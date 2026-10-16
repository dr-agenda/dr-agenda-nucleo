-- =============================================================================
-- Dr Agenda Núcleos — Migración Inicial P0
-- Archivo: supabase/migrations/20261016000001_init_dr_agenda_nucleos.sql
-- Descripción:
--   - Esquema multitenant con aislamiento estricto por organization_id
--   - Llaves foráneas compuestas (id, organization_id) que impiden cruces entre núcleos
--   - Restricciones de exclusión GiST (btree_gist) para impedir reservas simultáneas
--     del mismo profesional o del mismo consultorio/recurso y colisiones con bloqueos
--   - Separación estricta entre estado de atención y estado financiero
--   - Triggers de inmutabilidad en movimientos financieros, historial y auditoría
--   - Políticas Row Level Security (RLS) activas y forzadas en todas las tablas
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- -----------------------------------------------------------------------------
-- 0. Compatibilidad de Esquema Auth (Supabase Cloud / Local CLI / PostgreSQL)
-- -----------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS auth;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  encrypted_password TEXT NOT NULL,
  raw_user_meta_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.sub', true), ''),
    (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid;
$$;

CREATE OR REPLACE FUNCTION auth.jwt()
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claims', true), '')::jsonb,
    '{}'::jsonb
  );
$$;

-- -----------------------------------------------------------------------------
-- 1. Organizaciones (Núcleos) y Sedes (Locations)
-- -----------------------------------------------------------------------------
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9-]+$'),
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'MXN' CHECK (currency = 'MXN'),
  default_timezone TEXT NOT NULL DEFAULT 'America/Mexico_City',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),
  settings JSONB NOT NULL DEFAULT '{"min_advance_minutes": 15, "max_horizon_days": 90, "cancellation_notice_hours": 12}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  slug TEXT NOT NULL CHECK (slug ~ '^[a-z0-9-]+$'),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/Mexico_City',
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id),
  UNIQUE (organization_id, slug)
);

-- -----------------------------------------------------------------------------
-- 2. Membresías, Roles y Alcances (Scopes)
-- -----------------------------------------------------------------------------
CREATE TABLE public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'reception', 'professional', 'cashier')),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  initials TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id),
  UNIQUE (organization_id, user_id)
);

-- -----------------------------------------------------------------------------
-- 3. Recursos Físicos (Consultorios / Equipos)
-- -----------------------------------------------------------------------------
CREATE TABLE public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  location_id UUID NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'consultorio' CHECK (type IN ('consultorio', 'equipo')),
  capacity INTEGER NOT NULL DEFAULT 1 CHECK (capacity = 1),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id),
  UNIQUE (organization_id, location_id, code),
  FOREIGN KEY (location_id, organization_id) REFERENCES public.locations(id, organization_id) ON DELETE RESTRICT
);

-- -----------------------------------------------------------------------------
-- 4. Profesionales de la Salud
-- -----------------------------------------------------------------------------
CREATE TABLE public.professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  default_location_id UUID NOT NULL,
  default_resource_id UUID,
  slug TEXT NOT NULL CHECK (slug ~ '^[a-z0-9-]+$'),
  full_name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  license_number TEXT,
  color_hex TEXT NOT NULL DEFAULT '#10B981',
  bio TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id),
  UNIQUE (organization_id, slug),
  UNIQUE (organization_id, user_id),
  FOREIGN KEY (default_location_id, organization_id) REFERENCES public.locations(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (default_resource_id, organization_id) REFERENCES public.resources(id, organization_id) ON DELETE RESTRICT
);

-- Alcances por recepcionista o miembro (qué profesionales y sedes puede operar)
CREATE TABLE public.membership_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  membership_id UUID NOT NULL,
  location_id UUID,
  professional_id UUID,
  can_schedule BOOLEAN NOT NULL DEFAULT true,
  can_collect_payment BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (membership_id, organization_id) REFERENCES public.memberships(id, organization_id) ON DELETE CASCADE,
  FOREIGN KEY (location_id, organization_id) REFERENCES public.locations(id, organization_id) ON DELETE CASCADE,
  FOREIGN KEY (professional_id, organization_id) REFERENCES public.professionals(id, organization_id) ON DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- 5. Catálogo de Servicios por Profesional
