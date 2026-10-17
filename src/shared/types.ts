export type UserRole = 'admin' | 'reception' | 'professional' | 'cashier';

export type AttendanceStatus =
  | 'scheduled'
  | 'confirmed'
  | 'waiting'
  | 'in_consultation'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type FinancialStatus =
  | 'pending'
  | 'partial'
  | 'paid'
  | 'partially_refunded'
  | 'refunded'
  | 'no_charge';

export type MovementType =
  | 'charge'
  | 'discount'
  | 'payment'
  | 'refund'
  | 'adjustment'
  | 'reversal';

export type PaymentMethod = 'cash' | 'transfer' | 'card' | 'other';

export type OriginChannel =
  | 'public_link'
  | 'whatsapp_manual'
  | 'phone'
  | 'reception'
  | 'facebook'
  | 'google'
  | 'referral';

export interface AuthSessionUser {
  userId: string;
  email: string;
  fullName: string;
  initials: string;
  organizationId: string;
  organizationSlug: string;
  organizationName: string;
  role: UserRole;
  professionalId: string | null;
  timezone: string;
  currency: 'MXN';
}

export interface ProfessionalDTO {
  id: string;
  organization_id: string;
  user_id: string | null;
  default_location_id: string;
  default_resource_id: string | null;
  default_resource_name?: string | null;
  slug: string;
  full_name: string;
  specialty: string;
  license_number: string | null;
  color_hex: string;
  bio: string | null;
  whatsapp_instance_name?: string | null;
  whatsapp_status?: 'disconnected' | 'connecting' | 'connected';
  whatsapp_phone?: string | null;
  whatsapp_auto_confirm?: boolean;
  whatsapp_auto_reminder_24h?: boolean;
  whatsapp_auto_reminder_1h?: boolean;
  doctoralia_url?: string | null;
  doctoralia_sync_enabled?: boolean;
  is_public: boolean;
  is_active: boolean;
  appointments_today_count?: number;
}

export interface ClinicalRecordDTO {
  id: string;
  organization_id: string;
  patient_id: string;
  patient_name: string;
  patient_phone: string;
  professional_id: string;
  professional_name: string;
  professional_specialty: string;
  appointment_id: string | null;
  specialty_type: 'ginecologia' | 'medicina_interna' | 'nutricion' | 'psicologia' | 'general';
  chief_complaint: string;
  subjective_notes?: string | null;
  objective_notes?: string | null;
  evolution_notes?: string | null;
  diagnosis: string | null;
  treatment_plan: string | null;
  vital_signs: Record<string, string | number>;
  specialty_data: Record<string, string | number>;
  created_at: string;
  updated_at?: string;
}

export interface OrganizationIntegrationsDTO {
  organization_id: string;
  evolution_api_url: string;
  evolution_api_key_encrypted?: string | null;
  confirm_template: string;
  reschedule_template: string;
  cancel_template: string;
  reminder_24h_template: string;
  reminder_1h_template: string;
  auto_send_enabled: boolean;
  doctoralia_bridge_mode: string;
}

export interface ServiceDTO {
  id: string;
  organization_id: string;
  professional_id: string;
  professional_name?: string;
  default_resource_id: string | null;
  default_resource_name?: string | null;
  name: string;
  description: string | null;
  duration_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  price_cents: number;
  currency: 'MXN';
  publish_price: boolean;
  is_public: boolean;
  is_active: boolean;
}

export interface ResourceDTO {
  id: string;
  organization_id: string;
  location_id: string;
  code: string;
  name: string;
  type: 'consultorio' | 'equipo';
  capacity: number;
  is_active: boolean;
}

export interface AvailabilityRuleDTO {
  id: string;
  organization_id: string;
  professional_id: string;
  location_id: string;
  day_of_week: number;
  start_local_time: string;
  end_local_time: string;
  break_start_local_time: string | null;
  break_end_local_time: string | null;
  slot_interval_minutes: number;
  is_active: boolean;
}

export interface AvailabilityExceptionDTO {
  id: string;
  organization_id: string;
  professional_id: string;
  professional_name?: string;
  location_id: string;
  resource_id: string | null;
  resource_name?: string | null;
  kind: 'block' | 'vacation' | 'break' | 'meeting';
  starts_at: string;
  ends_at: string;
  reason: string;
  is_active: boolean;
}

export interface AvailableSlotDTO {
  startsAt: string; // ISO UTC
  endsAt: string;   // ISO UTC
  localTimeLabel: string; // e.g. "09:00"
  localEndTimeLabel: string; // e.g. "09:30"
  resourceId: string;
  resourceName: string;
}

export interface AppointmentDTO {
  id: string;
  organization_id: string;
  folio: string;
  location_id: string;
  location_name: string;
  professional_id: string;
  professional_name: string;
  professional_specialty: string;
  professional_color: string;
  service_id: string;
  service_name: string;
  duration_minutes: number;
  resource_id: string;
  resource_name: string;
  patient_id: string;
  patient_name: string;
  patient_phone: string;
  patient_email: string | null;
  contact_name?: string | null;
  contact_relationship?: string | null;
  contact_phone?: string | null;
  starts_at: string;
  ends_at: string;
  local_time: string;
  local_end_time: string;
  local_date: string;
  attendance_status: AttendanceStatus;
  financial_status: FinancialStatus;
  agreed_price_cents: number;
  net_paid_cents: number;
  balance_cents: number;
  currency: 'MXN';
  origin_channel: OriginChannel;
  campaign_source: string | null;
  admin_notes: string | null;
  cancellation_reason: string | null;
  version: number;
  created_at: string;
}

export interface FinancialMovementDTO {
  id: string;
  organization_id: string;
  appointment_id: string;
  folio?: string;
  patient_name?: string;
  professional_name?: string;
  movement_type: MovementType;
  amount_cents: number;
  currency: 'MXN';
  payment_method: PaymentMethod | null;
  beneficiary_type: 'organization' | 'professional';
  reference_code: string | null;
  notes: string | null;
  related_movement_id: string | null;
  recorded_by_label: string;
  created_at: string;
}

export interface AppointmentEventDTO {
  id: string;
  appointment_id: string;
  event_type: string;
  previous_state: Record<string, unknown>;
  new_state: Record<string, unknown>;
  reason: string | null;
  actor_label: string;
  created_at: string;
}

export interface DailySummaryReportDTO {
  date: string;
  timezone: string;
  kpis: {
    appointmentsToday: number;
    toConfirm: number;
    waiting: number;
    inConsultation: number;
    completed: number;
    cancelled: number;
    noShow: number;
    collectedTodayCents: number;
    pendingBalanceCount: number;
    pendingBalanceTotalCents: number;
    rescheduledRequestsCount: number;
  };
  teamAgendas: Array<{
    id: string;
    slug: string;
    fullName: string;
    specialty: string;
    colorHex: string;
    appointmentsCount: number;
    completedCount: number;
  }>;
}
