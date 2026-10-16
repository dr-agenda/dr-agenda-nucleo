import type { Sql, TransactionSql } from 'postgres';
import { getLocalDayUtcBounds, getLocalParts, localDateTimeToUtc } from '../shared/timezone';
import type { AvailableSlotDTO } from '../shared/types';

export interface ComputeAvailabilityParams {
  organizationId: string;
  professionalId: string;
  serviceId: string;
  dateStr: string; // YYYY-MM-DD in location's timezone
  resourceIdOverride?: string | null;
  excludeAppointmentId?: string | null;
}

export async function computeAvailableSlots(
  db: Sql | TransactionSql,
  params: ComputeAvailabilityParams
): Promise<{
  timezone: string;
  locationId: string;
  resourceId: string;
  resourceName: string;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  agreedPriceCents: number;
  slots: AvailableSlotDTO[];
}> {
  const { organizationId, professionalId, serviceId, dateStr, resourceIdOverride, excludeAppointmentId } =
    params;

  // 1. Obtener profesional, sede y servicio
  const profRows = await db`
    SELECT
      p.id AS professional_id,
      p.is_active AS prof_active,
      p.default_location_id,
      p.default_resource_id AS prof_resource_id,
      l.timezone,
      s.id AS service_id,
      s.duration_minutes,
      s.buffer_before_minutes,
      s.buffer_after_minutes,
      s.price_cents,
      s.default_resource_id AS srv_resource_id,
      s.is_active AS srv_active
    FROM public.professionals p
    JOIN public.locations l
      ON l.id = p.default_location_id
      AND l.organization_id = p.organization_id
    JOIN public.services s
      ON s.id = ${serviceId}
      AND s.professional_id = p.id
      AND s.organization_id = p.organization_id
    WHERE p.id = ${professionalId}
      AND p.organization_id = ${organizationId}
    LIMIT 1
  `;

  if (profRows.length === 0) {
    throw Object.assign(new Error('Profesional o servicio no encontrado en este núcleo.'), {
      status: 404,
    });
  }

  const info = profRows[0];
  if (!info.prof_active || !info.srv_active) {
    return {
      timezone: info.timezone,
      locationId: info.default_location_id,
      resourceId: resourceIdOverride || info.srv_resource_id || info.prof_resource_id,
      resourceName: 'Inactivo',
      durationMinutes: Number(info.duration_minutes),
      bufferBeforeMinutes: Number(info.buffer_before_minutes),
      bufferAfterMinutes: Number(info.buffer_after_minutes),
      agreedPriceCents: Number(info.price_cents),
      slots: [],
    };
  }

  const targetResourceId: string =
    resourceIdOverride || info.srv_resource_id || info.prof_resource_id;

  const resRows = await db`
    SELECT id, name, is_active
    FROM public.resources
    WHERE id = ${targetResourceId}
      AND organization_id = ${organizationId}
    LIMIT 1
  `;

  if (resRows.length === 0 || !resRows[0].is_active) {
    throw Object.assign(new Error('Consultorio o recurso requerido no disponible.'), {
      status: 422,
    });
  }

  const resourceName: string = resRows[0].name;
  const timezone: string = info.timezone;
  const locationId: string = info.default_location_id;
  const durationMinutes = Number(info.duration_minutes);
  const bufferBeforeMinutes = Number(info.buffer_before_minutes);
  const bufferAfterMinutes = Number(info.buffer_after_minutes);
  const agreedPriceCents = Number(info.price_cents);

  const { dayStartUtc, dayEndUtc, weekday } = getLocalDayUtcBounds(dateStr, timezone);

  // 2. Obtener reglas de horario semanal para ese día de la semana
  const rules = await db`
    SELECT
      start_local_time::text AS start_local_time,
      end_local_time::text AS end_local_time,
      break_start_local_time::text AS break_start_local_time,
      break_end_local_time::text AS break_end_local_time,
      slot_interval_minutes
    FROM public.availability_rules
    WHERE organization_id = ${organizationId}
      AND professional_id = ${professionalId}
      AND location_id = ${locationId}
      AND day_of_week = ${weekday}
      AND is_active = true
    ORDER BY start_local_time ASC
  `;

  if (rules.length === 0) {
    return {
      timezone,
      locationId,
      resourceId: targetResourceId,
      resourceName,
      durationMinutes,
      bufferBeforeMinutes,
      bufferAfterMinutes,
      agreedPriceCents,
      slots: [],
    };
  }

  // 3. Obtener ocupaciones activas (citas y bloqueos del profesional O del consultorio compartido)
  const reservations = await db`
    SELECT
      starts_at,
      ends_at,
      appointment_id
    FROM public.resource_reservations
    WHERE organization_id = ${organizationId}
      AND status = 'active'
      AND (professional_id = ${professionalId} OR resource_id = ${targetResourceId})
      AND starts_at < ${dayEndUtc.toISOString()}::timestamptz
      AND ends_at > ${dayStartUtc.toISOString()}::timestamptz
  `;

  const exceptions = await db`
    SELECT
      starts_at,
      ends_at
    FROM public.availability_exceptions
    WHERE organization_id = ${organizationId}
      AND is_active = true
      AND (professional_id = ${professionalId} OR resource_id = ${targetResourceId})
      AND starts_at < ${dayEndUtc.toISOString()}::timestamptz
      AND ends_at > ${dayStartUtc.toISOString()}::timestamptz
  `;

  const busyIntervals: Array<{ startMs: number; endMs: number }> = [];

  for (const r of reservations) {
    if (excludeAppointmentId && r.appointment_id === excludeAppointmentId) {
      continue;
    }
    busyIntervals.push({
      startMs: new Date(r.starts_at).getTime(),
      endMs: new Date(r.ends_at).getTime(),
    });
  }

  for (const ex of exceptions) {
    busyIntervals.push({
      startMs: new Date(ex.starts_at).getTime(),
      endMs: new Date(ex.ends_at).getTime(),
    });
  }

  // 4. Generar candidatos por cada regla semanal y filtrar por jornada, comida, márgenes y ocupaciones
  const slots: AvailableSlotDTO[] = [];

  for (const rule of rules) {
    const shiftStartUtc = localDateTimeToUtc(dateStr, rule.start_local_time, timezone);
    const shiftEndUtc = localDateTimeToUtc(dateStr, rule.end_local_time, timezone);
    const intervalMs = Number(rule.slot_interval_minutes) * 60 * 1000;

    let breakStartMs: number | null = null;
    let breakEndMs: number | null = null;
    if (rule.break_start_local_time && rule.break_end_local_time) {
      breakStartMs = localDateTimeToUtc(dateStr, rule.break_start_local_time, timezone).getTime();
      breakEndMs = localDateTimeToUtc(dateStr, rule.break_end_local_time, timezone).getTime();
    }

    for (
      let cursorMs = shiftStartUtc.getTime();
      cursorMs < shiftEndUtc.getTime();
      cursorMs += intervalMs
    ) {
      const apptStartMs = cursorMs;
      const apptEndMs = apptStartMs + durationMinutes * 60 * 1000;
      const occupiedStartMs = apptStartMs - bufferBeforeMinutes * 60 * 1000;
      const occupiedEndMs = apptEndMs + bufferAfterMinutes * 60 * 1000;

      // Regla A08: El servicio completo y sus márgenes deben caber dentro de la jornada permitida
      if (occupiedStartMs < shiftStartUtc.getTime() || occupiedEndMs > shiftEndUtc.getTime()) {
        continue;
      }

      // Verificar que no cruce el horario de comida/descanso [breakStartMs, breakEndMs)
      if (
        breakStartMs !== null &&
        breakEndMs !== null &&
        occupiedStartMs < breakEndMs &&
        occupiedEndMs > breakStartMs
      ) {
        continue;
      }

      // Verificar que no choque con ninguna reserva activa ni bloqueo [startMs, endMs)
      const hasOverlap = busyIntervals.some(
        (b) => occupiedStartMs < b.endMs && occupiedEndMs > b.startMs
      );
      if (hasOverlap) {
        continue;
      }

      const startParts = getLocalParts(new Date(apptStartMs), timezone);
      const endParts = getLocalParts(new Date(apptEndMs), timezone);

      slots.push({
        startsAt: new Date(apptStartMs).toISOString(),
        endsAt: new Date(apptEndMs).toISOString(),
        localTimeLabel: startParts.timeString,
        localEndTimeLabel: endParts.timeString,
        resourceId: targetResourceId,
        resourceName,
      });
    }
  }

  return {
    timezone,
    locationId,
    resourceId: targetResourceId,
    resourceName,
    durationMinutes,
    bufferBeforeMinutes,
    bufferAfterMinutes,
    agreedPriceCents,
    slots,
  };
}

