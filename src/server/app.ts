import { Hono } from 'hono';
import { cors } from 'hono/cors';
import {
  authenticateWithPassword,
  resolveActiveSessionUser,
} from './auth';
import {
  getSql,
  withServiceTransaction,
  withUserRls,
  type ServerEnv,
} from './db';
import { computeAvailableSlots } from './availability';
import {
  cancelBookingAtomic,
  createAvailabilityBlockAtomic,
  createBookingAtomic,
  getAppointmentById,
  hashToken,
  recordPaymentAtomic,
  rescheduleBookingAtomic,
  reverseOrRefundMovementAtomic,
  updateAttendanceStatusAtomic,
} from './booking-service';
import {
  connectEvolutionInstance,
  renderWhatsAppTemplate,
  sendEvolutionWhatsAppMessage,
} from './evolution';
import { getLocalDayUtcBounds, getLocalParts, normalizeMexicanPhone } from '../shared/timezone';
import type {
  AppointmentDTO,
  AttendanceStatus,
  AuthSessionUser,
  DailySummaryReportDTO,
  OriginChannel,
  PaymentMethod,
} from '../shared/types';

type Variables = {
  user: AuthSessionUser;
};

export const app = new Hono<{ Bindings: ServerEnv; Variables: Variables }>();

app.use('/api/*', cors());

// Manejador centralizado de errores con códigos HTTP semánticos (409, 422, 403, 404)
app.onError((err, c) => {
  const e = err as { status?: number; code?: string; message?: string; availableSlots?: unknown };
  const status = (e.status || 500) as 400 | 401 | 403 | 404 | 409 | 422 | 500;
  return c.json(
    {
      error: e.message || 'Error interno del servidor',
      code: e.code || 'SERVER_ERROR',
      ...(e.availableSlots ? { availableSlots: e.availableSlots } : {}),
    },
    status
  );
});

// Salud del servicio
app.get('/api/v1/health', async (c) => {
  try {
    const sql = getSql(c.env);
    const [res] = await sql`SELECT now() AS server_time`;
    return c.json({
      status: 'ok',
      service: 'dr-agenda-nucleos-api',
      database: 'connected',
      serverTime: res.server_time,
    });
  } catch (err) {
    const e = err as Error;
    return c.json(
      {
        status: 'degraded',
        service: 'dr-agenda-nucleos-api',
        database: 'error',
        error: e.message || 'Database connection error',
      },
      503
    );
  }
});

// -----------------------------------------------------------------------------
// 1. Autenticación y Sesiones
// -----------------------------------------------------------------------------
app.post('/api/v1/auth/login', async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>();
  if (!body.email || !body.password) {
    return c.json({ error: 'Ingrese correo electrónico y contraseña.' }, 422);
  }

  const authResult = await authenticateWithPassword(body.email, body.password, c.env);
  if (!authResult) {
    return c.json({ error: 'Credenciales inválidas o cuenta inactiva.' }, 401);
  }

  return c.json({
    token: authResult.token,
    user: authResult.user,
  });
});

app.post('/api/v1/auth/logout', async (c) => {
  return c.json({ ok: true });
});

app.get('/api/v1/auth/demo-accounts', async (c) => {
  return c.json({
    accounts: [
      {
        label: 'Laura · Asistente (Control General de Citas)',
        email: 'laura@nucleodemo.mx',
        role: 'Asistente',
        description: 'Controla las agendas de todas las especialistas, registra llegadas/cobros y gestiona recordatorios.',
      },
      {
        label: 'Dirección · Administrador del Núcleo',
        email: 'admin@nucleodemo.mx',
        role: 'Administrador',
        description: 'Vista consolidada, configuración de Evolution API (WhatsApp), Doctoralia, horarios y reversos.',
      },
      {
        label: 'Ginecóloga · Ginecología y Obstetricia',
        email: 'sofia@nucleodemo.mx',
        role: 'Especialista',
        description: 'Agenda individual, expediente ginecológico privado y WhatsApp propio (consultorio-ginecologa).',
      },
      {
        label: 'Internista · Medicina Interna',
        email: 'pablo@nucleodemo.mx',
        role: 'Especialista',
        description: 'Agenda individual, expediente clínico de medicina interna y WhatsApp propio (consultorio-internista).',
      },
      {
        label: 'Nutrióloga · Nutrición Clínica',
        email: 'elena@nucleodemo.mx',
        role: 'Especialista',
        description: 'Agenda individual, expediente antropométrico/nutricional y WhatsApp propio (consultorio-nutriologa).',
      },
      {
        label: 'Psicóloga · Psicología Clínica',
        email: 'psicologa@nucleodemo.mx',
        role: 'Especialista',
        description: 'Agenda individual, notas psicoterapéuticas confidenciales y WhatsApp propio (consultorio-psicologa).',
      },
    ],
  });
});

// Middleware de autenticación para rutas privadas
app.use('/api/v1/*', async (c, next) => {
  const path = c.req.path;
  if (
    path.startsWith('/api/v1/health') ||
    path === '/api/v1/auth/login' ||
    path === '/api/v1/auth/logout' ||
    path === '/api/v1/auth/demo-accounts' ||
    path.startsWith('/api/v1/public/') ||
    path.startsWith('/api/v1/booking-access/') ||
    path.startsWith('/api/v1/bookings/') ||
    path.startsWith('/api/v1/webhooks/')
  ) {
    return next();
  }

  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Sesión no autenticada. Inicie sesión nuevamente.' }, 401);
  }

  const token = authHeader.slice('Bearer '.length).trim();
  const sessionUser = await resolveActiveSessionUser(token, c.env);
  if (!sessionUser) {
    return c.json(
      { error: 'Sesión expirada o usuario revocado. Inicie sesión nuevamente.' },
      401
    );
  }

  c.set('user', sessionUser);
  return next();
});

app.get('/api/v1/auth/me', async (c) => {
  const user = c.get('user');
  return c.json({ user });
});

// Helper de autorización en servidor por profesional (además de RLS en BD)
function assertCanAccessProfessional(user: AuthSessionUser, targetProfessionalId: string) {
  if (user.role === 'professional' && user.professionalId !== targetProfessionalId) {
    throw Object.assign(
      new Error('Acceso denegado: un profesional no puede consultar ni modificar la agenda de otro profesional.'),
      { status: 403, code: 'FORBIDDEN_PROFESSIONAL_SCOPE' }
    );
  }
}

// -----------------------------------------------------------------------------
// 2. Rutas Públicas de Reserva y Autogestión con Token Seguro
// -----------------------------------------------------------------------------
app.get('/api/v1/public/:slug/professionals', async (c) => {
  const orgSlug = c.req.param('slug');
  const sql = getSql(c.env);

  const orgs = await sql`
    SELECT id, slug, name, currency, default_timezone
    FROM public.organizations
    WHERE slug = ${orgSlug} AND status = 'active'
    LIMIT 1
  `;

  if (orgs.length === 0) {
    return c.json({ error: 'Núcleo médico no encontrado.' }, 404);
  }

  const org = orgs[0];
  const locations = await sql`
    SELECT id, slug, name, address, timezone, phone
    FROM public.locations
    WHERE organization_id = ${org.id} AND is_active = true
    ORDER BY created_at ASC
  `;

  const professionals = await sql`
    SELECT
      p.id,
      p.slug,
      p.full_name,
      p.specialty,
      p.license_number,
      p.color_hex,
      p.bio,
      p.default_location_id,
      l.name AS location_name,
      l.address AS location_address,
      l.timezone
    FROM public.professionals p
    JOIN public.locations l ON l.id = p.default_location_id AND l.organization_id = p.organization_id
    WHERE p.organization_id = ${org.id}
      AND p.is_public = true
      AND p.is_active = true
    ORDER BY p.created_at ASC
  `;

  const services = await sql`
    SELECT
      id,
      professional_id,
      name,
      description,
      duration_minutes,
      CASE WHEN publish_price THEN price_cents ELSE NULL END AS price_cents,
      currency,
      publish_price
    FROM public.services
    WHERE organization_id = ${org.id}
      AND is_public = true
      AND is_active = true
    ORDER BY price_cents ASC
  `;

  return c.json({
    organization: org,
    locations,
    professionals,
    services,
  });
});

app.get('/api/v1/public/:slug/availability', async (c) => {
  const orgSlug = c.req.param('slug');
  const professionalId = c.req.query('professional_id');
  const serviceId = c.req.query('service_id');
  const dateStr = c.req.query('date');

  if (!professionalId || !serviceId || !dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return c.json(
      { error: 'Parámetros requeridos: professional_id, service_id y date (YYYY-MM-DD).' },
      422
    );
  }

  const sql = getSql(c.env);
  const orgs = await sql`
    SELECT id FROM public.organizations WHERE slug = ${orgSlug} AND status = 'active' LIMIT 1
  `;
  if (orgs.length === 0) {
    return c.json({ error: 'Núcleo no encontrado.' }, 404);
  }

  const result = await computeAvailableSlots(sql, {
    organizationId: orgs[0].id,
    professionalId,
    serviceId,
    dateStr,
  });

  // Nunca exponer nombres ni datos de pacientes en la disponibilidad pública
  return c.json({
    date: dateStr,
    timezone: result.timezone,
    durationMinutes: result.durationMinutes,
    slots: result.slots.map((s) => ({
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      localTimeLabel: s.localTimeLabel,
      localEndTimeLabel: s.localEndTimeLabel,
    })),
  });
});

