-- =============================================================================
-- Dr Agenda Núcleos — Migración 002:
--   1. Vinculación de WhatsApp Personal por Especialista vía Evolution API
--   2. Configuración de servidor Evolution API por Organización (Núcleo)
--   3. Expedientes Clínicos individuales por especialidad (RLS aislado del rol Asistente)
-- =============================================================================

-- 1. Campos de WhatsApp personal (Evolution API) en cada profesional
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS whatsapp_instance_name TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_status TEXT NOT NULL DEFAULT 'disconnected',
  ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_connected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS whatsapp_auto_confirm BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS whatsapp_auto_reminder_24h BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS whatsapp_auto_reminder_1h BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS doctoralia_url TEXT,
  ADD COLUMN IF NOT EXISTS doctoralia_sync_enabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.professionals
  DROP CONSTRAINT IF EXISTS professionals_whatsapp_status_check;

ALTER TABLE public.professionals
  ADD CONSTRAINT professionals_whatsapp_status_check
  CHECK (whatsapp_status IN ('disconnected', 'connecting', 'qr_ready', 'connected'));

-- 2. Tabla de configuración de integraciones del Núcleo (Evolution API y Doctoralia)
CREATE TABLE IF NOT EXISTS public.organization_integrations (
  organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  evolution_api_url TEXT NOT NULL DEFAULT 'https://whatsapp.dragendas.com',
  evolution_api_key_encrypted TEXT,
  evolution_enabled BOOLEAN NOT NULL DEFAULT true,
  auto_send_enabled BOOLEAN NOT NULL DEFAULT true,
  send_on_booking_created BOOLEAN NOT NULL DEFAULT true,
  send_on_booking_rescheduled BOOLEAN NOT NULL DEFAULT true,
  send_on_booking_cancelled BOOLEAN NOT NULL DEFAULT true,
  send_reminder_24h BOOLEAN NOT NULL DEFAULT true,
  send_reminder_1h BOOLEAN NOT NULL DEFAULT true,
  confirm_template TEXT NOT NULL DEFAULT 'Hola {{paciente}}, le saludamos del consultorio de *{{especialista}}*. Su cita para *{{servicio}}* quedó agendada el *{{fecha}}* a las *{{hora}} hrs*. Para confirmar, reprogramar o cancelar su cita ingrese a: {{enlace}}',
  reschedule_template TEXT NOT NULL DEFAULT 'Hola {{paciente}}, su cita con *{{especialista}}* ha sido reprogramada para el *{{fecha}}* a las *{{hora}} hrs*.',
  cancel_template TEXT NOT NULL DEFAULT 'Hola {{paciente}}, le informamos que su cita con *{{especialista}}* del *{{fecha}} ({{hora}} hrs)* ha sido cancelada.',
  reminder_24h_template TEXT NOT NULL DEFAULT 'Hola {{paciente}}, recordatorio 24h de su cita con *{{especialista}}* mañana *{{fecha}}* a las *{{hora}} hrs*. Confirme su asistencia aquí: {{enlace}}',
  reminder_1h_template TEXT NOT NULL DEFAULT 'Hola {{paciente}}, le esperamos en 1 hora (*{{hora}} hrs*) para su consulta con *{{especialista}}* en *{{sede}}*.',
  custom_confirm_template TEXT NOT NULL DEFAULT 'Hola {{paciente}}, le saludamos del consultorio de *{{especialista}}*. Su cita para *{{servicio}}* quedó agendada el *{{fecha}}* a las *{{hora}} hrs*. Para confirmar, reprogramar o cancelar su cita ingrese a: {{enlace}}',
  custom_reminder_template TEXT NOT NULL DEFAULT 'Hola {{paciente}}, recordatorio de su cita con *{{especialista}}* mañana *{{fecha}}* a las *{{hora}} hrs*. Confirme su asistencia aquí: {{enlace}}',
  custom_cancel_template TEXT NOT NULL DEFAULT 'Hola {{paciente}}, le informamos que su cita con *{{especialista}}* del *{{fecha}} ({{hora}} hrs)* ha sido cancelada.',
  doctoralia_bridge_mode TEXT NOT NULL DEFAULT 'email_webhook',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.organization_integrations
  ADD COLUMN IF NOT EXISTS auto_send_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS confirm_template TEXT NOT NULL DEFAULT 'Hola {{paciente}}, le saludamos del consultorio de *{{especialista}}*. Su cita para *{{servicio}}* quedó agendada el *{{fecha}}* a las *{{hora}} hrs*. Para confirmar, reprogramar o cancelar su cita ingrese a: {{enlace}}',
  ADD COLUMN IF NOT EXISTS reschedule_template TEXT NOT NULL DEFAULT 'Hola {{paciente}}, su cita con *{{especialista}}* ha sido reprogramada para el *{{fecha}}* a las *{{hora}} hrs*.',
  ADD COLUMN IF NOT EXISTS cancel_template TEXT NOT NULL DEFAULT 'Hola {{paciente}}, le informamos que su cita con *{{especialista}}* del *{{fecha}} ({{hora}} hrs)* ha sido cancelada.',
  ADD COLUMN IF NOT EXISTS reminder_24h_template TEXT NOT NULL DEFAULT 'Hola {{paciente}}, recordatorio 24h de su cita con *{{especialista}}* mañana *{{fecha}}* a las *{{hora}} hrs*. Confirme su asistencia aquí: {{enlace}}',
  ADD COLUMN IF NOT EXISTS reminder_1h_template TEXT NOT NULL DEFAULT 'Hola {{paciente}}, le esperamos en 1 hora (*{{hora}} hrs*) para su consulta con *{{especialista}}* en *{{sede}}*.';

ALTER TABLE public.organization_integrations
  DROP CONSTRAINT IF EXISTS organization_integrations_doctoralia_bridge_mode_check;

ALTER TABLE public.organization_integrations
  ADD CONSTRAINT organization_integrations_doctoralia_bridge_mode_check
  CHECK (doctoralia_bridge_mode IN ('disabled', 'google_calendar', 'email_webhook', 'email_and_ics', 'docplanner_api'));

ALTER TABLE public.organization_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_integrations FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_integrations TO authenticated, service_role;

DROP POLICY IF EXISTS org_integrations_select ON public.organization_integrations;
CREATE POLICY org_integrations_select ON public.organization_integrations
  FOR SELECT TO authenticated
  USING (public.user_has_org_membership(organization_id));

DROP POLICY IF EXISTS org_integrations_write ON public.organization_integrations;
CREATE POLICY org_integrations_write ON public.organization_integrations
  FOR ALL TO authenticated
  USING (public.user_org_role(organization_id) IN ('admin', 'reception'))
  WITH CHECK (public.user_org_role(organization_id) IN ('admin', 'reception'));

-- 3. Tabla de Expedientes Clínicos por Especialidad (Aislado por especialista; Asistente NO tiene lectura clínica)
CREATE TABLE IF NOT EXISTS public.clinical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  patient_id UUID NOT NULL,
  professional_id UUID NOT NULL,
  appointment_id UUID,
  specialty_type TEXT NOT NULL DEFAULT 'general'
    CHECK (specialty_type IN ('ginecologia', 'medicina_interna', 'nutricion', 'psicologia', 'general')),
  chief_complaint TEXT NOT NULL,
  evolution_notes TEXT NOT NULL DEFAULT '',
  subjective_notes TEXT,
  objective_notes TEXT,
  diagnosis TEXT,
  treatment_plan TEXT,
  vital_signs JSONB NOT NULL DEFAULT '{}'::jsonb,
  specialty_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id),
  FOREIGN KEY (patient_id, organization_id) REFERENCES public.patients(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (professional_id, organization_id) REFERENCES public.professionals(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (appointment_id, organization_id) REFERENCES public.appointments(id, organization_id) ON DELETE SET NULL
);

ALTER TABLE public.clinical_records
  ADD COLUMN IF NOT EXISTS evolution_notes TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS subjective_notes TEXT,
  ADD COLUMN IF NOT EXISTS objective_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_clinical_records_prof_pat
  ON public.clinical_records(organization_id, professional_id, patient_id, created_at DESC);

ALTER TABLE public.clinical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_records FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.clinical_records TO authenticated, service_role;

-- Política crítica de privacidad médica:
-- Solo el especialista titular de ese expediente (o el director médico admin) puede leer/escribir notas clínicas.
-- La Asistente ('reception') NO puede consultar el contenido clínico/psicológico/ginecológico.
DROP POLICY IF EXISTS clinical_records_specialist_isolation ON public.clinical_records;
CREATE POLICY clinical_records_specialist_isolation ON public.clinical_records
  FOR ALL TO authenticated
  USING (
    public.user_has_org_membership(organization_id)
    AND (
      public.user_org_role(organization_id) = 'admin'
      OR (
        public.user_org_role(organization_id) = 'professional'
        AND EXISTS (
          SELECT 1 FROM public.professionals p
          WHERE p.id = clinical_records.professional_id
            AND p.organization_id = clinical_records.organization_id
            AND p.user_id = auth.uid()
        )
      )
    )
  )
  WITH CHECK (
    public.user_has_org_membership(organization_id)
    AND (
      public.user_org_role(organization_id) = 'admin'
      OR (
        public.user_org_role(organization_id) = 'professional'
        AND EXISTS (
          SELECT 1 FROM public.professionals p
          WHERE p.id = clinical_records.professional_id
            AND p.organization_id = clinical_records.organization_id
            AND p.user_id = auth.uid()
        )
      )
    )
  );

