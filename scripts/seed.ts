import crypto from 'node:crypto';
import postgres from 'postgres';

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

export const SEED_IDS = {
  orgDemo: '11111111-1111-4111-8111-111111111111',
  orgNorte: '99999999-9999-4999-8999-999999999999',
  locRoma: '22222222-2222-4222-8222-222222222221',
  locNorte: '99999999-2222-4222-8222-999999999991',
  resCons1: '33333333-3333-4333-8333-333333333331',
  resCons2: '33333333-3333-4333-8333-333333333332',
  resCons3: '33333333-3333-4333-8333-333333333333',
  resNorte1: '99999999-3333-4333-8333-999999999991',
  userLaura: '44444444-4444-4444-8444-444444444441',
  userAdmin: '44444444-4444-4444-8444-444444444442',
  userSofia: '44444444-4444-4444-8444-444444444443',
  userPablo: '44444444-4444-4444-8444-444444444444',
  userElena: '44444444-4444-4444-8444-444444444445',
  userIntruder: '99999999-4444-4444-8444-999999999991',
  profSofia: '55555555-5555-4555-8555-555555555551',
  profPablo: '55555555-5555-4555-8555-555555555552',
  profElena: '55555555-5555-4555-8555-555555555553',
  profNorte: '99999999-5555-4555-8555-999999999991',
  srvSofiaGeneral: '66666666-6666-4666-8666-666666666661',
  srvSofiaCheckup: '66666666-6666-4666-8666-666666666662',
  srvSofiaSharedRoom: '66666666-6666-4666-8666-666666666663',
  srvPabloCardio: '66666666-6666-4666-8666-666666666664',
  srvPabloPreop: '66666666-6666-4666-8666-666666666665',
  srvElenaPrimera: '66666666-6666-4666-8666-666666666666',
  srvElenaSeguimiento: '66666666-6666-4666-8666-666666666667',
  srvNorteGeneral: '99999999-6666-4666-8666-999999999991',
};

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export async function seedDatabase(customUrl?: string) {
  const sql = postgres(customUrl || DATABASE_URL, { max: 1, onnotice: () => {} });

  try {
    console.log('🌱 Cargando datos ficticios de demostración en PostgreSQL (proceso de seed)...');

    await sql.begin(async (tx) => {
      // Limpiar datos previos manteniendo estructura
      await tx.unsafe(`
        TRUNCATE TABLE
          public.audit_logs,
          public.idempotency_keys,
          public.outbox_events,
          public.notification_jobs,
          public.management_tokens,
          public.consents,
          public.financial_movements,
          public.appointment_events,
          public.resource_reservations,
          public.appointments,
          public.patient_contacts,
          public.patients,
          public.availability_exceptions,
          public.availability_rules,
          public.services,
          public.membership_scopes,
          public.professionals,
          public.resources,
          public.memberships,
          public.locations,
          public.organizations,
          auth.users
        RESTART IDENTITY CASCADE;
      `);

      // 1. Usuarios ficticios (Contraseña de prueba para todos: Demo2026!)
      const users = [
        {
          id: SEED_IDS.userLaura,
          email: 'laura@nucleodemo.mx',
          name: 'Laura Méndez',
          role: 'reception',
        },
        {
          id: SEED_IDS.userAdmin,
          email: 'admin@nucleodemo.mx',
          name: 'Dr. Alejandro Vega',
          role: 'admin',
        },
        {
          id: SEED_IDS.userSofia,
          email: 'sofia@nucleodemo.mx',
          name: 'Dra. Sofía García',
          role: 'professional',
        },
        {
          id: SEED_IDS.userPablo,
          email: 'pablo@nucleodemo.mx',
          name: 'Dr. Pablo Ruiz',
          role: 'professional',
        },
        {
          id: SEED_IDS.userElena,
          email: 'elena@nucleodemo.mx',
          name: 'Lic. Elena Martínez',
          role: 'professional',
        },
        {
          id: SEED_IDS.userIntruder,
          email: 'intruder@nucleonorte.mx',
          name: 'Roberto Garza (Otro Núcleo)',
          role: 'admin',
        },
      ];

      for (const u of users) {
        await tx`
          INSERT INTO auth.users (id, email, encrypted_password, raw_user_meta_data, is_active)
          VALUES (
            ${u.id},
            ${u.email},
            crypt('Demo2026!', gen_salt('bf')),
            ${tx.json({ full_name: u.name, demo_role: u.role })},
            true
          )
        `;
      }

      // 2. Organizaciones: Núcleo Demo y Núcleo Norte (para pruebas de aislamiento A10)
      await tx`
        INSERT INTO public.organizations (id, slug, name, currency, default_timezone, status)
        VALUES
          (${SEED_IDS.orgDemo}, 'nucleo-demo', 'Núcleo Demo', 'MXN', 'America/Mexico_City', 'active'),
          (${SEED_IDS.orgNorte}, 'nucleo-norte', 'Núcleo Norte Privado', 'MXN', 'America/Monterrey', 'active')
      `;

      // 3. Sedes
      await tx`
        INSERT INTO public.locations (id, organization_id, slug, name, address, timezone, phone)
        VALUES
          (${SEED_IDS.locRoma}, ${SEED_IDS.orgDemo}, 'sede-roma-norte', 'Sede Roma Norte', 'Av. Álvaro Obregón 185, Col. Roma Norte, CDMX', 'America/Mexico_City', '+52 55 5510 2030'),
          (${SEED_IDS.locNorte}, ${SEED_IDS.orgNorte}, 'sede-san-pedro', 'Sede San Pedro', 'Av. Vasconcelos 402, San Pedro Garza García, NL', 'America/Monterrey', '+52 81 8300 1000')
      `;

      // 4. Consultorios (Recursos físicos de capacidad 1)
      await tx`
        INSERT INTO public.resources (id, organization_id, location_id, code, name, type, capacity)
        VALUES
          (${SEED_IDS.resCons1}, ${SEED_IDS.orgDemo}, ${SEED_IDS.locRoma}, 'CONS-1', 'Consultorio 1 · Medicina General', 'consultorio', 1),
          (${SEED_IDS.resCons2}, ${SEED_IDS.orgDemo}, ${SEED_IDS.locRoma}, 'CONS-2', 'Consultorio 2 · Especialidades / Nutrición', 'consultorio', 1),
          (${SEED_IDS.resCons3}, ${SEED_IDS.orgDemo}, ${SEED_IDS.locRoma}, 'CONS-3', 'Consultorio 3 · Cardiología', 'consultorio', 1),
          (${SEED_IDS.resNorte1}, ${SEED_IDS.orgNorte}, ${SEED_IDS.locNorte}, 'CONS-N1', 'Consultorio Norte 1', 'consultorio', 1)
      `;

      // 5. Profesionales (3 en Núcleo Demo + 1 en Núcleo Norte)
      await tx`
        INSERT INTO public.professionals (
          id, organization_id, user_id, default_location_id, default_resource_id,
          slug, full_name, specialty, license_number, color_hex, bio, is_public, is_active
        )
        VALUES
          (
            ${SEED_IDS.profSofia}, ${SEED_IDS.orgDemo}, ${SEED_IDS.userSofia},
            ${SEED_IDS.locRoma}, ${SEED_IDS.resCons1},
            'dra-sofia-garcia', 'Dra. Sofía García', 'Medicina general', 'CED-7812340', '#10B981',
            'Especialista en atención primaria, prevención metabólica y seguimiento integral de adultos.',
            true, true
          ),
          (
            ${SEED_IDS.profPablo}, ${SEED_IDS.orgDemo}, ${SEED_IDS.userPablo},
            ${SEED_IDS.locRoma}, ${SEED_IDS.resCons3},
            'dr-pablo-ruiz', 'Dr. Pablo Ruiz', 'Cardiología', 'CED-6549812', '#3B82F6',
            'Cardiólogo clínico especializado en hipertensión, electrocardiografía y riesgo cardiovascular.',
            true, true
          ),
          (
            ${SEED_IDS.profElena}, ${SEED_IDS.orgDemo}, ${SEED_IDS.userElena},
            ${SEED_IDS.locRoma}, ${SEED_IDS.resCons2},
            'lic-elena-martinez', 'Lic. Elena Martínez', 'Nutrición', 'CED-9102834', '#8B5CF6',
            'Nutrióloga clínica enfocada en composición corporal, control glucémico y hábitos sostenibles.',
            true, true
          ),
          (
            ${SEED_IDS.profNorte}, ${SEED_IDS.orgNorte}, ${SEED_IDS.userIntruder},
            ${SEED_IDS.locNorte}, ${SEED_IDS.resNorte1},
            'dr-roberto-garza', 'Dr. Roberto Garza', 'Medicina Interna', 'CED-1122334', '#0EA5E9',
            'Médico internista en Núcleo Norte.',
            true, true
          )
      `;

      // 6. Membresías y Alcances (Scopes)
      const memLaura = '77777777-7777-4777-8777-777777777771';
      await tx`
        INSERT INTO public.memberships (id, organization_id, user_id, role, full_name, email, initials, is_active)
        VALUES
          (${memLaura}, ${SEED_IDS.orgDemo}, ${SEED_IDS.userLaura}, 'reception', 'Laura · Recepción', 'laura@nucleodemo.mx', 'LM', true),
          ('77777777-7777-4777-8777-777777777772', ${SEED_IDS.orgDemo}, ${SEED_IDS.userAdmin}, 'admin', 'Dr. Alejandro Vega · Admin', 'admin@nucleodemo.mx', 'AV', true),
          ('77777777-7777-4777-8777-777777777773', ${SEED_IDS.orgDemo}, ${SEED_IDS.userSofia}, 'professional', 'Dra. Sofía García', 'sofia@nucleodemo.mx', 'SG', true),
          ('77777777-7777-4777-8777-777777777774', ${SEED_IDS.orgDemo}, ${SEED_IDS.userPablo}, 'professional', 'Dr. Pablo Ruiz', 'pablo@nucleodemo.mx', 'PR', true),
          ('77777777-7777-4777-8777-777777777775', ${SEED_IDS.orgDemo}, ${SEED_IDS.userElena}, 'professional', 'Lic. Elena Martínez', 'elena@nucleodemo.mx', 'EM', true),
          ('99999999-7777-4777-8777-999999999991', ${SEED_IDS.orgNorte}, ${SEED_IDS.userIntruder}, 'admin', 'Roberto Garza · Admin Norte', 'intruder@nucleonorte.mx', 'RG', true)
      `;

      for (const profId of [SEED_IDS.profSofia, SEED_IDS.profPablo, SEED_IDS.profElena]) {
        await tx`
          INSERT INTO public.membership_scopes (organization_id, membership_id, location_id, professional_id, can_schedule, can_collect_payment)
          VALUES (${SEED_IDS.orgDemo}, ${memLaura}, ${SEED_IDS.locRoma}, ${profId}, true, true)
        `;
      }

      // 7. Servicios por profesional (precios en centavos MXN)
      await tx`
        INSERT INTO public.services (
          id, organization_id, professional_id, default_resource_id,
          name, description, duration_minutes, buffer_before_minutes, buffer_after_minutes,
          price_cents, currency, publish_price, is_public, is_active
        )
        VALUES
          (
            ${SEED_IDS.srvSofiaGeneral}, ${SEED_IDS.orgDemo}, ${SEED_IDS.profSofia}, ${SEED_IDS.resCons1},
            'Consulta Medicina General', 'Valoración médica general, revisión de signos vitales y plan de tratamiento.',
            30, 0, 0, 120000, 'MXN', true, true, true
          ),
          (
            ${SEED_IDS.srvSofiaCheckup}, ${SEED_IDS.orgDemo}, ${SEED_IDS.profSofia}, ${SEED_IDS.resCons1},
            'Check-up Preventivo Integral', 'Evaluación clínica completa de 60 minutos con interpretación de laboratorio.',
            60, 0, 10, 180000, 'MXN', true, true, true
          ),
          (
            ${SEED_IDS.srvSofiaSharedRoom}, ${SEED_IDS.orgDemo}, ${SEED_IDS.profSofia}, ${SEED_IDS.resCons2},
            'Valoración Metabólica (Consultorio 2)', 'Consulta en Consultorio 2 compartido con Nutrición.',
            30, 0, 0, 140000, 'MXN', true, true, true
          ),
          (
            ${SEED_IDS.srvPabloCardio}, ${SEED_IDS.orgDemo}, ${SEED_IDS.profPablo}, ${SEED_IDS.resCons3},
            'Consulta Cardiología + Electrocardiograma', 'Consulta especializada con trazo electrocardiográfico en reposo.',
            30, 0, 0, 160000, 'MXN', true, true, true
          ),
          (
            ${SEED_IDS.srvPabloPreop}, ${SEED_IDS.orgDemo}, ${SEED_IDS.profPablo}, ${SEED_IDS.resCons3},
            'Valoración Preoperatoria Cardiovascular', 'Dictamen de riesgo quirúrgico cardiovascular completo.',
            60, 0, 0, 240000, 'MXN', true, true, true
          ),
          (
            ${SEED_IDS.srvElenaPrimera}, ${SEED_IDS.orgDemo}, ${SEED_IDS.profElena}, ${SEED_IDS.resCons2},
            'Consulta Nutrición Clínica (1ra vez)', 'Evaluación antropométrica, bioimpedancia y plan nutricional personalizado.',
            60, 0, 0, 120000, 'MXN', true, true, true
          ),
          (
            ${SEED_IDS.srvElenaSeguimiento}, ${SEED_IDS.orgDemo}, ${SEED_IDS.profElena}, ${SEED_IDS.resCons2},
            'Seguimiento Nutricional', 'Control de composición corporal y ajuste de plan alimenticio.',
            30, 0, 0, 90000, 'MXN', true, true, true
          ),
          (
            ${SEED_IDS.srvNorteGeneral}, ${SEED_IDS.orgNorte}, ${SEED_IDS.profNorte}, ${SEED_IDS.resNorte1},
            'Consulta Medicina Interna Norte', 'Consulta privada de otro núcleo.',
            30, 0, 0, 150000, 'MXN', true, true, true
          )
      `;

      // 8. Horarios semanales (Lunes=1 a Sábado=6, 08:00 a 19:00, comida 14:00 a 15:00)
      for (const profId of [SEED_IDS.profSofia, SEED_IDS.profPablo, SEED_IDS.profElena]) {
        for (let dow = 1; dow <= 6; dow++) {
          await tx`
            INSERT INTO public.availability_rules (
              organization_id, professional_id, location_id, day_of_week,
              start_local_time, end_local_time, break_start_local_time, break_end_local_time,
              slot_interval_minutes, is_active
            )
            VALUES (
              ${SEED_IDS.orgDemo}, ${profId}, ${SEED_IDS.locRoma}, ${dow},
              '08:00:00', '19:00:00', '14:00:00', '15:00:00',
              30, true
            )
          `;
        }
      }

      // 9. Pacientes y citas demostrativas para el viernes 16 de octubre de 2026 (zona America/Mexico_City, UTC-6)
      const demoAppts = [
        {
          id: '88888888-8888-4888-8888-888888888801',
          folio: 'NUC-2026-001',
          patientName: 'Ana López',
          phone: '+525511112201',
          phoneDisplay: '55 1111 2201',
          email: 'ana.lopez@ejemplo.mx',
          profId: SEED_IDS.profSofia,
          srvId: SEED_IDS.srvSofiaGeneral,
          resId: SEED_IDS.resCons1,
          startsAt: '2026-10-16T09:00:00-06:00',
          endsAt: '2026-10-16T09:30:00-06:00',
          status: 'completed',
          priceCents: 120000,
          paidCents: 120000,
          method: 'card',
          origin: 'whatsapp_manual',
          tokenRaw: 'demo-token-ana-lopez-001',
        },
        {
          id: '88888888-8888-4888-8888-888888888802',
          folio: 'NUC-2026-002',
          patientName: 'Luis Pérez',
          phone: '+525511112202',
          phoneDisplay: '55 1111 2202',
          email: 'luis.perez@ejemplo.mx',
          profId: SEED_IDS.profPablo,
          srvId: SEED_IDS.srvPabloCardio,
          resId: SEED_IDS.resCons3,
          startsAt: '2026-10-16T09:30:00-06:00',
          endsAt: '2026-10-16T10:00:00-06:00',
          status: 'in_consultation',
          priceCents: 160000,
          paidCents: 0,
          method: null,
          origin: 'phone',
          tokenRaw: 'demo-token-luis-perez-002',
        },
        {
          id: '88888888-8888-4888-8888-888888888803',
          folio: 'NUC-2026-003',
          patientName: 'María Torres',
          phone: '+525511112203',
          phoneDisplay: '55 1111 2203',
          email: 'maria.torres@ejemplo.mx',
          profId: SEED_IDS.profElena,
          srvId: SEED_IDS.srvElenaSeguimiento,
          resId: SEED_IDS.resCons2,
          startsAt: '2026-10-16T10:00:00-06:00',
          endsAt: '2026-10-16T10:30:00-06:00',
          status: 'waiting',
          priceCents: 120000,
          paidCents: 60000, // Pago parcial $600 de $1,200
          method: 'transfer',
          origin: 'public_link',
          tokenRaw: 'demo-token-maria-torres-003',
        },
        {
          id: '88888888-8888-4888-8888-888888888804',
          folio: 'NUC-2026-004',
          patientName: 'Carlos Díaz',
          phone: '+525511112204',
          phoneDisplay: '55 1111 2204',
          email: 'carlos.diaz@ejemplo.mx',
          profId: SEED_IDS.profSofia,
          srvId: SEED_IDS.srvSofiaGeneral,
          resId: SEED_IDS.resCons1,
          startsAt: '2026-10-16T10:30:00-06:00',
          endsAt: '2026-10-16T11:00:00-06:00',
          status: 'confirmed',
          priceCents: 120000,
          paidCents: 0,
          method: null,
          origin: 'whatsapp_manual',
          tokenRaw: 'demo-token-carlos-diaz-004',
        },
        {
          id: '88888888-8888-4888-8888-888888888805',
          folio: 'NUC-2026-005',
          patientName: 'Laura Mendoza',
          phone: '+525511112205',
          phoneDisplay: '55 1111 2205',
          email: 'laura.mendoza@ejemplo.mx',
          profId: SEED_IDS.profPablo,
          srvId: SEED_IDS.srvPabloCardio,
          resId: SEED_IDS.resCons3,
          startsAt: '2026-10-16T11:00:00-06:00',
          endsAt: '2026-10-16T11:30:00-06:00',
          status: 'scheduled',
          priceCents: 160000,
          paidCents: 0,
          method: null,
          origin: 'public_link',
          tokenRaw: 'demo-token-laura-mendoza-005',
        },
        {
          id: '88888888-8888-4888-8888-888888888806',
          folio: 'NUC-2026-006',
          patientName: 'José Ramírez',
          phone: '+525511112206',
          phoneDisplay: '55 1111 2206',
          email: 'jose.ramirez@ejemplo.mx',
          profId: SEED_IDS.profElena,
          srvId: SEED_IDS.srvElenaSeguimiento,
          resId: SEED_IDS.resCons2,
          startsAt: '2026-10-16T11:30:00-06:00',
          endsAt: '2026-10-16T12:00:00-06:00',
          status: 'confirmed',
          priceCents: 90000,
          paidCents: 90000,
          method: 'cash',
          origin: 'reception',
          tokenRaw: 'demo-token-jose-ramirez-006',
        },
        {
          id: '88888888-8888-4888-8888-888888888807',
          folio: 'NUC-2026-007',
          patientName: 'Gabriela Morales',
          phone: '+525511112207',
          phoneDisplay: '55 1111 2207',
          email: 'gabriela.morales@ejemplo.mx',
          profId: SEED_IDS.profSofia,
          srvId: SEED_IDS.srvSofiaGeneral,
          resId: SEED_IDS.resCons1,
          startsAt: '2026-10-16T12:00:00-06:00',
          endsAt: '2026-10-16T12:30:00-06:00',
          status: 'waiting',
          priceCents: 120000,
          paidCents: 120000,
          method: 'card',
          origin: 'facebook',
          tokenRaw: 'demo-token-gabriela-007',
        },
        {
          id: '88888888-8888-4888-8888-888888888808',
          folio: 'NUC-2026-008',
          patientName: 'Fernando Herrera',
          phone: '+525511112208',
          phoneDisplay: '55 1111 2208',
          email: 'fernando.herrera@ejemplo.mx',
          profId: SEED_IDS.profPablo,
          srvId: SEED_IDS.srvPabloPreop,
          resId: SEED_IDS.resCons3,
          startsAt: '2026-10-16T12:00:00-06:00',
          endsAt: '2026-10-16T13:00:00-06:00',
          status: 'waiting',
          priceCents: 240000,
          paidCents: 240000,
          method: 'transfer',
          origin: 'referral',
          tokenRaw: 'demo-token-fernando-008',
        },
        {
          id: '88888888-8888-4888-8888-888888888809',
          folio: 'NUC-2026-009',
          patientName: 'Valeria Ortega',
          phone: '+525511112209',
          phoneDisplay: '55 1111 2209',
          email: 'valeria.ortega@ejemplo.mx',
          profId: SEED_IDS.profElena,
          srvId: SEED_IDS.srvElenaSeguimiento,
          resId: SEED_IDS.resCons2,
          startsAt: '2026-10-16T13:00:00-06:00',
          endsAt: '2026-10-16T13:30:00-06:00',
          status: 'scheduled',
          priceCents: 90000,
          paidCents: 0,
          method: null,
          origin: 'google',
          tokenRaw: 'demo-token-valeria-009',
        },
        {
          id: '88888888-8888-4888-8888-888888888810',
          folio: 'NUC-2026-010',
          patientName: 'Ricardo Navarro',
          phone: '+525511112210',
          phoneDisplay: '55 1111 2210',
          email: 'ricardo.navarro@ejemplo.mx',
          profId: SEED_IDS.profSofia,
          srvId: SEED_IDS.srvSofiaGeneral,
          resId: SEED_IDS.resCons1,
          startsAt: '2026-10-16T15:30:00-06:00',
          endsAt: '2026-10-16T16:00:00-06:00',
          status: 'scheduled',
          priceCents: 120000,
          paidCents: 0,
          method: null,
          origin: 'whatsapp_manual',
          tokenRaw: 'demo-token-ricardo-010',
        },
        {
          id: '88888888-8888-4888-8888-888888888811',
          folio: 'NUC-2026-011',
          patientName: 'Patricia Vega',
          phone: '+525511112211',
          phoneDisplay: '55 1111 2211',
          email: 'patricia.vega@ejemplo.mx',
          profId: SEED_IDS.profPablo,
          srvId: SEED_IDS.srvPabloCardio,
          resId: SEED_IDS.resCons3,
          startsAt: '2026-10-16T16:00:00-06:00',
          endsAt: '2026-10-16T16:30:00-06:00',
          status: 'scheduled',
          priceCents: 160000,
          paidCents: 0,
          method: null,
          origin: 'public_link',
          tokenRaw: 'demo-token-patricia-011',
        },
        {
          id: '88888888-8888-4888-8888-888888888812',
          folio: 'NUC-2026-012',
          patientName: 'Miguel Ángel Castro',
          phone: '+525511112212',
          phoneDisplay: '55 1111 2212',
          email: 'miguel.castro@ejemplo.mx',
          profId: SEED_IDS.profElena,
          srvId: SEED_IDS.srvElenaPrimera,
          resId: SEED_IDS.resCons2,
          startsAt: '2026-10-16T16:30:00-06:00',
          endsAt: '2026-10-16T17:30:00-06:00',
          status: 'scheduled',
          priceCents: 120000,
          paidCents: 120000,
          method: 'cash',
          origin: 'reception',
          tokenRaw: 'demo-token-miguel-012',
        },
        {
          id: '88888888-8888-4888-8888-888888888813',
          folio: 'NUC-2026-013',
          patientName: 'Sofía Domínguez',
          phone: '+525511112213',
          phoneDisplay: '55 1111 2213',
          email: 'sofia.dominguez@ejemplo.mx',
          profId: SEED_IDS.profSofia,
          srvId: SEED_IDS.srvSofiaGeneral,
          resId: SEED_IDS.resCons1,
          startsAt: '2026-10-16T17:00:00-06:00',
          endsAt: '2026-10-16T17:30:00-06:00',
          status: 'scheduled',
          priceCents: 120000,
          paidCents: 0,
          method: null,
          origin: 'whatsapp_manual',
          tokenRaw: 'demo-token-sofia-013',
        },
        {
          id: '88888888-8888-4888-8888-888888888814',
          folio: 'NUC-2026-014',
          patientName: 'Jorge Sánchez',
          phone: '+525511112214',
          phoneDisplay: '55 1111 2214',
          email: 'jorge.sanchez@ejemplo.mx',
          profId: SEED_IDS.profPablo,
          srvId: SEED_IDS.srvPabloCardio,
          resId: SEED_IDS.resCons3,
          startsAt: '2026-10-16T08:30:00-06:00',
          endsAt: '2026-10-16T09:00:00-06:00',
          status: 'completed',
          priceCents: 160000,
          paidCents: 90000, // Atendida con saldo pendiente ($700 pendientes)
          method: 'cash',
          origin: 'phone',
          tokenRaw: 'demo-token-jorge-014',
        },
      ];

      for (const item of demoAppts) {
        const [patient] = await tx`
          INSERT INTO public.patients (organization_id, full_name, phone_normalized, phone_display, email)
          VALUES (${SEED_IDS.orgDemo}, ${item.patientName}, ${item.phone}, ${item.phoneDisplay}, ${item.email})
          RETURNING id
        `;

        await tx`
          INSERT INTO public.appointments (
            id, organization_id, folio, location_id, professional_id, service_id, resource_id, patient_id,
            starts_at, ends_at, occupied_starts_at, occupied_ends_at,
            attendance_status, financial_status, agreed_price_cents, currency, origin_channel, created_by
          )
          VALUES (
            ${item.id}, ${SEED_IDS.orgDemo}, ${item.folio}, ${SEED_IDS.locRoma},
            ${item.profId}, ${item.srvId}, ${item.resId}, ${patient.id},
            ${item.startsAt}::timestamptz, ${item.endsAt}::timestamptz,
            ${item.startsAt}::timestamptz, ${item.endsAt}::timestamptz,
            ${item.status}, 'pending', ${item.priceCents}, 'MXN', ${item.origin}, ${SEED_IDS.userLaura}
          )
        `;

        await tx`
          INSERT INTO public.resource_reservations (
            organization_id, professional_id, resource_id, appointment_id, kind, starts_at, ends_at, status
          )
          VALUES (
            ${SEED_IDS.orgDemo}, ${item.profId}, ${item.resId}, ${item.id}, 'appointment',
            ${item.startsAt}::timestamptz, ${item.endsAt}::timestamptz, 'active'
          )
        `;

        await tx`
          INSERT INTO public.appointment_events (
            organization_id, appointment_id, event_type, previous_state, new_state, reason, actor_user_id, actor_label
          )
          VALUES (
            ${SEED_IDS.orgDemo}, ${item.id}, 'created', '{}'::jsonb,
            ${tx.json({ attendance_status: item.status, starts_at: item.startsAt, ends_at: item.endsAt })},
            'Reserva inicial de demostración', ${SEED_IDS.userLaura}, 'Laura · Recepción'
          )
        `;

        // Cargo financiero inicial por el precio acordado
        await tx`
          INSERT INTO public.financial_movements (
            organization_id, appointment_id, movement_type, amount_cents, currency,
            beneficiary_type, notes, recorded_by, recorded_by_label, created_at
          )
          VALUES (
            ${SEED_IDS.orgDemo}, ${item.id}, 'charge', ${item.priceCents}, 'MXN',
            'organization', 'Cargo por servicio agendado', ${SEED_IDS.userLaura}, 'Laura · Recepción',
            '2026-10-16T08:00:00-06:00'::timestamptz
          )
        `;

        if (item.paidCents > 0 && item.method) {
          await tx`
            INSERT INTO public.financial_movements (
              organization_id, appointment_id, movement_type, amount_cents, currency,
              payment_method, beneficiary_type, reference_code, notes, recorded_by, recorded_by_label, created_at
            )
            VALUES (
              ${SEED_IDS.orgDemo}, ${item.id}, 'payment', ${item.paidCents}, 'MXN',
              ${item.method}, 'organization', ${'REC-' + item.folio}, 'Cobro registrado en recepción',
              ${SEED_IDS.userLaura}, 'Laura · Recepción',
              '2026-10-16T09:15:00-06:00'::timestamptz
            )
          `;
        }

        await tx`SELECT * FROM public.recalculate_appointment_financial_status(${SEED_IDS.orgDemo}, ${item.id})`;

        await tx`
          INSERT INTO public.consents (organization_id, patient_id, appointment_id, purpose, policy_version, accepted)
          VALUES (${SEED_IDS.orgDemo}, ${patient.id}, ${item.id}, 'operational_booking', 'v1.0-2026-10', true)
        `;

        await tx`
          INSERT INTO public.management_tokens (organization_id, appointment_id, token_hash, expires_at)
          VALUES (
            ${SEED_IDS.orgDemo}, ${item.id}, ${hashToken(item.tokenRaw)},
            ('2026-10-16T12:00:00-06:00'::timestamptz + interval '30 days')
          )
        `;
      }

      // 10. Cita privada en Núcleo Norte (para verificar aislamiento estricto A10)
      const [nortePatient] = await tx`
        INSERT INTO public.patients (id, organization_id, full_name, phone_normalized, phone_display, email)
        VALUES ('99999999-8888-4888-8888-999999999901', ${SEED_IDS.orgNorte}, 'Paciente Confidencial Norte', '+528111119999', '81 1111 9999', 'confidencial@norte.mx')
        RETURNING id
      `;

      await tx`
        INSERT INTO public.appointments (
          id, organization_id, folio, location_id, professional_id, service_id, resource_id, patient_id,
          starts_at, ends_at, occupied_starts_at, occupied_ends_at,
          attendance_status, financial_status, agreed_price_cents, currency, origin_channel, created_by
        )
        VALUES (
          '99999999-8888-4888-8888-999999999999', ${SEED_IDS.orgNorte}, 'NORTE-2026-001', ${SEED_IDS.locNorte},
          ${SEED_IDS.profNorte}, ${SEED_IDS.srvNorteGeneral}, ${SEED_IDS.resNorte1}, ${nortePatient.id},
          '2026-10-16T10:00:00-06:00'::timestamptz, '2026-10-16T10:30:00-06:00'::timestamptz,
          '2026-10-16T10:00:00-06:00'::timestamptz, '2026-10-16T10:30:00-06:00'::timestamptz,
          'confirmed', 'pending', 150000, 'MXN', 'reception', ${SEED_IDS.userIntruder}
        )
      `;
    });

    console.log('✅ Datos ficticios de demostración cargados correctamente.');
  } finally {
    await sql.end();
  }
}

import { fileURLToPath } from 'node:url';
import path from 'node:path';

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFile)) {
  seedDatabase().catch((err) => {
    console.error('❌ Error en seed:', err);
    process.exit(1);
  });
}

