import React, { useEffect, useState } from 'react';
import {
  X,
  Calendar,
  CreditCard,
  History,
  Link2,
  Check,
  Copy,
  ExternalLink,
  RefreshCw,
  Ban,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
} from 'lucide-react';
import { apiFetch, generateIdempotencyKey } from './api';
import { formatMxnCents, formatSpanishLongDate } from '../shared/timezone';
import { AttendanceBadge, FinancialBadge, ORIGIN_LABELS } from './badges';
import type {
  AppointmentDTO,
  AttendanceStatus,
  AuthSessionUser,
  OriginChannel,
  PaymentMethod,
  ProfessionalDTO,
  ResourceDTO,
  ServiceDTO,
} from '../shared/types';

export const NewAppointmentModal: React.FC<{
  user: AuthSessionUser;
  professionals: ProfessionalDTO[];
  services: ServiceDTO[];
  resources: ResourceDTO[];
  defaultDate: string;
  defaultProfessionalId?: string;
  isOffline: boolean;
  onClose: () => void;
  onCreated: (appt: AppointmentDTO) => void;
}> = ({
  user,
  professionals,
  services,
  resources,
  defaultDate,
  defaultProfessionalId,
  isOffline,
  onClose,
  onCreated,
}) => {
  const initialProfId =
    user.role === 'professional' && user.professionalId
      ? user.professionalId
      : defaultProfessionalId || professionals[0]?.id || '';

  const [professionalId, setProfessionalId] = useState(initialProfId);
  const profServices = services.filter((s) => s.professional_id === professionalId && s.is_active);
  const [serviceId, setServiceId] = useState(profServices[0]?.id || '');
  const [resourceId, setResourceId] = useState('');
  const [dateStr, setDateStr] = useState(defaultDate);
  const [slots, setSlots] = useState<
    Array<{ startsAt: string; localTimeLabel: string; localEndTimeLabel: string }>
  >([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedStartsAt, setSelectedStartsAt] = useState('');

  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactRelationship, setContactRelationship] = useState('');
  const [originChannel, setOriginChannel] = useState<OriginChannel>('whatsapp_manual');
  const [adminNotes, setAdminNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idemKey, setIdemKey] = useState(() => generateIdempotencyKey('rec-appt'));

  useEffect(() => {
    const validServices = services.filter(
      (s) => s.professional_id === professionalId && s.is_active
    );
    if (!validServices.some((s) => s.id === serviceId)) {
      setServiceId(validServices[0]?.id || '');
    }
  }, [professionalId, services, serviceId]);

  useEffect(() => {
    if (!professionalId || !serviceId || !dateStr) return;
    let mounted = true;
    setLoadingSlots(true);
    setSelectedStartsAt('');
    const resQuery = resourceId ? `&resource_id=${resourceId}` : '';
    apiFetch(
      `/api/v1/availability/slots?professional_id=${professionalId}&service_id=${serviceId}&date=${dateStr}${resQuery}`
    )
      .then((res) => {
        if (mounted) {
          setSlots(res.slots || []);
        }
      })
      .catch((err) => {
        if (mounted) setError(err.message);
      })
      .finally(() => {
        if (mounted) setLoadingSlots(false);
      });
    return () => {
      mounted = false;
    };
  }, [professionalId, serviceId, dateStr, resourceId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!selectedStartsAt) {
      setError('Seleccione un horario disponible.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch('/api/v1/appointments', {
        method: 'POST',
        idempotencyKey: idemKey,
        isSimulatedOffline: isOffline,
        body: {
          professionalId,
          serviceId,
          resourceId: resourceId || undefined,
          startsAt: selectedStartsAt,
          patientName,
          patientPhone,
          patientEmail: patientEmail || undefined,
          contactName: contactName || undefined,
          contactRelationship: contactRelationship || undefined,
          originChannel,
          adminNotes: adminNotes || undefined,
          idempotencyKey: idemKey,
        },
      });
      onCreated(res.appointment);
    } catch (err: any) {
      setError(err.message);
      setIdemKey(generateIdempotencyKey('rec-appt'));
    } finally {
      setSubmitting(false);
    }
  };

  const selectedService = services.find((s) => s.id === serviceId);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-new-appt-title"
    >
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full overflow-hidden my-8">
        <div className="bg-[#0B2138] text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 id="modal-new-appt-title" className="text-lg font-bold">
              Agendar nueva cita desde recepción
            </h2>
            <p className="text-xs text-slate-300">
              Validación transaccional de profesional, servicio y consultorio compartido
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {error && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-800"
            >
              {error}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Profesional de la salud *
              </label>
              <select
                value={professionalId}
                disabled={user.role === 'professional'}
                onChange={(e) => setProfessionalId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
              >
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} · {p.specialty}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Servicio y duración *
              </label>
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
              >
                {profServices.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.duration_minutes} min · {formatMxnCents(s.price_cents)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Fecha de atención *
              </label>
              <input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Consultorio asignado
              </label>
              <select
                value={resourceId}
                onChange={(e) => setResourceId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
              >
                <option value="">Por defecto del servicio</option>
                {resources.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Origen / Canal de atribución
              </label>
              <select
                value={originChannel}
                onChange={(e) => setOriginChannel(e.target.value as OriginChannel)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
              >
                <option value="whatsapp_manual">WhatsApp Recepción</option>
                <option value="phone">Llamada Telefónica</option>
                <option value="reception">Presencial en Recepción</option>
                <option value="facebook">Campaña Facebook</option>
                <option value="google">Campaña Google</option>
                <option value="referral">Paciente Referido</option>
              </select>
            </div>
          </div>

          {/* Selección de Horario */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Horarios disponibles ({user.timezone}) *
            </label>
            {loadingSlots ? (
              <div className="p-4 text-xs text-slate-500 bg-slate-50 rounded-xl text-center">
                Calculando intersección de horario del médico y consultorio...
              </div>
            ) : slots.length === 0 ? (
              <div className="p-4 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl">
                No hay horarios libres para esta fecha/consultorio.
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-36 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                {slots.map((s) => (
                  <button
                    key={s.startsAt}
                    type="button"
                    onClick={() => setSelectedStartsAt(s.startsAt)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition ${
                      selectedStartsAt === s.startsAt
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-teal-500'
                    }`}
                  >
                    {s.localTimeLabel}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Datos del paciente */}
          <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nombre completo del paciente *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Roberto Méndez"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Teléfono de contacto *
              </label>
              <input
                type="tel"
                required
                placeholder="Ej. 55 2345 6789"
                value={patientPhone}
                onChange={(e) => setPatientPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Correo electrónico (opcional)
              </label>
              <input
                type="email"
                placeholder="correo@ejemplo.mx"
                value={patientEmail}
                onChange={(e) => setPatientEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contacto responsable (opcional)
              </label>
              <input
                type="text"
                placeholder="Madre / Padre / Tutor"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Notas administrativas
              </label>
              <input
                type="text"
                placeholder="Sin datos clínicos sensibles"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <div className="text-xs text-slate-600">
              {selectedService && (
                <span>
                  Importe a registrar:{' '}
                  <strong className="text-slate-900">
                    {formatMxnCents(selectedService.price_cents)} MXN
                  </strong>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting || isOffline || !selectedStartsAt}
                className="px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white text-xs font-semibold shadow-xs"
              >
                {submitting ? 'Guardando en Supabase...' : 'Confirmar y guardar cita'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export const ShareLinksModal: React.FC<{
  orgSlug: string;
  orgName: string;
  professionals: ProfessionalDTO[];
  onClose: () => void;
  onOpenPublicBooking: (profSlug?: string) => void;
}> = ({ orgSlug, orgName, professionals, onClose, onOpenPublicBooking }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';

  const copyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const generalUrl = `${origin}/reservar/${orgSlug}`;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full overflow-hidden">
        <div className="bg-[#0B2138] text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Link2 className="w-5 h-5 text-teal-400" />
              Compartir enlaces de reserva por WhatsApp
            </h2>
            <p className="text-xs text-slate-300">
              Enlace general de {orgName} y enlaces directos por especialista (sin parámetros sensibles)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Enlace general del núcleo */}
          <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-200">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold uppercase text-teal-800">
                Directorio General · {orgName}
              </span>
              <button
                type="button"
                onClick={() => onOpenPublicBooking()}
                className="text-xs font-semibold text-teal-700 hover:underline inline-flex items-center gap-1"
              >
                Abrir vista pública <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <code className="flex-1 text-xs bg-white px-3 py-2 rounded-lg border border-teal-200 text-slate-800">
                {generalUrl}
              </code>
              <button
                type="button"
                onClick={() => copyText('general-url', generalUrl)}
                className="px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold inline-flex items-center gap-1.5"
              >
                {copiedKey === 'general-url' ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                Copiar URL
              </button>
            </div>
          </div>

          {/* Enlaces por profesional */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Enlaces específicos por profesional
            </h3>
            {professionals.map((prof) => {
              const profUrl = `${origin}/reservar/${orgSlug}/${prof.slug}`;
              const waMessage = `Hola, le compartimos el enlace oficial de ${orgName} para elegir su horario con ${prof.full_name} (${prof.specialty}): ${profUrl}`;
              const waHref = `https://wa.me/?text=${encodeURIComponent(waMessage)}`;

              return (
                <div
                  key={prof.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: prof.color_hex }}
                      />
                      <strong className="text-sm text-slate-900">{prof.full_name}</strong>
                      <span className="text-xs text-slate-500">· {prof.specialty}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenPublicBooking(prof.slug)}
                      className="text-xs font-semibold text-teal-700 hover:underline inline-flex items-center gap-1"
                    >
                      Probar enlace de reserva <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <code className="flex-1 text-xs bg-white px-3 py-2 rounded-lg border border-slate-200 text-slate-700 truncate">
                      {profUrl}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyText(`url-${prof.id}`, profUrl)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1"
                    >
                      {copiedKey === `url-${prof.id}` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      Copiar enlace
                    </button>
                    <button
                      type="button"
                      onClick={() => copyText(`msg-${prof.id}`, waMessage)}
                      className="px-3 py-1.5 rounded-lg border border-teal-200 bg-teal-50 hover:bg-teal-100 text-xs font-semibold text-teal-800 inline-flex items-center gap-1"
                    >
                      {copiedKey === `msg-${prof.id}` ? (
                        <Check className="w-3.5 h-3.5 text-teal-700" />
                      ) : (
                        <MessageCircle className="w-3.5 h-3.5" />
                      )}
                      Copiar texto WhatsApp
                    </button>
                    <a
                      href={waHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1"
                    >
                      Abrir WhatsApp ↗
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export const AppointmentDetailModal: React.FC<{
  user: AuthSessionUser;
  appointmentId: string;
  isOffline: boolean;
  onClose: () => void;
  onUpdated: () => void;
  onOpenManagePortal: (token: string) => void;
}> = ({ user, appointmentId, isOffline, onClose, onUpdated, onOpenManagePortal }) => {
  const [detail, setDetail] = useState<{
    appointment: AppointmentDTO;
    events: any[];
    movements: any[];
    notificationJobs: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Sub-formularios: Pago manual, Reprogramación, Cancelación
  const [activeTab, setActiveTab] = useState<'actions' | 'payments' | 'reschedule' | 'history'>(
    'actions'
  );
  const [paymentAmountPesos, setPaymentAmountPesos] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [payIdemKey, setPayIdemKey] = useState(() => generateIdempotencyKey('pay'));

  const [rescheduleDate, setRescheduleDate] = useState('2026-10-16');
  const [rescheduleSlots, setRescheduleSlots] = useState<any[]>([]);
  const [newStartsAt, setNewStartsAt] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');

  const [cancelReason, setCancelReason] = useState('');
  const [generatedManageLink, setGeneratedManageLink] = useState<{
    token: string;
    managementUrl: string;
  } | null>(null);

  const fetchDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/api/v1/appointments/${appointmentId}`);
      setDetail(data);
      setRescheduleDate(data.appointment.local_date);
      if (data.appointment.balance_cents > 0) {
        setPaymentAmountPesos(String(data.appointment.balance_cents / 100));
      } else {
        setPaymentAmountPesos('');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [appointmentId]);

  useEffect(() => {
    if (activeTab !== 'reschedule' || !detail) return;
    apiFetch(
      `/api/v1/availability/slots?professional_id=${detail.appointment.professional_id}&service_id=${detail.appointment.service_id}&date=${rescheduleDate}&exclude_appointment_id=${detail.appointment.id}`
    )
      .then((res) => setRescheduleSlots(res.slots || []))
      .catch(() => setRescheduleSlots([]));
  }, [activeTab, detail, rescheduleDate]);

  const handleStatusChange = async (newStatus: AttendanceStatus) => {
    if (!detail) return;
    setError(null);
    setFeedback(null);
    try {
      await apiFetch(`/api/v1/appointments/${appointmentId}/status`, {
        method: 'POST',
        isSimulatedOffline: isOffline,
        body: {
          status: newStatus,
          expectedVersion: detail.appointment.version,
        },
      });
      setFeedback(
        `Estado de atención actualizado a "${newStatus}". El estado financiero se conserva independiente.`
      );
      await fetchDetail();
      onUpdated();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail) return;
    setError(null);
    setFeedback(null);

    const amountCents = Math.round(Number(paymentAmountPesos) * 100);
    if (!amountCents || amountCents <= 0) {
      setError('Ingrese un monto válido mayor a $0.00 MXN.');
      return;
    }

    try {
      await apiFetch(`/api/v1/appointments/${appointmentId}/payments`, {
        method: 'POST',
        idempotencyKey: payIdemKey,
        isSimulatedOffline: isOffline,
        body: {
          amountCents,
          paymentMethod,
          referenceCode: paymentReference || undefined,
          notes: paymentNotes || undefined,
          idempotencyKey: payIdemKey,
        },
      });
      setFeedback(`Pago de ${formatMxnCents(amountCents)} MXN registrado y saldo actualizado.`);
      setPayIdemKey(generateIdempotencyKey('pay'));
      setPaymentReference('');
      setPaymentNotes('');
      await fetchDetail();
      onUpdated();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleReverseMovement = async (movementId: string) => {
    setError(null);
    setFeedback(null);
    try {
      await apiFetch(`/api/v1/payments/${movementId}/reversals`, {
        method: 'POST',
        isSimulatedOffline: isOffline,
        body: {
          type: 'reversal',
          reason: 'Reverso autorizado por administración desde detalle de cita',
        },
      });
      setFeedback('Reverso registrado de forma inmutable y saldo recalculado.');
      await fetchDetail();
      onUpdated();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail || !newStartsAt) return;
    setError(null);
    setFeedback(null);
    try {
      await apiFetch(`/api/v1/appointments/${appointmentId}/reschedule`, {
        method: 'POST',
        isSimulatedOffline: isOffline,
        body: {
          newStartsAt,
          expectedVersion: detail.appointment.version,
          reason: rescheduleReason || 'Reprogramación operativa desde recepción',
        },
      });
      setFeedback('Cita reprogramada de forma atómica y historial actualizado.');
      setNewStartsAt('');
      setActiveTab('actions');
      await fetchDetail();
      onUpdated();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCancelSubmit = async () => {
    if (!detail) return;
    if (!cancelReason.trim()) {
      setError('Especifique el motivo de cancelación.');
      return;
    }
    setError(null);
    setFeedback(null);
    try {
      await apiFetch(`/api/v1/appointments/${appointmentId}/cancel`, {
        method: 'POST',
        isSimulatedOffline: isOffline,
        body: {
          reason: cancelReason,
          expectedVersion: detail.appointment.version,
        },
      });
      setFeedback('Cita cancelada. El horario fue liberado y el historial se conserva.');
      setCancelReason('');
      await fetchDetail();
      onUpdated();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGenerateManageLink = async () => {
    setError(null);
    try {
      const res = await apiFetch(`/api/v1/appointments/${appointmentId}/management-link`, {
        method: 'POST',
        isSimulatedOffline: isOffline,
      });
      setGeneratedManageLink({
        token: res.token,
        managementUrl: res.managementUrl,
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const appt = detail?.appointment;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-3xl w-full overflow-hidden my-8">
        <div className="bg-[#0B2138] text-white px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-teal-300 font-bold">
                {appt ? `Folio ${appt.folio} · Versión v${appt.version}` : 'Detalle de Cita'}
              </span>
            </div>
            <h2 className="text-lg font-bold">
              {appt ? `${appt.patient_name} — ${appt.professional_name}` : 'Cargando...'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading || !appt ? (
          <div className="p-8 text-center text-sm text-slate-500">
            {error ? <span className="text-rose-600 font-semibold">{error}</span> : 'Cargando...'}
          </div>
        ) : (
          <div className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
            {error && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {feedback && (
              <div
                role="status"
                className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {feedback}
              </div>
            )}

            {/* Resumen superior de la cita */}
            <div className="grid sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block">Fecha y Horario ({user.timezone})</span>
                <strong className="text-slate-900 text-sm block mt-0.5">
                  {formatSpanishLongDate(appt.local_date)}
                </strong>
                <span className="text-teal-700 font-bold">
                  {appt.local_time} a {appt.local_end_time} hrs
                </span>
                <span className="block text-slate-500 mt-1">{appt.resource_name}</span>
              </div>

              <div>
                <span className="text-slate-500 block">Paciente y Contacto</span>
                <strong className="text-slate-900 text-sm block mt-0.5">{appt.patient_name}</strong>
                <span className="text-slate-700 block">Tel: {appt.patient_phone}</span>
                {appt.contact_name && (
                  <span className="text-slate-500 block mt-0.5">
                    Resp: {appt.contact_name} ({appt.contact_relationship})
                  </span>
                )}
                <span className="text-slate-400 block mt-0.5">
                  Origen: {ORIGIN_LABELS[appt.origin_channel] || appt.origin_channel}
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Atención:</span>
                  <AttendanceBadge status={appt.attendance_status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Estado pago:</span>
                  <FinancialBadge status={appt.financial_status} />
                </div>
                <div className="pt-1 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-slate-500">Precio acordado:</span>
                  <strong className="text-slate-800">
                    {formatMxnCents(appt.agreed_price_cents)}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Pagado neto:</span>
                  <strong className="text-emerald-700">
                    {formatMxnCents(appt.net_paid_cents)}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Saldo pendiente:</span>
                  <strong
                    className={appt.balance_cents > 0 ? 'text-rose-700 text-sm' : 'text-slate-700'}
                  >
                    {formatMxnCents(appt.balance_cents)} MXN
                  </strong>
                </div>
              </div>
            </div>

            {/* Pestañas de operación */}
            <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('actions')}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'actions'
                    ? 'bg-[#0B2138] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Estados de atención y Cancelación
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('payments')}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1.5 ${
                  activeTab === 'payments'
                    ? 'bg-[#0B2138] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                Cobros y Movimientos ({detail.movements.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('reschedule')}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1.5 ${
                  activeTab === 'reschedule'
                    ? 'bg-[#0B2138] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reprogramar Cita
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1.5 ${
                  activeTab === 'history'
                    ? 'bg-[#0B2138] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                Historial y Recordatorios ({detail.events.length})
              </button>
            </div>

            {/* Contenido de Pestaña 1: Estados de atención y enlace de paciente */}
            {activeTab === 'actions' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-xs font-bold uppercase text-slate-500 mb-2.5">
                    Registrar estado de atención (independiente del cobro)
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { status: 'scheduled', label: 'Programada' },
                        { status: 'confirmed', label: 'Confirmar asistencia' },
                        { status: 'waiting', label: 'Registrar llegada (En espera)' },
                        { status: 'in_consultation', label: 'Iniciar consulta' },
                        { status: 'completed', label: 'Marcar Atendida' },
                        { status: 'no_show', label: 'Registrar Inasistencia (No asistió)' },
                      ] as Array<{ status: AttendanceStatus; label: string }>
                    ).map((btn) => (
                      <button
                        key={btn.status}
                        type="button"
                        disabled={isOffline || appt.attendance_status === btn.status}
                        onClick={() => handleStatusChange(btn.status)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition ${
                          appt.attendance_status === btn.status
                            ? 'bg-teal-600 text-white border-teal-600'
                            : 'bg-white text-slate-800 border-slate-300 hover:border-teal-600 hover:bg-teal-50/40 disabled:opacity-50'
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Enlace de autogestión verificada para el paciente */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">
                        Enlace seguro de autogestión para el paciente
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Genera un token con caducidad para que el paciente confirme, reprograme o cancele.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isOffline}
                      onClick={handleGenerateManageLink}
                      className="px-3 py-1.5 rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold"
                    >
                      Generar enlace de gestión
                    </button>
                  </div>

                  {generatedManageLink && (
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <code className="flex-1 text-xs bg-white px-3 py-1.5 rounded border border-slate-300">
                        {window.location.origin}
                        {generatedManageLink.managementUrl}
                      </code>
                      <button
                        type="button"
                        onClick={() => onOpenManagePortal(generatedManageLink.token)}
                        className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold"
                      >
                        Abrir vista del paciente →
                      </button>
                    </div>
                  )}
                </div>

                {/* Cancelación con motivo */}
                {appt.attendance_status !== 'cancelled' && (
                  <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-200 space-y-2.5">
                    <h4 className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                      <Ban className="w-4 h-4 text-rose-600" />
                      Cancelar cita (libera horario y consultorio conservando historial)
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      <input
                        type="text"
                        placeholder="Escriba el motivo de cancelación (obligatorio)..."
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-rose-300 text-xs bg-white"
                      />
                      <button
                        type="button"
                        disabled={isOffline}
                        onClick={handleCancelSubmit}
                        className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white text-xs font-semibold"
                      >
                        Cancelar cita
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Contenido de Pestaña 2: Cobros manuales y movimientos inmutables */}
            {activeTab === 'payments' && (
              <div className="space-y-5">
                {['admin', 'reception', 'cashier'].includes(user.role) && (
                  <form
                    onSubmit={handleRecordPayment}
                    className="p-4 rounded-xl bg-teal-50/40 border border-teal-200 space-y-3"
                  >
                    <h3 className="text-xs font-bold uppercase text-teal-900">
                      Registrar pago manual (Total o Parcial)
                    </h3>
                    <div className="grid sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Importe a cobrar (MXN) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="1"
                          required
                          value={paymentAmountPesos}
                          onChange={(e) => setPaymentAmountPesos(e.target.value)}
                          placeholder="Ej. 600"
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Método de pago *
                        </label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm bg-white"
                        >
                          <option value="cash">Efectivo</option>
                          <option value="card">Tarjeta débito/crédito</option>
                          <option value="transfer">Transferencia SPEI validada</option>
                          <option value="other">Otro</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Referencia / Folio recibo
                        </label>
                        <input
                          type="text"
                          value={paymentReference}
                          onChange={(e) => setPaymentReference(e.target.value)}
                          placeholder="Ej. AUT-9981"
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm bg-white"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <input
                        type="text"
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        placeholder="Nota del movimiento (ej. Anticipo 50% o Liquidación)"
                        className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                      />
                      <button
                        type="submit"
                        disabled={isOffline}
                        className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white text-xs font-semibold"
                      >
                        Registrar cobro en libro mayor
                      </button>
                    </div>
                  </form>
                )}

                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">
                    Libro de movimientos financieros (Inmutable · Sin borrado)
                  </h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3">Tipo</th>
                          <th className="py-2 px-3">Método</th>
                          <th className="py-2 px-3">Importe</th>
                          <th className="py-2 px-3">Nota / Referencia</th>
                          <th className="py-2 px-3">Registró</th>
                          {user.role === 'admin' && <th className="py-2 px-3 text-right">Acción</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detail.movements.map((m: any) => (
                          <tr key={m.id}>
                            <td className="py-2 px-3 font-semibold capitalize">
                              {m.movement_type === 'charge'
                                ? 'Cargo servicio'
                                : m.movement_type === 'payment'
                                ? 'Pago recibido'
                                : m.movement_type === 'reversal'
                                ? 'Reverso'
                                : m.movement_type}
                            </td>
                            <td className="py-2 px-3 text-slate-600">
                              {m.payment_method || '—'}
                            </td>
                            <td
                              className={`py-2 px-3 font-bold ${
                                m.movement_type === 'payment'
                                  ? 'text-emerald-700'
                                  : m.movement_type === 'reversal' || m.movement_type === 'refund'
                                  ? 'text-rose-700'
                                  : 'text-slate-800'
                              }`}
                            >
                              {formatMxnCents(Number(m.amount_cents))}
                            </td>
                            <td className="py-2 px-3 text-slate-600">
                              {m.notes || '—'} {m.reference_code ? `(${m.reference_code})` : ''}
                            </td>
                            <td className="py-2 px-3 text-slate-500">{m.recorded_by_label}</td>
                            {user.role === 'admin' && (
                              <td className="py-2 px-3 text-right">
                                {m.movement_type === 'payment' && (
                                  <button
                                    type="button"
                                    disabled={isOffline}
                                    onClick={() => handleReverseMovement(m.id)}
                                    className="text-rose-600 hover:underline font-semibold"
                                  >
                                    Revertir
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Contenido de Pestaña 3: Reprogramar atómicamente */}
            {activeTab === 'reschedule' && (
              <form onSubmit={handleRescheduleSubmit} className="space-y-4">
                <p className="text-xs text-slate-600">
                  La reprogramación es atómica (control de versión <code>v{appt.version}</code>): si
                  el nuevo horario falla o es ocupado por otro operador, la cita actual permanece
                  intacta en <strong>{appt.local_date} {appt.local_time}</strong>.
                </p>
                <div className="flex items-center gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nueva fecha
                    </label>
                    <input
                      type="date"
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Motivo del cambio
                    </label>
                    <input
                      type="text"
                      value={rescheduleReason}
                      onChange={(e) => setRescheduleReason(e.target.value)}
                      placeholder="Ej. Solicitud telefónica del paciente"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 max-h-40 overflow-y-auto">
                  {rescheduleSlots.map((s) => (
                    <button
                      key={s.startsAt}
                      type="button"
                      onClick={() => setNewStartsAt(s.startsAt)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold border ${
                        newStartsAt === s.startsAt
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'bg-white text-slate-800 border-slate-200 hover:border-teal-500'
                      }`}
                    >
                      {s.localTimeLabel}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={!newStartsAt || isOffline}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white text-xs font-semibold"
                >
                  Confirmar reprogramación atómica
                </button>
              </form>
            )}

            {/* Contenido de Pestaña 4: Historial de eventos y cola de recordatorios */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">
                    Eventos de auditoría de la cita (`appointment_events`)
                  </h4>
                  <div className="space-y-2">
                    {detail.events.map((ev: any) => (
                      <div
                        key={ev.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-start justify-between gap-4"
                      >
                        <div>
                          <span className="font-bold text-slate-900 uppercase">
                            {ev.event_type}
                          </span>{' '}
                          <span className="text-slate-600">por {ev.actor_label}</span>
                          {ev.reason && (
                            <p className="text-slate-600 mt-0.5">Motivo: {ev.reason}</p>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 shrink-0">
                          {new Date(ev.created_at).toLocaleString('es-MX')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">
                    Cola de recordatorios de servidor (`notification_jobs`)
                  </h4>
                  <div className="space-y-1.5">
                    {detail.notificationJobs.map((j: any) => (
                      <div
                        key={j.id}
                        className="p-2.5 rounded-lg border border-slate-200 text-xs flex items-center justify-between"
                      >
                        <span>
                          <strong>{j.job_type}</strong> ({j.channel} · v{j.appointment_version})
                        </span>
                        <span className="font-semibold text-slate-700">Estado: {j.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
