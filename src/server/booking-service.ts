import crypto from 'node:crypto';
import type { TransactionSql } from 'postgres';
import { computeAvailableSlots, validateSlotInSchedule } from './availability';
import { getLocalParts, normalizeMexicanPhone } from '../shared/timezone';
import type {
  AppointmentDTO,
  AttendanceStatus,
  OriginChannel,
  PaymentMethod,
} from '../shared/types';

export function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export function hashPayload(payload: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

export interface CreateBookingInput {
  organizationId: string;
  professionalId: string;
  serviceId: string;
  resourceIdOverride?: string | null;
  startsAtIso: string;
  patientName: string;
  patientPhone: string;
  patientEmail?: string | null;
  contactName?: string | null;
  contactRelationship?: string | null;
  contactPhone?: string | null;
  originChannel: OriginChannel;
  campaignSource?: string | null;
  adminNotes?: string | null;
  policyAccepted?: boolean;
  idempotencyKey: string;
  actorUserId: string | null;
  actorRole: string;
  actorLabel: string;
  nowOverride?: Date; // Para pruebas deterministas (ej. A27)
}

export interface CreateBookingResult {
  appointment: AppointmentDTO;
  managementToken?: string;
  managementUrl?: string;
  duplicatePhoneCount: number;
  idempotentReplay: boolean;
}

/**
 * Programa recordatorios en la cola de servidor (patrón Outbox / notification_jobs)
 * omitiendo recordatorios cuya hora programada ya haya pasado (cumple A27).
 */
async function scheduleAppointmentNotifications(
  tx: TransactionSql,
  params: {
    organizationId: string;
    appointmentId: string;
    appointmentVersion: number;
    startsAtUtc: Date;
    nowUtc: Date;
  }
) {
  const { organizationId, appointmentId, appointmentVersion, startsAtUtc, nowUtc } = params;

  // Confirmación inmediata
  const confirmKey = `${appointmentId}:v${appointmentVersion}:booking_confirmation:email`;
  await tx`
    INSERT INTO public.notification_jobs (
      organization_id, appointment_id, appointment_version, channel, job_type,
      scheduled_for, status, idempotency_key
    )
    VALUES (
      ${organizationId}, ${appointmentId}, ${appointmentVersion}, 'email', 'booking_confirmation',
      ${nowUtc.toISOString()}::timestamptz, 'pending', ${confirmKey}
    )
    ON CONFLICT (idempotency_key) DO NOTHING
  `;

  // Recordatorio 24h antes y 1h antes
  const reminders: Array<{ type: 'reminder_24h' | 'reminder_1h'; offsetMs: number }> = [
    { type: 'reminder_24h', offsetMs: 24 * 60 * 60 * 1000 },
    { type: 'reminder_1h', offsetMs: 1 * 60 * 60 * 1000 },
  ];

  for (const rem of reminders) {
    const scheduledFor = new Date(startsAtUtc.getTime() - rem.offsetMs);
    const key = `${appointmentId}:v${appointmentVersion}:${rem.type}:email`;
    // Regla A27: Si se agenda con menos anticipación que la ventana del recordatorio, omitir tareas vencidas
    const status = scheduledFor.getTime() <= nowUtc.getTime() ? 'skipped_past' : 'pending';

    await tx`
      INSERT INTO public.notification_jobs (
        organization_id, appointment_id, appointment_version, channel, job_type,
        scheduled_for, status, idempotency_key
      )
      VALUES (
        ${organizationId}, ${appointmentId}, ${appointmentVersion}, 'email', ${rem.type},
        ${scheduledFor.toISOString()}::timestamptz, ${status}, ${key}
      )
      ON CONFLICT (idempotency_key) DO NOTHING
    `;
  }
}

export async function getAppointmentById(
  tx: TransactionSql,
  organizationId: string,
  appointmentId: string
): Promise<AppointmentDTO> {
  const rows = await tx`
    SELECT
      a.id,
      a.organization_id,
      a.folio,
      a.location_id,
      l.name AS location_name,
      l.timezone,
      a.professional_id,
      p.full_name AS professional_name,
      p.specialty AS professional_specialty,
      p.color_hex AS professional_color,
      a.service_id,
      s.name AS service_name,
      s.duration_minutes,
      a.resource_id,
      r.name AS resource_name,
      a.patient_id,
      pat.full_name AS patient_name,
      pat.phone_display AS patient_phone,
      pat.email AS patient_email,
      pc.full_name AS contact_name,
      pc.relationship AS contact_relationship,
      pc.phone_display AS contact_phone,
      a.starts_at,
      a.ends_at,
      a.attendance_status,
      a.financial_status,
      a.agreed_price_cents,
      a.currency,
      a.origin_channel,
      a.campaign_source,
      a.admin_notes,
      a.cancellation_reason,
      a.version,
      a.created_at,
      COALESCE((
        SELECT SUM(CASE
          WHEN fm.movement_type = 'payment' THEN fm.amount_cents
          WHEN fm.movement_type IN ('refund', 'reversal') THEN -fm.amount_cents
          ELSE 0
        END)
        FROM public.financial_movements fm
        WHERE fm.organization_id = a.organization_id AND fm.appointment_id = a.id
      ), 0) AS net_paid_cents,
      COALESCE((
        SELECT SUM(CASE
          WHEN fm.movement_type = 'charge' THEN fm.amount_cents
          WHEN fm.movement_type IN ('discount', 'adjustment') THEN -fm.amount_cents
          ELSE 0
        END)
        FROM public.financial_movements fm
        WHERE fm.organization_id = a.organization_id AND fm.appointment_id = a.id
      ), 0) AS net_charged_cents
    FROM public.appointments a
    JOIN public.locations l ON l.id = a.location_id AND l.organization_id = a.organization_id
    JOIN public.professionals p ON p.id = a.professional_id AND p.organization_id = a.organization_id
    JOIN public.services s ON s.id = a.service_id AND s.organization_id = a.organization_id
    JOIN public.resources r ON r.id = a.resource_id AND r.organization_id = a.organization_id
    JOIN public.patients pat ON pat.id = a.patient_id AND pat.organization_id = a.organization_id
    LEFT JOIN public.patient_contacts pc ON pc.id = a.contact_id AND pc.organization_id = a.organization_id
    WHERE a.id = ${appointmentId}
      AND a.organization_id = ${organizationId}
    LIMIT 1
  `;

  if (rows.length === 0) {
    throw Object.assign(new Error('Cita no encontrada o acceso no autorizado.'), { status: 404 });
  }

  const row = rows[0];
  const startsParts = getLocalParts(new Date(row.starts_at), row.timezone);
  const endsParts = getLocalParts(new Date(row.ends_at), row.timezone);
  const netPaid = Math.max(0, Number(row.net_paid_cents));
  const netCharged = Math.max(0, Number(row.net_charged_cents));
  const balanceCents = Math.max(0, netCharged - netPaid);

  return {
    id: row.id,
    organization_id: row.organization_id,
    folio: row.folio,
    location_id: row.location_id,
    location_name: row.location_name,
    professional_id: row.professional_id,
    professional_name: row.professional_name,
    professional_specialty: row.professional_specialty,
    professional_color: row.professional_color,
    service_id: row.service_id,
    service_name: row.service_name,
    duration_minutes: Number(row.duration_minutes),
    resource_id: row.resource_id,
    resource_name: row.resource_name,
    patient_id: row.patient_id,
    patient_name: row.patient_name,
    patient_phone: row.patient_phone,
    patient_email: row.patient_email,
    contact_name: row.contact_name,
    contact_relationship: row.contact_relationship,
    contact_phone: row.contact_phone,
    starts_at: new Date(row.starts_at).toISOString(),
    ends_at: new Date(row.ends_at).toISOString(),
    local_time: startsParts.timeString,
    local_end_time: endsParts.timeString,
    local_date: startsParts.dateString,
    attendance_status: row.attendance_status,
    financial_status: row.financial_status,
    agreed_price_cents: Number(row.agreed_price_cents),
    net_paid_cents: netPaid,
    balance_cents: balanceCents,
    currency: 'MXN',
    origin_channel: row.origin_channel,
    campaign_source: row.campaign_source,
    admin_notes: row.admin_notes,
    cancellation_reason: row.cancellation_reason,
    version: Number(row.version),
    created_at: new Date(row.created_at).toISOString(),
  };
}

/**
 * Crea una cita de forma transaccional, serializada y protegida por:
 * - Clave de idempotencia (A04)
 * - Bloqueo transaccional por profesional y recurso (pg_advisory_xact_lock)
 * - Restricciones de exclusión GiST en PostgreSQL (A03, A07, A09)
 */
export async function createBookingAtomic(
  tx: TransactionSql,
  input: CreateBookingInput
): Promise<CreateBookingResult> {
  const scope = 'create_booking';
  const reqHash = hashPayload({
    professionalId: input.professionalId,
    serviceId: input.serviceId,
    startsAtIso: input.startsAtIso,
    patientName: input.patientName.trim(),
    patientPhone: normalizeMexicanPhone(input.patientPhone),
  });

  // 1. Verificar clave de idempotencia primero (A04)
  const existingIdem = await tx`
    SELECT request_hash, response_body
    FROM public.idempotency_keys
    WHERE organization_id = ${input.organizationId}
      AND scope = ${scope}
      AND idempotency_key = ${input.idempotencyKey}
      AND expires_at > now()
    LIMIT 1
  `;

  if (existingIdem.length > 0) {
    const saved = existingIdem[0].response_body as CreateBookingResult;
    return {
      ...saved,
      idempotentReplay: true,
    };
  }

  // 2. Serializar por organización + profesional para evitar carreras antes del constraint GiST
  await tx`
    SELECT pg_advisory_xact_lock(hashtext(${input.organizationId + ':' + input.professionalId}))
  `;

  // 3. Revalidar disponibilidad en el servidor dentro de la transacción
  const slotValidation = await validateSlotInSchedule(tx, {
    organizationId: input.organizationId,
    professionalId: input.professionalId,
    serviceId: input.serviceId,
    startsAtIso: input.startsAtIso,
    resourceIdOverride: input.resourceIdOverride,
  });

  await tx`
    SELECT pg_advisory_xact_lock(hashtext(${input.organizationId + ':' + slotValidation.resourceId}))
  `;

  const phoneNormalized = normalizeMexicanPhone(input.patientPhone);

  // 4. Detectar posibles teléfonos compartidos sin fusionar pacientes automáticamente (A20)
  const existingPhoneMatches = await tx`
    SELECT id, full_name
    FROM public.patients
    WHERE organization_id = ${input.organizationId}
      AND phone_normalized = ${phoneNormalized}
  `;

  // Reutilizar registro únicamente si coincide nombre exacto Y teléfono; si es otra persona (ej. hijo/familiar con mismo teléfono), crear paciente propio (A20)
  let patientId: string;
  const exactMatch = existingPhoneMatches.find(
    (p) => p.full_name.trim().toLowerCase() === input.patientName.trim().toLowerCase()
  );

  if (exactMatch) {
    patientId = exactMatch.id;
  } else {
    const [createdPat] = await tx`
      INSERT INTO public.patients (organization_id, full_name, phone_normalized, phone_display, email)
      VALUES (
        ${input.organizationId},
        ${input.patientName.trim()},
        ${phoneNormalized},
        ${input.patientPhone.trim()},
        ${input.patientEmail?.trim() || null}
      )
      RETURNING id
    `;
    patientId = createdPat.id;
  }

  let contactId: string | null = null;
  if (input.contactName && input.contactName.trim().length > 0) {
    const [createdContact] = await tx`
      INSERT INTO public.patient_contacts (
        organization_id, patient_id, full_name, relationship, phone_display, email
      )
      VALUES (
        ${input.organizationId},
        ${patientId},
        ${input.contactName.trim()},
        ${input.contactRelationship?.trim() || 'Familiar / Tutor'},
        ${input.contactPhone?.trim() || input.patientPhone.trim()},
        ${input.patientEmail?.trim() || null}
      )
      RETURNING id
    `;
    contactId = createdContact.id;
  }

  // Generar folio único legible
  const randomSuffix = crypto.randomInt(1000, 9999);
  const dateCompact = slotValidation.localDateStr.replace(/-/g, '');
  const folio = `NUC-${dateCompact}-${randomSuffix}`;

  let appointmentId: string;
  try {
    const [insertedAppt] = await tx`
      INSERT INTO public.appointments (
        organization_id, folio, location_id, professional_id, service_id, resource_id,
        patient_id, contact_id, starts_at, ends_at, occupied_starts_at, occupied_ends_at,
        attendance_status, financial_status, agreed_price_cents, currency,
        origin_channel, campaign_source, admin_notes, version, created_by
      )
      VALUES (
        ${input.organizationId},
        ${folio},
        ${slotValidation.locationId},
        ${input.professionalId},
        ${input.serviceId},
        ${slotValidation.resourceId},
        ${patientId},
        ${contactId},
        ${slotValidation.startsAtUtc.toISOString()}::timestamptz,
        ${slotValidation.endsAtUtc.toISOString()}::timestamptz,
        ${slotValidation.occupiedStartsAtUtc.toISOString()}::timestamptz,
        ${slotValidation.occupiedEndsAtUtc.toISOString()}::timestamptz,
        'scheduled',
        'pending',
        ${slotValidation.agreedPriceCents},
        'MXN',
        ${input.originChannel},
        ${input.campaignSource || null},
        ${input.adminNotes || null},
        1,
        ${input.actorUserId}
      )
      RETURNING id
    `;
    appointmentId = insertedAppt.id;

    // Registrar en la tabla común de ocupación (impide choques con bloqueos simultáneos A09)
    await tx`
      INSERT INTO public.resource_reservations (
        organization_id, professional_id, resource_id, appointment_id, kind, starts_at, ends_at, status
      )
      VALUES (
        ${input.organizationId},
        ${input.professionalId},
        ${slotValidation.resourceId},
        ${appointmentId},
        'appointment',
        ${slotValidation.occupiedStartsAtUtc.toISOString()}::timestamptz,
        ${slotValidation.occupiedEndsAtUtc.toISOString()}::timestamptz,
        'active'
      )
    `;
  } catch (err: unknown) {
    const pgErr = err as { code?: string; message?: string };
    if (pgErr.code === '23P01' || pgErr.code === '23505') {
      throw Object.assign(
        new Error(
          'Conflicto de concurrencia: el horario o consultorio acaba de ser ocupado por otra operación.'
        ),
        {
          status: 409,
          code: 'CONCURRENT_BOOKING_CONFLICT',
        }
      );
    }
    throw err;
  }

  // Registrar evento inicial en el historial inmutable
  await tx`
    INSERT INTO public.appointment_events (
      organization_id, appointment_id, event_type, previous_state, new_state, reason, actor_user_id, actor_label
    )
    VALUES (
      ${input.organizationId},
      ${appointmentId},
      'created',
      '{}'::jsonb,
      ${tx.json({
        attendance_status: 'scheduled',
        starts_at: slotValidation.startsAtUtc.toISOString(),
        ends_at: slotValidation.endsAtUtc.toISOString(),
        resource_id: slotValidation.resourceId,
        agreed_price_cents: slotValidation.agreedPriceCents,
      })},
      ${'Reserva creada vía ' + input.originChannel},
      ${input.actorUserId},
      ${input.actorLabel}
    )
  `;

  // Registrar movimiento financiero de cargo por el precio acordado (A23)
  await tx`
    INSERT INTO public.financial_movements (
      organization_id, appointment_id, movement_type, amount_cents, currency,
      beneficiary_type, notes, recorded_by, recorded_by_label
    )
    VALUES (
      ${input.organizationId},
      ${appointmentId},
      'charge',
      ${slotValidation.agreedPriceCents},
      'MXN',
      'organization',
      'Cargo inicial por servicio reservado',
      ${input.actorUserId},
      ${input.actorLabel}
    )
  `;

  await tx`
    SELECT * FROM public.recalculate_appointment_financial_status(${input.organizationId}, ${appointmentId})
  `;

  // Registrar consentimiento de privacidad (LFPDPPP)
  await tx`
    INSERT INTO public.consents (
      organization_id, patient_id, appointment_id, purpose, policy_version, accepted
    )
    VALUES (
      ${input.organizationId},
      ${patientId},
      ${appointmentId},
      'operational_booking',
      'v1.0-2026-10',
      ${input.policyAccepted !== false}
    )
  `;

  // Generar token secreto de autogestión de alcance limitado y caducidad
  const rawToken = `mgt_${crypto.randomBytes(24).toString('base64url')}`;
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(slotValidation.endsAtUtc.getTime() + 7 * 24 * 60 * 60 * 1000);

  await tx`
    INSERT INTO public.management_tokens (
      organization_id, appointment_id, token_hash, scopes, expires_at
    )
    VALUES (
      ${input.organizationId},
      ${appointmentId},
      ${tokenHash},
      ARRAY['read', 'confirm', 'reschedule', 'cancel'],
      ${expiresAt.toISOString()}::timestamptz
    )
  `;

  // Programar notificaciones y recordatorios en cola de servidor (A27)
  await scheduleAppointmentNotifications(tx, {
    organizationId: input.organizationId,
    appointmentId,
    appointmentVersion: 1,
    startsAtUtc: slotValidation.startsAtUtc,
    nowUtc: input.nowOverride || new Date(),
  });

  // Registrar auditoría sanitizada (sin datos clínicos ni teléfonos en claro)
  await tx`
    INSERT INTO public.audit_logs (
      organization_id, actor_user_id, actor_role, entity_type, entity_id, action, before_sanitized, after_sanitized
    )
    VALUES (
      ${input.organizationId},
      ${input.actorUserId},
      ${input.actorRole},
      'appointment',
      ${appointmentId},
      'appointment.created',
      '{}'::jsonb,
      ${tx.json({
        folio,
        professional_id: input.professionalId,
        service_id: input.serviceId,
        starts_at: slotValidation.startsAtUtc.toISOString(),
        origin_channel: input.originChannel,
      })}
    )
  `;

  const appointment = await getAppointmentById(tx, input.organizationId, appointmentId);

  const result: CreateBookingResult = {
    appointment,
    managementToken: rawToken,
    managementUrl: `/gestionar/${rawToken}`,
    duplicatePhoneCount: existingPhoneMatches.length,
    idempotentReplay: false,
  };

  await tx`
    INSERT INTO public.idempotency_keys (
      organization_id, scope, idempotency_key, request_hash, response_status, response_body
    )
    VALUES (
      ${input.organizationId},
      ${scope},
      ${input.idempotencyKey},
      ${reqHash},
      201,
      ${tx.json(JSON.parse(JSON.stringify(result)))}
    )
  `;

  return result;
}

/**
 * Reprograma atómicamente una cita (A05, A06, A26):
 * - Verifica `expectedVersion` (control optimista de concurrencia A26)
 * - Si el nuevo horario está ocupado o falla la restricción GiST, la transacción hace rollback
 *   conservando la cita original intacta (A05)
 * - Invalida recordatorios pendientes de la versión anterior y agenda los nuevos (A06)
 */
export async function rescheduleBookingAtomic(
  tx: TransactionSql,
  params: {
    organizationId: string;
    appointmentId: string;
    newStartsAtIso: string;
    newResourceIdOverride?: string | null;
    expectedVersion: number;
    reason?: string | null;
    actorUserId: string | null;
    actorRole: string;
    actorLabel: string;
    nowOverride?: Date;
  }
): Promise<AppointmentDTO> {
  const currentRows = await tx`
    SELECT
      id, professional_id, service_id, resource_id, starts_at, ends_at,
      attendance_status, version
    FROM public.appointments
    WHERE id = ${params.appointmentId}
      AND organization_id = ${params.organizationId}
    FOR UPDATE
  `;

  if (currentRows.length === 0) {
    throw Object.assign(new Error('Cita no encontrada.'), { status: 404 });
  }

  const current = currentRows[0];

  if (Number(current.version) !== Number(params.expectedVersion)) {
    throw Object.assign(
      new Error(
        `Conflicto de versión: la cita fue modificada por otro operador (versión actual ${current.version}, esperada ${params.expectedVersion}). Recargue la agenda.`
      ),
      { status: 409, code: 'VERSION_CONFLICT' }
    );
  }

  if (['cancelled', 'completed', 'no_show'].includes(current.attendance_status)) {
    throw Object.assign(
      new Error(`No se puede reprogramar una cita en estado ${current.attendance_status}.`),
      { status: 422 }
    );
  }

  // Validar nuevo horario excluyendo la propia cita actual
  const slotValidation = await validateSlotInSchedule(tx, {
    organizationId: params.organizationId,
    professionalId: current.professional_id,
    serviceId: current.service_id,
    startsAtIso: params.newStartsAtIso,
    resourceIdOverride: params.newResourceIdOverride || current.resource_id,
    excludeAppointmentId: params.appointmentId,
  });

  const nextVersion = Number(current.version) + 1;

  try {
    await tx`
      UPDATE public.appointments
      SET
        starts_at = ${slotValidation.startsAtUtc.toISOString()}::timestamptz,
        ends_at = ${slotValidation.endsAtUtc.toISOString()}::timestamptz,
        occupied_starts_at = ${slotValidation.occupiedStartsAtUtc.toISOString()}::timestamptz,
        occupied_ends_at = ${slotValidation.occupiedEndsAtUtc.toISOString()}::timestamptz,
        resource_id = ${slotValidation.resourceId},
        version = ${nextVersion},
        updated_at = now()
      WHERE id = ${params.appointmentId}
        AND organization_id = ${params.organizationId}
        AND version = ${params.expectedVersion}
    `;

    await tx`
      UPDATE public.resource_reservations
      SET
        starts_at = ${slotValidation.occupiedStartsAtUtc.toISOString()}::timestamptz,
        ends_at = ${slotValidation.occupiedEndsAtUtc.toISOString()}::timestamptz,
        resource_id = ${slotValidation.resourceId}
      WHERE appointment_id = ${params.appointmentId}
        AND organization_id = ${params.organizationId}
        AND status = 'active'
    `;
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr.code === '23P01') {
      throw Object.assign(
        new Error('El nuevo horario seleccionado ya se encuentra ocupado por otra cita o bloqueo.'),
        { status: 409, code: 'RESCHEDULE_SLOT_OCCUPIED' }
      );
    }
    throw err;
  }

  // Invalidar recordatorios pendientes de versiones anteriores (A06)
  await tx`
    UPDATE public.notification_jobs
    SET status = 'cancelled_obsolete', updated_at = now()
    WHERE organization_id = ${params.organizationId}
      AND appointment_id = ${params.appointmentId}
      AND status = 'pending'
  `;

  await scheduleAppointmentNotifications(tx, {
    organizationId: params.organizationId,
    appointmentId: params.appointmentId,
    appointmentVersion: nextVersion,
    startsAtUtc: slotValidation.startsAtUtc,
    nowUtc: params.nowOverride || new Date(),
  });

  // Guardar historial con antes y después
  await tx`
    INSERT INTO public.appointment_events (
      organization_id, appointment_id, event_type, previous_state, new_state, reason, actor_user_id, actor_label
    )
    VALUES (
      ${params.organizationId},
      ${params.appointmentId},
      'rescheduled',
      ${tx.json({
        starts_at: new Date(current.starts_at).toISOString(),
        ends_at: new Date(current.ends_at).toISOString(),
        resource_id: current.resource_id,
        version: Number(current.version),
      })},
      ${tx.json({
        starts_at: slotValidation.startsAtUtc.toISOString(),
        ends_at: slotValidation.endsAtUtc.toISOString(),
        resource_id: slotValidation.resourceId,
        version: nextVersion,
      })},
      ${params.reason || 'Reprogramación solicitada'},
      ${params.actorUserId},
      ${params.actorLabel}
    )
  `;

  await tx`
    INSERT INTO public.audit_logs (
      organization_id, actor_user_id, actor_role, entity_type, entity_id, action, before_sanitized, after_sanitized
    )
    VALUES (
      ${params.organizationId},
      ${params.actorUserId},
      ${params.actorRole},
      'appointment',
      ${params.appointmentId},
      'appointment.rescheduled',
      ${tx.json({ starts_at: new Date(current.starts_at).toISOString(), version: Number(current.version) })},
      ${tx.json({ starts_at: slotValidation.startsAtUtc.toISOString(), version: nextVersion })}
    )
  `;

  return getAppointmentById(tx, params.organizationId, params.appointmentId);
}