/**
 * Verifica en el servidor si un instante de inicio específico `startsAtIso` es válido
 * dentro de la jornada laboral y libre de conflictos.
 */
export async function validateSlotInSchedule(
  db: Sql | TransactionSql,
  params: {
    organizationId: string;
    professionalId: string;
    serviceId: string;
    startsAtIso: string;
    resourceIdOverride?: string | null;
    excludeAppointmentId?: string | null;
  }
): Promise<{
  timezone: string;
  locationId: string;
  resourceId: string;
  resourceName: string;
  startsAtUtc: Date;
  endsAtUtc: Date;
  occupiedStartsAtUtc: Date;
  occupiedEndsAtUtc: Date;
  agreedPriceCents: number;
  localDateStr: string;
  availableAlternatives: AvailableSlotDTO[];
}> {
  const startsAtUtc = new Date(params.startsAtIso);
  if (Number.isNaN(startsAtUtc.getTime())) {
    throw Object.assign(new Error('Fecha/hora de inicio inválida.'), { status: 422 });
  }

  // Consultar zona horaria de la sede del profesional
  const locRow = await db`
    SELECT l.timezone
    FROM public.professionals p
    JOIN public.locations l ON l.id = p.default_location_id AND l.organization_id = p.organization_id
    WHERE p.id = ${params.professionalId}
      AND p.organization_id = ${params.organizationId}
    LIMIT 1
  `;
  if (locRow.length === 0) {
    throw Object.assign(new Error('Profesional no encontrado.'), { status: 404 });
  }

  const timezone: string = locRow[0].timezone;
  const localParts = getLocalParts(startsAtUtc, timezone);

  const computed = await computeAvailableSlots(db, {
    organizationId: params.organizationId,
    professionalId: params.professionalId,
    serviceId: params.serviceId,
    dateStr: localParts.dateString,
    resourceIdOverride: params.resourceIdOverride,
    excludeAppointmentId: params.excludeAppointmentId,
  });

  const endsAtUtc = new Date(startsAtUtc.getTime() + computed.durationMinutes * 60 * 1000);
  const occupiedStartsAtUtc = new Date(
    startsAtUtc.getTime() - computed.bufferBeforeMinutes * 60 * 1000
  );
  const occupiedEndsAtUtc = new Date(
    endsAtUtc.getTime() + computed.bufferAfterMinutes * 60 * 1000
  );

  // Validar que coincida con un horario disponible dentro de la jornada y sin conflictos
  const matchingSlot = computed.slots.find(
    (s) => new Date(s.startsAt).getTime() === startsAtUtc.getTime()
  );

  if (!matchingSlot) {
    // Determinar si está fuera de jornada (A08) o si está ocupado por otra cita/recurso/bloqueo
    const { weekday } = getLocalDayUtcBounds(localParts.dateString, timezone);
    const rules = await db`
      SELECT
        start_local_time::text AS start_local_time,
        end_local_time::text AS end_local_time,
        break_start_local_time::text AS break_start_local_time,
        break_end_local_time::text AS break_end_local_time
      FROM public.availability_rules
      WHERE organization_id = ${params.organizationId}
        AND professional_id = ${params.professionalId}
        AND location_id = ${computed.locationId}
        AND day_of_week = ${weekday}
        AND is_active = true
    `;

    let fitsInShift = false;
    for (const r of rules) {
      const shiftStart = localDateTimeToUtc(localParts.dateString, r.start_local_time, timezone);
      const shiftEnd = localDateTimeToUtc(localParts.dateString, r.end_local_time, timezone);
      let crossesBreak = false;
      if (r.break_start_local_time && r.break_end_local_time) {
        const bStart = localDateTimeToUtc(localParts.dateString, r.break_start_local_time, timezone);
        const bEnd = localDateTimeToUtc(localParts.dateString, r.break_end_local_time, timezone);
        if (occupiedStartsAtUtc < bEnd && occupiedEndsAtUtc > bStart) {
          crossesBreak = true;
        }
      }
      if (occupiedStartsAtUtc >= shiftStart && occupiedEndsAtUtc <= shiftEnd && !crossesBreak) {
        fitsInShift = true;
      }
    }

    if (!fitsInShift) {
      throw Object.assign(
        new Error(
          'El horario solicitado o la duración total del servicio excede la jornada laboral o cruza el horario de descanso del profesional.'
        ),
        {
          status: 422,
          code: 'OUTSIDE_WORKING_HOURS',
          availableSlots: computed.slots,
        }
      );
    }

    throw Object.assign(
      new Error(
        'Conflicto de horario: el profesional o el consultorio ya se encuentran ocupados o bloqueados en ese intervalo.'
      ),
      {
        status: 409,
        code: 'SLOT_CONFLICT',
        availableSlots: computed.slots,
      }
    );
  }

  return {
    timezone,
    locationId: computed.locationId,
    resourceId: computed.resourceId,
    resourceName: computed.resourceName,
    startsAtUtc,
    endsAtUtc,
    occupiedStartsAtUtc,
    occupiedEndsAtUtc,
    agreedPriceCents: computed.agreedPriceCents,
    localDateStr: localParts.dateString,
    availableAlternatives: computed.slots,
  };
}