-- -----------------------------------------------------------------------------
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  professional_id UUID NOT NULL,
  default_resource_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes >= 10 AND duration_minutes <= 480),
  buffer_before_minutes INTEGER NOT NULL DEFAULT 0 CHECK (buffer_before_minutes >= 0 AND buffer_before_minutes <= 120),
  buffer_after_minutes INTEGER NOT NULL DEFAULT 0 CHECK (buffer_after_minutes >= 0 AND buffer_after_minutes <= 120),
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'MXN' CHECK (currency = 'MXN'),
  publish_price BOOLEAN NOT NULL DEFAULT true,
  is_public BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id),
  FOREIGN KEY (professional_id, organization_id) REFERENCES public.professionals(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (default_resource_id, organization_id) REFERENCES public.resources(id, organization_id) ON DELETE RESTRICT
);

-- -----------------------------------------------------------------------------
-- 6. Reglas de Disponibilidad Semanal y Excepciones/Bloqueos
-- -----------------------------------------------------------------------------
CREATE TABLE public.availability_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  professional_id UUID NOT NULL,
  location_id UUID NOT NULL,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Domingo, 1=Lunes ... 6=Sábado
  start_local_time TIME NOT NULL,
  end_local_time TIME NOT NULL,
  break_start_local_time TIME,
  break_end_local_time TIME,
  slot_interval_minutes INTEGER NOT NULL DEFAULT 30 CHECK (slot_interval_minutes IN (10, 15, 20, 30, 45, 60)),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_local_time > start_local_time),
  CHECK (
    (break_start_local_time IS NULL AND break_end_local_time IS NULL) OR
    (break_start_local_time IS NOT NULL AND break_end_local_time IS NOT NULL AND break_end_local_time > break_start_local_time)
  ),
  UNIQUE (id, organization_id),
  FOREIGN KEY (professional_id, organization_id) REFERENCES public.professionals(id, organization_id) ON DELETE CASCADE,
  FOREIGN KEY (location_id, organization_id) REFERENCES public.locations(id, organization_id) ON DELETE CASCADE
);

CREATE TABLE public.availability_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  professional_id UUID NOT NULL,
  location_id UUID NOT NULL,
  resource_id UUID,
  kind TEXT NOT NULL DEFAULT 'block' CHECK (kind IN ('block', 'vacation', 'break', 'meeting')),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  reason TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  UNIQUE (id, organization_id),
  FOREIGN KEY (professional_id, organization_id) REFERENCES public.professionals(id, organization_id) ON DELETE CASCADE,
  FOREIGN KEY (location_id, organization_id) REFERENCES public.locations(id, organization_id) ON DELETE CASCADE,
  FOREIGN KEY (resource_id, organization_id) REFERENCES public.resources(id, organization_id) ON DELETE SET NULL
);

-- -----------------------------------------------------------------------------
-- 7. Pacientes y Contactos Responsables (Sin usar teléfono como ID único)
-- -----------------------------------------------------------------------------
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  full_name TEXT NOT NULL,
  phone_normalized TEXT NOT NULL,
  phone_display TEXT NOT NULL,
  email TEXT,
  notes_admin TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id)
);

CREATE INDEX idx_patients_org_phone ON public.patients(organization_id, phone_normalized);
CREATE INDEX idx_patients_org_name ON public.patients(organization_id, full_name);

CREATE TABLE public.patient_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  patient_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  phone_display TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id),
  FOREIGN KEY (patient_id, organization_id) REFERENCES public.patients(id, organization_id) ON DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- 8. Citas (Appointments) y Ocupación Unificada de Recursos