/**
 * Cancela una cita liberando el horario y recurso, invalidando recordatorios pendientes,
 * conservando el historial y sin ejecutar reembolsos implícitos (A15, A17).
 */
export async function cancelBookingAtomic(
  tx: TransactionSql,
  params: {
    organizationId: string;
    appointmentId: string;
    reason: string;
    expectedVersion?: number;
    actorUserId: string | null;
    actorRole: string;
    actorLabel: string;
  }
): Promise<AppointmentDTO> {
  const rows = await tx`
    SELECT id, attendance_status, starts_at, ends_at, version
    FROM public.appointments
    WHERE id = ${params.appointmentId}
      AND organization_id = ${params.organizationId}
    FOR UPDATE
  `;

  if (rows.length === 0) {
    throw Object.assign(new Error('Cita no encontrada.'), { status: 404 });
  }

  const current = rows[0];
  if (
    params.expectedVersion !== undefined &&
    Number(current.version) !== Number(params.expectedVersion)
  ) {
    throw Object.assign(
      new Error('Conflicto de versión: la cita fue modificada por otro operador.'),
      { status: 409, code: 'VERSION_CONFLICT' }
    );
  }

  if (current.attendance_status === 'cancelled') {
    return getAppointmentById(tx, params.organizationId, params.appointmentId);
  }

  const nextVersion = Number(current.version) + 1;

  await tx`
    UPDATE public.appointments
    SET
      attendance_status = 'cancelled',
      cancellation_reason = ${params.reason.trim() || 'Cancelada por solicitud'},
      cancelled_at = now(),
      cancelled_by = ${params.actorUserId},
      version = ${nextVersion},
      updated_at = now()
    WHERE id = ${params.appointmentId}
      AND organization_id = ${params.organizationId}
  `;

  // Liberar el horario en la tabla común de ocupación
  await tx`
    UPDATE public.resource_reservations
    SET status = 'released'
    WHERE appointment_id = ${params.appointmentId}
      AND organization_id = ${params.organizationId}
      AND status = 'active'
  `;

  // Invalidar recordatorios pendientes para que no salgan mensajes obsoletos (A17)
  await tx`
    UPDATE public.notification_jobs
    SET status = 'cancelled_obsolete', updated_at = now()
    WHERE organization_id = ${params.organizationId}
      AND appointment_id = ${params.appointmentId}
      AND status = 'pending'
  `;

  await tx`
    INSERT INTO public.appointment_events (
      organization_id, appointment_id, event_type, previous_state, new_state, reason, actor_user_id, actor_label
    )
    VALUES (
      ${params.organizationId},
      ${params.appointmentId},
      'cancelled',
      ${tx.json({ attendance_status: current.attendance_status, version: Number(current.version) })},
      ${tx.json({ attendance_status: 'cancelled', version: nextVersion })},
      ${params.reason.trim()},
      ${params.actorUserId},
      ${params.actorLabel}
    )
  `;

  await tx`
    INSERT INTO public.audit_logs (
      organization_id, actor_user_id, actor_role, entity_type, entity_id, action, before_sanitized, after_sanitized
    )
    VALUES (
      ${params.organizationId},
      ${params.actorUserId},
      ${params.actorRole},
      'appointment',
      ${params.appointmentId},
      'appointment.cancelled',
      ${tx.json({ attendance_status: current.attendance_status })},
      ${tx.json({ attendance_status: 'cancelled', reason: params.reason.trim() })}
    )
  `;

  return getAppointmentById(tx, params.organizationId, params.appointmentId);
}

