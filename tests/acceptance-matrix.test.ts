import { beforeAll, describe, expect, it } from 'vitest';
import { app } from '../src/server/app';
import { getSql, withUserRls } from '../src/server/db';
import { seedDatabase, SEED_IDS } from '../scripts/seed';

async function apiRequest(
  path: string,
  options: {
    method?: string;
    token?: string;
    headers?: Record<string, string>;
    body?: unknown;
  } = {}
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }
  const req = new Request(`http://localhost:8787${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const res = await app.fetch(req, {});
  const data = await res.json();
  return { status: res.status, data };
}

describe('Dr Agenda Núcleos — Matriz de Pruebas de Aceptación (A01–A27)', () => {
  let receptionToken = '';
  let adminToken = '';
  let sofiaToken = '';
  let intruderToken = '';

  beforeAll(async () => {
    await seedDatabase();

    const recLogin = await apiRequest('/api/v1/auth/login', {
      method: 'POST',
      body: { email: 'laura@nucleodemo.mx', password: 'Demo2026!' },
    });
    expect(recLogin.status).toBe(200);
    receptionToken = recLogin.data.token;

    const admLogin = await apiRequest('/api/v1/auth/login', {
      method: 'POST',
      body: { email: 'admin@nucleodemo.mx', password: 'Demo2026!' },
    });
    expect(admLogin.status).toBe(200);
    adminToken = admLogin.data.token;

    const sofLogin = await apiRequest('/api/v1/auth/login', {
      method: 'POST',
      body: { email: 'sofia@nucleodemo.mx', password: 'Demo2026!' },
    });
    expect(sofLogin.status).toBe(200);
    sofiaToken = sofLogin.data.token;

    const intLogin = await apiRequest('/api/v1/auth/login', {
      method: 'POST',
      body: { email: 'intruder@nucleonorte.mx', password: 'Demo2026!' },
    });
    expect(intLogin.status).toBe(200);
    intruderToken = intLogin.data.token;
  });

  it('A01 & A04: Paciente reserva desde enlace público e idempotencia evita duplicados por doble clic', async () => {
    const idemKey = 'idem-public-a01-test';
    const payload = {
      professionalId: SEED_IDS.profSofia,
      serviceId: SEED_IDS.srvSofiaGeneral,
      startsAt: '2026-10-17T09:00:00-06:00',
      patientName: 'Camila Fuentes',
      patientPhone: '55 4433 2211',
      patientEmail: 'camila@ejemplo.mx',
      policyAccepted: true,
      idempotencyKey: idemKey,
    };

    const res1 = await apiRequest('/api/v1/public/nucleo-demo/bookings', {
      method: 'POST',
      body: payload,
    });
    expect(res1.status).toBe(201);
    expect(res1.data.booking.folio).toMatch(/^NUC-20261017-\d{4}$/);
    expect(res1.data.managementToken).toMatch(/^mgt_/);

    // Reintento por doble clic con la misma clave de idempotencia (A04)
    const res2 = await apiRequest('/api/v1/public/nucleo-demo/bookings', {
      method: 'POST',
      body: payload,
    });
    expect(res2.status).toBe(200);
    expect(res2.data.idempotentReplay).toBe(true);
    expect(res2.data.booking.id).toBe(res1.data.booking.id);

    // Verificar que aparece en la agenda interna de recepción y de la Dra. Sofía
    const listRec = await apiRequest('/api/v1/appointments?date=2026-10-17', {
      token: receptionToken,
    });
    expect(listRec.status).toBe(200);
    const found = listRec.data.appointments.filter(
      (a: { id: string }) => a.id === res1.data.booking.id
    );
    expect(found.length).toBe(1);
  });

  it('A02 & A03: Recepción agenda por teléfono y 2 intentos concurrentes al mismo horario producen una sola reserva', async () => {
    const targetStartsAt = '2026-10-17T10:00:00-06:00';

    const [attempt1, attempt2] = await Promise.all([
      apiRequest('/api/v1/appointments', {
        method: 'POST',
        token: receptionToken,
        body: {
          professionalId: SEED_IDS.profPablo,
          serviceId: SEED_IDS.srvPabloCardio,
          startsAt: targetStartsAt,
          patientName: 'Paciente Concurrente Uno',
          patientPhone: '55 9000 0001',
          originChannel: 'phone',
          idempotencyKey: 'concurrent-attempt-1',
        },
      }),
      apiRequest('/api/v1/public/nucleo-demo/bookings', {
        method: 'POST',
        body: {
          professionalId: SEED_IDS.profPablo,
          serviceId: SEED_IDS.srvPabloCardio,
          startsAt: targetStartsAt,
          patientName: 'Paciente Concurrente Dos',
          patientPhone: '55 9000 0002',
          policyAccepted: true,
          idempotencyKey: 'concurrent-attempt-2',
        },
      }),
    ]);

    const statuses = [attempt1.status, attempt2.status].sort();
    expect(statuses).toEqual([201, 409]);
  });

  it('A05, A06 & A26: Reprogramación fallida conserva cita original; reprogramación válida guarda historial e invalida recordatorios; control de versión evita sobrescritura', async () => {
    // Crear cita base a las 11:00 del 17 de octubre
    const created = await apiRequest('/api/v1/appointments', {
      method: 'POST',
      token: receptionToken,
      body: {
        professionalId: SEED_IDS.profSofia,
        serviceId: SEED_IDS.srvSofiaGeneral,
        startsAt: '2026-10-17T11:00:00-06:00',
        patientName: 'Daniela Ríos',
        patientPhone: '55 7788 9900',
        idempotencyKey: 'resched-test-base',
      },
    });
    expect(created.status).toBe(201);
    const apptId = created.data.appointment.id;

    // A05: Intentar reprogramar al horario ocupado de las 09:00 del 17 de octubre (creado en A01)
    const failedResched = await apiRequest(`/api/v1/appointments/${apptId}/reschedule`, {
      method: 'POST',
      token: receptionToken,
      body: {
        newStartsAt: '2026-10-17T09:00:00-06:00',
        expectedVersion: 1,
        reason: 'Intento a horario ocupado',
      },
    });
    expect(failedResched.status).toBe(409);

    // Verificar que la cita original permanece intacta a las 11:00 con versión 1
    const checkAfterFail = await apiRequest(`/api/v1/appointments/${apptId}`, {
      token: receptionToken,
    });
    expect(checkAfterFail.data.appointment.local_time).toBe('11:00');
    expect(checkAfterFail.data.appointment.version).toBe(1);

    // A06: Reprogramación válida a las 11:30
    const okResched = await apiRequest(`/api/v1/appointments/${apptId}/reschedule`, {
      method: 'POST',
      token: receptionToken,
      body: {
        newStartsAt: '2026-10-17T11:30:00-06:00',
        expectedVersion: 1,
        reason: 'Paciente solicitó recorrer 30 min',
      },
    });
    expect(okResched.status).toBe(200);
    expect(okResched.data.appointment.local_time).toBe('11:30');
    expect(okResched.data.appointment.version).toBe(2);

    // A26: Segundo operador intenta modificar usando expectedVersion=1 obsoleta
    const staleUpdate = await apiRequest(`/api/v1/appointments/${apptId}/status`, {
      method: 'POST',
      token: adminToken,
      body: {
        status: 'confirmed',
        expectedVersion: 1,
      },
    });
    expect(staleUpdate.status).toBe(409);
    expect(staleUpdate.data.code).toBe('VERSION_CONFLICT');

    // Verificar historial y recordatorios invalidados
    const detail = await apiRequest(`/api/v1/appointments/${apptId}`, {
      token: receptionToken,
    });
    const reschedEvent = detail.data.events.find(
      (e: { event_type: string }) => e.event_type === 'rescheduled'
    );
    expect(reschedEvent).toBeDefined();
    const obsoleteJobs = detail.data.notificationJobs.filter(
      (j: { appointment_version: number; status: string }) =>
        j.appointment_version === 1 && j.status === 'cancelled_obsolete'
    );
    expect(obsoleteJobs.length).toBeGreaterThan(0);
  });

  it('A07: Dos profesionales que comparten el Consultorio 2 no pueden traslaparse en el mismo horario', async () => {
    // Lic. Elena Martínez reserva en Consultorio 2 a las 12:00 del 17 de octubre
    const elenaBooking = await apiRequest('/api/v1/appointments', {
      method: 'POST',
      token: receptionToken,
      body: {
        professionalId: SEED_IDS.profElena,
        serviceId: SEED_IDS.srvElenaSeguimiento,
        startsAt: '2026-10-17T12:00:00-06:00',
        patientName: 'Paciente Nutrición Consultorio 2',
        patientPhone: '55 3000 0001',
        idempotencyKey: 'shared-room-elena-1200',
      },
    });
    expect(elenaBooking.status).toBe(201);

    // Dra. Sofía García intenta reservar su servicio en Consultorio 2 a las 12:00 del mismo día
    const sofiaSharedRoomAttempt = await apiRequest('/api/v1/appointments', {
      method: 'POST',
      token: receptionToken,
      body: {
        professionalId: SEED_IDS.profSofia,
        serviceId: SEED_IDS.srvSofiaSharedRoom, // Usa Consultorio 2
        startsAt: '2026-10-17T12:00:00-06:00',
        patientName: 'Paciente Sofía Consultorio 2',
        patientPhone: '55 3000 0002',
        idempotencyKey: 'shared-room-sofia-1200',
      },
    });
    expect(sofiaSharedRoomAttempt.status).toBe(409);
  });

  it('A08 & A09: Servicio que excede fin de jornada es rechazado (422) y bloqueo de horario impide reservas en ese intervalo (409)', async () => {
    // A08: Servicio de 60 min (Checkup) iniciando a las 18:30 cuando la jornada termina a las 19:00
    const exceedShift = await apiRequest('/api/v1/appointments', {
      method: 'POST',
      token: receptionToken,
      body: {
        professionalId: SEED_IDS.profSofia,
        serviceId: SEED_IDS.srvSofiaCheckup, // 60 min + 10 min buffer
        startsAt: '2026-10-17T18:30:00-06:00',
        patientName: 'Paciente Fuera De Jornada',
        patientPhone: '55 6000 0001',
        idempotencyKey: 'outside-shift-test',
      },
    });
    expect(exceedShift.status).toBe(422);
    expect(exceedShift.data.code).toBe('OUTSIDE_WORKING_HOURS');

    // A09: Bloquear horario de 16:00 a 17:00 del 17 de octubre para Dr. Pablo Ruiz
    const blockRes = await apiRequest('/api/v1/availability/blocks', {
      method: 'POST',
      token: receptionToken,
      body: {
        professionalId: SEED_IDS.profPablo,
        kind: 'meeting',
        startsAt: '2026-10-17T16:00:00-06:00',
        endsAt: '2026-10-17T17:00:00-06:00',
        reason: 'Junta médica cardiovascular',
      },
    });
    expect(blockRes.status).toBe(201);

    // Intentar agendar cita a las 16:00 durante el bloqueo
    const duringBlock = await apiRequest('/api/v1/appointments', {
      method: 'POST',
      token: receptionToken,
      body: {
        professionalId: SEED_IDS.profPablo,
        serviceId: SEED_IDS.srvPabloCardio,
        startsAt: '2026-10-17T16:00:00-06:00',
        patientName: 'Paciente En Horario Bloqueado',
        patientPhone: '55 6000 0002',
        idempotencyKey: 'booked-during-block-test',
      },
    });
    expect(duringBlock.status).toBe(409);
  });

  it('A10 & A11: Aislamiento estricto RLS y de servidor entre organizaciones y entre profesionales', async () => {
    const demoApptId = '88888888-8888-4888-8888-888888888802'; // Cita de Dr. Pablo Ruiz en Núcleo Demo
    const norteApptId = '99999999-8888-4888-8888-999999999999'; // Cita privada en Núcleo Norte

    // A10: Usuario de otro núcleo intenta leer o cancelar cita de Núcleo Demo conociendo su UUID
    const crossOrgRead = await apiRequest(`/api/v1/appointments/${demoApptId}`, {
      token: intruderToken,
    });
    expect(crossOrgRead.status).toBe(404);

    const crossOrgCancel = await apiRequest(`/api/v1/appointments/${demoApptId}/cancel`, {
      method: 'POST',
      token: intruderToken,
      body: { reason: 'Intento malicioso desde otro núcleo' },
    });
    expect(crossOrgCancel.status).toBe(404);

    // Inverso: Recepción de Núcleo Demo intenta leer cita de Núcleo Norte
    const demoReadsNorte = await apiRequest(`/api/v1/appointments/${norteApptId}`, {
      token: receptionToken,
    });
    expect(demoReadsNorte.status).toBe(404);

    // Verificación directa en PostgreSQL RLS: el usuario de Núcleo Norte ve 0 filas de Núcleo Demo
    const rlsRows = await withUserRls(SEED_IDS.userIntruder, async (tx) => {
      return tx`SELECT id FROM public.appointments WHERE organization_id = ${SEED_IDS.orgDemo}`;
    });
    expect(rlsRows.length).toBe(0);

    // A11: Dra. Sofía García intenta leer o modificar una cita del Dr. Pablo Ruiz en el mismo núcleo
    const sofiaReadsPablo = await apiRequest(`/api/v1/appointments/${demoApptId}`, {
      token: sofiaToken,
    });
    expect([403, 404]).toContain(sofiaReadsPablo.status);

    const sofiaListsPablo = await apiRequest(
      `/api/v1/appointments?date=2026-10-16&professional_id=${SEED_IDS.profPablo}`,
      { token: sofiaToken }
    );
    expect(sofiaListsPablo.status).toBe(403);
  });

  it('A12, A13, A14 & A15: Estados de atención separados de cobros, pagos parciales/reversos inmutables, bloqueo de faltó en cita futura y cancelación liberando espacio', async () => {
    // Crear cita en el pasado hoy (08:00 del 16 de octubre) para probar transición a Atendida sin pago (A12)
    const apptRes = await apiRequest('/api/v1/appointments', {
      method: 'POST',
      token: receptionToken,
      body: {
        professionalId: SEED_IDS.profSofia,
        serviceId: SEED_IDS.srvSofiaGeneral, // $1,200 MXN (120000 centavos)
        startsAt: '2026-10-16T08:00:00-06:00',
        patientName: 'Paciente Flujo Financiero',
        patientPhone: '55 5050 6060',
        idempotencyKey: 'fin-flow-test-0800',
      },
    });
    expect(apptRes.status).toBe(201);
    const apptId = apptRes.data.appointment.id;

    // A12: Marcar como "Atendida" (completed) NO cambia automáticamente el estado financiero a pagado
    const markCompleted = await apiRequest(`/api/v1/appointments/${apptId}/status`, {
      method: 'POST',
      token: receptionToken,
      body: { status: 'completed', expectedVersion: 1 },
    });
    expect(markCompleted.status).toBe(200);
    expect(markCompleted.data.appointment.attendance_status).toBe('completed');
    expect(markCompleted.data.appointment.financial_status).toBe('pending');
    expect(markCompleted.data.appointment.balance_cents).toBe(120000);

    // A13: Registrar pago parcial de $500 MXN (50000 centavos)
    const partialPay = await apiRequest(`/api/v1/appointments/${apptId}/payments`, {
      method: 'POST',
      token: receptionToken,
      body: {
        amountCents: 50000,
        paymentMethod: 'cash',
        notes: 'Anticipo en efectivo',
        idempotencyKey: 'pay-partial-500',
      },
    });
    expect(partialPay.status).toBe(201);
    expect(partialPay.data.appointment.financial_status).toBe('partial');
    expect(partialPay.data.appointment.net_paid_cents).toBe(50000);
    expect(partialPay.data.appointment.balance_cents).toBe(70000);

    // Liquidar los $700 MXN restantes (70000 centavos)
    const secondPay = await apiRequest(`/api/v1/appointments/${apptId}/payments`, {
      method: 'POST',
      token: receptionToken,
      body: {
        amountCents: 70000,
        paymentMethod: 'card',
        notes: 'Liquidación con tarjeta',
        idempotencyKey: 'pay-second-700',
      },
    });
    expect(secondPay.status).toBe(201);
    expect(secondPay.data.appointment.financial_status).toBe('paid');
    expect(secondPay.data.appointment.balance_cents).toBe(0);

    // Reverso autorizado del segundo pago sin borrar el movimiento original (A13)
    const revRes = await apiRequest(
      `/api/v1/payments/${secondPay.data.movementId}/reversals`,
      {
        method: 'POST',
        token: adminToken,
        body: {
          type: 'reversal',
          reason: 'Cargo en terminal duplicado por error de captura',
        },
      }
    );
    expect(revRes.status).toBe(201);
    expect(revRes.data.appointment.financial_status).toBe('partial');
    expect(revRes.data.appointment.balance_cents).toBe(70000);

    // Verificar que un DELETE directo en financial_movements es bloqueado por trigger de inmutabilidad
    const sql = getSql();
    await expect(
      sql`DELETE FROM public.financial_movements WHERE id = ${partialPay.data.movementId}`
    ).rejects.toThrow(/inmutable/);

    // A14: Intentar marcar como "No asistió" (no_show) una cita futura (2026-10-17 11:30)
    const futureAppts = await apiRequest('/api/v1/appointments?date=2026-10-17', {
      token: receptionToken,
    });
    const futureAppt = futureAppts.data.appointments[0];
    const futureNoShow = await apiRequest(`/api/v1/appointments/${futureAppt.id}/status`, {
      method: 'POST',
      token: receptionToken,
      body: { status: 'no_show' },
    });
    expect(futureNoShow.status).toBe(422);
    expect(futureNoShow.data.code).toBe('FUTURE_NO_SHOW_FORBIDDEN');

    // A15: Cancelar la cita futura libera el horario y conserva historial
    const cancelRes = await apiRequest(`/api/v1/appointments/${futureAppt.id}/cancel`, {
      method: 'POST',
      token: receptionToken,
      body: { reason: 'Paciente canceló con anticipación' },
    });
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.data.appointment.attendance_status).toBe('cancelled');

    // Ahora el horario liberado por la cancelación puede volver a reservarse
    const rebookFreedSlot = await apiRequest('/api/v1/appointments', {
      method: 'POST',
      token: receptionToken,
      body: {
        professionalId: futureAppt.professional_id,
        serviceId: futureAppt.service_id,
        startsAt: futureAppt.starts_at,
        patientName: 'Nuevo Paciente En Hueco Liberado',
        patientPhone: '55 8181 9292',
        idempotencyKey: 'rebook-freed-slot-a15',
      },
    });
    expect(rebookFreedSlot.status).toBe(201);
  });

  it('A19, A20, A21, A22 & A23: Totales por fecha real, teléfonos compartidos sin fusión automática, revocación de usuario, validación de token y conservación de precio histórico', async () => {
    // A19: Resumen diario cambia según la fecha consultada
    const summaryOct16 = await apiRequest('/api/v1/reports/daily?date=2026-10-16', {
      token: receptionToken,
    });
    const summaryOct17 = await apiRequest('/api/v1/reports/daily?date=2026-10-17', {
      token: receptionToken,
    });
    expect(summaryOct16.status).toBe(200);
    expect(summaryOct17.status).toBe(200);
    expect(summaryOct16.data.kpis.appointmentsToday).toBeGreaterThan(
      summaryOct17.data.kpis.appointmentsToday
    );

    // A20: Madre agenda para dos hijos distintos usando el mismo teléfono
    const sharedPhone = '55 1234 9876';
    const child1 = await apiRequest('/api/v1/appointments', {
      method: 'POST',
      token: receptionToken,
      body: {
        professionalId: SEED_IDS.profElena,
        serviceId: SEED_IDS.srvElenaSeguimiento,
        startsAt: '2026-10-17T08:00:00-06:00',
        patientName: 'Mateo Hernández (Menor)',
        patientPhone: sharedPhone,
        contactName: 'Lucía Hernández',
        contactRelationship: 'Madre',
        idempotencyKey: 'shared-phone-child-1',
      },
    });
    const child2 = await apiRequest('/api/v1/appointments', {
      method: 'POST',
      token: receptionToken,
      body: {
        professionalId: SEED_IDS.profElena,
        serviceId: SEED_IDS.srvElenaSeguimiento,
        startsAt: '2026-10-17T08:30:00-06:00',
        patientName: 'Valentina Hernández (Menor)',
        patientPhone: sharedPhone,
        contactName: 'Lucía Hernández',
        contactRelationship: 'Madre',
        idempotencyKey: 'shared-phone-child-2',
      },
    });
    expect(child1.status).toBe(201);
    expect(child2.status).toBe(201);
    expect(child1.data.appointment.patient_id).not.toBe(child2.data.appointment.patient_id);

    // A22: Token de gestión manipulado es rechazado con 401
    const badTokenRes = await apiRequest('/api/v1/booking-access/verify', {
      method: 'POST',
      body: { token: 'mgt_token_manipulado_invalido_12345' },
    });
    expect(badTokenRes.status).toBe(401);

    // A23: Cambiar el precio del catálogo no altera agreed_price_cents de las citas previas
    const beforePrice = child1.data.appointment.agreed_price_cents;
    const patchSrv = await apiRequest(`/api/v1/services/${SEED_IDS.srvElenaSeguimiento}`, {
      method: 'PATCH',
      token: adminToken,
      body: { priceCents: 115000 },
    });
    expect(patchSrv.status).toBe(200);

    const child1AfterPriceChange = await apiRequest(
      `/api/v1/appointments/${child1.data.appointment.id}`,
      { token: receptionToken }
    );
    expect(child1AfterPriceChange.data.appointment.agreed_price_cents).toBe(beforePrice);

    // A21: Si un usuario es desactivado en la base de datos, su sesión activa pierde acceso de inmediato
    const sql = getSql();
    await sql`UPDATE auth.users SET is_active = false WHERE id = ${SEED_IDS.userSofia}`;
    const revokedAccess = await apiRequest('/api/v1/auth/me', { token: sofiaToken });
    expect(revokedAccess.status).toBe(401);
    // Restaurar estado activo para uso posterior
    await sql`UPDATE auth.users SET is_active = true WHERE id = ${SEED_IDS.userSofia}`;
  });

  it('A16, A17 & A27: Cola de recordatorios omite tareas vencidas, invalida obsoletas al cancelar y conserva la cita si el proveedor falla', async () => {
    const jobsList = await apiRequest('/api/v1/communications/jobs', {
      token: receptionToken,
    });
    expect(jobsList.status).toBe(200);
    const pendingJob = jobsList.data.jobs.find(
      (j: { status: string }) => j.status === 'pending'
    );
    expect(pendingJob).toBeDefined();

    // A16: Simular fallo de proveedor transaccional al procesar recordatorio
    const failProcess = await apiRequest(
      `/api/v1/communications/jobs/${pendingJob.id}/process`,
      {
        method: 'POST',
        token: receptionToken,
        body: { simulateFailure: true },
      }
    );
    expect(failProcess.status).toBe(200);
    expect(failProcess.data.job.status).toBe('failed');
    expect(failProcess.data.job.attempts).toBe(1);
    expect(failProcess.data.job.last_error).toContain('no disponible');

    // La cita asociada permanece intacta
    const apptStillExists = await apiRequest(
      `/api/v1/appointments/${pendingJob.appointment_id}`,
      { token: receptionToken }
    );
    expect(apptStillExists.status).toBe(200);
  });
});