-- -----------------------------------------------------------------------------
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  folio TEXT NOT NULL,
  location_id UUID NOT NULL,
  professional_id UUID NOT NULL,
  service_id UUID NOT NULL,
  resource_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  contact_id UUID,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  occupied_starts_at TIMESTAMPTZ NOT NULL,
  occupied_ends_at TIMESTAMPTZ NOT NULL,
  attendance_status TEXT NOT NULL DEFAULT 'scheduled' CHECK (
    attendance_status IN (
      'scheduled',
      'confirmed',
      'waiting',
      'in_consultation',
      'completed',
      'cancelled',
      'no_show'
    )
  ),
  financial_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    financial_status IN (
      'pending',
      'partial',
      'paid',
      'partially_refunded',
      'refunded',
      'no_charge'
    )
  ),
  agreed_price_cents INTEGER NOT NULL CHECK (agreed_price_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'MXN' CHECK (currency = 'MXN'),
  origin_channel TEXT NOT NULL DEFAULT 'reception' CHECK (
    origin_channel IN (
      'public_link',
      'whatsapp_manual',
      'phone',
      'reception',
      'facebook',
      'google',
      'referral'
    )
  ),
  campaign_source TEXT,
  admin_notes TEXT,
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES auth.users(id),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  CHECK (occupied_ends_at >= ends_at AND occupied_starts_at <= starts_at),
  UNIQUE (id, organization_id),
  UNIQUE (organization_id, folio),
  FOREIGN KEY (location_id, organization_id) REFERENCES public.locations(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (professional_id, organization_id) REFERENCES public.professionals(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (service_id, organization_id) REFERENCES public.services(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (resource_id, organization_id) REFERENCES public.resources(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (patient_id, organization_id) REFERENCES public.patients(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (contact_id, organization_id) REFERENCES public.patient_contacts(id, organization_id) ON DELETE SET NULL,
  -- Restricción de exclusión GiST #1: Ningún profesional puede tener dos citas activas traslapadas
  CONSTRAINT appointments_no_prof_overlap EXCLUDE USING gist (
    professional_id WITH =,
    tstzrange(occupied_starts_at, occupied_ends_at, '[)') WITH &&
  ) WHERE (attendance_status <> 'cancelled'),
  -- Restricción de exclusión GiST #2: Ningún consultorio/recurso puede tener dos citas activas traslapadas
  CONSTRAINT appointments_no_resource_overlap EXCLUDE USING gist (
    resource_id WITH =,
    tstzrange(occupied_starts_at, occupied_ends_at, '[)') WITH &&
  ) WHERE (attendance_status <> 'cancelled')
);

CREATE INDEX idx_appointments_org_prof_starts ON public.appointments(organization_id, professional_id, starts_at);
CREATE INDEX idx_appointments_org_loc_starts ON public.appointments(organization_id, location_id, starts_at);

-- Tabla común de ocupación (citas + bloqueos) para evitar condiciones de carrera entre reservar y bloquear
CREATE TABLE public.resource_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  professional_id UUID NOT NULL,
  resource_id UUID,
  appointment_id UUID,
  exception_id UUID,
  kind TEXT NOT NULL CHECK (kind IN ('appointment', 'block')),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'released')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  UNIQUE (id, organization_id),
  FOREIGN KEY (professional_id, organization_id) REFERENCES public.professionals(id, organization_id) ON DELETE CASCADE,
  FOREIGN KEY (resource_id, organization_id) REFERENCES public.resources(id, organization_id) ON DELETE CASCADE,
  FOREIGN KEY (appointment_id, organization_id) REFERENCES public.appointments(id, organization_id) ON DELETE CASCADE,
  FOREIGN KEY (exception_id, organization_id) REFERENCES public.availability_exceptions(id, organization_id) ON DELETE CASCADE,
  -- Restricción GiST #3: Impide carrera entre cita y bloqueo del mismo profesional
  CONSTRAINT resource_reservations_no_prof_overlap EXCLUDE USING gist (
    professional_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  ) WHERE (status = 'active'),
  -- Restricción GiST #4: Impide carrera entre cita y bloqueo del mismo consultorio/recurso
  CONSTRAINT resource_reservations_no_resource_overlap EXCLUDE USING gist (
    resource_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  ) WHERE (status = 'active' AND resource_id IS NOT NULL)
);

-- -----------------------------------------------------------------------------
-- 9. Historial de Eventos de la Cita (Inmutable)
-- -----------------------------------------------------------------------------
CREATE TABLE public.appointment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  appointment_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'created',
      'rescheduled',
      'status_changed',
      'cancelled',
      'payment_recorded',
      'payment_reversed'
    )
  ),
  previous_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  new_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  reason TEXT,
  actor_user_id UUID REFERENCES auth.users(id),
  actor_label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (appointment_id, organization_id) REFERENCES public.appointments(id, organization_id) ON DELETE RESTRICT
);