/**
 * Cambia el estado de atención de la cita sin modificar el estado financiero (A12),
 * e impide marcar como "No asistió" (no_show) una cita cuya hora de inicio aún es futura (A14).
 */
export async function updateAttendanceStatusAtomic(
  tx: TransactionSql,
  params: {
    organizationId: string;
    appointmentId: string;
    newStatus: AttendanceStatus;
    expectedVersion?: number;
    reason?: string | null;
    actorUserId: string | null;
    actorRole: string;
    actorLabel: string;
    nowOverride?: Date;
  }
): Promise<AppointmentDTO> {
  if (params.newStatus === 'cancelled') {
    return cancelBookingAtomic(tx, {
      organizationId: params.organizationId,
      appointmentId: params.appointmentId,
      reason: params.reason || 'Cancelada desde panel',
      expectedVersion: params.expectedVersion,
      actorUserId: params.actorUserId,
      actorRole: params.actorRole,
      actorLabel: params.actorLabel,
    });
  }

  const rows = await tx`
    SELECT id, attendance_status, financial_status, starts_at, version
    FROM public.appointments
    WHERE id = ${params.appointmentId}
      AND organization_id = ${params.organizationId}
    FOR UPDATE
  `;

  if (rows.length === 0) {
    throw Object.assign(new Error('Cita no encontrada.'), { status: 404 });
  }

  const current = rows[0];

  if (
    params.expectedVersion !== undefined &&
    Number(current.version) !== Number(params.expectedVersion)
  ) {
    throw Object.assign(
      new Error(
        `Conflicto de versión: la cita fue modificada por otro operador (versión actual ${current.version}, esperada ${params.expectedVersion}).`
      ),
      { status: 409, code: 'VERSION_CONFLICT' }
    );
  }

  const nowUtc = params.nowOverride || new Date();
  const startsAtUtc = new Date(current.starts_at);

  // Regla A14: Una cita futura NO puede marcarse como "No asistió" (no_show)
  if (params.newStatus === 'no_show' && startsAtUtc.getTime() > nowUtc.getTime()) {
    throw Object.assign(
      new Error(
        'No se puede registrar inasistencia ("No asistió") en una cita cuya hora de inicio aún es futura.'
      ),
      { status: 422, code: 'FUTURE_NO_SHOW_FORBIDDEN' }
    );
  }

  const nextVersion = Number(current.version) + 1;

  // Regla A12: Actualizar únicamente attendance_status; financial_status permanece intacto
  await tx`
    UPDATE public.appointments
    SET
      attendance_status = ${params.newStatus},
      version = ${nextVersion},
      updated_at = now()
    WHERE id = ${params.appointmentId}
      AND organization_id = ${params.organizationId}
  `;

  await tx`
    INSERT INTO public.appointment_events (
      organization_id, appointment_id, event_type, previous_state, new_state, reason, actor_user_id, actor_label
    )
    VALUES (
      ${params.organizationId},
      ${params.appointmentId},
      'status_changed',
      ${tx.json({ attendance_status: current.attendance_status, version: Number(current.version) })},
      ${tx.json({ attendance_status: params.newStatus, version: nextVersion })},
      ${params.reason || `Cambio de estado a ${params.newStatus}`},
      ${params.actorUserId},
      ${params.actorLabel}
    )
  `;

  await tx`
    INSERT INTO public.audit_logs (
      organization_id, actor_user_id, actor_role, entity_type, entity_id, action, before_sanitized, after_sanitized
    )
    VALUES (
      ${params.organizationId},
      ${params.actorUserId},
      ${params.actorRole},
      'appointment',
      ${params.appointmentId},
      'appointment.status_changed',
      ${tx.json({ attendance_status: current.attendance_status })},
      ${tx.json({ attendance_status: params.newStatus })}
    )
  `;

  return getAppointmentById(tx, params.organizationId, params.appointmentId);
}

