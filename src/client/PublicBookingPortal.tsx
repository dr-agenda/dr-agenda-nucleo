import React, { useEffect, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  ShieldCheck,
  Stethoscope,
  UserCheck,
  AlertTriangle,
  ArrowLeft,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';
import { apiFetch, generateIdempotencyKey } from './api';
import { formatMxnCents, formatSpanishLongDate } from '../shared/timezone';
import { AttendanceBadge, FinancialBadge } from './badges';

interface PublicCatalog {
  organization: {
    id: string;
    slug: string;
    name: string;
    currency: 'MXN';
    default_timezone: string;
  };
  locations: Array<{
    id: string;
    name: string;
    address: string;
    timezone: string;
    phone: string | null;
  }>;
  professionals: Array<{
    id: string;
    slug: string;
    full_name: string;
    specialty: string;
    license_number: string | null;
    color_hex: string;
    bio: string | null;
    location_name: string;
    location_address: string;
    timezone: string;
  }>;
  services: Array<{
    id: string;
    professional_id: string;
    name: string;
    description: string | null;
    duration_minutes: number;
    price_cents: number | null;
    publish_price: boolean;
  }>;
}

export const PublicBookingPortal: React.FC<{
  orgSlug: string;
  initialProfSlug?: string | null;
  initialDate?: string;
  isOffline: boolean;
  onBackToStaffPanel?: () => void;
}> = ({ orgSlug, initialProfSlug, initialDate = '2026-10-16', isOffline, onBackToStaffPanel }) => {
  const [catalog, setCatalog] = useState<PublicCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedProfId, setSelectedProfId] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [availableSlots, setAvailableSlots] = useState<
    Array<{ startsAt: string; endsAt: string; localTimeLabel: string; localEndTimeLabel: string }>
  >([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlotStartsAt, setSelectedSlotStartsAt] = useState<string>('');

  // Datos del paciente
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [hasResponsibleContact, setHasResponsibleContact] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactRelationship, setContactRelationship] = useState('Madre / Padre / Tutor');
  const [contactPhone, setContactPhone] = useState('');
  const [policyAccepted, setPolicyAccepted] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => generateIdempotencyKey('pub-book'));

  const [confirmedBooking, setConfirmedBooking] = useState<{
    id: string;
    folio: string;
    professionalName: string;
    specialty: string;
    serviceName: string;
    locationName: string;
    localDate: string;
    localTime: string;
    localEndTime: string;
    agreedPriceCents: number;
    managementToken: string;
    managementUrl: string;
  } | null>(null);

  const [copiedTokenLink, setCopiedTokenLink] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    apiFetch<PublicCatalog>(`/api/v1/public/${orgSlug}/professionals`)
      .then((data) => {
        if (!mounted) return;
        setCatalog(data);
        let initialProf = data.professionals[0];
        if (initialProfSlug) {
          const found = data.professionals.find((p) => p.slug === initialProfSlug);
          if (found) initialProf = found;
        }
        if (initialProf) {
          setSelectedProfId(initialProf.id);
          const firstSrv = data.services.find((s) => s.professional_id === initialProf.id);
          if (firstSrv) setSelectedServiceId(firstSrv.id);
        }
      })
      .catch((err) => {
        if (mounted) setError(err.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [orgSlug, initialProfSlug]);

  // Cargar horarios reales cuando cambia profesional, servicio o fecha
  useEffect(() => {
    if (!selectedProfId || !selectedServiceId || !selectedDate) return;
    let mounted = true;
    setLoadingSlots(true);
    setSelectedSlotStartsAt('');
    apiFetch<{
      slots: Array<{
        startsAt: string;
        endsAt: string;
        localTimeLabel: string;
        localEndTimeLabel: string;
      }>;
    }>(
      `/api/v1/public/${orgSlug}/availability?professional_id=${selectedProfId}&service_id=${selectedServiceId}&date=${selectedDate}`
    )
      .then((res) => {
        if (mounted) {
          setAvailableSlots(res.slots || []);
        }
      })
      .catch(() => {
        if (mounted) setAvailableSlots([]);
      })
      .finally(() => {
        if (mounted) setLoadingSlots(false);
      });
    return () => {
      mounted = false;
    };
  }, [orgSlug, selectedProfId, selectedServiceId, selectedDate]);

  const handleSelectProfessional = (profId: string) => {
    setSelectedProfId(profId);
    const firstSrv = catalog?.services.find((s) => s.professional_id === profId);
    setSelectedServiceId(firstSrv?.id || '');
    setIdempotencyKey(generateIdempotencyKey('pub-book'));
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (isOffline) {
      setSubmitError(
        'Sin conexión a internet: no es posible confirmar su cita hasta restablecer la red.'
      );
      return;
    }

    if (!selectedSlotStartsAt) {
      setSubmitError('Seleccione un horario disponible antes de confirmar.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch<{
        booking: {
          id: string;
          folio: string;
          professionalName: string;
          specialty: string;
          serviceName: string;
          locationName: string;
          localDate: string;
          localTime: string;
          localEndTime: string;
          agreedPriceCents: number;
        };
        managementToken: string;
        managementUrl: string;
      }>(`/api/v1/public/${orgSlug}/bookings`, {
        method: 'POST',
        idempotencyKey,
        isSimulatedOffline: isOffline,
        body: {
          professionalId: selectedProfId,
          serviceId: selectedServiceId,
          startsAt: selectedSlotStartsAt,
          patientName,
          patientPhone,
          patientEmail: patientEmail || undefined,
          contactName: hasResponsibleContact ? contactName : undefined,
          contactRelationship: hasResponsibleContact ? contactRelationship : undefined,
          contactPhone: hasResponsibleContact ? contactPhone : undefined,
          policyAccepted,
          idempotencyKey,
        },
      });

      setConfirmedBooking({
        ...res.booking,
        managementToken: res.managementToken,
        managementUrl: res.managementUrl,
      });
    } catch (err: any) {
      setSubmitError(err.message || 'No se pudo completar la reserva.');
      if (err.availableSlots) {
        setAvailableSlots(err.availableSlots);
        setSelectedSlotStartsAt('');
      }
      setIdempotencyKey(generateIdempotencyKey('pub-book'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F7FA] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center max-w-md w-full">
          <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-700 font-medium">Cargando disponibilidad del núcleo médico...</p>
        </div>
      </div>
    );
  }

  if (error || !catalog) {
    return (
      <div className="min-h-screen bg-[#F4F7FA] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-rose-200 p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h1 className="text-lg font-bold text-slate-900 mb-2">Enlace no disponible</h1>
          <p className="text-sm text-slate-600 mb-4">{error || 'Núcleo no encontrado'}</p>
          {onBackToStaffPanel && (
            <button
              type="button"
              onClick={onBackToStaffPanel}
              className="px-4 py-2 bg-navy-900 text-white rounded-lg text-sm font-medium"
            >
              Volver al panel del núcleo
            </button>
          )}
        </div>
      </div>
    );
  }

  const currentProf = catalog.professionals.find((p) => p.id === selectedProfId);
  const profServices = catalog.services.filter((s) => s.professional_id === selectedProfId);
  const currentService = profServices.find((s) => s.id === selectedServiceId);

  return (
    <div className="min-h-screen bg-[#F4F7FA] flex flex-col">
      {/* Header Institucional */}
      <header className="bg-[#0B2138] text-white border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center font-bold">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight">Dr Agenda</span>
                <span className="text-xs uppercase tracking-widest text-teal-300 font-semibold">
                  NÚCLEOS
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Reserva en línea · {catalog.organization.name} ({catalog.organization.default_timezone})
              </p>
            </div>
          </div>

          {onBackToStaffPanel && (
            <button
              type="button"
              onClick={onBackToStaffPanel}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#16324F] hover:bg-[#1E4268] text-xs font-medium text-white border border-slate-700 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al panel de recepción
            </button>
          )}
        </div>
      </header>

      {isOffline && (
        <div
          role="alert"
          className="bg-amber-600 text-white px-4 py-2.5 text-center text-sm font-medium flex items-center justify-center gap-2"
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Modo sin conexión activo: puede consultar la pantalla pero no se confirmarán reservas hasta recuperar internet.
        </div>
      )}

      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 flex-1">
        {confirmedBooking ? (
          <div className="bg-white rounded-2xl shadow-sm border border-emerald-200 p-6 sm:p-8 max-w-2xl mx-auto">
            <div className="flex items-center gap-3 text-emerald-700 mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 shrink-0" />
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                  Reserva Persistida en Servidor
                </span>
                <h1 className="text-2xl font-bold text-slate-900">
                  ¡Cita confirmada! Folio {confirmedBooking.folio}
                </h1>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-6">
              Su espacio ha sido reservado en la agenda de{' '}
              <strong>{confirmedBooking.professionalName}</strong>. Conserve su folio y enlace
              personal de gestión.
            </p>

            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 grid sm:grid-cols-2 gap-4 mb-6 text-sm">
              <div>
                <span className="text-xs text-slate-500 block">Profesional y especialidad</span>
                <strong className="text-slate-900">{confirmedBooking.professionalName}</strong>
                <span className="text-slate-600 block text-xs">{confirmedBooking.specialty}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Servicio médico</span>
                <strong className="text-slate-900">{confirmedBooking.serviceName}</strong>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Fecha y hora ({catalog.organization.default_timezone})</span>
                <strong className="text-slate-900">
                  {formatSpanishLongDate(confirmedBooking.localDate)}
                </strong>
                <span className="text-teal-700 font-semibold block">
                  {confirmedBooking.localTime} a {confirmedBooking.localEndTime} hrs
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Importe acordado</span>
                <strong className="text-slate-900 text-base">
                  {formatMxnCents(confirmedBooking.agreedPriceCents)} MXN
                </strong>
                <span className="text-xs text-slate-500 block">Pago en recepción de la sede</span>
              </div>
            </div>

            <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-4 mb-6">
              <div className="text-xs font-bold uppercase text-teal-800 mb-1">
                Enlace privado para confirmar, reprogramar o cancelar
              </div>
              <p className="text-xs text-teal-700 mb-3">
                Este enlace contiene un token único con vencimiento y alcance limitado a su cita:
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="flex-1 text-xs bg-white px-3 py-2 rounded border border-teal-200 text-slate-800 break-all">
                  {window.location.origin}
                  {confirmedBooking.managementUrl}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}${confirmedBooking.managementUrl}`
                    );
                    setCopiedTokenLink(true);
                    setTimeout(() => setCopiedTokenLink(false), 2000);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
                >
                  {copiedTokenLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedTokenLink ? 'Copiado' : 'Copiar enlace'}
                </button>
                <a
                  href={confirmedBooking.managementUrl}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold"
                >
                  Abrir autogestión →
                </a>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setConfirmedBooking(null);
                  setPatientName('');
                  setPatientPhone('');
                  setPatientEmail('');
                  setSelectedSlotStartsAt('');
                  setIdempotencyKey(generateIdempotencyKey('pub-book'));
                }}
                className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
              >
                Realizar otra reserva
              </button>
              {onBackToStaffPanel && (
                <button
                  type="button"
                  onClick={onBackToStaffPanel}
                  className="px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold"
                >
                  Ver cita reflejada en la agenda del núcleo →
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-6">
            {/* Columna izquierda: Selección de Profesional, Servicio y Horario */}
            <div className="lg:col-span-7 space-y-6">
              {/* Paso 1: Profesional */}
              <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-teal-600" />
                  1. Seleccione al profesional de la salud
                </h2>
                <p className="text-xs text-slate-500 mb-4">
                  Cada especialista administra sus propios servicios y disponibilidad dentro de{' '}
                  {catalog.organization.name}.
                </p>

                <div className="grid sm:grid-cols-3 gap-3">
                  {catalog.professionals.map((prof) => {
                    const active = prof.id === selectedProfId;
                    return (
                      <button
                        key={prof.id}
                        type="button"
                        onClick={() => handleSelectProfessional(prof.id)}
                        className={`text-left p-3.5 rounded-xl border transition ${
                          active
                            ? 'border-teal-600 bg-teal-50/60 ring-2 ring-teal-600/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: prof.color_hex }}
                          />
                          <span className="font-bold text-sm text-slate-900 truncate">
                            {prof.full_name}
                          </span>
                        </div>
                        <span className="text-xs text-slate-600 block">{prof.specialty}</span>
                        {prof.license_number && (
                          <span className="text-[11px] text-slate-400 block mt-1">
                            Céd. {prof.license_number}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {currentProf && (
                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-teal-600" />
                      {currentProf.location_name}: {currentProf.location_address}
                    </span>
                    <span className="text-slate-400">Zona: {currentProf.timezone}</span>
                  </div>
                )}
              </section>

              {/* Paso 2: Servicio */}
              <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-teal-600" />
                  2. Elija el tipo de consulta
                </h2>
                <div className="space-y-2.5">
                  {profServices.map((srv) => {
                    const active = srv.id === selectedServiceId;
                    return (
                      <button
                        key={srv.id}
                        type="button"
                        onClick={() => setSelectedServiceId(srv.id)}
                        className={`w-full text-left p-4 rounded-xl border transition flex items-center justify-between gap-4 ${
                          active
                            ? 'border-teal-600 bg-teal-50/50 ring-2 ring-teal-600/20'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-sm text-slate-900">{srv.name}</div>
                          {srv.description && (
                            <p className="text-xs text-slate-500 mt-0.5">{srv.description}</p>
                          )}
                          <span className="inline-block mt-1.5 text-xs font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                            Duración: {srv.duration_minutes} min
                          </span>
                        </div>
                        {srv.publish_price && srv.price_cents !== null && (
                          <div className="text-right shrink-0">
                            <span className="text-base font-bold text-slate-900">
                              {formatMxnCents(srv.price_cents)}
                            </span>
                            <span className="block text-[11px] text-slate-500">MXN</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Paso 3: Fecha y Horario */}
              <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-teal-600" />
                    3. Seleccione fecha y horario disponible
                  </h2>
                  <input
                    type="date"
                    aria-label="Fecha de la cita"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>

                <p className="text-xs text-slate-500 mb-3">
                  {formatSpanishLongDate(selectedDate)} · Horarios calculados en tiempo real en{' '}
                  <strong>{catalog.organization.default_timezone}</strong>:
                </p>

                {loadingSlots ? (
                  <div className="py-8 text-center text-sm text-slate-500">
                    Consultando disponibilidad en servidor...
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <p className="text-sm font-medium text-slate-700">
                      No hay horarios disponibles para esta fecha.
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Seleccione otro día (lunes a sábado) o consulte otro especialista.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                    {availableSlots.map((slot) => {
                      const selected = slot.startsAt === selectedSlotStartsAt;
                      return (
                        <button
                          key={slot.startsAt}
                          type="button"
                          onClick={() => setSelectedSlotStartsAt(slot.startsAt)}
                          className={`py-2.5 px-3 rounded-lg text-sm font-semibold border transition ${
                            selected
                              ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                              : 'bg-white text-slate-800 border-slate-200 hover:border-teal-500 hover:bg-teal-50/40'
                          }`}
                        >
                          {slot.localTimeLabel}
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            {/* Columna derecha: Datos mínimos del paciente y confirmación */}
            <div className="lg:col-span-5">
              <form
                onSubmit={handleSubmitBooking}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-6 space-y-4"
              >
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-teal-600" />
                  4. Datos del paciente
                </h2>
                <p className="text-xs text-slate-500">
                  Solo solicitamos los datos administrativos indispensables para registrar su cita.
                </p>

                {submitError && (
                  <div
                    role="alert"
                    className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium"
                  >
                    {submitError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre completo del paciente *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Sofía Hernández"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Teléfono móvil (WhatsApp / Llamadas) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Ej. 55 1234 5678"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Correo electrónico (opcional)
                  </label>
                  <input
                    type="email"
                    placeholder="paciente@ejemplo.mx"
                    value={patientEmail}
                    onChange={(e) => setPatientEmail(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>

                <div className="pt-1">
                  <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasResponsibleContact}
                      onChange={(e) => setHasResponsibleContact(e.target.checked)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-600"
                    />
                    La cita es para un menor o dependiente (registrar contacto responsable)
                  </label>
                </div>

                {hasResponsibleContact && (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nombre del contacto responsable *
                      </label>
                      <input
                        type="text"
                        required={hasResponsibleContact}
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="Nombre de madre, padre o tutor"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Parentesco
                        </label>
                        <input
                          type="text"
                          value={contactRelationship}
                          onChange={(e) => setContactRelationship(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Teléfono contacto
                        </label>
                        <input
                          type="tel"
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          placeholder="Opcional si es el mismo"
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Resumen previo a confirmar */}
                {currentProf && currentService && (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Profesional:</span>
                      <strong className="text-slate-900">{currentProf.full_name}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Servicio:</span>
                      <strong className="text-slate-900">{currentService.name}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Horario:</span>
                      <strong className="text-teal-700">
                        {selectedSlotStartsAt
                          ? `${selectedDate} · ${
                              availableSlots.find((s) => s.startsAt === selectedSlotStartsAt)
                                ?.localTimeLabel || ''
                            } hrs`
                          : 'Sin seleccionar'}
                      </strong>
                    </div>
                    {currentService.publish_price && currentService.price_cents !== null && (
                      <div className="flex justify-between pt-1 border-t border-slate-200">
                        <span className="text-slate-500">Importe de consulta:</span>
                        <strong className="text-slate-900">
                          {formatMxnCents(currentService.price_cents)} MXN
                        </strong>
                      </div>
                    )}
                  </div>
                )}

                <label className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={policyAccepted}
                    onChange={(e) => setPolicyAccepted(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-600"
                  />
                  <span>
                    He leído y acepto el Aviso de Privacidad (versión <code>v1.0-2026-10</code>) y
                    el uso de mis datos de contacto para notificaciones operativas de esta cita.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={submitting || isOffline || !selectedSlotStartsAt}
                  className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white font-semibold text-sm transition shadow-sm flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {submitting
                    ? 'Verificando disponibilidad y guardando...'
                    : isOffline
                    ? 'Sin conexión — Confirmación deshabilitada'
                    : 'Confirmar reserva ahora'}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export const PatientManageBookingPortal: React.FC<{
  token: string;
  isOffline: boolean;
  onBack?: () => void;
}> = ({ token, isOffline, onBack }) => {
  const [booking, setBooking] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('2026-10-17');
  const [rescheduleSlots, setRescheduleSlots] = useState<any[]>([]);
  const [newSlotStartsAt, setNewSlotStartsAt] = useState('');

  const loadBooking = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/v1/booking-access/verify', {
        method: 'POST',
        body: { token },
      });
      setBooking(res.booking);
      setRescheduleDate(res.booking.localDate);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooking();
  }, [token]);

  useEffect(() => {
    if (!showReschedule || !booking) return;
    apiFetch(
      `/api/v1/public/nucleo-demo/availability?professional_id=${booking.professionalId}&service_id=${booking.serviceId}&date=${rescheduleDate}`
    )
      .then((res) => setRescheduleSlots(res.slots || []))
      .catch(() => setRescheduleSlots([]));
  }, [showReschedule, booking, rescheduleDate]);

  const handleConfirmAttendance = async () => {
    setError(null);
    setActionMessage(null);
    try {
      const res = await apiFetch(`/api/v1/bookings/${booking.id}/confirm`, {
        method: 'POST',
        isSimulatedOffline: isOffline,
        body: { token },
      });
      setBooking({
        ...booking,
        attendanceStatus: res.booking.attendance_status,
        version: res.booking.version,
      });
      setActionMessage('Su asistencia ha sido confirmada exitosamente.');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleReschedule = async () => {
    if (!newSlotStartsAt) return;
    setError(null);
    setActionMessage(null);
    try {
      const res = await apiFetch(`/api/v1/bookings/${booking.id}/reschedule`, {
        method: 'POST',
        isSimulatedOffline: isOffline,
        body: {
          token,
          newStartsAt: newSlotStartsAt,
          expectedVersion: booking.version,
          reason: 'Reprogramada por el paciente',
        },
      });
      setBooking({
        ...booking,
        startsAt: res.booking.starts_at,
        endsAt: res.booking.ends_at,
        localDate: res.booking.local_date,
        localTime: res.booking.local_time,
        localEndTime: res.booking.local_end_time,
        version: res.booking.version,
      });
      setShowReschedule(false);
      setActionMessage('Su cita fue reprogramada de manera atómica.');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCancel = async () => {
    setError(null);
    setActionMessage(null);
    try {
      const res = await apiFetch(`/api/v1/bookings/${booking.id}/cancel`, {
        method: 'POST',
        isSimulatedOffline: isOffline,
        body: {
          token,
          reason: cancelReason || 'Cancelada por el paciente en portal de autogestión',
          expectedVersion: booking.version,
        },
      });
      setBooking({
        ...booking,
        attendanceStatus: res.booking.attendance_status,
        version: res.booking.version,
      });
      setShowCancelConfirm(false);
      setActionMessage('Su cita ha sido cancelada y el horario fue liberado.');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FA] p-4 sm:p-8 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 max-w-xl w-full space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <span className="text-xs font-bold uppercase text-teal-600 tracking-wider">
              Gestión Verificada de Reserva
            </span>
            <h1 className="text-xl font-bold text-slate-900">Dr Agenda Núcleos</h1>
          </div>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" /> Volver
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-slate-500 py-6 text-center">Verificando token seguro...</p>
        ) : error && !booking ? (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-800">
            <strong>Acceso denegado:</strong> {error}
          </div>
        ) : (
          booking && (
            <>
              {actionMessage && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
                  {actionMessage}
                </div>
              )}
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800">
                  {error}
                </div>
              )}

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">Folio: {booking.folio}</span>
                  <div className="flex items-center gap-2">
                    <AttendanceBadge status={booking.attendanceStatus} />
                    <FinancialBadge status={booking.financialStatus} />
                  </div>
                </div>
                <p className="text-slate-700">
                  <strong>Paciente:</strong> {booking.patientName}
                </p>
                <p className="text-slate-700">
                  <strong>Especialista:</strong> {booking.professionalName} ({booking.specialty})
                </p>
                <p className="text-slate-700">
                  <strong>Servicio:</strong> {booking.serviceName}
                </p>
                <p className="text-slate-700">
                  <strong>Fecha y Hora:</strong> {formatSpanishLongDate(booking.localDate)} ·{' '}
                  {booking.localTime} - {booking.localEndTime} hrs
                </p>
              </div>

              {booking.attendanceStatus !== 'cancelled' &&
                booking.attendanceStatus !== 'completed' && (
                  <div className="flex flex-wrap gap-3 pt-2">
                    {booking.attendanceStatus === 'scheduled' && (
                      <button
                        type="button"
                        disabled={isOffline}
                        onClick={handleConfirmAttendance}
                        className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white text-xs font-semibold"
                      >
                        Confirmar mi asistencia
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={isOffline}
                      onClick={() => setShowReschedule(!showReschedule)}
                      className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Reprogramar horario
                    </button>
                    <button
                      type="button"
                      disabled={isOffline}
                      onClick={() => setShowCancelConfirm(!showCancelConfirm)}
                      className="px-4 py-2.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold"
                    >
                      Cancelar cita
                    </button>
                  </div>
                )}

              {showReschedule && (
                <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Seleccione nueva fecha y hora
                    </span>
                    <input
                      type="date"
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      className="px-2.5 py-1 rounded border border-slate-300 text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {rescheduleSlots.map((s) => (
                      <button
                        key={s.startsAt}
                        type="button"
                        onClick={() => setNewSlotStartsAt(s.startsAt)}
                        className={`py-1.5 px-2 rounded text-xs font-semibold border ${
                          newSlotStartsAt === s.startsAt
                            ? 'bg-teal-600 text-white border-teal-600'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        {s.localTimeLabel}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled={!newSlotStartsAt || isOffline}
                    onClick={handleReschedule}
                    className="w-full py-2 rounded-lg bg-teal-600 text-white text-xs font-semibold disabled:bg-slate-300"
                  >
                    Confirmar cambio de horario
                  </button>
                </div>
              )}

              {showCancelConfirm && (
                <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 space-y-3">
                  <label className="block text-xs font-bold text-rose-900">
                    Motivo de cancelación (requiere confirmación explícita):
                  </label>
                  <input
                    type="text"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Ej. Imprevisto laboral"
                    className="w-full px-3 py-1.5 rounded border border-rose-300 text-xs"
                  />
                  <button
                    type="button"
                    disabled={isOffline}
                    onClick={handleCancel}
                    className="w-full py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
                  >
                    Confirmar cancelación definitiva
                  </button>
                </div>
              )}
            </>
          )
        )}
      </div>
    </div>
  );
};