app.post('/api/v1/public/:slug/bookings', async (c) => {
  const orgSlug = c.req.param('slug');
  const body = await c.req.json<{
    professionalId?: string;
    serviceId?: string;
    startsAt?: string;
    patientName?: string;
    patientPhone?: string;
    patientEmail?: string;
    contactName?: string;
    contactRelationship?: string;
    contactPhone?: string;
    campaignSource?: string;
    policyAccepted?: boolean;
    idempotencyKey?: string;
  }>();

  const headerIdem = c.req.header('Idempotency-Key');
  const idempotencyKey = headerIdem || body.idempotencyKey;

  if (
    !body.professionalId ||
    !body.serviceId ||
    !body.startsAt ||
    !body.patientName?.trim() ||
    !body.patientPhone?.trim() ||
    !idempotencyKey
  ) {
    return c.json(
      {
        error:
          'Datos incompletos: profesional, servicio, horario, nombre, teléfono y clave de idempotencia son obligatorios.',
      },
      422
    );
  }

  if (body.policyAccepted === false) {
    return c.json({ error: 'Debe aceptar el aviso de privacidad y políticas de reserva.' }, 422);
  }

  const sql = getSql(c.env);
  const orgs = await sql`
    SELECT id, name FROM public.organizations WHERE slug = ${orgSlug} AND status = 'active' LIMIT 1
  `;
  if (orgs.length === 0) {
    return c.json({ error: 'Núcleo médico no encontrado.' }, 404);
  }

  const created = await withServiceTransaction(
    async (tx) =>
      createBookingAtomic(tx, {
        organizationId: orgs[0].id,
        professionalId: body.professionalId!,
        serviceId: body.serviceId!,
        startsAtIso: body.startsAt!,
        patientName: body.patientName!,
        patientPhone: body.patientPhone!,
        patientEmail: body.patientEmail,
        contactName: body.contactName,
        contactRelationship: body.contactRelationship,
        contactPhone: body.contactPhone,
        originChannel: 'public_link',
        campaignSource: body.campaignSource || null,
        policyAccepted: true,
        idempotencyKey,
        actorUserId: null,
        actorRole: 'patient',
        actorLabel: 'Paciente (Reserva Pública)',
      }),
    c.env
  );

  // En respuesta pública no devolvemos notas internas ni contadores internos de duplicados
  return c.json(
    {
      booking: {
        id: created.appointment.id,
        folio: created.appointment.folio,
        professionalName: created.appointment.professional_name,
        specialty: created.appointment.professional_specialty,
        serviceName: created.appointment.service_name,
        locationName: created.appointment.location_name,
        startsAt: created.appointment.starts_at,
        endsAt: created.appointment.ends_at,
        localDate: created.appointment.local_date,
        localTime: created.appointment.local_time,
        localEndTime: created.appointment.local_end_time,
        agreedPriceCents: created.appointment.agreed_price_cents,
        currency: created.appointment.currency,
        attendanceStatus: created.appointment.attendance_status,
        version: created.appointment.version,
      },
      managementToken: created.managementToken,
      managementUrl: created.managementUrl,
      idempotentReplay: created.idempotentReplay,
    },
    created.idempotentReplay ? 200 : 201
  );
});

// Verificación de token seguro de gestión de reserva (A22)
async function verifyManagementTokenInDb(tokenRaw: string, env?: ServerEnv) {
  if (!tokenRaw || tokenRaw.trim().length < 10) {
    throw Object.assign(new Error('Token de gestión inválido o ausente.'), {
      status: 401,
      code: 'INVALID_MANAGEMENT_TOKEN',
    });
  }

  const sql = getSql(env);
  const hashed = hashToken(tokenRaw.trim());

  const rows = await sql`
    SELECT
      mt.id AS token_id,
      mt.organization_id,
      mt.appointment_id,
      mt.scopes,
      mt.expires_at,
      mt.revoked_at
    FROM public.management_tokens mt
    WHERE mt.token_hash = ${hashed}
    LIMIT 1
  `;

  if (rows.length === 0) {
    throw Object.assign(new Error('Enlace de gestión no válido o inexistente.'), {
      status: 401,
      code: 'INVALID_MANAGEMENT_TOKEN',
    });
  }

  const tok = rows[0];
  if (tok.revoked_at || new Date(tok.expires_at).getTime() <= Date.now()) {
    throw Object.assign(new Error('El enlace de gestión de esta reserva ha expirado o fue revocado.'), {
      status: 401,
      code: 'EXPIRED_MANAGEMENT_TOKEN',
    });
  }

  return tok;
}

app.post('/api/v1/booking-access/verify', async (c) => {
  const body = await c.req.json<{ token?: string }>();
  const tok = await verifyManagementTokenInDb(body.token || '', c.env);

  const appt = await withServiceTransaction(
    async (tx) => {
      await tx`
        UPDATE public.management_tokens SET last_used_at = now() WHERE id = ${tok.token_id}
      `;
      return getAppointmentById(tx, tok.organization_id, tok.appointment_id);
    },
    c.env
  );

  return c.json({
    booking: {
      id: appt.id,
      folio: appt.folio,
      professionalId: appt.professional_id,
      professionalName: appt.professional_name,
      specialty: appt.professional_specialty,
      serviceId: appt.service_id,
      serviceName: appt.service_name,
      locationName: appt.location_name,
      patientName: appt.patient_name,
      startsAt: appt.starts_at,
      endsAt: appt.ends_at,
      localDate: appt.local_date,
      localTime: appt.local_time,
      localEndTime: appt.local_end_time,
      attendanceStatus: appt.attendance_status,
      financialStatus: appt.financial_status,
      agreedPriceCents: appt.agreed_price_cents,
      balanceCents: appt.balance_cents,
      version: appt.version,
    },
    scopes: tok.scopes,
  });
});

app.post('/api/v1/bookings/:id/confirm', async (c) => {
  const appointmentId = c.req.param('id');
  const body = await c.req.json<{ token?: string }>();
  const tok = await verifyManagementTokenInDb(body.token || '', c.env);

  if (tok.appointment_id !== appointmentId) {
    return c.json({ error: 'El token no corresponde a la cita solicitada.' }, 403);
  }

  const updated = await withServiceTransaction(
    async (tx) =>
      updateAttendanceStatusAtomic(tx, {
        organizationId: tok.organization_id,
        appointmentId,
        newStatus: 'confirmed',
        reason: 'Asistencia confirmada por el paciente mediante enlace seguro',
        actorUserId: null,
        actorRole: 'patient',
        actorLabel: 'Paciente (Autogestión)',
      }),
    c.env
  );

  return c.json({ booking: updated });
});

app.post('/api/v1/bookings/:id/reschedule', async (c) => {
  const appointmentId = c.req.param('id');
  const body = await c.req.json<{
    token?: string;
    newStartsAt?: string;
    expectedVersion?: number;
    reason?: string;
  }>();

  const tok = await verifyManagementTokenInDb(body.token || '', c.env);
  if (tok.appointment_id !== appointmentId) {
    return c.json({ error: 'El token no corresponde a la cita solicitada.' }, 403);
  }

  if (!body.newStartsAt || body.expectedVersion === undefined) {
    return c.json({ error: 'Se requiere newStartsAt y expectedVersion.' }, 422);
  }

  const updated = await withServiceTransaction(
    async (tx) =>
      rescheduleBookingAtomic(tx, {
        organizationId: tok.organization_id,
        appointmentId,
        newStartsAtIso: body.newStartsAt!,
        expectedVersion: Number(body.expectedVersion),
        reason: body.reason || 'Reprogramada por el paciente desde enlace seguro',
        actorUserId: null,
        actorRole: 'patient',
        actorLabel: 'Paciente (Autogestión)',
      }),
    c.env
  );

  return c.json({ booking: updated });
});

app.post('/api/v1/bookings/:id/cancel', async (c) => {
  const appointmentId = c.req.param('id');
  const body = await c.req.json<{
    token?: string;
    reason?: string;
    expectedVersion?: number;
  }>();

  const tok = await verifyManagementTokenInDb(body.token || '', c.env);
  if (tok.appointment_id !== appointmentId) {
    return c.json({ error: 'El token no corresponde a la cita solicitada.' }, 403);
  }

  const updated = await withServiceTransaction(
    async (tx) =>
      cancelBookingAtomic(tx, {
        organizationId: tok.organization_id,
        appointmentId,
        reason: body.reason || 'Cancelada por el paciente desde enlace seguro',
        expectedVersion: body.expectedVersion,
        actorUserId: null,
        actorRole: 'patient',
        actorLabel: 'Paciente (Autogestión)',
      }),
    c.env
  );

  return c.json({ booking: updated });
});