/**
 * Registra un pago manual idempotente y recalcula el saldo desde los movimientos (A04, A12, A13).
 */
export async function recordPaymentAtomic(
  tx: TransactionSql,
  params: {
    organizationId: string;
    appointmentId: string;
    amountCents: number;
    paymentMethod: PaymentMethod;
    beneficiaryType?: 'organization' | 'professional';
    referenceCode?: string | null;
    notes?: string | null;
    idempotencyKey: string;
    actorUserId: string;
    actorRole: string;
    actorLabel: string;
  }
): Promise<{
  appointment: AppointmentDTO;
  movementId: string;
  idempotentReplay: boolean;
}> {
  if (params.amountCents <= 0 || !Number.isInteger(params.amountCents)) {
    throw Object.assign(new Error('El importe del pago debe ser un entero positivo en centavos.'), {
      status: 422,
    });
  }

  const scope = `payment:${params.appointmentId}`;
  const reqHash = hashPayload({
    appointmentId: params.appointmentId,
    amountCents: params.amountCents,
    paymentMethod: params.paymentMethod,
  });

  const existingIdem = await tx`
    SELECT response_body
    FROM public.idempotency_keys
    WHERE organization_id = ${params.organizationId}
      AND scope = ${scope}
      AND idempotency_key = ${params.idempotencyKey}
      AND expires_at > now()
    LIMIT 1
  `;

  if (existingIdem.length > 0) {
    const saved = existingIdem[0].response_body as {
      appointment: AppointmentDTO;
      movementId: string;
    };
    return { ...saved, idempotentReplay: true };
  }

  const [mov] = await tx`
    INSERT INTO public.financial_movements (
      organization_id, appointment_id, movement_type, amount_cents, currency,
      payment_method, beneficiary_type, reference_code, notes, recorded_by, recorded_by_label
    )
    VALUES (
      ${params.organizationId},
      ${params.appointmentId},
      'payment',
      ${params.amountCents},
      'MXN',
      ${params.paymentMethod},
      ${params.beneficiaryType || 'organization'},
      ${params.referenceCode || null},
      ${params.notes || 'Pago registrado en recepción'},
      ${params.actorUserId},
      ${params.actorLabel}
    )
    RETURNING id
  `;

  await tx`
    SELECT * FROM public.recalculate_appointment_financial_status(${params.organizationId}, ${params.appointmentId})
  `;

  await tx`
    INSERT INTO public.appointment_events (
      organization_id, appointment_id, event_type, previous_state, new_state, reason, actor_user_id, actor_label
    )
    VALUES (
      ${params.organizationId},
      ${params.appointmentId},
      'payment_recorded',
      '{}'::jsonb,
      ${tx.json({ movement_id: mov.id, amount_cents: params.amountCents, method: params.paymentMethod })},
      ${params.notes || 'Cobro manual registrado'},
      ${params.actorUserId},
      ${params.actorLabel}
    )
  `;

  const appointment = await getAppointmentById(tx, params.organizationId, params.appointmentId);

  const responsePayload = {
    appointment,
    movementId: mov.id as string,
    idempotentReplay: false,
  };

  await tx`
    INSERT INTO public.idempotency_keys (
      organization_id, scope, idempotency_key, request_hash, response_status, response_body
    )
    VALUES (
      ${params.organizationId},
      ${scope},
      ${params.idempotencyKey},
      ${reqHash},
      201,
      ${tx.json(JSON.parse(JSON.stringify(responsePayload)))}
    )
  `;

  return responsePayload;
}