CREATE INDEX idx_appointment_events_appt ON public.appointment_events(organization_id, appointment_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 10. Movimientos Financieros (Libro Mayor Inmutable en Centavos MXN)
-- -----------------------------------------------------------------------------
CREATE TABLE public.financial_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  appointment_id UUID NOT NULL,
  movement_type TEXT NOT NULL CHECK (
    movement_type IN ('charge', 'discount', 'payment', 'refund', 'adjustment', 'reversal')
  ),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'MXN' CHECK (currency = 'MXN'),
  payment_method TEXT CHECK (payment_method IN ('cash', 'transfer', 'card', 'other')),
  beneficiary_type TEXT NOT NULL DEFAULT 'organization' CHECK (beneficiary_type IN ('organization', 'professional')),
  reference_code TEXT,
  notes TEXT,
  related_movement_id UUID,
  recorded_by UUID REFERENCES auth.users(id),
  recorded_by_label TEXT NOT NULL DEFAULT 'Sistema',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, organization_id),
  FOREIGN KEY (appointment_id, organization_id) REFERENCES public.appointments(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (related_movement_id, organization_id) REFERENCES public.financial_movements(id, organization_id) ON DELETE RESTRICT
);

CREATE INDEX idx_financial_movements_org_appt ON public.financial_movements(organization_id, appointment_id, created_at);
CREATE INDEX idx_financial_movements_org_date ON public.financial_movements(organization_id, created_at);

-- -----------------------------------------------------------------------------
-- 11. Consentimientos, Tokens de Gestión, Outbox/Recordatorios, Idempotencia y Auditoría
-- -----------------------------------------------------------------------------
CREATE TABLE public.consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  patient_id UUID NOT NULL,
  appointment_id UUID,
  purpose TEXT NOT NULL CHECK (purpose IN ('operational_booking', 'marketing')),
  policy_version TEXT NOT NULL DEFAULT 'v1.0-2026-10',
  accepted BOOLEAN NOT NULL DEFAULT true,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (patient_id, organization_id) REFERENCES public.patients(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (appointment_id, organization_id) REFERENCES public.appointments(id, organization_id) ON DELETE SET NULL
);

CREATE TABLE public.management_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  appointment_id UUID NOT NULL,
  token_hash TEXT UNIQUE NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['read', 'confirm', 'reschedule', 'cancel'],
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (appointment_id, organization_id) REFERENCES public.appointments(id, organization_id) ON DELETE CASCADE
);

CREATE TABLE public.notification_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  appointment_id UUID NOT NULL,
  appointment_version INTEGER NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  job_type TEXT NOT NULL CHECK (job_type IN ('booking_confirmation', 'reminder_24h', 'reminder_1h', 'rescheduled', 'cancelled')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'sent', 'failed', 'cancelled_obsolete', 'skipped_past')
  ),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  idempotency_key TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (appointment_id, organization_id) REFERENCES public.appointments(id, organization_id) ON DELETE CASCADE
);

CREATE TABLE public.outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  aggregate_type TEXT NOT NULL,
  aggregate_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE TABLE public.idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  scope TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_status INTEGER NOT NULL,
  response_body JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  UNIQUE (organization_id, scope, idempotency_key)
);

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  actor_user_id UUID REFERENCES auth.users(id),
  actor_role TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  before_sanitized JSONB NOT NULL DEFAULT '{}'::jsonb,
  after_sanitized JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 12. Triggers de Inmutabilidad (Prohibido borrar o alterar movimientos/auditoría)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_immutable_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Operación no permitida: la tabla % es inmutable por auditoría financiera y clínica. Registre un ajuste o reverso.', TG_TABLE_NAME
    USING ERRCODE = '42501';
END;
$$;

CREATE TRIGGER trg_financial_movements_immutable
BEFORE UPDATE OR DELETE ON public.financial_movements
FOR EACH ROW EXECUTE FUNCTION public.prevent_immutable_modification();

CREATE TRIGGER trg_appointment_events_immutable
BEFORE UPDATE OR DELETE ON public.appointment_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_immutable_modification();

CREATE TRIGGER trg_audit_logs_immutable
BEFORE UPDATE OR DELETE ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION public.prevent_immutable_modification();