// -----------------------------------------------------------------------------
// 3. Resumen Diario e Indicadores Reales (Inicio / Dashboard)
// -----------------------------------------------------------------------------
app.get('/api/v1/reports/daily', async (c) => {
  const user = c.get('user');
  const dateStr =
    c.req.query('date') || getLocalParts(new Date(), user.timezone).dateString;
  const filterProfId = c.req.query('professional_id') || null;

  if (filterProfId) {
    assertCanAccessProfessional(user, filterProfId);
  }

  const effectiveProfId =
    user.role === 'professional' ? user.professionalId : filterProfId;

  const { dayStartUtc, dayEndUtc } = getLocalDayUtcBounds(dateStr, user.timezone);

  const summary = await withUserRls(
    user.userId,
    async (tx) => {
      const appts = await tx`
        SELECT
          a.id,
          a.professional_id,
          a.attendance_status,
          a.financial_status,
          a.agreed_price_cents,
          COALESCE((
            SELECT SUM(CASE
              WHEN fm.movement_type = 'payment' THEN fm.amount_cents
              WHEN fm.movement_type IN ('refund', 'reversal') THEN -fm.amount_cents
              ELSE 0
            END)
            FROM public.financial_movements fm
            WHERE fm.organization_id = a.organization_id AND fm.appointment_id = a.id
          ), 0) AS net_paid_cents
        FROM public.appointments a
        WHERE a.organization_id = ${user.organizationId}
          AND a.starts_at >= ${dayStartUtc.toISOString()}::timestamptz
          AND a.starts_at < ${dayEndUtc.toISOString()}::timestamptz
          ${effectiveProfId ? tx`AND a.professional_id = ${effectiveProfId}` : tx``}
      `;

      // Ingresos cobrados en esa fecha en las citas autorizadas
      const paymentsRows = await tx`
        SELECT
          COALESCE(SUM(CASE
            WHEN fm.movement_type = 'payment' THEN fm.amount_cents
            WHEN fm.movement_type IN ('refund', 'reversal') THEN -fm.amount_cents
            ELSE 0
          END), 0) AS collected_today_cents
        FROM public.financial_movements fm
        JOIN public.appointments a
          ON a.id = fm.appointment_id
          AND a.organization_id = fm.organization_id
        WHERE fm.organization_id = ${user.organizationId}
          AND a.starts_at >= ${dayStartUtc.toISOString()}::timestamptz
          AND a.starts_at < ${dayEndUtc.toISOString()}::timestamptz
          ${effectiveProfId ? tx`AND a.professional_id = ${effectiveProfId}` : tx``}
      `;

      const rescheduledEvents = await tx`
        SELECT COUNT(*)::int AS cnt
        FROM public.appointment_events ae
        JOIN public.appointments a
          ON a.id = ae.appointment_id
          AND a.organization_id = ae.organization_id
        WHERE ae.organization_id = ${user.organizationId}
          AND ae.event_type = 'rescheduled'
          AND a.starts_at >= ${dayStartUtc.toISOString()}::timestamptz
          AND a.starts_at < ${dayEndUtc.toISOString()}::timestamptz
          ${effectiveProfId ? tx`AND a.professional_id = ${effectiveProfId}` : tx``}
      `;

      const profs = await tx`
        SELECT id, slug, full_name, specialty, color_hex
        FROM public.professionals
        WHERE organization_id = ${user.organizationId}
          AND is_active = true
          ${user.role === 'professional' && user.professionalId ? tx`AND id = ${user.professionalId}` : tx``}
        ORDER BY created_at ASC
      `;

      // Conteos por profesional para las tarjetas "Agendas del equipo"
      const allDayApptsByProf = await tx`
        SELECT
          professional_id,
          COUNT(*) FILTER (WHERE attendance_status <> 'cancelled')::int AS active_cnt,
          COUNT(*) FILTER (WHERE attendance_status = 'completed')::int AS completed_cnt
        FROM public.appointments
        WHERE organization_id = ${user.organizationId}
          AND starts_at >= ${dayStartUtc.toISOString()}::timestamptz
          AND starts_at < ${dayEndUtc.toISOString()}::timestamptz
        GROUP BY professional_id
      `;

      const countsMap = new Map<string, { active: number; completed: number }>();
      for (const r of allDayApptsByProf) {
        countsMap.set(r.professional_id, {
          active: Number(r.active_cnt),
          completed: Number(r.completed_cnt),
        });
      }

      const activeAppts = appts.filter((a) => a.attendance_status !== 'cancelled');
      const toConfirm = activeAppts.filter((a) => a.attendance_status === 'scheduled').length;
      const waiting = activeAppts.filter((a) => a.attendance_status === 'waiting').length;
      const inConsultation = activeAppts.filter(
        (a) => a.attendance_status === 'in_consultation'
      ).length;
      const completed = activeAppts.filter((a) => a.attendance_status === 'completed').length;
      const cancelled = appts.filter((a) => a.attendance_status === 'cancelled').length;
      const noShow = appts.filter((a) => a.attendance_status === 'no_show').length;

      let pendingBalanceCount = 0;
      let pendingBalanceTotalCents = 0;
      for (const a of activeAppts) {
        const bal = Math.max(0, Number(a.agreed_price_cents) - Number(a.net_paid_cents));
        if (bal > 0) {
          pendingBalanceCount++;
          pendingBalanceTotalCents += bal;
        }
      }

      const report: DailySummaryReportDTO = {
        date: dateStr,
        timezone: user.timezone,
        kpis: {
          appointmentsToday: activeAppts.length,
          toConfirm,
          waiting,
          inConsultation,
          completed,
          cancelled,
          noShow,
          collectedTodayCents: Math.max(0, Number(paymentsRows[0]?.collected_today_cents || 0)),
          pendingBalanceCount,
          pendingBalanceTotalCents,
          rescheduledRequestsCount: Number(rescheduledEvents[0]?.cnt || 0),
        },
        teamAgendas: profs.map((p) => ({
          id: p.id,
          slug: p.slug,
          fullName: p.full_name,
          specialty: p.specialty,
          colorHex: p.color_hex,
          appointmentsCount: countsMap.get(p.id)?.active ?? 0,
          completedCount: countsMap.get(p.id)?.completed ?? 0,
        })),
      };

      return report;
    },
    c.env
  );

  return c.json(summary);
});