/**
 * Registra un reverso o devolución sin borrar el movimiento original (A13).
 */
export async function reverseOrRefundMovementAtomic(
  tx: TransactionSql,
  params: {
    organizationId: string;
    movementId: string;
    type: 'reversal' | 'refund';
    amountCents?: number;
    reason: string;
    actorUserId: string;
    actorRole: string;
    actorLabel: string;
  }
): Promise<{ appointment: AppointmentDTO; reversalMovementId: string }> {
  const origRows = await tx`
    SELECT id, appointment_id, movement_type, amount_cents, payment_method, beneficiary_type
    FROM public.financial_movements
    WHERE id = ${params.movementId}
      AND organization_id = ${params.organizationId}
    LIMIT 1
  `;

  if (origRows.length === 0) {
    throw Object.assign(new Error('Movimiento financiero original no encontrado.'), { status: 404 });
  }

  const orig = origRows[0];
  if (orig.movement_type !== 'payment') {
    throw Object.assign(new Error('Solo se pueden revertir o reembolsar movimientos de tipo pago.'), {
      status: 422,
    });
  }

  const targetAmount = params.amountCents ?? Number(orig.amount_cents);
  if (targetAmount <= 0 || targetAmount > Number(orig.amount_cents)) {
    throw Object.assign(
      new Error('El monto de devolución/reverso no puede exceder el pago original.'),
      { status: 422 }
    );
  }

  const [rev] = await tx`
    INSERT INTO public.financial_movements (
      organization_id, appointment_id, movement_type, amount_cents, currency,
      payment_method, beneficiary_type, related_movement_id, notes, recorded_by, recorded_by_label
    )
    VALUES (
      ${params.organizationId},
      ${orig.appointment_id},
      ${params.type},
      ${targetAmount},
      'MXN',
      ${orig.payment_method},
      ${orig.beneficiary_type},
      ${orig.id},
      ${params.reason.trim()},
      ${params.actorUserId},
      ${params.actorLabel}
    )
    RETURNING id
  `;

  await tx`
    SELECT * FROM public.recalculate_appointment_financial_status(${params.organizationId}, ${orig.appointment_id})
  `;

  await tx`
    INSERT INTO public.appointment_events (
      organization_id, appointment_id, event_type, previous_state, new_state, reason, actor_user_id, actor_label
    )
    VALUES (
      ${params.organizationId},
      ${orig.appointment_id},
      'payment_reversed',
      ${tx.json({ original_movement_id: orig.id })},
      ${tx.json({ reversal_movement_id: rev.id, type: params.type, amount_cents: targetAmount })},
      ${params.reason.trim()},
      ${params.actorUserId},
      ${params.actorLabel}
    )
  `;

  const appointment = await getAppointmentById(tx, params.organizationId, orig.appointment_id);
  return { appointment, reversalMovementId: rev.id };
}