-- -----------------------------------------------------------------------------
-- 13. Funciones Auxiliares de Autorización y Cálculo Financiero
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalculate_appointment_financial_status(
  p_organization_id UUID,
  p_appointment_id UUID
)
RETURNS TABLE (
  charges_cents INTEGER,
  discounts_cents INTEGER,
  payments_cents INTEGER,
  refunds_cents INTEGER,
  reversals_cents INTEGER,
  net_charged_cents INTEGER,
  net_paid_cents INTEGER,
  balance_cents INTEGER,
  computed_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_charges INTEGER := 0;
  v_discounts INTEGER := 0;
  v_payments INTEGER := 0;
  v_refunds INTEGER := 0;
  v_reversals INTEGER := 0;
  v_adjustments INTEGER := 0;
  v_net_charged INTEGER := 0;
  v_net_paid INTEGER := 0;
  v_balance INTEGER := 0;
  v_status TEXT := 'pending';
BEGIN
  SELECT
    COALESCE(SUM(CASE WHEN movement_type = 'charge' THEN amount_cents ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN movement_type = 'discount' THEN amount_cents ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN movement_type = 'payment' THEN amount_cents ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN movement_type = 'refund' THEN amount_cents ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN movement_type = 'reversal' THEN amount_cents ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN movement_type = 'adjustment' THEN amount_cents ELSE 0 END), 0)
  INTO v_charges, v_discounts, v_payments, v_refunds, v_reversals, v_adjustments
  FROM public.financial_movements
  WHERE organization_id = p_organization_id
    AND appointment_id = p_appointment_id;

  v_net_charged := GREATEST(0, v_charges - v_discounts - v_adjustments);
  v_net_paid := GREATEST(0, v_payments - v_reversals - v_refunds);
  v_balance := GREATEST(0, v_net_charged - v_net_paid);

  IF v_net_charged = 0 THEN
    v_status := 'no_charge';
  ELSIF v_refunds > 0 AND v_net_paid = 0 THEN
    v_status := 'refunded';
  ELSIF v_refunds > 0 AND v_net_paid > 0 AND v_balance > 0 THEN
    v_status := 'partially_refunded';
  ELSIF v_net_paid >= v_net_charged THEN
    v_status := 'paid';
  ELSIF v_net_paid > 0 THEN
    v_status := 'partial';
  ELSE
    v_status := 'pending';
  END IF;

  UPDATE public.appointments
  SET financial_status = v_status,
      updated_at = now()
  WHERE id = p_appointment_id
    AND organization_id = p_organization_id;

  RETURN QUERY SELECT
    v_charges,
    v_discounts,
    v_payments,
    v_refunds,
    v_reversals,
    v_net_charged,
    v_net_paid,
    v_balance,
    v_status;
END;
$$;

-- Funciones para políticas RLS basadas en auth.uid()
CREATE OR REPLACE FUNCTION public.user_has_org_membership(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships m
    JOIN auth.users u ON u.id = m.user_id
    WHERE m.organization_id = p_org_id
      AND m.user_id = auth.uid()
      AND m.is_active = true
      AND u.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.user_org_role(p_org_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT m.role
  FROM public.memberships m
  JOIN auth.users u ON u.id = m.user_id
  WHERE m.organization_id = p_org_id
    AND m.user_id = auth.uid()
    AND m.is_active = true
    AND u.is_active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.user_can_access_professional(p_org_id UUID, p_prof_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships m
    JOIN auth.users u ON u.id = m.user_id
    LEFT JOIN public.professionals p ON p.organization_id = m.organization_id AND p.user_id = m.user_id
    WHERE m.organization_id = p_org_id
      AND m.user_id = auth.uid()
      AND m.is_active = true
      AND u.is_active = true
      AND (
        m.role IN ('admin', 'cashier')
        OR (m.role = 'professional' AND p.id = p_prof_id AND p.is_active = true)
        OR (
          m.role = 'reception' AND (
            NOT EXISTS (SELECT 1 FROM public.membership_scopes ms WHERE ms.membership_id = m.id)
            OR EXISTS (
              SELECT 1 FROM public.membership_scopes ms
              WHERE ms.membership_id = m.id
                AND (ms.professional_id IS NULL OR ms.professional_id = p_prof_id)
            )
          )
        )
      )
  );
$$;

-- -----------------------------------------------------------------------------
-- 14. Políticas Row Level Security (RLS) Activas y Forzadas
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'organizations',
    'locations',
    'memberships',
    'membership_scopes',
    'resources',
    'professionals',
    'services',
    'availability_rules',
    'availability_exceptions',
    'patients',
    'patient_contacts',
    'appointments',
    'resource_reservations',
    'appointment_events',
    'financial_movements',
    'consents',
    'management_tokens',
    'notification_jobs',
    'outbox_events',
    'idempotency_keys',
    'audit_logs'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated, service_role;', t);
  END LOOP;
END
$$;

-- Políticas de lectura y escritura aisladas por organización y rol
CREATE POLICY org_isolation_select ON public.organizations
  FOR SELECT TO authenticated
  USING (public.user_has_org_membership(id));

CREATE POLICY org_isolation_update ON public.organizations
  FOR UPDATE TO authenticated
  USING (public.user_org_role(id) = 'admin')
  WITH CHECK (public.user_org_role(id) = 'admin');

CREATE POLICY locations_isolation ON public.locations
  FOR ALL TO authenticated
  USING (public.user_has_org_membership(organization_id))
  WITH CHECK (public.user_org_role(organization_id) = 'admin');

CREATE POLICY memberships_isolation_select ON public.memberships
  FOR SELECT TO authenticated
  USING (public.user_has_org_membership(organization_id));

CREATE POLICY memberships_isolation_write ON public.memberships
  FOR ALL TO authenticated
  USING (public.user_org_role(organization_id) = 'admin')
  WITH CHECK (public.user_org_role(organization_id) = 'admin');

CREATE POLICY membership_scopes_isolation ON public.membership_scopes
  FOR ALL TO authenticated
  USING (public.user_has_org_membership(organization_id))
  WITH CHECK (public.user_org_role(organization_id) = 'admin');

CREATE POLICY resources_isolation_select ON public.resources
  FOR SELECT TO authenticated
  USING (public.user_has_org_membership(organization_id));

CREATE POLICY resources_isolation_write ON public.resources
  FOR ALL TO authenticated
  USING (public.user_org_role(organization_id) = 'admin')
  WITH CHECK (public.user_org_role(organization_id) = 'admin');

CREATE POLICY professionals_isolation_select ON public.professionals
  FOR SELECT TO authenticated
  USING (public.user_has_org_membership(organization_id));

CREATE POLICY professionals_isolation_write ON public.professionals
  FOR ALL TO authenticated
  USING (
    public.user_org_role(organization_id) = 'admin'
    OR (public.user_org_role(organization_id) = 'professional' AND user_id = auth.uid())
  )
  WITH CHECK (
    public.user_org_role(organization_id) = 'admin'
    OR (public.user_org_role(organization_id) = 'professional' AND user_id = auth.uid())
  );

CREATE POLICY services_isolation_select ON public.services
  FOR SELECT TO authenticated
  USING (public.user_has_org_membership(organization_id));

CREATE POLICY services_isolation_write ON public.services
  FOR ALL TO authenticated
  USING (
    public.user_org_role(organization_id) = 'admin'
    OR public.user_can_access_professional(organization_id, professional_id)
  )
  WITH CHECK (
    public.user_org_role(organization_id) = 'admin'
    OR public.user_can_access_professional(organization_id, professional_id)
  );

CREATE POLICY availability_rules_isolation_select ON public.availability_rules
  FOR SELECT TO authenticated
  USING (public.user_has_org_membership(organization_id));

CREATE POLICY availability_rules_isolation_write ON public.availability_rules
  FOR ALL TO authenticated
  USING (public.user_can_access_professional(organization_id, professional_id))
  WITH CHECK (public.user_can_access_professional(organization_id, professional_id));

CREATE POLICY availability_exceptions_isolation ON public.availability_exceptions
  FOR ALL TO authenticated
  USING (public.user_can_access_professional(organization_id, professional_id))
  WITH CHECK (public.user_can_access_professional(organization_id, professional_id));

-- Pacientes: un profesional solo ve pacientes vinculados a sus citas; recepción y admin ven los de su núcleo
CREATE POLICY patients_isolation_select ON public.patients
  FOR SELECT TO authenticated
  USING (
    public.user_has_org_membership(organization_id) AND (
      public.user_org_role(organization_id) IN ('admin', 'reception', 'cashier')
      OR EXISTS (
        SELECT 1
        FROM public.appointments a
        WHERE a.organization_id = patients.organization_id
          AND a.patient_id = patients.id
          AND public.user_can_access_professional(a.organization_id, a.professional_id)
      )
    )
  );

CREATE POLICY patients_isolation_write ON public.patients
  FOR ALL TO authenticated
  USING (
    public.user_has_org_membership(organization_id)
    AND public.user_org_role(organization_id) IN ('admin', 'reception')
  )
  WITH CHECK (
    public.user_has_org_membership(organization_id)
    AND public.user_org_role(organization_id) IN ('admin', 'reception')
  );

CREATE POLICY patient_contacts_isolation ON public.patient_contacts
  FOR ALL TO authenticated
  USING (public.user_has_org_membership(organization_id))
  WITH CHECK (public.user_has_org_membership(organization_id));

-- Citas: un profesional solo puede leer y modificar citas de su propia agenda (A11);
-- un usuario de otro núcleo no puede leer ni modificar nada (A10).
CREATE POLICY appointments_isolation_select ON public.appointments
  FOR SELECT TO authenticated
  USING (public.user_can_access_professional(organization_id, professional_id));

CREATE POLICY appointments_isolation_write ON public.appointments
  FOR ALL TO authenticated
  USING (public.user_can_access_professional(organization_id, professional_id))
  WITH CHECK (public.user_can_access_professional(organization_id, professional_id));

CREATE POLICY resource_reservations_isolation ON public.resource_reservations
  FOR ALL TO authenticated
  USING (public.user_has_org_membership(organization_id))
  WITH CHECK (public.user_can_access_professional(organization_id, professional_id));

CREATE POLICY appointment_events_isolation_select ON public.appointment_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = appointment_events.appointment_id
        AND a.organization_id = appointment_events.organization_id
        AND public.user_can_access_professional(a.organization_id, a.professional_id)
    )
  );

CREATE POLICY appointment_events_isolation_insert ON public.appointment_events
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = appointment_events.appointment_id
        AND a.organization_id = appointment_events.organization_id
        AND public.user_can_access_professional(a.organization_id, a.professional_id)
    )
  );