// -----------------------------------------------------------------------------
// 4. Gestión de Citas (Recepción, Profesional y Administrador)
// -----------------------------------------------------------------------------
app.get('/api/v1/appointments', async (c) => {
  const user = c.get('user');
  const dateStr = c.req.query('date') || getLocalParts(new Date(), user.timezone).dateString;
  const professionalId = c.req.query('professional_id') || null;
  const statusFilter = c.req.query('status') || null;
  const search = c.req.query('search')?.trim() || null;

  if (professionalId) {
    assertCanAccessProfessional(user, professionalId);
  }

  const effectiveProfId =
    user.role === 'professional' ? user.professionalId : professionalId;

  const { dayStartUtc, dayEndUtc } = getLocalDayUtcBounds(dateStr, user.timezone);

  const appointments = await withUserRls(
    user.userId,
    async (tx) => {
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
          ), 0) AS net_paid_cents
        FROM public.appointments a
        JOIN public.locations l ON l.id = a.location_id AND l.organization_id = a.organization_id
        JOIN public.professionals p ON p.id = a.professional_id AND p.organization_id = a.organization_id
        JOIN public.services s ON s.id = a.service_id AND s.organization_id = a.organization_id
        JOIN public.resources r ON r.id = a.resource_id AND r.organization_id = a.organization_id
        JOIN public.patients pat ON pat.id = a.patient_id AND pat.organization_id = a.organization_id
        LEFT JOIN public.patient_contacts pc ON pc.id = a.contact_id AND pc.organization_id = a.organization_id
        WHERE a.organization_id = ${user.organizationId}
          AND a.starts_at >= ${dayStartUtc.toISOString()}::timestamptz
          AND a.starts_at < ${dayEndUtc.toISOString()}::timestamptz
          ${effectiveProfId ? tx`AND a.professional_id = ${effectiveProfId}` : tx``}
          ${statusFilter ? tx`AND a.attendance_status = ${statusFilter}` : tx``}
        ORDER BY a.starts_at ASC
      `;

      let mapped: AppointmentDTO[] = rows.map((row) => {
        const startsParts = getLocalParts(new Date(row.starts_at), row.timezone);
        const endsParts = getLocalParts(new Date(row.ends_at), row.timezone);
        const netPaid = Math.max(0, Number(row.net_paid_cents));
        const agreed = Number(row.agreed_price_cents);
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
          agreed_price_cents: agreed,
          net_paid_cents: netPaid,
          balance_cents: Math.max(0, agreed - netPaid),
          currency: 'MXN',
          origin_channel: row.origin_channel,
          campaign_source: row.campaign_source,
          admin_notes: row.admin_notes,
          cancellation_reason: row.cancellation_reason,
          version: Number(row.version),
          created_at: new Date(row.created_at).toISOString(),
        };
      });

      if (search) {
        const q = search.toLowerCase();
        mapped = mapped.filter(
          (a) =>
            a.patient_name.toLowerCase().includes(q) ||
            a.folio.toLowerCase().includes(q) ||
            a.professional_name.toLowerCase().includes(q) ||
            a.patient_phone.includes(q)
        );
      }

      return mapped;
    },
    c.env
  );

  return c.json({ date: dateStr, appointments });
});

app.get('/api/v1/appointments/:id', async (c) => {
  const user = c.get('user');
  const appointmentId = c.req.param('id');

  const detail = await withUserRls(
    user.userId,
    async (tx) => {
      const appointment = await getAppointmentById(tx, user.organizationId, appointmentId);
      assertCanAccessProfessional(user, appointment.professional_id);

      const events = await tx`
        SELECT id, appointment_id, event_type, previous_state, new_state, reason, actor_label, created_at
        FROM public.appointment_events
        WHERE organization_id = ${user.organizationId}
          AND appointment_id = ${appointmentId}
        ORDER BY created_at DESC
      `;

      const movements = await tx`
        SELECT
          id, organization_id, appointment_id, movement_type, amount_cents, currency,
          payment_method, beneficiary_type, reference_code, notes, related_movement_id,
          recorded_by_label, created_at
        FROM public.financial_movements
        WHERE organization_id = ${user.organizationId}
          AND appointment_id = ${appointmentId}
        ORDER BY created_at ASC
      `;

      const jobs = await tx`
        SELECT id, channel, job_type, scheduled_for, status, attempts, last_error, appointment_version
        FROM public.notification_jobs
        WHERE organization_id = ${user.organizationId}
          AND appointment_id = ${appointmentId}
        ORDER BY scheduled_for ASC
      `;

      return { appointment, events, movements, notificationJobs: jobs };
    },
    c.env
  );

  return c.json(detail);
});

app.post('/api/v1/appointments', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    professionalId?: string;
    serviceId?: string;
    resourceId?: string;
    startsAt?: string;
    patientName?: string;
    patientPhone?: string;
    patientEmail?: string;
    contactName?: string;
    contactRelationship?: string;
    contactPhone?: string;
    originChannel?: OriginChannel;
    campaignSource?: string;
    adminNotes?: string;
    idempotencyKey?: string;
  }>();

  const headerIdem = c.req.header('Idempotency-Key');
  const idempotencyKey = headerIdem || body.idempotencyKey;

  if (
    !body.professionalId ||
    !body.serviceId ||
    !body.startsAt ||
    !body.patientName?.trim() ||
    !body.patientPhone?.trim() ||
    !idempotencyKey
  ) {
    return c.json(
      {
        error:
          'Faltan campos obligatorios: professionalId, serviceId, startsAt, patientName, patientPhone e idempotencyKey.',
      },
      422
    );
  }

  assertCanAccessProfessional(user, body.professionalId);

  const created = await withUserRls(
    user.userId,
    async (tx) =>
      createBookingAtomic(tx, {
        organizationId: user.organizationId,
        professionalId: body.professionalId!,
        serviceId: body.serviceId!,
        resourceIdOverride: body.resourceId || null,
        startsAtIso: body.startsAt!,
        patientName: body.patientName!,
        patientPhone: body.patientPhone!,
        patientEmail: body.patientEmail,
        contactName: body.contactName,
        contactRelationship: body.contactRelationship,
        contactPhone: body.contactPhone,
        originChannel: body.originChannel || 'reception',
        campaignSource: body.campaignSource || null,
        adminNotes: body.adminNotes || null,
        policyAccepted: true,
        idempotencyKey,
        actorUserId: user.userId,
        actorRole: user.role,
        actorLabel: user.fullName,
      }),
    c.env
  );

  return c.json(created, created.idempotentReplay ? 200 : 201);
});

app.post('/api/v1/appointments/:id/reschedule', async (c) => {
  const user = c.get('user');
  const appointmentId = c.req.param('id');
  const body = await c.req.json<{
    newStartsAt?: string;
    newResourceId?: string;
    expectedVersion?: number;
    reason?: string;
  }>();

  if (!body.newStartsAt || body.expectedVersion === undefined) {
    return c.json({ error: 'Se requiere newStartsAt y expectedVersion.' }, 422);
  }

  const updated = await withUserRls(
    user.userId,
    async (tx) => {
      const current = await getAppointmentById(tx, user.organizationId, appointmentId);
      assertCanAccessProfessional(user, current.professional_id);

      return rescheduleBookingAtomic(tx, {
        organizationId: user.organizationId,
        appointmentId,
        newStartsAtIso: body.newStartsAt!,
        newResourceIdOverride: body.newResourceId || null,
        expectedVersion: Number(body.expectedVersion),
        reason: body.reason || 'Reprogramación desde recepción/panel',
        actorUserId: user.userId,
        actorRole: user.role,
        actorLabel: user.fullName,
      });
    },
    c.env
  );

  return c.json({ appointment: updated });
});

app.post('/api/v1/appointments/:id/cancel', async (c) => {
  const user = c.get('user');
  const appointmentId = c.req.param('id');
  const body = await c.req.json<{
    reason?: string;
    expectedVersion?: number;
  }>();

  if (!body.reason?.trim()) {
    return c.json({ error: 'Indique el motivo de cancelación para el registro de auditoría.' }, 422);
  }

  const updated = await withUserRls(
    user.userId,
    async (tx) => {
      const current = await getAppointmentById(tx, user.organizationId, appointmentId);
      assertCanAccessProfessional(user, current.professional_id);

      return cancelBookingAtomic(tx, {
        organizationId: user.organizationId,
        appointmentId,
        reason: body.reason!,
        expectedVersion: body.expectedVersion,
        actorUserId: user.userId,
        actorRole: user.role,
        actorLabel: user.fullName,
      });
    },
    c.env
  );

  return c.json({ appointment: updated });
});

app.post('/api/v1/appointments/:id/status', async (c) => {
  const user = c.get('user');
  const appointmentId = c.req.param('id');
  const body = await c.req.json<{
    status?: AttendanceStatus;
    expectedVersion?: number;
    reason?: string;
  }>();

  if (!body.status) {
    return c.json({ error: 'Especifique el nuevo estado de atención.' }, 422);
  }

  const updated = await withUserRls(
    user.userId,
    async (tx) => {
      const current = await getAppointmentById(tx, user.organizationId, appointmentId);
      assertCanAccessProfessional(user, current.professional_id);

      return updateAttendanceStatusAtomic(tx, {
        organizationId: user.organizationId,
        appointmentId,
        newStatus: body.status!,
        expectedVersion: body.expectedVersion,
        reason: body.reason,
        actorUserId: user.userId,
        actorRole: user.role,
        actorLabel: user.fullName,
      });
    },
    c.env
  );

  return c.json({ appointment: updated });
});

// -----------------------------------------------------------------------------
// 5. Cobros Manuales, Saldos y Reversos Auditables
// -----------------------------------------------------------------------------
app.post('/api/v1/appointments/:id/payments', async (c) => {
  const user = c.get('user');
  const appointmentId = c.req.param('id');

  if (!['admin', 'reception', 'cashier'].includes(user.role)) {
    return c.json({ error: 'Su rol no tiene permiso para registrar cobros.' }, 403);
  }

  const body = await c.req.json<{
    amountCents?: number;
    paymentMethod?: PaymentMethod;
    beneficiaryType?: 'organization' | 'professional';
    referenceCode?: string;
    notes?: string;
    idempotencyKey?: string;
  }>();

  const headerIdem = c.req.header('Idempotency-Key');
  const idempotencyKey = headerIdem || body.idempotencyKey;

  if (!body.amountCents || !body.paymentMethod || !idempotencyKey) {
    return c.json(
      { error: 'Se requiere amountCents, paymentMethod e idempotencyKey.' },
      422
    );
  }

  const res = await withUserRls(
    user.userId,
    async (tx) =>
      recordPaymentAtomic(tx, {
        organizationId: user.organizationId,
        appointmentId,
        amountCents: Number(body.amountCents),
        paymentMethod: body.paymentMethod!,
        beneficiaryType: body.beneficiaryType || 'organization',
        referenceCode: body.referenceCode,
        notes: body.notes,
        idempotencyKey,
        actorUserId: user.userId,
        actorRole: user.role,
        actorLabel: user.fullName,
      }),
    c.env
  );

  return c.json(res, res.idempotentReplay ? 200 : 201);
});

app.post('/api/v1/payments/:id/reversals', async (c) => {
  const user = c.get('user');
  const movementId = c.req.param('id');

  if (user.role !== 'admin') {
    return c.json(
      { error: 'Solo el administrador del núcleo puede autorizar reversos o devoluciones.' },
      403
    );
  }

  const body = await c.req.json<{
    type?: 'reversal' | 'refund';
    amountCents?: number;
    reason?: string;
  }>();

  if (!body.reason?.trim()) {
    return c.json({ error: 'Indique el motivo del reverso o devolución.' }, 422);
  }

  const res = await withUserRls(
    user.userId,
    async (tx) =>
      reverseOrRefundMovementAtomic(tx, {
        organizationId: user.organizationId,
        movementId,
        type: body.type || 'reversal',
        amountCents: body.amountCents ? Number(body.amountCents) : undefined,
        reason: body.reason!,
        actorUserId: user.userId,
        actorRole: user.role,
        actorLabel: user.fullName,
      }),
    c.env
  );

  return c.json(res, 201);
});

app.get('/api/v1/financial-movements', async (c) => {
  const user = c.get('user');
  const dateStr = c.req.query('date') || null;

  const data = await withUserRls(
    user.userId,
    async (tx) => {
      let dateFilter = tx``;
      if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const { dayStartUtc, dayEndUtc } = getLocalDayUtcBounds(dateStr, user.timezone);
        dateFilter = tx`AND fm.created_at >= ${dayStartUtc.toISOString()}::timestamptz AND fm.created_at < ${dayEndUtc.toISOString()}::timestamptz`;
      }

      const movements = await tx`
        SELECT
          fm.id,
          fm.organization_id,
          fm.appointment_id,
          a.folio,
          pat.full_name AS patient_name,
          p.full_name AS professional_name,
          fm.movement_type,
          fm.amount_cents,
          fm.currency,
          fm.payment_method,
          fm.beneficiary_type,
          fm.reference_code,
          fm.notes,
          fm.related_movement_id,
          fm.recorded_by_label,
          fm.created_at
        FROM public.financial_movements fm
        JOIN public.appointments a ON a.id = fm.appointment_id AND a.organization_id = fm.organization_id
        JOIN public.patients pat ON pat.id = a.patient_id AND pat.organization_id = a.organization_id
        JOIN public.professionals p ON p.id = a.professional_id AND p.organization_id = a.organization_id
        WHERE fm.organization_id = ${user.organizationId}
          ${user.role === 'professional' && user.professionalId ? tx`AND a.professional_id = ${user.professionalId}` : tx``}
          ${dateFilter}
        ORDER BY fm.created_at DESC
        LIMIT 200
      `;

      return { movements };
    },
    c.env
  );

  return c.json(data);
});

// -----------------------------------------------------------------------------
// 6. Profesionales, Servicios, Consultorios y Disponibilidad/Bloqueos
// -----------------------------------------------------------------------------
app.get('/api/v1/catalog', async (c) => {
  const user = c.get('user');

  const catalog = await withUserRls(
    user.userId,
    async (tx) => {
      const [organization] = await tx`
        SELECT id, slug, name, currency, default_timezone, settings
        FROM public.organizations
        WHERE id = ${user.organizationId}
      `;

      const locations = await tx`
        SELECT id, slug, name, address, timezone, phone, is_active
        FROM public.locations
        WHERE organization_id = ${user.organizationId}
        ORDER BY created_at ASC
      `;

      const resources = await tx`
        SELECT id, organization_id, location_id, code, name, type, capacity, is_active
        FROM public.resources
        WHERE organization_id = ${user.organizationId}
        ORDER BY code ASC
      `;

      const professionals = await tx`
        SELECT
          p.id,
          p.organization_id,
          p.user_id,
          p.default_location_id,
          p.default_resource_id,
          r.name AS default_resource_name,
          p.slug,
          p.full_name,
          p.specialty,
          p.license_number,
          p.color_hex,
          p.bio,
          p.is_public,
          p.is_active,
          p.whatsapp_instance_name,
          p.whatsapp_status,
          p.whatsapp_phone,
          p.whatsapp_connected_at,
          p.whatsapp_auto_confirm,
          p.whatsapp_auto_reminder_24h,
          p.whatsapp_auto_reminder_1h,
          p.doctoralia_url,
          p.doctoralia_sync_enabled
        FROM public.professionals p
        LEFT JOIN public.resources r ON r.id = p.default_resource_id AND r.organization_id = p.organization_id
        WHERE p.organization_id = ${user.organizationId}
          ${user.role === 'professional' && user.professionalId ? tx`AND p.id = ${user.professionalId}` : tx``}
        ORDER BY p.created_at ASC
      `;

      const services = await tx`
        SELECT
          s.id,
          s.organization_id,
          s.professional_id,
          p.full_name AS professional_name,
          s.default_resource_id,
          r.name AS default_resource_name,
          s.name,
          s.description,
          s.duration_minutes,
          s.buffer_before_minutes,
          s.buffer_after_minutes,
          s.price_cents,
          s.currency,
          s.publish_price,
          s.is_public,
          s.is_active
        FROM public.services s
        JOIN public.professionals p ON p.id = s.professional_id AND p.organization_id = s.organization_id
        LEFT JOIN public.resources r ON r.id = s.default_resource_id AND r.organization_id = s.organization_id
        WHERE s.organization_id = ${user.organizationId}
          ${user.role === 'professional' && user.professionalId ? tx`AND s.professional_id = ${user.professionalId}` : tx``}
        ORDER BY p.created_at ASC, s.name ASC
      `;

      const rules = await tx`
        SELECT
          id,
          organization_id,
          professional_id,
          location_id,
          day_of_week,
          start_local_time::text AS start_local_time,
          end_local_time::text AS end_local_time,
          break_start_local_time::text AS break_start_local_time,
          break_end_local_time::text AS break_end_local_time,
          slot_interval_minutes,
          is_active
        FROM public.availability_rules
        WHERE organization_id = ${user.organizationId}
          ${user.role === 'professional' && user.professionalId ? tx`AND professional_id = ${user.professionalId}` : tx``}
        ORDER BY professional_id, day_of_week ASC
      `;

      const blocks = await tx`
        SELECT
          ex.id,
          ex.organization_id,
          ex.professional_id,
          p.full_name AS professional_name,
          ex.location_id,
          ex.resource_id,
          r.name AS resource_name,
          ex.kind,
          ex.starts_at,
          ex.ends_at,
          ex.reason,
          ex.is_active
        FROM public.availability_exceptions ex
        JOIN public.professionals p ON p.id = ex.professional_id AND p.organization_id = ex.organization_id
        LEFT JOIN public.resources r ON r.id = ex.resource_id AND r.organization_id = ex.organization_id
        WHERE ex.organization_id = ${user.organizationId}
          AND ex.is_active = true
        ORDER BY ex.starts_at DESC
        LIMIT 50
      `;

      const [integrations] = await tx`
        SELECT
          organization_id,
          evolution_api_url,
          evolution_api_key_encrypted,
          confirm_template,
          reschedule_template,
          cancel_template,
          reminder_24h_template,
          reminder_1h_template,
          auto_send_enabled,
          doctoralia_bridge_mode
        FROM public.organization_integrations
        WHERE organization_id = ${user.organizationId}
      `;

      return {
        organization,
        locations,
        resources,
        professionals,
        services,
        availabilityRules: rules,
        availabilityBlocks: blocks,
        integrations: integrations || null,
      };
    },
    c.env
  );

  return c.json(catalog);
});

app.post('/api/v1/services', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    professionalId?: string;
    defaultResourceId?: string;
    name?: string;
    description?: string;
    durationMinutes?: number;
    bufferBeforeMinutes?: number;
    bufferAfterMinutes?: number;
    priceCents?: number;
    publishPrice?: boolean;
  }>();

  if (!body.professionalId || !body.name?.trim() || !body.durationMinutes || body.priceCents === undefined) {
    return c.json({ error: 'Datos de servicio incompletos.' }, 422);
  }

  assertCanAccessProfessional(user, body.professionalId);
  if (user.role === 'reception') {
    return c.json({ error: 'Recepción no tiene permisos para modificar el catálogo de servicios.' }, 403);
  }

  const created = await withUserRls(
    user.userId,
    async (tx) => {
      const [srv] = await tx`
        INSERT INTO public.services (
          organization_id, professional_id, default_resource_id, name, description,
          duration_minutes, buffer_before_minutes, buffer_after_minutes, price_cents, publish_price
        )
        VALUES (
          ${user.organizationId},
          ${body.professionalId!},
          ${body.defaultResourceId || null},
          ${body.name!.trim()},
          ${body.description?.trim() || null},
          ${Number(body.durationMinutes)},
          ${Number(body.bufferBeforeMinutes || 0)},
          ${Number(body.bufferAfterMinutes || 0)},
          ${Number(body.priceCents)},
          ${body.publishPrice !== false}
        )
        RETURNING *
      `;
      return srv;
    },
    c.env
  );

  return c.json({ service: created }, 201);
});

app.patch('/api/v1/services/:id', async (c) => {
  const user = c.get('user');
  const serviceId = c.req.param('id');
  const body = await c.req.json<{
    name?: string;
    durationMinutes?: number;
    bufferBeforeMinutes?: number;
    bufferAfterMinutes?: number;
    priceCents?: number;
    defaultResourceId?: string;
    isActive?: boolean;
  }>();

  if (user.role === 'reception') {
    return c.json({ error: 'Recepción no puede alterar precios ni duración del catálogo.' }, 403);
  }

  const updated = await withUserRls(
    user.userId,
    async (tx) => {
      const existing = await tx`
        SELECT id, professional_id FROM public.services
        WHERE id = ${serviceId} AND organization_id = ${user.organizationId}
        LIMIT 1
      `;
      if (existing.length === 0) {
        throw Object.assign(new Error('Servicio no encontrado.'), { status: 404 });
      }
      assertCanAccessProfessional(user, existing[0].professional_id);

      // Nota A23: Actualizar price_cents en el catálogo NO modifica agreed_price_cents de citas existentes
      const [srv] = await tx`
        UPDATE public.services
        SET
          name = COALESCE(${body.name?.trim() || null}, name),
          duration_minutes = COALESCE(${body.durationMinutes !== undefined ? Number(body.durationMinutes) : null}, duration_minutes),
          buffer_before_minutes = COALESCE(${body.bufferBeforeMinutes !== undefined ? Number(body.bufferBeforeMinutes) : null}, buffer_before_minutes),
          buffer_after_minutes = COALESCE(${body.bufferAfterMinutes !== undefined ? Number(body.bufferAfterMinutes) : null}, buffer_after_minutes),
          price_cents = COALESCE(${body.priceCents !== undefined ? Number(body.priceCents) : null}, price_cents),
          default_resource_id = COALESCE(${body.defaultResourceId || null}, default_resource_id),
          is_active = COALESCE(${body.isActive !== undefined ? body.isActive : null}, is_active),
          updated_at = now()
        WHERE id = ${serviceId} AND organization_id = ${user.organizationId}
        RETURNING *
      `;
      return srv;
    },
    c.env
  );

  return c.json({ service: updated });
});

app.put('/api/v1/availability/rules', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    professionalId?: string;
    dayOfWeek?: number;
    startLocalTime?: string;
    endLocalTime?: string;
    breakStartLocalTime?: string | null;
    breakEndLocalTime?: string | null;
    slotIntervalMinutes?: number;
    isActive?: boolean;
  }>();

  if (
    !body.professionalId ||
    body.dayOfWeek === undefined ||
    !body.startLocalTime ||
    !body.endLocalTime
  ) {
    return c.json({ error: 'Datos de horario semanal incompletos.' }, 422);
  }

  assertCanAccessProfessional(user, body.professionalId);

  const rule = await withUserRls(
    user.userId,
    async (tx) => {
      const [prof] = await tx`
        SELECT default_location_id FROM public.professionals
        WHERE id = ${body.professionalId!} AND organization_id = ${user.organizationId}
      `;
      if (!prof) {
        throw Object.assign(new Error('Profesional no encontrado.'), { status: 404 });
      }

      const existing = await tx`
        SELECT id FROM public.availability_rules
        WHERE organization_id = ${user.organizationId}
          AND professional_id = ${body.professionalId!}
          AND day_of_week = ${Number(body.dayOfWeek)}
        LIMIT 1
      `;

      if (existing.length > 0) {
        const [updated] = await tx`
          UPDATE public.availability_rules
          SET
            start_local_time = ${body.startLocalTime!}::time,
            end_local_time = ${body.endLocalTime!}::time,
            break_start_local_time = ${body.breakStartLocalTime ? body.breakStartLocalTime : null}::time,
            break_end_local_time = ${body.breakEndLocalTime ? body.breakEndLocalTime : null}::time,
            slot_interval_minutes = ${Number(body.slotIntervalMinutes || 30)},
            is_active = ${body.isActive !== false},
            updated_at = now()
          WHERE id = ${existing[0].id}
          RETURNING *
        `;
        return updated;
      } else {
        const [inserted] = await tx`
          INSERT INTO public.availability_rules (
            organization_id, professional_id, location_id, day_of_week,
            start_local_time, end_local_time, break_start_local_time, break_end_local_time,
            slot_interval_minutes, is_active
          )
          VALUES (
            ${user.organizationId},
            ${body.professionalId!},
            ${prof.default_location_id},
            ${Number(body.dayOfWeek)},
            ${body.startLocalTime!}::time,
            ${body.endLocalTime!}::time,
            ${body.breakStartLocalTime ? body.breakStartLocalTime : null}::time,
            ${body.breakEndLocalTime ? body.breakEndLocalTime : null}::time,
            ${Number(body.slotIntervalMinutes || 30)},
            ${body.isActive !== false}
          )
          RETURNING *
        `;
        return inserted;
      }
    },
    c.env
  );

  return c.json({ rule });
});

app.post('/api/v1/availability/blocks', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    professionalId?: string;
    resourceId?: string | null;
    kind?: 'block' | 'vacation' | 'break' | 'meeting';
    startsAt?: string;
    endsAt?: string;
    reason?: string;
  }>();

  if (!body.professionalId || !body.startsAt || !body.endsAt || !body.reason?.trim()) {
    return c.json(
      { error: 'Se requiere professionalId, startsAt, endsAt y motivo (reason).' },
      422
    );
  }

  assertCanAccessProfessional(user, body.professionalId);

  const block = await withUserRls(
    user.userId,
    async (tx) =>
      createAvailabilityBlockAtomic(tx, {
        organizationId: user.organizationId,
        professionalId: body.professionalId!,
        resourceId: body.resourceId,
        kind: body.kind || 'block',
        startsAtIso: body.startsAt!,
        endsAtIso: body.endsAt!,
        reason: body.reason!,
        actorUserId: user.userId,
      }),
    c.env
  );

  return c.json({ block }, 201);
});

// -----------------------------------------------------------------------------
// 7. Directorio de Pacientes y Detección de Teléfonos Compartidos (A20)
// -----------------------------------------------------------------------------
app.get('/api/v1/patients', async (c) => {
  const user = c.get('user');
  const search = c.req.query('search')?.trim() || '';

  const patients = await withUserRls(
    user.userId,
    async (tx) => {
      const rows = await tx`
        SELECT
          pat.id,
          pat.full_name,
          pat.phone_normalized,
          pat.phone_display,
          pat.email,
          pat.notes_admin,
          pat.created_at,
          (
            SELECT COUNT(*)::int
            FROM public.patients p2
            WHERE p2.organization_id = pat.organization_id
              AND p2.phone_normalized = pat.phone_normalized
          ) AS shared_phone_count,
          (
            SELECT COUNT(*)::int
            FROM public.appointments a
            WHERE a.organization_id = pat.organization_id
              AND a.patient_id = pat.id
          ) AS total_appointments
        FROM public.patients pat
        WHERE pat.organization_id = ${user.organizationId}
        ORDER BY pat.created_at DESC
        LIMIT 100
      `;

      if (!search) return rows;
      const q = search.toLowerCase();
      return rows.filter(
        (r) =>
          r.full_name.toLowerCase().includes(q) ||
          r.phone_display.includes(q) ||
          r.phone_normalized.includes(q) ||
          (r.email && r.email.toLowerCase().includes(q))
      );
    },
    c.env
  );

  return c.json({ patients });
});

// -----------------------------------------------------------------------------
// 8. Reportes Operativos y de Marketing con Denominadores Explícitos (Sección 16)
// -----------------------------------------------------------------------------
app.get('/api/v1/reports/metrics', async (c) => {
  const user = c.get('user');
  const fromDate = c.req.query('from') || '2026-10-01';
  const toDate = c.req.query('to') || '2026-10-31';

  const { dayStartUtc: startUtc } = getLocalDayUtcBounds(fromDate, user.timezone);
  const { dayEndUtc: endUtc } = getLocalDayUtcBounds(toDate, user.timezone);

  const metrics = await withUserRls(
    user.userId,
    async (tx) => {
      const appts = await tx`
        SELECT
          a.id,
          a.professional_id,
          p.full_name AS professional_name,
          a.attendance_status,
          a.agreed_price_cents,
          a.origin_channel,
          s.duration_minutes,
          COALESCE((
            SELECT SUM(CASE
              WHEN fm.movement_type = 'payment' THEN fm.amount_cents
              WHEN fm.movement_type IN ('refund', 'reversal') THEN -fm.amount_cents
              ELSE 0
            END)
            FROM public.financial_movements fm
            WHERE fm.organization_id = a.organization_id AND fm.appointment_id = a.id
          ), 0) AS net_paid_cents
        FROM public.appointments a
        JOIN public.professionals p ON p.id = a.professional_id AND p.organization_id = a.organization_id
        JOIN public.services s ON s.id = a.service_id AND s.organization_id = a.organization_id
        WHERE a.organization_id = ${user.organizationId}
          AND a.starts_at >= ${startUtc.toISOString()}::timestamptz
          AND a.starts_at < ${endUtc.toISOString()}::timestamptz
          ${user.role === 'professional' && user.professionalId ? tx`AND a.professional_id = ${user.professionalId}` : tx``}
      `;

      const totalPeriodAppointments = appts.length;
      const completedCount = appts.filter((a) => a.attendance_status === 'completed').length;
      const noShowCount = appts.filter((a) => a.attendance_status === 'no_show').length;
      const cancelledCount = appts.filter((a) => a.attendance_status === 'cancelled').length;
      const resolvedDenominator = completedCount + noShowCount;

      let netCollectedCents = 0;
      let pendingBalanceCents = 0;
      let occupiedMinutes = 0;

      const byOrigin: Record<string, number> = {};
      const byProfessional: Record<
        string,
        {
          professionalName: string;
          total: number;
          completed: number;
          cancelled: number;
          noShow: number;
          collectedCents: number;
          pendingCents: number;
        }
      > = {};

      for (const a of appts) {
        const paid = Math.max(0, Number(a.net_paid_cents));
        const price = Number(a.agreed_price_cents);
        const bal = a.attendance_status === 'cancelled' ? 0 : Math.max(0, price - paid);

        netCollectedCents += paid;
        pendingBalanceCents += bal;

        if (a.attendance_status !== 'cancelled') {
          occupiedMinutes += Number(a.duration_minutes);
        }

        byOrigin[a.origin_channel] = (byOrigin[a.origin_channel] || 0) + 1;

        if (!byProfessional[a.professional_id]) {
          byProfessional[a.professional_id] = {
            professionalName: a.professional_name,
            total: 0,
            completed: 0,
            cancelled: 0,
            noShow: 0,
            collectedCents: 0,
            pendingCents: 0,
          };
        }
        const bp = byProfessional[a.professional_id];
        bp.total++;
        if (a.attendance_status === 'completed') bp.completed++;
        if (a.attendance_status === 'cancelled') bp.cancelled++;
        if (a.attendance_status === 'no_show') bp.noShow++;
        bp.collectedCents += paid;
        bp.pendingCents += bal;
      }

      return {
        period: { from: fromDate, to: toDate, timezone: user.timezone },
        indicators: {
          periodAppointments: totalPeriodAppointments,
          attendanceRatePercent:
            resolvedDenominator > 0 ? Math.round((completedCount / resolvedDenominator) * 100) : 0,
          attendanceNumerator: completedCount,
          attendanceDenominator: resolvedDenominator,
          cancellationRatePercent:
            totalPeriodAppointments > 0
              ? Math.round((cancelledCount / totalPeriodAppointments) * 100)
              : 0,
          cancellationNumerator: cancelledCount,
          cancellationDenominator: totalPeriodAppointments,
          occupiedMinutes,
          netCollectedCents,
          pendingBalanceCents,
        },
        byOrigin,
        byProfessional: Object.values(byProfessional),
      };
    },
    c.env
  );

  return c.json(metrics);
});

// -----------------------------------------------------------------------------
// 9. Cola de Recordatorios y Comunicaciones (Outbox P0 y manejo de fallas A16)
// -----------------------------------------------------------------------------
app.get('/api/v1/communications/jobs', async (c) => {
  const user = c.get('user');
  const jobs = await withUserRls(
    user.userId,
    async (tx) => {
      return tx`
        SELECT
          nj.id,
          nj.appointment_id,
          a.folio,
          pat.full_name AS patient_name,
          p.full_name AS professional_name,
          nj.appointment_version,
          nj.channel,
          nj.job_type,
          nj.scheduled_for,
          nj.status,
          nj.attempts,
          nj.last_error,
          nj.updated_at
        FROM public.notification_jobs nj
        JOIN public.appointments a ON a.id = nj.appointment_id AND a.organization_id = nj.organization_id
        JOIN public.patients pat ON pat.id = a.patient_id AND pat.organization_id = a.organization_id
        JOIN public.professionals p ON p.id = a.professional_id AND p.organization_id = a.organization_id
        WHERE nj.organization_id = ${user.organizationId}
        ORDER BY nj.created_at DESC
        LIMIT 100
      `;
    },
    c.env
  );

  return c.json({ jobs });
});

app.post('/api/v1/communications/jobs/:id/process', async (c) => {
  const user = c.get('user');
  const jobId = c.req.param('id');
  const body = await c.req.json<{ simulateFailure?: boolean }>();

  const result = await withUserRls(
    user.userId,
    async (tx) => {
      const rows = await tx`
        SELECT nj.*, a.attendance_status, a.version AS current_appt_version
        FROM public.notification_jobs nj
        JOIN public.appointments a ON a.id = nj.appointment_id AND a.organization_id = nj.organization_id
        WHERE nj.id = ${jobId} AND nj.organization_id = ${user.organizationId}
        FOR UPDATE
      `;
      if (rows.length === 0) {
        throw Object.assign(new Error('Tarea de comunicación no encontrada.'), { status: 404 });
      }
      const job = rows[0];

      // Antes de enviar, volver a leer estado y versión vigentes (Sección 10 / A17)
      if (
        job.attendance_status === 'cancelled' ||
        Number(job.appointment_version) !== Number(job.current_appt_version)
      ) {
        const [cancelledJob] = await tx`
          UPDATE public.notification_jobs
          SET status = 'cancelled_obsolete', updated_at = now()
          WHERE id = ${jobId}
          RETURNING *
        `;
        return cancelledJob;
      }

      if (body.simulateFailure) {
        // Regla A16: Si falla un proveedor, conservar la cita, registrar el error visible y limitar reintentos
        const nextAttempts = Number(job.attempts) + 1;
        const [failedJob] = await tx`
          UPDATE public.notification_jobs
          SET
            status = 'failed',
            attempts = ${nextAttempts},
            last_error = ${`Proveedor SMTP/Transaccional no disponible (intento ${nextAttempts}/3)`},
            updated_at = now()
          WHERE id = ${jobId}
          RETURNING *
        `;
        return failedJob;
      }

      const [sentJob] = await tx`
        UPDATE public.notification_jobs
        SET
          status = 'sent',
          attempts = attempts + 1,
          last_error = NULL,
          updated_at = now()
        WHERE id = ${jobId}
        RETURNING *
      `;
      return sentJob;
    },
    c.env
  );

  return c.json({ job: result });
});

// Horarios disponibles para Recepción / Reprogramación interna
app.get('/api/v1/availability/slots', async (c) => {
  const user = c.get('user');
  const professionalId = c.req.query('professional_id');
  const serviceId = c.req.query('service_id');
  const dateStr = c.req.query('date');
  const resourceId = c.req.query('resource_id') || null;
  const excludeAppointmentId = c.req.query('exclude_appointment_id') || null;

  if (!professionalId || !serviceId || !dateStr) {
    return c.json({ error: 'Se requiere professional_id, service_id y date.' }, 422);
  }

  assertCanAccessProfessional(user, professionalId);

  const result = await withUserRls(
    user.userId,
    async (tx) =>
      computeAvailableSlots(tx, {
        organizationId: user.organizationId,
        professionalId,
        serviceId,
        dateStr,
        resourceIdOverride: resourceId,
        excludeAppointmentId,
      }),
    c.env
  );

  return c.json(result);
});

// Generar enlace seguro de autogestión para compartir al paciente por WhatsApp manual
app.post('/api/v1/appointments/:id/management-link', async (c) => {
  const user = c.get('user');
  const appointmentId = c.req.param('id');

  const linkData = await withUserRls(
    user.userId,
    async (tx) => {
      const appt = await getAppointmentById(tx, user.organizationId, appointmentId);
      assertCanAccessProfessional(user, appt.professional_id);

      const rawToken = `mgt_${Buffer.from(
        `${appointmentId}:${Date.now()}:${Math.random()}`
      ).toString('base64url')}`;
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

      await tx`
        INSERT INTO public.management_tokens (
          organization_id, appointment_id, token_hash, scopes, expires_at
        )
        VALUES (
          ${user.organizationId},
          ${appointmentId},
          ${tokenHash},
          ARRAY['read', 'confirm', 'reschedule', 'cancel'],
          ${expiresAt.toISOString()}::timestamptz
        )
      `;

      return {
        token: rawToken,
        managementUrl: `/gestionar/${rawToken}`,
        expiresAt: expiresAt.toISOString(),
        folio: appt.folio,
        patientName: appt.patient_name,
        professionalName: appt.professional_name,
        localDate: appt.local_date,
        localTime: appt.local_time,
      };
    },
    c.env
  );

  return c.json(linkData, 201);
});

app.patch('/api/v1/organization/settings', async (c) => {
  const user = c.get('user');
  if (user.role !== 'admin') {
    return c.json({ error: 'Solo el administrador puede modificar la configuración del núcleo.' }, 403);
  }

  const body = await c.req.json<{
    organizationName?: string;
    locationName?: string;
    locationAddress?: string;
    timezone?: string;
    phone?: string;
  }>();

  const updated = await withUserRls(
    user.userId,
    async (tx) => {
      if (body.organizationName?.trim() || body.timezone?.trim()) {
        await tx`
          UPDATE public.organizations
          SET
            name = COALESCE(${body.organizationName?.trim() || null}, name),
            default_timezone = COALESCE(${body.timezone?.trim() || null}, default_timezone),
            updated_at = now()
          WHERE id = ${user.organizationId}
        `;
      }

      if (body.locationName?.trim() || body.locationAddress?.trim() || body.timezone?.trim() || body.phone !== undefined) {
        await tx`
          UPDATE public.locations
          SET
            name = COALESCE(${body.locationName?.trim() || null}, name),
            address = COALESCE(${body.locationAddress?.trim() || null}, address),
            timezone = COALESCE(${body.timezone?.trim() || null}, timezone),
            phone = COALESCE(${body.phone?.trim() || null}, phone),
            updated_at = now()
          WHERE organization_id = ${user.organizationId}
        `;
      }

      const [org] = await tx`SELECT * FROM public.organizations WHERE id = ${user.organizationId}`;
      const [loc] = await tx`SELECT * FROM public.locations WHERE organization_id = ${user.organizationId} LIMIT 1`;
      return { organization: org, location: loc };
    },
    c.env
  );

  return c.json(updated);
});

// -----------------------------------------------------------------------------
// 10. Integración Evolution API (WhatsApp Individual por Especialista) y Doctoralia
// -----------------------------------------------------------------------------
app.get('/api/v1/integrations/settings', async (c) => {
  const user = c.get('user');
  const data = await withUserRls(
    user.userId,
    async (tx) => {
      const [row] = await tx`
        SELECT
          organization_id,
          evolution_api_url,
          evolution_api_key_encrypted,
          confirm_template,
          reschedule_template,
          cancel_template,
          reminder_24h_template,
          reminder_1h_template,
          auto_send_enabled,
          doctoralia_bridge_mode
        FROM public.organization_integrations
        WHERE organization_id = ${user.organizationId}
      `;
      return row || null;
    },
    c.env
  );

  return c.json({ integrations: data, settings: data });
});

app.put('/api/v1/integrations/settings', async (c) => {
  const user = c.get('user');
  if (!['admin', 'reception'].includes(user.role)) {
    return c.json({ error: 'Solo Dirección o la Asistente pueden actualizar la configuración de integraciones.' }, 403);
  }

  const body = await c.req.json<{
    evolutionApiUrl?: string;
    evolutionApiKey?: string;
    confirmTemplate?: string;
    rescheduleTemplate?: string;
    cancelTemplate?: string;
    reminder24hTemplate?: string;
    reminder1hTemplate?: string;
    autoSendEnabled?: boolean;
    doctoraliaBridgeMode?: string;
  }>();

  const updated = await withUserRls(
    user.userId,
    async (tx) => {
      const [row] = await tx`
        INSERT INTO public.organization_integrations (
          organization_id,
          evolution_api_url,
          evolution_api_key_encrypted,
          confirm_template,
          reschedule_template,
          cancel_template,
          reminder_24h_template,
          reminder_1h_template,
          auto_send_enabled,
          doctoralia_bridge_mode,
          updated_at
        )
        VALUES (
          ${user.organizationId},
          ${body.evolutionApiUrl?.trim() || 'https://whatsapp.dragendas.com'},
          ${body.evolutionApiKey?.trim() || ''},
          ${body.confirmTemplate?.trim() || 'Hola {{paciente}}, te saluda tu {{especialista}}. Tu cita de {{servicio}} quedó confirmada para el {{fecha}} a las {{hora}} en {{sede}}. Gestiona o confirma tu asistencia aquí: {{link}}'},
          ${body.rescheduleTemplate?.trim() || 'Hola {{paciente}}, tu cita con {{especialista}} ha sido reprogramada para el {{fecha}} a las {{hora}}.'},
          ${body.cancelTemplate?.trim() || 'Hola {{paciente}}, tu cita con {{especialista}} del {{fecha}} a las {{hora}} ha sido cancelada.'},
          ${body.reminder24hTemplate?.trim() || 'Recordatorio 24h: Hola {{paciente}}, mañana {{fecha}} a las {{hora}} tienes cita con {{especialista}} ({{servicio}}). Confirma tu asistencia en: {{link}}'},
          ${body.reminder1hTemplate?.trim() || 'Recordatorio 1h: Hola {{paciente}}, te esperamos en 1 hora ({{hora}}) para tu consulta con {{especialista}} en {{sede}}.'},
          ${body.autoSendEnabled !== false},
          ${body.doctoraliaBridgeMode || 'email_and_ics'},
          now()
        )
        ON CONFLICT (organization_id) DO UPDATE SET
          evolution_api_url = COALESCE(${body.evolutionApiUrl?.trim() || null}, public.organization_integrations.evolution_api_url),
          evolution_api_key_encrypted = COALESCE(${body.evolutionApiKey !== undefined ? body.evolutionApiKey.trim() : null}, public.organization_integrations.evolution_api_key_encrypted),
          confirm_template = COALESCE(${body.confirmTemplate?.trim() || null}, public.organization_integrations.confirm_template),
          reschedule_template = COALESCE(${body.rescheduleTemplate?.trim() || null}, public.organization_integrations.reschedule_template),
          cancel_template = COALESCE(${body.cancelTemplate?.trim() || null}, public.organization_integrations.cancel_template),
          reminder_24h_template = COALESCE(${body.reminder24hTemplate?.trim() || null}, public.organization_integrations.reminder_24h_template),
          reminder_1h_template = COALESCE(${body.reminder1hTemplate?.trim() || null}, public.organization_integrations.reminder_1h_template),
          auto_send_enabled = COALESCE(${body.autoSendEnabled !== undefined ? body.autoSendEnabled : null}, public.organization_integrations.auto_send_enabled),
          doctoralia_bridge_mode = COALESCE(${body.doctoraliaBridgeMode || null}, public.organization_integrations.doctoralia_bridge_mode),
          updated_at = now()
        RETURNING *
      `;
      return row;
    },
    c.env
  );

  return c.json({ integrations: updated, settings: updated });
});

// Conectar / Obtener QR de WhatsApp de un especialista individual en Evolution API
app.post('/api/v1/professionals/:id/whatsapp/connect', async (c) => {
  const user = c.get('user');
  const professionalId = c.req.param('id');
  assertCanAccessProfessional(user, professionalId);

  const body = await c.req.json<{
    instanceName?: string;
    whatsappPhone?: string;
  }>();

  const result = await withUserRls(
    user.userId,
    async (tx) => {
      const [prof] = await tx`
        SELECT id, slug, full_name, whatsapp_instance_name, whatsapp_phone
        FROM public.professionals
        WHERE id = ${professionalId} AND organization_id = ${user.organizationId}
      `;
      if (!prof) {
        throw Object.assign(new Error('Especialista no encontrada.'), { status: 404 });
      }

      const [integ] = await tx`
        SELECT evolution_api_url, evolution_api_key_encrypted
        FROM public.organization_integrations
        WHERE organization_id = ${user.organizationId}
      `;

      const instanceName =
        body.instanceName?.trim() ||
        prof.whatsapp_instance_name ||
        `consultorio-${prof.slug}`;

      const effectiveApiKey =
        integ?.evolution_api_key_encrypted ||
        (c.env as Record<string, string | undefined>)?.EVOLUTION_API_KEY ||
        (typeof process !== 'undefined' ? process.env.EVOLUTION_API_KEY : '') ||
        'DrAgendas_WA_ClaveSecreta_2026_Demo';

      const evoRes = await connectEvolutionInstance({
        baseUrl: integ?.evolution_api_url || 'https://whatsapp.dragendas.com',
        apiKey: effectiveApiKey,
        instanceName,
      });

      const nextStatus = evoRes.status === 'connected' ? 'connected' : 'qr_ready';
      const [updatedProf] = await tx`
        UPDATE public.professionals
        SET
          whatsapp_instance_name = ${instanceName},
          whatsapp_status = ${nextStatus},
          whatsapp_phone = COALESCE(${body.whatsappPhone?.trim() || null}, whatsapp_phone),
          updated_at = now()
        WHERE id = ${professionalId} AND organization_id = ${user.organizationId}
        RETURNING *
      `;

      return {
        professional: updatedProf,
        evolution: evoRes,
        instanceName: evoRes.instanceName,
        qrCodeBase64: evoRes.qrBase64,
      };
    },
    c.env
  );

  return c.json(result);
});

// Confirmar vinculación de WhatsApp personal o actualizar ajustes de WhatsApp/Doctoralia del especialista
app.post('/api/v1/professionals/:id/whatsapp/confirm-link', async (c) => {
  const user = c.get('user');
  const professionalId = c.req.param('id');
  assertCanAccessProfessional(user, professionalId);

  const body = await c.req.json<{
    status?: 'connected' | 'disconnected' | 'qr_ready';
    whatsappPhone?: string;
    instanceName?: string;
    autoConfirm?: boolean;
    autoReminder24h?: boolean;
    autoReminder1h?: boolean;
    doctoraliaUrl?: string;
    doctoraliaSyncEnabled?: boolean;
  }>();

  const updated = await withUserRls(
    user.userId,
    async (tx) => {
      const [prof] = await tx`
        UPDATE public.professionals
        SET
          whatsapp_status = COALESCE(${body.status || null}, whatsapp_status),
          whatsapp_phone = COALESCE(${body.whatsappPhone?.trim() || null}, whatsapp_phone),
          whatsapp_instance_name = COALESCE(${body.instanceName?.trim() || null}, whatsapp_instance_name),
          whatsapp_connected_at = CASE
            WHEN ${body.status || null} = 'connected' THEN now()
            ELSE whatsapp_connected_at
          END,
          whatsapp_auto_confirm = COALESCE(${body.autoConfirm !== undefined ? body.autoConfirm : null}, whatsapp_auto_confirm),
          whatsapp_auto_reminder_24h = COALESCE(${body.autoReminder24h !== undefined ? body.autoReminder24h : null}, whatsapp_auto_reminder_24h),
          whatsapp_auto_reminder_1h = COALESCE(${body.autoReminder1h !== undefined ? body.autoReminder1h : null}, whatsapp_auto_reminder_1h),
          doctoralia_url = COALESCE(${body.doctoraliaUrl !== undefined ? body.doctoraliaUrl.trim() : null}, doctoralia_url),
          doctoralia_sync_enabled = COALESCE(${body.doctoraliaSyncEnabled !== undefined ? body.doctoraliaSyncEnabled : null}, doctoralia_sync_enabled),
          updated_at = now()
        WHERE id = ${professionalId} AND organization_id = ${user.organizationId}
        RETURNING *
      `;
      if (!prof) {
        throw Object.assign(new Error('Especialista no encontrada.'), { status: 404 });
      }
      return prof;
    },
    c.env
  );

  return c.json({ professional: updated });
});

// Enviar mensaje de prueba o notificación desde la instancia de WhatsApp personal del especialista
app.post('/api/v1/professionals/:id/whatsapp/test', async (c) => {
  const user = c.get('user');
  const professionalId = c.req.param('id');
  assertCanAccessProfessional(user, professionalId);

  const body = await c.req.json<{
    recipientPhone?: string;
    patientName?: string;
    templateType?: 'confirm' | 'reschedule' | 'cancel' | 'reminder_24h' | 'reminder_1h';
  }>();

  const res = await withUserRls(
    user.userId,
    async (tx) => {
      const [prof] = await tx`
        SELECT p.*, l.name AS location_name
        FROM public.professionals p
        JOIN public.locations l ON l.id = p.default_location_id AND l.organization_id = p.organization_id
        WHERE p.id = ${professionalId} AND p.organization_id = ${user.organizationId}
      `;
      if (!prof) {
        throw Object.assign(new Error('Especialista no encontrada.'), { status: 404 });
      }

      const [integ] = await tx`
        SELECT * FROM public.organization_integrations
        WHERE organization_id = ${user.organizationId}
      `;

      const templateType = body.templateType || 'confirm';
      const rawTemplate =
        templateType === 'reschedule'
          ? integ?.reschedule_template
          : templateType === 'cancel'
            ? integ?.cancel_template
            : templateType === 'reminder_24h'
              ? integ?.reminder_24h_template
              : templateType === 'reminder_1h'
                ? integ?.reminder_1h_template
                : integ?.confirm_template;

      const renderedMessage = renderWhatsAppTemplate(
        rawTemplate ||
          'Hola {{paciente}}, te saluda tu {{especialista}}. Tu cita quedó confirmada para el {{fecha}} a las {{hora}} en {{sede}}.',
        {
          paciente: body.patientName?.trim() || 'María Fernanda Soto',
          especialista: prof.full_name,
          especialidad: prof.specialty,
          servicio: `Consulta de ${prof.specialty}`,
          fecha: '17/10/2026',
          hora: '11:00',
          sede: prof.location_name || 'Núcleo Médico Especializado',
          link: 'https://multiagenda.dragendas.com/reservar/nucleo-demo',
        }
      );

      const targetPhone = body.recipientPhone?.trim() || prof.whatsapp_phone || '+525511223344';
      const instanceName = prof.whatsapp_instance_name || `consultorio-${prof.slug}`;

      const effectiveApiKey =
        integ?.evolution_api_key_encrypted ||
        (c.env as Record<string, string | undefined>)?.EVOLUTION_API_KEY ||
        (typeof process !== 'undefined' ? process.env.EVOLUTION_API_KEY : '') ||
        'DrAgendas_WA_ClaveSecreta_2026_Demo';

      const sendResult = await sendEvolutionWhatsAppMessage({
        baseUrl: integ?.evolution_api_url || 'https://whatsapp.dragendas.com',
        apiKey: effectiveApiKey,
        instanceName,
        phoneNormalized: targetPhone,
        text: renderedMessage,
      });

      return {
        sent: sendResult.sent,
        simulated: sendResult.simulated,
        instanceName,
        senderPhone: prof.whatsapp_phone || 'WhatsApp Personal Vinculado',
        recipientPhone: targetPhone,
        renderedMessage,
        providerResponse: sendResult.providerResponse,
      };
    },
    c.env
  );

  return c.json(res);
});

// Simulación / Puente de cita entrante desde Doctoralia hacia la agenda del especialista
app.post('/api/v1/integrations/doctoralia/simulate-booking', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    professionalId?: string;
    date?: string;
    patientName?: string;
    patientPhone?: string;
  }>();

  const targetDate = body.date || getLocalParts(new Date(), user.timezone).dateString;

  const result = await withUserRls(
    user.userId,
    async (tx) => {
      const profId =
        body.professionalId ||
        (user.role === 'professional' ? user.professionalId : null);

      const profRows = await tx`
        SELECT p.*, l.name AS location_name
        FROM public.professionals p
        JOIN public.locations l ON l.id = p.default_location_id AND l.organization_id = p.organization_id
        WHERE p.organization_id = ${user.organizationId}
          ${profId ? tx`AND p.id = ${profId}` : tx``}
        ORDER BY p.created_at ASC
        LIMIT 1
      `;
      if (profRows.length === 0) {
        throw Object.assign(new Error('No se encontró especialista para sincronizar con Doctoralia.'), { status: 404 });
      }
      const prof = profRows[0];

      const [service] = await tx`
        SELECT id, name FROM public.services
        WHERE organization_id = ${user.organizationId} AND professional_id = ${prof.id} AND is_active = true
        ORDER BY created_at ASC
        LIMIT 1
      `;
      if (!service) {
        throw Object.assign(new Error('La especialista no tiene servicios activos configurados.'), { status: 422 });
      }

      const slotsRes = await computeAvailableSlots(tx, {
        organizationId: user.organizationId,
        professionalId: prof.id,
        serviceId: service.id,
        dateStr: targetDate,
      });

      if (slotsRes.slots.length === 0) {
        throw Object.assign(
          new Error(`No hay horarios disponibles el ${targetDate} para reflejar la cita de Doctoralia.`),
          { status: 409, code: 'NO_SLOTS_FOR_DOCTORALIA_SYNC' }
        );
      }

      const chosenSlot = slotsRes.slots[0];
      const patientName = body.patientName?.trim() || 'Lucía Domínguez (Paciente Doctoralia)';
      const patientPhone = body.patientPhone?.trim() || '5566778899';

      const created = await createBookingAtomic(tx, {
        organizationId: user.organizationId,
        professionalId: prof.id,
        serviceId: service.id,
        startsAtIso: chosenSlot.startsAt,
        patientName,
        patientPhone,
        patientEmail: 'paciente.doctoralia@ejemplo.mx',
        originChannel: 'referral',
        campaignSource: 'doctoralia_sync',
        adminNotes: `Cita sincronizada automáticamente desde Doctoralia (${prof.doctoralia_url || 'Perfil Doctoralia'}). Confirmación enviada por WhatsApp desde instancia ${prof.whatsapp_instance_name || prof.slug}.`,
        policyAccepted: true,
        idempotencyKey: `doctoralia-sim-${prof.id}-${chosenSlot.startsAt}-${Date.now()}`,
        actorUserId: user.userId,
        actorRole: user.role,
        actorLabel: 'Puente Doctoralia Sync',
      });

      return {
        appointment: created.appointment,
        whatsappDispatchedFrom: prof.whatsapp_instance_name || `consultorio-${prof.slug}`,
        specialistPhone: prof.whatsapp_phone || '+525500000000',
      };
    },
    c.env
  );

  return c.json(result, 201);
});

// -----------------------------------------------------------------------------
// 11. Expedientes Clínicos Individuales por Especialista (Aislamiento Estricto RLS)
// -----------------------------------------------------------------------------
app.get('/api/v1/clinical-records', async (c) => {
  const user = c.get('user');
  if (user.role === 'reception') {
    return c.json(
      {
        error:
          'Por privacidad médica (NOM-004 / RLS), la Asistente controla la agenda y cobros pero no tiene acceso a las notas clínicas privadas de cada especialista.',
        code: 'FORBIDDEN_CLINICAL_RECORDS_FOR_ASSISTANT',
      },
      403
    );
  }

  const patientId = c.req.query('patient_id') || null;
  const professionalId = c.req.query('professional_id') || null;

  if (professionalId) {
    assertCanAccessProfessional(user, professionalId);
  }

  const effectiveProfId =
    user.role === 'professional' ? user.professionalId : professionalId;

  const records = await withUserRls(
    user.userId,
    async (tx) => {
      return tx`
        SELECT
          cr.id,
          cr.organization_id,
          cr.patient_id,
          pat.full_name AS patient_name,
          pat.phone_display AS patient_phone,
          cr.professional_id,
          p.full_name AS professional_name,
          p.specialty AS professional_specialty,
          cr.appointment_id,
          cr.specialty_type,
          cr.chief_complaint,
          cr.evolution_notes,
          COALESCE(cr.subjective_notes, cr.evolution_notes) AS subjective_notes,
          cr.objective_notes,
          cr.diagnosis,
          cr.treatment_plan,
          cr.vital_signs,
          cr.specialty_data,
          cr.created_at,
          cr.updated_at
        FROM public.clinical_records cr
        JOIN public.patients pat ON pat.id = cr.patient_id AND pat.organization_id = cr.organization_id
        JOIN public.professionals p ON p.id = cr.professional_id AND p.organization_id = cr.organization_id
        WHERE cr.organization_id = ${user.organizationId}
          ${effectiveProfId ? tx`AND cr.professional_id = ${effectiveProfId}` : tx``}
          ${patientId ? tx`AND cr.patient_id = ${patientId}` : tx``}
        ORDER BY cr.created_at DESC
        LIMIT 100
      `;
    },
    c.env
  );

  return c.json({ records });
});

app.post('/api/v1/clinical-records', async (c) => {
  const user = c.get('user');
  if (user.role === 'reception') {
    return c.json(
      {
        error: 'La Asistente no puede crear ni editar notas de expediente clínico.',
        code: 'FORBIDDEN_CLINICAL_RECORDS_FOR_ASSISTANT',
      },
      403
    );
  }

  const body = await c.req.json<{
    patientId?: string;
    professionalId?: string;
    appointmentId?: string | null;
    specialtyType?: string;
    chiefComplaint?: string;
    subjectiveNotes?: string;
    objectiveNotes?: string;
    diagnosis?: string;
    treatmentPlan?: string;
    vitalSigns?: Record<string, string | number>;
    specialtyData?: Record<string, string | number>;
  }>();

  const targetProfId =
    user.role === 'professional' ? user.professionalId : body.professionalId;

  if (!body.patientId || !targetProfId || !body.chiefComplaint?.trim()) {
    return c.json(
      { error: 'Seleccione paciente, especialista y motivo de consulta (chiefComplaint).' },
      422
    );
  }

  assertCanAccessProfessional(user, targetProfId);

  const created = await withUserRls(
    user.userId,
    async (tx) => {
      const [rec] = await tx`
        INSERT INTO public.clinical_records (
          organization_id,
          patient_id,
          professional_id,
          appointment_id,
          specialty_type,
          chief_complaint,
          evolution_notes,
          subjective_notes,
          objective_notes,
          diagnosis,
          treatment_plan,
          vital_signs,
          specialty_data,
          created_by
        )
        VALUES (
          ${user.organizationId},
          ${body.patientId!},
          ${targetProfId!},
          ${body.appointmentId || null},
          ${body.specialtyType || 'general'},
          ${body.chiefComplaint!.trim()},
          ${body.subjectiveNotes?.trim() || ''},
          ${body.subjectiveNotes?.trim() || null},
          ${body.objectiveNotes?.trim() || null},
          ${body.diagnosis?.trim() || null},
          ${body.treatmentPlan?.trim() || null},
          ${JSON.stringify(body.vitalSigns || {})}::jsonb,
          ${JSON.stringify(body.specialtyData || {})}::jsonb,
          ${user.userId}
        )
        RETURNING *
      `;
      return rec;
    },
    c.env
  );

  return c.json({ record: created }, 201);
});


