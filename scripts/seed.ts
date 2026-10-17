import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
  resCons4: '33333333-3333-4333-8333-333333333334',
  resNorte1: '99999999-3333-4333-8333-999999999991',
  userLaura: '44444444-4444-4444-8444-444444444441',
  userAdmin: '44444444-4444-4444-8444-444444444442',
  userSofia: '44444444-4444-4444-8444-444444444443', // Ginecóloga
  userPablo: '44444444-4444-4444-8444-444444444444', // Internista
  userElena: '44444444-4444-4444-8444-444444444445', // Nutrióloga
  userPsico: '44444444-4444-4444-8444-444444444446', // Psicóloga
  userIntruder: '99999999-4444-4444-8444-999999999991',
  profSofia: '55555555-5555-4555-8555-555555555551', // Ginecóloga
  profPablo: '55555555-5555-4555-8555-555555555552', // Internista
  profElena: '55555555-5555-4555-8555-555555555553', // Nutrióloga
  profPsico: '55555555-5555-4555-8555-555555555554', // Psicóloga
  profNorte: '99999999-5555-4555-8555-999999999991',
  srvSofiaGeneral: '66666666-6666-4666-8666-666666666661',
  srvSofiaCheckup: '66666666-6666-4666-8666-666666666662',
  srvSofiaSharedRoom: '66666666-6666-4666-8666-666666666663',
  srvPabloCardio: '66666666-6666-4666-8666-666666666664',
  srvPabloPreop: '66666666-6666-4666-8666-666666666665',
  srvElenaPrimera: '66666666-6666-4666-8666-666666666666',
  srvElenaSeguimiento: '66666666-6666-4666-8666-666666666667',
  srvPsicoPrimera: '66666666-6666-4666-8666-666666666668',
  srvPsicoSesion: '66666666-6666-4666-8666-666666666669',
  srvNorteGeneral: '99999999-6666-4666-8666-999999999991',
};

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export async function seedDatabase(customUrl?: string) {
  const sql = postgres(customUrl || DATABASE_URL, { max: 1, onnotice: () => {} });

  try {
    console.log('🌱 Cargando datos de demostración (Ginecóloga, Internista, Nutrióloga, Psicóloga + Asistente)...');

    await sql.begin(async (tx) => {
      await tx.unsafe(`
        TRUNCATE TABLE
          public.clinical_records,
          public.organization_integrations,
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

      // 1. Usuarios de demostración (Contraseña para todos: Demo2026!)
      const users = [
        {
          id: SEED_IDS.userLaura,
          email: 'laura@nucleodemo.mx',
          name: 'Asistente del Núcleo',
          role: 'reception',
        },
        {
          id: SEED_IDS.userAdmin,
          email: 'admin@nucleodemo.mx',
          name: 'Administrador del Núcleo',
          role: 'admin',
        },
        {
          id: SEED_IDS.userSofia,
          email: 'sofia@nucleodemo.mx',
          name: 'Ginecóloga',
          role: 'professional',
        },
        {
          id: SEED_IDS.userPablo,
          email: 'pablo@nucleodemo.mx',
          name: 'Internista',
          role: 'professional',
        },
        {
          id: SEED_IDS.userElena,
          email: 'elena@nucleodemo.mx',
          name: 'Nutrióloga',
          role: 'professional',
        },
        {
          id: SEED_IDS.userPsico,
          email: 'psicologa@nucleodemo.mx',
          name: 'Psicóloga',
          role: 'professional',
        },
        {
          id: SEED_IDS.userIntruder,
          email: 'intruder@nucleonorte.mx',
          name: 'Administrador Otro Núcleo',
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

      // 2. Organizaciones: Núcleo Demo y Núcleo Norte
      await tx`
        INSERT INTO public.organizations (id, slug, name, currency, default_timezone, status)
        VALUES
          (${SEED_IDS.orgDemo}, 'nucleo-demo', 'Núcleo Médico Especialidades', 'MXN', 'America/Mexico_City', 'active'),
          (${SEED_IDS.orgNorte}, 'nucleo-norte', 'Núcleo Norte Privado', 'MXN', 'America/Monterrey', 'active')
      `;

      // Configuración de integraciones (Evolution API en whatsapp.dragendas.com + Doctoralia)
      await tx`
        INSERT INTO public.organization_integrations (
          organization_id, evolution_api_url, evolution_enabled,
          send_on_booking_created, send_on_booking_rescheduled, send_on_booking_cancelled,
          send_reminder_24h, send_reminder_1h, doctoralia_bridge_mode
        )
        VALUES (
          ${SEED_IDS.orgDemo},
          'https://whatsapp.dragendas.com',
          true,
          true, true, true, true, true,
          'email_webhook'
        )
      `;

      // 3. Sedes
      await tx`
        INSERT INTO public.locations (id, organization_id, slug, name, address, timezone, phone)
        VALUES
          (${SEED_IDS.locRoma}, ${SEED_IDS.orgDemo}, 'sede-principal', 'Sede Principal · Consultorios', 'Av. Álvaro Obregón 185, CDMX', 'America/Mexico_City', '+52 55 5510 2030'),
          (${SEED_IDS.locNorte}, ${SEED_IDS.orgNorte}, 'sede-san-pedro', 'Sede San Pedro', 'Av. Vasconcelos 402, NL', 'America/Monterrey', '+52 81 8300 1000')
      `;

      // 4. Consultorios (Recursos físicos de capacidad 1)
      await tx`
        INSERT INTO public.resources (id, organization_id, location_id, code, name, type, capacity)
        VALUES
          (${SEED_IDS.resCons1}, ${SEED_IDS.orgDemo}, ${SEED_IDS.locRoma}, 'CONS-1', 'Consultorio 1 · Ginecología', 'consultorio', 1),
          (${SEED_IDS.resCons2}, ${SEED_IDS.orgDemo}, ${SEED_IDS.locRoma}, 'CONS-2', 'Consultorio 2 · Nutrición / Compartido', 'consultorio', 1),
          (${SEED_IDS.resCons3}, ${SEED_IDS.orgDemo}, ${SEED_IDS.locRoma}, 'CONS-3', 'Consultorio 3 · Medicina Interna', 'consultorio', 1),
          (${SEED_IDS.resCons4}, ${SEED_IDS.orgDemo}, ${SEED_IDS.locRoma}, 'CONS-4', 'Consultorio 4 · Psicología', 'consultorio', 1),
          (${SEED_IDS.resNorte1}, ${SEED_IDS.orgNorte}, ${SEED_IDS.locNorte}, 'CONS-N1', 'Consultorio Norte 1', 'consultorio', 1)
      `;

      // 5. Los 4 Especialistas solicitados por el cliente + instancia individual de WhatsApp Evolution API
      await tx`
        INSERT INTO public.professionals (
          id, organization_id, user_id, default_location_id, default_resource_id,
          slug, full_name, specialty, license_number, color_hex, bio,
          whatsapp_instance_name, whatsapp_status, whatsapp_phone,
          doctoralia_url, doctoralia_sync_enabled,
          is_public, is_active
        )
        VALUES
          (
            ${SEED_IDS.profSofia}, ${SEED_IDS.orgDemo}, ${SEED_IDS.userSofia},
            ${SEED_IDS.locRoma}, ${SEED_IDS.resCons1},
            'ginecologa', 'Ginecóloga', 'Ginecología y Obstetricia', 'CED-7812340', '#EC4899',
            'Control ginecológico integral, colposcopía, Papanicolaou, ultrasonido y control prenatal.',
            'consultorio-ginecologa', 'connected', '+52 55 4100 1001',
            'https://www.doctoralia.com.mx/ginecologa-demo', true,
            true, true
          ),
          (
            ${SEED_IDS.profPablo}, ${SEED_IDS.orgDemo}, ${SEED_IDS.userPablo},
            ${SEED_IDS.locRoma}, ${SEED_IDS.resCons3},
            'internista', 'Internista', 'Medicina Interna', 'CED-6549812', '#3B82F6',
            'Diagnóstico integral del adulto, control de enfermedades crónico-degenerativas y valoración preoperatoria.',
            'consultorio-internista', 'connected', '+52 55 4100 1002',
            'https://www.doctoralia.com.mx/internista-demo', true,
            true, true
          ),
          (
            ${SEED_IDS.profElena}, ${SEED_IDS.orgDemo}, ${SEED_IDS.userElena},
            ${SEED_IDS.locRoma}, ${SEED_IDS.resCons2},
            'nutriologa', 'Nutrióloga', 'Nutrición Clínica', 'CED-9102834', '#10B981',
            'Evaluación de composición corporal InBody, nutrición clínica metabólica, hormonal y perinatal.',
            'consultorio-nutriologa', 'connected', '+52 55 4100 1003',
            'https://www.doctoralia.com.mx/nutriologa-demo', true,
            true, true
          ),
          (
            ${SEED_IDS.profPsico}, ${SEED_IDS.orgDemo}, ${SEED_IDS.userPsico},
            ${SEED_IDS.locRoma}, ${SEED_IDS.resCons4},
            'psicologa', 'Psicóloga', 'Psicología Clínica y Psicoterapia', 'CED-8451209', '#8B5CF6',
            'Psicoterapia individual, manejo de ansiedad, depresión, duelo y acompañamiento emocional.',
            'consultorio-psicologa', 'disconnected', '+52 55 4100 1004',
            'https://www.doctoralia.com.mx/psicologa-demo', true,
            true, true
          ),
          (
            ${SEED_IDS.profNorte}, ${SEED_IDS.orgNorte}, ${SEED_IDS.userIntruder},
            ${SEED_IDS.locNorte}, ${SEED_IDS.resNorte1},
            'especialista-norte', 'Especialista Norte', 'Medicina Interna', 'CED-1122334', '#0EA5E9',
            'Especialista en Núcleo Norte.',
            'consultorio-norte', 'disconnected', null,
            null, false,
            true, true
          )
      `;

      // 6. Membresías y Alcances (Asistente tiene alcance sobre las 4 especialistas)
      const memLaura = '77777777-7777-4777-8777-777777777771';
      await tx`
        INSERT INTO public.memberships (id, organization_id, user_id, role, full_name, email, initials, is_active)
        VALUES
          (${memLaura}, ${SEED_IDS.orgDemo}, ${SEED_IDS.userLaura}, 'reception', 'Laura · Asistente', 'laura@nucleodemo.mx', 'AS', true),
          ('77777777-7777-4777-8777-777777777772', ${SEED_IDS.orgDemo}, ${SEED_IDS.userAdmin}, 'admin', 'Dirección · Administrador', 'admin@nucleodemo.mx', 'AD', true),
          ('77777777-7777-4777-8777-777777777773', ${SEED_IDS.orgDemo}, ${SEED_IDS.userSofia}, 'professional', 'Ginecóloga', 'sofia@nucleodemo.mx', 'GI', true),
          ('77777777-7777-4777-8777-777777777774', ${SEED_IDS.orgDemo}, ${SEED_IDS.userPablo}, 'professional', 'Internista', 'pablo@nucleodemo.mx', 'IN', true),
          ('77777777-7777-4777-8777-777777777775', ${SEED_IDS.orgDemo}, ${SEED_IDS.userElena}, 'professional', 'Nutrióloga', 'elena@nucleodemo.mx', 'NU', true),
          ('77777777-7777-4777-8777-777777777776', ${SEED_IDS.orgDemo}, ${SEED_IDS.userPsico}, 'professional', 'Psicóloga', 'psicologa@nucleodemo.mx', 'PS', true),
          ('99999999-7777-4777-8777-999999999991', ${SEED_IDS.orgNorte}, ${SEED_IDS.userIntruder}, 'admin', 'Admin Norte', 'intruder@nucleonorte.mx', 'AN', true)
      `;

      for (const profId of [
        SEED_IDS.profSofia,
        SEED_IDS.profPablo,
        SEED_IDS.profElena,
        SEED_IDS.profPsico,
      ]) {
        await tx`
          INSERT INTO public.membership_scopes (organization_id, membership_id, location_id, professional_id, can_schedule, can_collect_payment)
          VALUES (${SEED_IDS.orgDemo}, ${memLaura}, ${SEED_IDS.locRoma}, ${profId}, true, true)
        `;
      }

      // 7. Servicios por especialista (precios en centavos MXN)
      await tx`
        INSERT INTO public.services (
          id, organization_id, professional_id, default_resource_id,
          name, description, duration_minutes, buffer_before_minutes, buffer_after_minutes,
          price_cents, currency, publish_price, is_public, is_active
        )
        VALUES
          (
            ${SEED_IDS.srvSofiaGeneral}, ${SEED_IDS.orgDemo}, ${SEED_IDS.profSofia}, ${SEED_IDS.resCons1},
            'Consulta Ginecológica + Ultrasonido', 'Revisión ginecológica integral con rastreo ultrasonográfico pélvico.',
            30, 0, 0, 120000, 'MXN', true, true, true
          ),
          (
            ${SEED_IDS.srvSofiaCheckup}, ${SEED_IDS.orgDemo}, ${SEED_IDS.profSofia}, ${SEED_IDS.resCons1},
            'Check-up Ginecológico Completo (Papanicolaou + Colposcopía)', 'Toma de citología cervical, colposcopía y exploración mamaria.',
            60, 0, 10, 180000, 'MXN', true, true, true
          ),
          (
            ${SEED_IDS.srvSofiaSharedRoom}, ${SEED_IDS.orgDemo}, ${SEED_IDS.profSofia}, ${SEED_IDS.resCons2},
            'Asesoría Gineco-Endocrina (Consultorio 2)', 'Consulta en Consultorio 2 compartido con Nutrición.',
            30, 0, 0, 140000, 'MXN', true, true, true
          ),
          (
            ${SEED_IDS.srvPabloCardio}, ${SEED_IDS.orgDemo}, ${SEED_IDS.profPablo}, ${SEED_IDS.resCons3},
            'Consulta Medicina Interna Integral', 'Valoración diagnóstica integral, control metabólico e hipertensivo.',
            30, 0, 0, 160000, 'MXN', true, true, true
          ),
          (
            ${SEED_IDS.srvPabloPreop}, ${SEED_IDS.orgDemo}, ${SEED_IDS.profPablo}, ${SEED_IDS.resCons3},
            'Valoración Preoperatoria de Medicina Interna', 'Dictamen clínico y electrocardiográfico de riesgo quirúrgico.',
            60, 0, 0, 240000, 'MXN', true, true, true
          ),
          (
            ${SEED_IDS.srvElenaPrimera}, ${SEED_IDS.orgDemo}, ${SEED_IDS.profElena}, ${SEED_IDS.resCons2},
            'Consulta Nutrición Clínica (1ra vez)', 'Evaluación antropométrica InBody, historia nutricional y plan personalizado.',
            60, 0, 0, 120000, 'MXN', true, true, true
          ),
          (
            ${SEED_IDS.srvElenaSeguimiento}, ${SEED_IDS.orgDemo}, ${SEED_IDS.profElena}, ${SEED_IDS.resCons2},
            'Seguimiento Nutricional y Composición Corporal', 'Control de porcentaje de grasa, masa muscular y ajuste de menú.',
            30, 0, 0, 90000, 'MXN', true, true, true
          ),
          (
            ${SEED_IDS.srvPsicoPrimera}, ${SEED_IDS.orgDemo}, ${SEED_IDS.profPsico}, ${SEED_IDS.resCons4},
            'Primera Entrevista Psicológica', 'Sesión inicial de evaluación clínica y establecimiento de objetivos terapéuticos.',
            60, 0, 0, 100000, 'MXN', true, true, true
          ),
          (
            ${SEED_IDS.srvPsicoSesion}, ${SEED_IDS.orgDemo}, ${SEED_IDS.profPsico}, ${SEED_IDS.resCons4},
            'Sesión de Psicoterapia Individual', 'Sesión de seguimiento psicoterapéutico de 45 minutos.',
            45, 0, 0, 90000, 'MXN', true, true, true
          ),
          (
            ${SEED_IDS.srvNorteGeneral}, ${SEED_IDS.orgNorte}, ${SEED_IDS.profNorte}, ${SEED_IDS.resNorte1},
            'Consulta Medicina Interna Norte', 'Consulta privada de otro núcleo.',
            30, 0, 0, 150000, 'MXN', true, true, true
          )
      `;

      // 8. Horarios semanales (Lunes=1 a Sábado=6, 08:00 a 19:00, comida 14:00 a 15:00)
      for (const profId of [
        SEED_IDS.profSofia,
        SEED_IDS.profPablo,
        SEED_IDS.profElena,
        SEED_IDS.profPsico,
      ]) {
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

      // 9. Pacientes, citas demostrativas y expedientes por especialidad
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
          campaign: 'WhatsApp Asistente',
          tokenRaw: 'demo-token-ana-lopez-001',
          clinical: {
            specialty_type: 'ginecologia',
            chief_complaint: 'Control ginecológico anual y revisión de ultrasonido.',
            evolution_notes: 'Paciente femenina de 32 años. Ciclos regulares 28x4. Ultrasonido endovaginal con útero en AVF de dimensiones normales, endometrio secretor de 8 mm, ovarios sin lesiones.',
            diagnosis: 'Z01.4 Examen ginecológico general (sin hallazgos patológicos)',
            treatment_plan: 'Cita anual de control. Continuar suplementación con ácido fólico y vitamina D.',
            vital_signs: { ta: '110/70', fc: '72 lpm', peso: '61.5 kg', temp: '36.5 °C' },
            specialty_data: { fum: '2026-10-02', gestas: 1, partos: 1, cesareas: 0, abortos: 0, metodo_anticonceptivo: 'DIU Mirena' },
          },
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
          origin: 'referral',
          campaign: 'Doctoralia Sync',
          tokenRaw: 'demo-token-luis-perez-002',
          clinical: {
            specialty_type: 'medicina_interna',
            chief_complaint: 'Seguimiento de hipertensión arterial sistémica y dislipidemia.',
            evolution_notes: 'Paciente masculino de 54 años con adecuado apego a tratamiento antihipertensivo. Laboratorios muestran HbA1c 5.6%, LDL 92 mg/dL, creatinina 0.9 mg/dL.',
            diagnosis: 'I10 Hipertensión esencial controlada · E78.5 Hiperlipidemia mixta en remisión',
            treatment_plan: 'Continuar Telmisartán 40 mg c/24h, Rosuvastatina 10 mg nocturna. Control en 3 meses.',
            vital_signs: { ta: '122/78', fc: '68 lpm', peso: '78.2 kg', spo2: '97%' },
            specialty_data: { riesgo_cardiovascular: 'Moderado-Bajo', ecg_ritmo: 'Sinusal normal 68 lpm' },
          },
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
          paidCents: 60000,
          method: 'transfer',
          origin: 'public_link',
          campaign: 'Enlace Nutrióloga',
          tokenRaw: 'demo-token-maria-torres-003',
          clinical: {
            specialty_type: 'nutricion',
            chief_complaint: 'Control de recomposición corporal y resistencia a la insulina.',
            evolution_notes: 'Reducción de 2.4 kg de masa grasa en 4 semanas conservando masa músculo-esquelética. Buena saciedad con distribución proteica.',
            diagnosis: 'Recomposición corporal favorable · HOMA-IR en descenso',
            treatment_plan: 'Plan hipocalórico moderado 1,650 kcal (30% P / 35% G / 35% HC) + entrenamiento de fuerza 3 días/sem.',
            vital_signs: { ta: '115/75', peso: '66.4 kg', talla: '164 cm', imc: '24.7' },
            specialty_data: { porcentaje_grasa: '27.2%', masa_muscular_kg: '26.8 kg', cintura_cm: '74 cm' },
          },
        },
        {
          id: '88888888-8888-4888-8888-888888888804',
          folio: 'NUC-2026-004',
          patientName: 'Carlos Díaz',
          phone: '+525511112204',
          phoneDisplay: '55 1111 2204',
          email: 'carlos.diaz@ejemplo.mx',
          profId: SEED_IDS.profPsico,
          srvId: SEED_IDS.srvPsicoSesion,
          resId: SEED_IDS.resCons4,
          startsAt: '2026-10-16T10:00:00-06:00',
          endsAt: '2026-10-16T10:45:00-06:00',
          status: 'confirmed',
          priceCents: 90000,
          paidCents: 90000,
          method: 'transfer',
          origin: 'public_link',
          campaign: 'Doctoralia Sync',
          tokenRaw: 'demo-token-carlos-diaz-004',
          clinical: {
            specialty_type: 'psicologia',
            chief_complaint: 'Manejo de estrés laboral y regulación del ciclo de sueño.',
            evolution_notes: 'Sesión #4 de enfoque cognitivo-conductual. El paciente reporta disminución de rumiación nocturna y aplicación de reestructuración cognitiva ante carga directiva.',
            diagnosis: 'F43.2 Trastorno de adaptación con ansiedad leve',
            treatment_plan: 'Continuar sesiones quincenales, registro de pensamientos automáticos e higiene de sueño.',
            vital_signs: { fc: '70 lpm' },
            specialty_data: { enfoque: 'Cognitivo-Conductual', sesion_numero: 4, escala_gad7: '6 (Leve)' },
          },
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
          campaign: 'WhatsApp Asistente',
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
          campaign: 'Directo',
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
          campaign: 'Doctoralia Sync',
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
          campaign: 'Referido Médico',
          tokenRaw: 'demo-token-fernando-008',
        },
        {
          id: '88888888-8888-4888-8888-888888888809',
          folio: 'NUC-2026-009',
          patientName: 'Valeria Ortega',
          phone: '+525511112209',
          phoneDisplay: '55 1111 2209',
          email: 'valeria.ortega@ejemplo.mx',
          profId: SEED_IDS.profPsico,
          srvId: SEED_IDS.srvPsicoPrimera,
          resId: SEED_IDS.resCons4,
          startsAt: '2026-10-16T12:30:00-06:00',
          endsAt: '2026-10-16T13:30:00-06:00',
          status: 'scheduled',
          priceCents: 100000,
          paidCents: 0,
          method: null,
          origin: 'google',
          campaign: 'Doctoralia Sync',
          tokenRaw: 'demo-token-valeria-009',
        },
        {
          id: '88888888-8888-4888-8888-888888888810',
          folio: 'NUC-2026-010',
          patientName: 'Claudia Domínguez',
          phone: '+525511112210',
          phoneDisplay: '55 1111 2210',
          email: 'claudia.dominguez@ejemplo.mx',
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
          campaign: 'WhatsApp Asistente',
          tokenRaw: 'demo-token-ricardo-010',
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
            attendance_status, financial_status, agreed_price_cents, currency,
            origin_channel, campaign_source, created_by
          )
          VALUES (
            ${item.id}, ${SEED_IDS.orgDemo}, ${item.folio}, ${SEED_IDS.locRoma},
            ${item.profId}, ${item.srvId}, ${item.resId}, ${patient.id},
            ${item.startsAt}::timestamptz, ${item.endsAt}::timestamptz,
            ${item.startsAt}::timestamptz, ${item.endsAt}::timestamptz,
            ${item.status}, 'pending', ${item.priceCents}, 'MXN',
            ${item.origin}, ${item.campaign || null}, ${SEED_IDS.userLaura}
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
            'Reserva inicial de demostración', ${SEED_IDS.userLaura}, 'Laura · Asistente'
          )
        `;

        await tx`
          INSERT INTO public.financial_movements (
            organization_id, appointment_id, movement_type, amount_cents, currency,
            beneficiary_type, notes, recorded_by, recorded_by_label, created_at
          )
          VALUES (
            ${SEED_IDS.orgDemo}, ${item.id}, 'charge', ${item.priceCents}, 'MXN',
            'organization', 'Cargo por servicio agendado', ${SEED_IDS.userLaura}, 'Laura · Asistente',
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
              ${item.method}, 'organization', ${'REC-' + item.folio}, 'Cobro registrado por Asistente',
              ${SEED_IDS.userLaura}, 'Laura · Asistente',
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

        if (item.clinical) {
          await tx`
            INSERT INTO public.clinical_records (
              organization_id, patient_id, professional_id, appointment_id,
              specialty_type, chief_complaint, evolution_notes, diagnosis, treatment_plan,
              vital_signs, specialty_data
            )
            VALUES (
              ${SEED_IDS.orgDemo}, ${patient.id}, ${item.profId}, ${item.id},
              ${item.clinical.specialty_type},
              ${item.clinical.chief_complaint},
              ${item.clinical.evolution_notes},
              ${item.clinical.diagnosis},
              ${item.clinical.treatment_plan},
              ${tx.json(item.clinical.vital_signs)},
              ${tx.json(item.clinical.specialty_data)}
            )
          `;
        }
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

    console.log('✅ Datos de demostración actualizados (Ginecóloga, Internista, Nutrióloga, Psicóloga + Asistente).');
  } finally {
    await sql.end();
  }
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFile)) {
  seedDatabase().catch((err) => {
    console.error('❌ Error en seed:', err);
    process.exit(1);
  });
}