CREATE POLICY financial_movements_isolation_select ON public.financial_movements
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = financial_movements.appointment_id
        AND a.organization_id = financial_movements.organization_id
        AND public.user_can_access_professional(a.organization_id, a.professional_id)
    )
  );

CREATE POLICY financial_movements_isolation_insert ON public.financial_movements
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_has_org_membership(organization_id)
    AND public.user_org_role(organization_id) IN ('admin', 'reception', 'cashier')
  );

CREATE POLICY consents_isolation ON public.consents
  FOR ALL TO authenticated
  USING (public.user_has_org_membership(organization_id))
  WITH CHECK (public.user_has_org_membership(organization_id));

CREATE POLICY management_tokens_isolation ON public.management_tokens
  FOR ALL TO authenticated
  USING (public.user_has_org_membership(organization_id))
  WITH CHECK (public.user_has_org_membership(organization_id));

CREATE POLICY notification_jobs_isolation ON public.notification_jobs
  FOR ALL TO authenticated
  USING (public.user_has_org_membership(organization_id))
  WITH CHECK (public.user_has_org_membership(organization_id));

CREATE POLICY outbox_events_isolation ON public.outbox_events
  FOR ALL TO authenticated
  USING (public.user_has_org_membership(organization_id))
  WITH CHECK (public.user_has_org_membership(organization_id));

CREATE POLICY idempotency_keys_isolation ON public.idempotency_keys
  FOR ALL TO authenticated
  USING (public.user_has_org_membership(organization_id))
  WITH CHECK (public.user_has_org_membership(organization_id));

CREATE POLICY audit_logs_isolation_select ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    public.user_has_org_membership(organization_id)
    AND public.user_org_role(organization_id) IN ('admin', 'reception')
  );

CREATE POLICY audit_logs_isolation_insert ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_org_membership(organization_id));