/**
 * Crea un bloqueo de horario utilizando la misma tabla `resource_reservations` y bloqueo
 * transaccional que las citas para impedir condiciones de carrera entre reservar y bloquear (A09).
 */
export async function createAvailabilityBlockAtomic(
  tx: TransactionSql,
  params: {
    organizationId: string;
    professionalId: string;
    resourceId?: string | null;
    kind: 'block' | 'vacation' | 'break' | 'meeting';
    startsAtIso: string;
    endsAtIso: string;
    reason: string;
    actorUserId: string;
  }
) {
  await tx`
    SELECT pg_advisory_xact_lock(hashtext(${params.organizationId + ':' + params.professionalId}))
  `;

  const profRows = await tx`
    SELECT default_location_id, default_resource_id
    FROM public.professionals
    WHERE id = ${params.professionalId}
      AND organization_id = ${params.organizationId}
    LIMIT 1
  `;

  if (profRows.length === 0) {
    throw Object.assign(new Error('Profesional no encontrado.'), { status: 404 });
  }

  const locationId = profRows[0].default_location_id;
  const resourceId = params.resourceId ?? profRows[0].default_resource_id;

  try {
    const [ex] = await tx`
      INSERT INTO public.availability_exceptions (
        organization_id, professional_id, location_id, resource_id, kind,
        starts_at, ends_at, reason, created_by
      )
      VALUES (
        ${params.organizationId},
        ${params.professionalId},
        ${locationId},
        ${resourceId},
        ${params.kind},
        ${params.startsAtIso}::timestamptz,
        ${params.endsAtIso}::timestamptz,
        ${params.reason.trim()},
        ${params.actorUserId}
      )
      RETURNING *
    `;

    await tx`
      INSERT INTO public.resource_reservations (
        organization_id, professional_id, resource_id, exception_id, kind,
        starts_at, ends_at, status
      )
      VALUES (
        ${params.organizationId},
        ${params.professionalId},
        ${resourceId},
        ${ex.id},
        'block',
        ${params.startsAtIso}::timestamptz,
        ${params.endsAtIso}::timestamptz,
        'active'
      )
    `;

    return ex;
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr.code === '23P01') {
      throw Object.assign(
        new Error(
          'Conflicto al bloquear horario: ya existe una cita activa o bloqueo en ese intervalo para el profesional o consultorio.'
        ),
        { status: 409, code: 'BLOCK_CONFLICT' }
      );
    }
    throw err;
  }
}
