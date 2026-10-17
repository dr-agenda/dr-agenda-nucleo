import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Home,
  Calendar,
  Users,
  UserCheck,
  CreditCard,
  BarChart3,
  Settings,
  Search,
  Bell,
  Plus,
  Link2,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronRight as ArrowRightIcon,
  ExternalLink,
  MoreHorizontal,
  Building2,
  LogOut,
  WifiOff,
  Wifi,
  DollarSign,
  RefreshCw,
  ShieldAlert,
  Lock,
  CheckCircle2,
  FileText,
  Smartphone,
  QrCode,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { apiFetch, clearToken, getSavedToken, saveToken } from './client/api';
import { AttendanceBadge, FinancialBadge } from './client/badges';
import {
  AppointmentDetailModal,
  NewAppointmentModal,
  ShareLinksModal,
} from './client/AppointmentModals';
import {
  PatientManageBookingPortal,
  PublicBookingPortal,
} from './client/PublicBookingPortal';
import { formatMxnCents, formatSpanishLongDate } from './shared/timezone';
import type {
  AppointmentDTO,
  AuthSessionUser,
  AvailabilityExceptionDTO,
  AvailabilityRuleDTO,
  ClinicalRecordDTO,
  DailySummaryReportDTO,
  FinancialMovementDTO,
  OrganizationIntegrationsDTO,
  ProfessionalDTO,
  ResourceDTO,
  ServiceDTO,
} from './shared/types';

type StaffSection =
  | 'inicio'
  | 'multiagenda'
  | 'pacientes'
  | 'expedientes'
  | 'profesionales'
  | 'cobros'
  | 'reportes'
  | 'configuracion';

const WEEKDAYS_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const ROLE_DISPLAY_NAMES: Record<string, string> = {
  reception: 'Asistente',
  admin: 'Administrador',
  professional: 'Especialista',
  cashier: 'Caja',
};

function buildMonthCalendarCells(year: number, month1Based: number) {
  const firstDayUtc = new Date(Date.UTC(year, month1Based - 1, 1));
  const jsDow = firstDayUtc.getUTCDay(); // 0=Sun..6=Sat
  const mondayFirstOffset = (jsDow + 6) % 7; // 0=Mon..6=Sun
  const daysInMonth = new Date(Date.UTC(year, month1Based, 0)).getUTCDate();
  const daysInPrevMonth = new Date(Date.UTC(year, month1Based - 1, 0)).getUTCDate();

  const cells: Array<{
    day: number;
    dateStr: string;
    inCurrentMonth: boolean;
  }> = [];

  for (let i = mondayFirstOffset - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const prevDate = new Date(Date.UTC(year, month1Based - 2, d));
    const dateStr = `${prevDate.getUTCFullYear()}-${String(prevDate.getUTCMonth() + 1).padStart(
      2,
      '0'
    )}-${String(prevDate.getUTCDate()).padStart(2, '0')}`;
    cells.push({ day: d, dateStr, inCurrentMonth: false });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month1Based).padStart(2, '0')}-${String(d).padStart(
      2,
      '0'
    )}`;
    cells.push({ day: d, dateStr, inCurrentMonth: true });
  }

  const remaining = (7 - (cells.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const nextDate = new Date(Date.UTC(year, month1Based, d));
    const dateStr = `${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth() + 1).padStart(
      2,
      '0'
    )}-${String(nextDate.getUTCDate()).padStart(2, '0')}`;
    cells.push({ day: d, dateStr, inCurrentMonth: false });
  }

  return cells;
}

export const App: React.FC = () => {
  // Detectar si estamos en ruta pública (/reservar/... o /gestionar/...)
  const [routePath, setRoutePath] = useState<string>(() => window.location.pathname);

  useEffect(() => {
    const onPopState = () => setRoutePath(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigateTo = (newPath: string) => {
    window.history.pushState({}, '', newPath);
    setRoutePath(newPath);
  };

  // Estado de conectividad real y simulador de prueba A18/A25
  const [browserOffline, setBrowserOffline] = useState<boolean>(!navigator.onLine);
  const [simulatedOffline, setSimulatedOffline] = useState<boolean>(false);
  const isOffline = browserOffline || simulatedOffline;

  // Sesión autenticada
  const [user, setUser] = useState<AuthSessionUser | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [loginEmail, setLoginEmail] = useState('laura@nucleodemo.mx');
  const [loginPassword, setLoginPassword] = useState('Demo2026!');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Navegación del panel interno
  const [activeSection, setActiveSection] = useState<StaffSection>('inicio');
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-16');
  const [calendarYearMonth, setCalendarYearMonth] = useState<{ year: number; month: number }>({
    year: 2026,
    month: 10,
  });
  const [selectedProfessionalFilter, setSelectedProfessionalFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAllAppointmentsInHome, setShowAllAppointmentsInHome] = useState<boolean>(false);

  // Datos reales desde Supabase PostgreSQL
  const [dailySummary, setDailySummary] = useState<DailySummaryReportDTO | null>(null);
  const [appointments, setAppointments] = useState<AppointmentDTO[]>([]);
  const [professionals, setProfessionals] = useState<ProfessionalDTO[]>([]);
  const [services, setServices] = useState<ServiceDTO[]>([]);
  const [resources, setResources] = useState<ResourceDTO[]>([]);
  const [availabilityRules, setAvailabilityRules] = useState<AvailabilityRuleDTO[]>([]);
  const [availabilityBlocks, setAvailabilityBlocks] = useState<AvailabilityExceptionDTO[]>([]);
  const [patientsList, setPatientsList] = useState<any[]>([]);
  const [clinicalRecords, setClinicalRecords] = useState<ClinicalRecordDTO[]>([]);
  const [clinicalError, setClinicalError] = useState<string | null>(null);
  const [movementsList, setMovementsList] = useState<FinancialMovementDTO[]>([]);
  const [reportMetrics, setReportMetrics] = useState<any | null>(null);
  const [notificationJobs, setNotificationJobs] = useState<any[]>([]);
  const [orgSettings, setOrgSettings] = useState<any | null>(null);
  const [integrations, setIntegrations] = useState<OrganizationIntegrationsDTO | null>(null);
  const [dataLoading, setDataLoading] = useState<boolean>(false);

  // Modales operativos
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);
  const [newAppointmentProfPreset, setNewAppointmentProfPreset] = useState<string | undefined>(
    undefined
  );
  const [showShareLinksModal, setShowShareLinksModal] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Modal de vinculación de WhatsApp personal por especialista (Evolution API)
  const [waModalProf, setWaModalProf] = useState<ProfessionalDTO | null>(null);
  const [waQrData, setWaQrData] = useState<{
    qrBase64: string | null;
    pairingCode: string | null;
    simulated: boolean;
    message: string;
  } | null>(null);
  const [waInstanceInput, setWaInstanceInput] = useState('');
  const [waPhoneInput, setWaPhoneInput] = useState('');
  const [waTestRecipient, setWaTestRecipient] = useState('');
  const [waTestTemplate, setWaTestTemplate] = useState<
    'confirm' | 'reschedule' | 'cancel' | 'reminder_24h' | 'reminder_1h'
  >('confirm');
  const [waTestResult, setWaTestResult] = useState<any | null>(null);
  const [waLoading, setWaLoading] = useState(false);

  // Formulario de configuración de Evolution API y Doctoralia
  const [evoUrlInput, setEvoUrlInput] = useState('https://whatsapp.dragendas.com');
  const [evoApiKeyInput, setEvoApiKeyInput] = useState('');
  const [confirmTplInput, setConfirmTplInput] = useState('');
  const [rescheduleTplInput, setRescheduleTplInput] = useState('');
  const [cancelTplInput, setCancelTplInput] = useState('');
  const [rem24hTplInput, setRem24hTplInput] = useState('');
  const [rem1hTplInput, setRem1hTplInput] = useState('');
  const [doctoraliaSimProfId, setDoctoraliaSimProfId] = useState('');
  const [doctoraliaFeedback, setDoctoraliaFeedback] = useState<string | null>(null);

  // Formulario de nuevo expediente clínico (por especialista)
  const [ehrPatientId, setEhrPatientId] = useState('');
  const [ehrChiefComplaint, setEhrChiefComplaint] = useState('');
  const [ehrSubjective, setEhrSubjective] = useState('');
  const [ehrObjective, setEhrObjective] = useState('');
  const [ehrDiagnosis, setEhrDiagnosis] = useState('');
  const [ehrTreatment, setEhrTreatment] = useState('');
  const [ehrWeight, setEhrWeight] = useState('');
  const [ehrBp, setEhrBp] = useState('');
  const [ehrSpecialtyFieldKey, setEhrSpecialtyFieldKey] = useState('');
  const [ehrSpecialtyFieldVal, setEhrSpecialtyFieldVal] = useState('');
  const [ehrFeedback, setEhrFeedback] = useState<string | null>(null);

  // Formularios en Profesionales / Horarios / Bloqueos / Configuración
  const [newSrvProfId, setNewSrvProfId] = useState('');
  const [newSrvName, setNewSrvName] = useState('');
  const [newSrvDuration, setNewSrvDuration] = useState('30');
  const [newSrvPricePesos, setNewSrvPricePesos] = useState('1200');
  const [newSrvResourceId, setNewSrvResourceId] = useState('');
  const [configFeedback, setConfigFeedback] = useState<string | null>(null);

  const [blockProfId, setBlockProfId] = useState('');
  const [blockDate, setBlockDate] = useState('2026-10-16');
  const [blockStartTime, setBlockStartTime] = useState('13:00');
  const [blockEndTime, setBlockEndTime] = useState('14:00');
  const [blockReason, setBlockReason] = useState('');

  // Recargar datos del servidor
  const refreshAllData = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    try {
      const profParam = selectedProfessionalFilter
        ? `&professional_id=${selectedProfessionalFilter}`
        : '';
      const statusParam = statusFilter ? `&status=${statusFilter}` : '';
      const searchParam = searchQuery.trim()
        ? `&search=${encodeURIComponent(searchQuery.trim())}`
        : '';

      const [summaryRes, apptsRes, catalogRes] = await Promise.all([
        apiFetch<DailySummaryReportDTO>(
          `/api/v1/reports/daily?date=${selectedDate}${profParam}`
        ),
        apiFetch<{ appointments: AppointmentDTO[] }>(
          `/api/v1/appointments?date=${selectedDate}${profParam}${statusParam}${searchParam}`
        ),
        apiFetch<{
          organization: any;
          locations: any[];
          resources: ResourceDTO[];
          professionals: ProfessionalDTO[];
          services: ServiceDTO[];
          availabilityRules: AvailabilityRuleDTO[];
          availabilityBlocks: AvailabilityExceptionDTO[];
          integrations: OrganizationIntegrationsDTO | null;
        }>('/api/v1/catalog'),
      ]);

      setDailySummary(summaryRes);
      setAppointments(apptsRes.appointments);
      setProfessionals(catalogRes.professionals);
      setServices(catalogRes.services);
      setResources(catalogRes.resources);
      setAvailabilityRules(catalogRes.availabilityRules);
      setAvailabilityBlocks(catalogRes.availabilityBlocks);
      setOrgSettings({
        organization: catalogRes.organization,
        location: catalogRes.locations[0] || null,
      });

      if (catalogRes.integrations) {
        setIntegrations(catalogRes.integrations);
        setEvoUrlInput(catalogRes.integrations.evolution_api_url || 'https://whatsapp.dragendas.com');
        setEvoApiKeyInput(catalogRes.integrations.evolution_api_key_encrypted || '');
        setConfirmTplInput(catalogRes.integrations.confirm_template || '');
        setRescheduleTplInput(catalogRes.integrations.reschedule_template || '');
        setCancelTplInput(catalogRes.integrations.cancel_template || '');
        setRem24hTplInput(catalogRes.integrations.reminder_24h_template || '');
        setRem1hTplInput(catalogRes.integrations.reminder_1h_template || '');
      }

      if (!newSrvProfId && catalogRes.professionals[0]) {
        setNewSrvProfId(catalogRes.professionals[0].id);
      }
      if (!blockProfId && catalogRes.professionals[0]) {
        setBlockProfId(catalogRes.professionals[0].id);
      }
      if (!doctoraliaSimProfId && catalogRes.professionals[0]) {
        setDoctoraliaSimProfId(catalogRes.professionals[0].id);
      }
    } catch (err) {
      console.error('Error al cargar datos:', err);
    } finally {
      setDataLoading(false);
    }
  }, [user, selectedDate, selectedProfessionalFilter, statusFilter, searchQuery]);

  // Cargar datos adicionales según la sección activa
  useEffect(() => {
    if (!user) return;
    if (activeSection === 'pacientes') {
      apiFetch(`/api/v1/patients?search=${encodeURIComponent(searchQuery)}`)
        .then((res) => setPatientsList(res.patients || []))
        .catch(() => {});
    } else if (activeSection === 'expedientes') {
      setClinicalError(null);
      apiFetch(`/api/v1/patients`)
        .then((res) => {
          const list = res.patients || [];
          setPatientsList(list);
          if (!ehrPatientId && list[0]) setEhrPatientId(list[0].id);
        })
        .catch(() => {});

      apiFetch<{ records: ClinicalRecordDTO[] }>('/api/v1/clinical-records')
        .then((res) => setClinicalRecords(res.records || []))
        .catch((err) => {
          setClinicalRecords([]);
          setClinicalError(err.message);
        });
    } else if (activeSection === 'cobros') {
      apiFetch('/api/v1/financial-movements')
        .then((res) => setMovementsList(res.movements || []))
        .catch(() => {});
    } else if (activeSection === 'reportes') {
      Promise.all([
        apiFetch('/api/v1/reports/metrics?from=2026-10-01&to=2026-10-31'),
        apiFetch('/api/v1/communications/jobs'),
      ])
        .then(([mRes, jRes]) => {
          setReportMetrics(mRes);
          setNotificationJobs(jRes.jobs || []);
        })
        .catch(() => {});
    }
  }, [user, activeSection, searchQuery]);

  // Verificar sesión guardada al iniciar
  useEffect(() => {
    const token = getSavedToken();
    if (!token) {
      setAuthChecking(false);
      return;
    }
    apiFetch<{ user: AuthSessionUser }>('/api/v1/auth/me')
      .then((res) => {
        setUser(res.user);
      })
      .catch(() => {
        clearToken();
        setUser(null);
      })
      .finally(() => {
        setAuthChecking(false);
      });
  }, []);

  useEffect(() => {
    if (user) {
      refreshAllData();
    }
  }, [user, refreshAllData]);

  // Reconexión automática (Regla A25: Al reconectar, vuelve a consultar el estado del servidor)
  useEffect(() => {
    const handleOnline = () => {
      setBrowserOffline(false);
      refreshAllData();
    };
    const handleOffline = () => {
      setBrowserOffline(true);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshAllData]);

  const handleLogin = async (emailToUse?: string, passwordToUse?: string) => {
    setLoginError(null);
    setLoginLoading(true);
    try {
      const res = await apiFetch<{ token: string; user: AuthSessionUser }>('/api/v1/auth/login', {
        method: 'POST',
        body: {
          email: emailToUse ?? loginEmail,
          password: passwordToUse ?? loginPassword,
        },
      });
      saveToken(res.token);
      setUser(res.user);
      setSelectedProfessionalFilter('');
      setShowProfileMenu(false);
    } catch (err: any) {
      setLoginError(err.message || 'No se pudo iniciar sesión.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    clearToken();
    setUser(null);
    setShowProfileMenu(false);
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigFeedback(null);
    try {
      await apiFetch('/api/v1/services', {
        method: 'POST',
        isSimulatedOffline: isOffline,
        body: {
          professionalId: newSrvProfId,
          defaultResourceId: newSrvResourceId || undefined,
          name: newSrvName,
          durationMinutes: Number(newSrvDuration),
          priceCents: Math.round(Number(newSrvPricePesos) * 100),
          publishPrice: true,
        },
      });
      setNewSrvName('');
      setConfigFeedback('Servicio creado y publicado en la agenda de la especialista.');
      await refreshAllData();
    } catch (err: any) {
      setConfigFeedback(`Error: ${err.message}`);
    }
  };

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigFeedback(null);
    try {
      const startsAt = `${blockDate}T${blockStartTime}:00-06:00`;
      const endsAt = `${blockDate}T${blockEndTime}:00-06:00`;
      await apiFetch('/api/v1/availability/blocks', {
        method: 'POST',
        isSimulatedOffline: isOffline,
        body: {
          professionalId: blockProfId,
          kind: 'block',
          startsAt,
          endsAt,
          reason: blockReason || 'Bloqueo operativo de agenda',
        },
      });
      setBlockReason('');
      setConfigFeedback('Horario bloqueado exitosamente en tabla común de ocupación.');
      await refreshAllData();
    } catch (err: any) {
      setConfigFeedback(`Error al bloquear: ${err.message}`);
    }
  };

  const openWhatsAppLinkModal = async (prof: ProfessionalDTO) => {
    setWaModalProf(prof);
    setWaInstanceInput(prof.whatsapp_instance_name || `consultorio-${prof.slug}`);
    setWaPhoneInput(prof.whatsapp_phone || '');
    setWaTestRecipient(prof.whatsapp_phone || '+525511223344');
    setWaTestResult(null);
    setWaQrData(null);
  };

  const handleGenerateQr = async () => {
    if (!waModalProf) return;
    setWaLoading(true);
    try {
      const res = await apiFetch(`/api/v1/professionals/${waModalProf.id}/whatsapp/connect`, {
        method: 'POST',
        body: {
          instanceName: waInstanceInput,
          whatsappPhone: waPhoneInput,
        },
      });
      setWaQrData(res.evolution);
      setWaModalProf(res.professional);
      await refreshAllData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setWaLoading(false);
    }
  };

  const handleConfirmWhatsAppLink = async (status: 'connected' | 'disconnected') => {
    if (!waModalProf) return;
    setWaLoading(true);
    try {
      const res = await apiFetch(
        `/api/v1/professionals/${waModalProf.id}/whatsapp/confirm-link`,
        {
          method: 'POST',
          body: {
            status,
            instanceName: waInstanceInput,
            whatsappPhone: waPhoneInput,
          },
        }
      );
      setWaModalProf(res.professional);
      await refreshAllData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setWaLoading(false);
    }
  };

  const handleSendWhatsAppTest = async () => {
    if (!waModalProf) return;
    setWaLoading(true);
    setWaTestResult(null);
    try {
      const res = await apiFetch(`/api/v1/professionals/${waModalProf.id}/whatsapp/test`, {
        method: 'POST',
        body: {
          recipientPhone: waTestRecipient,
          templateType: waTestTemplate,
        },
      });
      setWaTestResult(res);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setWaLoading(false);
    }
  };

  const handleSaveIntegrationSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigFeedback(null);
    try {
      await apiFetch('/api/v1/integrations/settings', {
        method: 'PUT',
        body: {
          evolutionApiUrl: evoUrlInput,
          evolutionApiKey: evoApiKeyInput,
          confirmTemplate: confirmTplInput,
          rescheduleTemplate: rescheduleTplInput,
          cancelTemplate: cancelTplInput,
          reminder24hTemplate: rem24hTplInput,
          reminder1hTemplate: rem1hTplInput,
          autoSendEnabled: true,
        },
      });
      setConfigFeedback(
        'Configuración de Evolution API (whatsapp.dragendas.com) y plantillas guardadas en Supabase.'
      );
      await refreshAllData();
    } catch (err: any) {
      setConfigFeedback(`Error: ${err.message}`);
    }
  };

  const handleSimulateDoctoraliaBooking = async (profIdOverride?: string) => {
    setDoctoraliaFeedback(null);
    try {
      const res = await apiFetch('/api/v1/integrations/doctoralia/simulate-booking', {
        method: 'POST',
        body: {
          professionalId: profIdOverride || doctoraliaSimProfId || professionals[0]?.id,
          date: selectedDate,
        },
      });
      setDoctoraliaFeedback(
        `Cita de Doctoralia sincronizada (${res.appointment.folio} · ${res.appointment.local_time} con ${res.appointment.professional_name}). WhatsApp automático despachado desde instancia "${res.whatsappDispatchedFrom}" (${res.specialistPhone}).`
      );
      await refreshAllData();
    } catch (err: any) {
      setDoctoraliaFeedback(`Aviso Doctoralia: ${err.message}`);
    }
  };

  const handleCreateClinicalRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setEhrFeedback(null);
    try {
      const targetProf =
        user?.role === 'professional'
          ? professionals.find((p) => p.id === user.professionalId)
          : professionals[0];

      const specialtyType =
        targetProf?.slug === 'ginecologa'
          ? 'ginecologia'
          : targetProf?.slug === 'internista'
            ? 'medicina_interna'
            : targetProf?.slug === 'nutriologa'
              ? 'nutricion'
              : targetProf?.slug === 'psicologa'
                ? 'psicologia'
                : 'general';

      await apiFetch('/api/v1/clinical-records', {
        method: 'POST',
        body: {
          patientId: ehrPatientId,
          professionalId: targetProf?.id,
          specialtyType,
          chiefComplaint: ehrChiefComplaint,
          subjectiveNotes: ehrSubjective,
          objectiveNotes: ehrObjective,
          diagnosis: ehrDiagnosis,
          treatmentPlan: ehrTreatment,
          vitalSigns: {
            ...(ehrWeight ? { peso_kg: ehrWeight } : {}),
            ...(ehrBp ? { presion_arterial: ehrBp } : {}),
          },
          specialtyData:
            ehrSpecialtyFieldKey && ehrSpecialtyFieldVal
              ? { [ehrSpecialtyFieldKey]: ehrSpecialtyFieldVal }
              : {},
        },
      });

      setEhrChiefComplaint('');
      setEhrSubjective('');
      setEhrObjective('');
      setEhrDiagnosis('');
      setEhrTreatment('');
      setEhrSpecialtyFieldKey('');
      setEhrSpecialtyFieldVal('');
      setEhrFeedback('Nota clínica guardada en el expediente privado de la especialista (RLS activo).');

      const updated = await apiFetch<{ records: ClinicalRecordDTO[] }>('/api/v1/clinical-records');
      setClinicalRecords(updated.records || []);
    } catch (err: any) {
      setEhrFeedback(`Error: ${err.message}`);
    }
  };

  const calendarCells = useMemo(
    () => buildMonthCalendarCells(calendarYearMonth.year, calendarYearMonth.month),
    [calendarYearMonth]
  );

  const monthTitle = useMemo(() => {
    const d = new Date(Date.UTC(calendarYearMonth.year, calendarYearMonth.month - 1, 15));
    const str = new Intl.DateTimeFormat('es-MX', {
      timeZone: 'UTC',
      month: 'long',
      year: 'numeric',
    }).format(d);
    return str.charAt(0).toUpperCase() + str.slice(1);
  }, [calendarYearMonth]);

  // 1. Si la ruta es /reservar/:orgSlug o /reservar/:orgSlug/:profSlug -> mostrar Portal Público
  if (routePath.startsWith('/reservar/')) {
    const parts = routePath.replace(/^\/reservar\//, '').split('/').filter(Boolean);
    const orgSlug = parts[0] || 'nucleo-demo';
    const profSlug = parts[1] || null;
    return (
      <PublicBookingPortal
        orgSlug={orgSlug}
        initialProfSlug={profSlug}
        initialDate={selectedDate}
        isOffline={isOffline}
        onBackToStaffPanel={() => {
          navigateTo('/');
          if (user) refreshAllData();
        }}
      />
    );
  }

  // 2. Si la ruta es /gestionar/:token -> mostrar Portal Verificado del Paciente
  if (routePath.startsWith('/gestionar/')) {
    const token = routePath.replace(/^\/gestionar\//, '').trim();
    return (
      <PatientManageBookingPortal
        token={token}
        isOffline={isOffline}
        onBack={() => {
          navigateTo('/');
          if (user) refreshAllData();
        }}
      />
    );
  }

  // 3. Si no hay sesión -> mostrar Pantalla de Acceso Institucional
  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#0B2138] flex items-center justify-center p-6 text-white">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-300">Verificando sesión segura en Dr Agenda Núcleos...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0B2138] flex flex-col justify-center items-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          <div className="bg-[#102A43] px-6 py-6 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-teal-500 flex items-center justify-center shadow-md">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Dr Agenda</h1>
                <p className="text-xs uppercase tracking-widest text-teal-300 font-semibold">
                  NÚCLEOS
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigateTo('/reservar/nucleo-demo')}
              className="text-xs font-semibold text-teal-300 hover:text-white underline"
            >
              Ir a reserva pública →
            </button>
          </div>

          <div className="p-6 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Acceso al núcleo médico</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Cuentas individuales con aislamiento por organización y rol en servidor (RLS activo).
              </p>
            </div>

            {loginError && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800"
              >
                {loginError}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin();
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Correo electrónico institucional
                </label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contraseña
                </label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition shadow-sm flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                {loginLoading ? 'Autenticando...' : 'Iniciar sesión'}
              </button>
            </form>

            {/* Cuentas de demostración para probar roles rápidamente */}
            <div className="pt-4 border-t border-slate-200">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Acceso rápido de demostración por especialidad (Contraseña: Demo2026!)
              </span>
              <div className="space-y-1.5">
                {[
                  {
                    label: 'Laura · Asistente (Control General)',
                    email: 'laura@nucleodemo.mx',
                    badge: 'Asistente',
                  },
                  {
                    label: 'Dirección · Administrador',
                    email: 'admin@nucleodemo.mx',
                    badge: 'Admin',
                  },
                  {
                    label: 'Ginecóloga · Ginecología y Obstetricia',
                    email: 'sofia@nucleodemo.mx',
                    badge: 'Especialista',
                  },
                  {
                    label: 'Internista · Medicina Interna',
                    email: 'pablo@nucleodemo.mx',
                    badge: 'Especialista',
                  },
                  {
                    label: 'Nutrióloga · Nutrición Clínica',
                    email: 'elena@nucleodemo.mx',
                    badge: 'Especialista',
                  },
                  {
                    label: 'Psicóloga · Psicología Clínica',
                    email: 'psicologa@nucleodemo.mx',
                    badge: 'Especialista',
                  },
                ].map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => {
                      setLoginEmail(acc.email);
                      setLoginPassword('Demo2026!');
                      handleLogin(acc.email, 'Demo2026!');
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50/40 text-xs flex items-center justify-between transition"
                  >
                    <span className="font-semibold text-slate-800">{acc.label}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                      {acc.badge}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Nombre corto para el saludo ("Buen día, Laura" como en la referencia visual)
  const greetingFirstName = user.fullName.includes('Laura')
    ? 'Laura'
    : user.fullName.split('·')[0].trim();

  const displayedHomeAppointments = showAllAppointmentsInHome
    ? appointments
    : appointments.slice(0, 6);

  return (
    <div className="min-h-screen bg-[#F4F7FA] flex flex-col lg:flex-row">
      {/* Menú Lateral Azul Marino (#0B2138) siguiendo fielmente la referencia visual */}
      <aside className="w-full lg:w-64 bg-[#0B2138] text-white flex flex-col justify-between shrink-0 select-none">
        <div>
          {/* Logo Superior */}
          <div className="px-6 pt-6 pb-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#14B8A6] flex items-center justify-center shadow-sm">
              <Calendar className="w-6 h-6 text-[#0B2138] stroke-[2.2]" />
            </div>
            <div>
              <div className="text-xl font-bold leading-none tracking-tight text-white">
                Dr Agenda
              </div>
              <div className="text-[11px] font-semibold tracking-[0.22em] text-slate-300 mt-1">
                NÚCLEOS
              </div>
            </div>
          </div>

          {/* Selector de Núcleo */}
          <div className="px-4 mb-5">
            <div className="w-full px-3.5 py-2.5 rounded-xl bg-[#132C47] border border-[#234567] flex items-center justify-between text-sm text-slate-100">
              <span className="flex items-center gap-2.5 font-medium truncate">
                <Building2 className="w-4 h-4 text-slate-300 shrink-0" />
                {user.organizationName}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 font-semibold">
                MXN
              </span>
            </div>
          </div>

          {/* Navegación Principal */}
          <nav aria-label="Menú principal" className="px-3 space-y-1">
            {(
              [
                { id: 'inicio', label: 'Inicio', icon: Home },
                { id: 'multiagenda', label: 'Multiagenda', icon: Calendar },
                { id: 'pacientes', label: 'Pacientes', icon: Users },
                { id: 'expedientes', label: 'Expedientes', icon: FileText },
                { id: 'profesionales', label: 'Especialistas y WhatsApp', icon: UserCheck },
                { id: 'cobros', label: 'Cobros', icon: CreditCard },
                { id: 'reportes', label: 'Reportes', icon: BarChart3 },
              ] as Array<{ id: StaffSection; label: string; icon: React.FC<{ className?: string }> }>
            ).map((item) => {
              const Icon = item.icon;
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition ${
                    active
                      ? 'bg-[#138A8A] text-white shadow-xs'
                      : 'text-slate-300 hover:bg-[#132C47] hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Configuración al pie del menú lateral */}
        <div className="p-3 border-t border-[#16324F] mt-6 lg:mt-0">
          <button
            type="button"
            onClick={() => setActiveSection('configuracion')}
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition ${
              activeSection === 'configuracion'
                ? 'bg-[#138A8A] text-white'
                : 'text-slate-300 hover:bg-[#132C47] hover:text-white'
            }`}
          >
            <Settings className="w-5 h-5 shrink-0" />
            <span>Configuración</span>
          </button>
        </div>
      </aside>

      {/* Contenedor Principal Derecho */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Aviso Sin Conexión (Requisito 8 y A18/A25) */}
        {isOffline && (
          <div
            role="alert"
            className="bg-amber-600 text-white px-6 py-2.5 text-xs sm:text-sm font-semibold flex flex-wrap items-center justify-between gap-2"
          >
            <span className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 shrink-0" />
              Modo sin conexión activo: No se confirmarán reservas, pagos ni cambios de estado hasta recuperar la red.
            </span>
            {simulatedOffline && (
              <button
                type="button"
                onClick={() => {
                  setSimulatedOffline(false);
                  refreshAllData();
                }}
                className="px-3 py-1 rounded bg-white text-amber-900 text-xs font-bold"
              >
                Restaurar conexión y sincronizar (A25)
              </button>
            )}
          </div>
        )}

        {/* Barra Superior Blanca */}
        <header className="bg-white border-b border-slate-200/80 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          {/* Buscador Global */}
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              aria-label="Buscar paciente o cita"
              placeholder="Buscar paciente o cita"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#F4F7FA] border border-slate-200/90 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition"
            />
          </div>

          {/* Controles Derechos: Simulador Offline, Notificaciones y Perfil/Cambio de Rol */}
          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              onClick={() => {
                const next = !simulatedOffline;
                setSimulatedOffline(next);
                if (!next) refreshAllData();
              }}
              title="Probar comportamiento sin conexión (Escenario A18 y A25)"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border inline-flex items-center gap-1.5 transition ${
                isOffline
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {isOffline ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
              {isOffline ? 'Sin conexión (Simulado)' : 'En línea'}
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('reportes')}
              aria-label="Ver cola de recordatorios y notificaciones"
              className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
            >
              <Bell className="w-5 h-5" />
              <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-1.5 right-1.5" />
            </button>

            {/* Menú de Usuario y Cambio Rápido de Rol */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-full hover:bg-slate-100 transition border border-transparent hover:border-slate-200"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center">
                  {user.initials}
                </div>
                <span className="text-sm font-medium text-slate-800">{user.fullName}</span>
                <span className="text-slate-400 text-xs">▾</span>
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-76 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 text-xs">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <div className="font-bold text-slate-900">{user.fullName}</div>
                    <div className="text-slate-500">{user.email}</div>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded bg-teal-50 text-teal-700 font-semibold uppercase text-[10px]">
                      Rol activo: {ROLE_DISPLAY_NAMES[user.role] || user.role}
                    </span>
                  </div>

                  <div className="px-4 py-2 border-b border-slate-100">
                    <span className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">
                      Cambiar vista por rol / especialista
                    </span>
                    {[
                      { label: 'Laura · Asistente (Control General)', email: 'laura@nucleodemo.mx' },
                      { label: 'Dirección · Administrador', email: 'admin@nucleodemo.mx' },
                      { label: 'Ginecóloga (Ginecología y Obstetricia)', email: 'sofia@nucleodemo.mx' },
                      { label: 'Internista (Medicina Interna)', email: 'pablo@nucleodemo.mx' },
                      { label: 'Nutrióloga (Nutrición Clínica)', email: 'elena@nucleodemo.mx' },
                      { label: 'Psicóloga (Psicología Clínica)', email: 'psicologa@nucleodemo.mx' },
                    ].map((sw) => (
                      <button
                        key={sw.email}
                        type="button"
                        onClick={() => handleLogin(sw.email, 'Demo2026!')}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 flex items-center justify-between ${
                          user.email === sw.email ? 'font-bold text-teal-700 bg-teal-50/50' : 'text-slate-700'
                        }`}
                      >
                        <span>{sw.label}</span>
                        {user.email === sw.email && <span>Activo</span>}
                      </button>
                    ))}
                  </div>

                  <div className="px-2 pt-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 rounded-lg text-rose-600 hover:bg-rose-50 font-semibold flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Área de Contenido Principal */}
        <main className="flex-1 p-6 lg:p-8 max-w-[1440px] w-full mx-auto space-y-6">
          {/* ================================================================= */}
          {/* SECCIÓN 1: INICIO (Fiel a la imagen de referencia + datos reales) */}
          {/* ================================================================= */}
          {activeSection === 'inicio' && (
            <>
              {/* Encabezado Hero */}
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-[#0B2138] tracking-tight">
                    Buen día, {greetingFirstName}
                  </h1>
                  <p className="text-sm text-slate-600 mt-1">
                    Este es el resumen de su núcleo hoy.
                  </p>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">
                    {formatSpanishLongDate(selectedDate)}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={isOffline}
                    onClick={() => {
                      setNewAppointmentProfPreset(undefined);
                      setShowNewAppointmentModal(true);
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1B8A8A] hover:bg-[#147474] disabled:bg-slate-300 text-white text-sm font-semibold shadow-xs transition"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    Nueva cita
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowShareLinksModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-sm font-semibold shadow-2xs transition"
                  >
                    <Link2 className="w-4 h-4 text-slate-600" />
                    Compartir enlace
                  </button>
                </div>
              </div>

              {/* 4 Tarjetas KPI Superiores (Alimentadas con consultas reales de Supabase PostgreSQL) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {/* KPI 1: Citas de hoy */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-500">Citas de hoy</div>
                    <div className="text-3xl font-extrabold text-[#0B2138] mt-0.5">
                      {dailySummary ? dailySummary.kpis.appointmentsToday : '—'}
                    </div>
                  </div>
                </div>

                {/* KPI 2: Por confirmar */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-500">Por confirmar</div>
                    <div className="text-3xl font-extrabold text-amber-600 mt-0.5">
                      {dailySummary ? dailySummary.kpis.toConfirm : '—'}
                    </div>
                  </div>
                </div>

                {/* KPI 3: En espera */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-500">En espera</div>
                    <div className="text-3xl font-extrabold text-orange-600 mt-0.5">
                      {dailySummary ? dailySummary.kpis.waiting : '—'}
                    </div>
                  </div>
                </div>

                {/* KPI 4: Cobrado hoy */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-500">Cobrado hoy</div>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className="text-3xl font-extrabold text-[#0B2138]">
                        {dailySummary
                          ? formatMxnCents(dailySummary.kpis.collectedTodayCents)
                          : '—'}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">MXN</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid Principal de 2 Columnas */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                {/* Columna Izquierda (8 cols): Citas del día + Agendas del equipo */}
                <div className="xl:col-span-8 space-y-6">
                  {/* Tarjeta: Citas del día */}
                  <section className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                      <h2 className="text-lg font-bold text-[#0B2138]">Citas del día</h2>

                      <div className="flex flex-wrap items-center gap-2.5">
                        {/* Filtro por profesional */}
                        <select
                          aria-label="Filtrar por profesional"
                          value={selectedProfessionalFilter}
                          disabled={user.role === 'professional'}
                          onChange={(e) => setSelectedProfessionalFilter(e.target.value)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600"
                        >
                          <option value="">Todos los profesionales</option>
                          {professionals.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.full_name}
                            </option>
                          ))}
                        </select>

                        {/* Selector de Fecha Rápido */}
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-700">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <input
                            type="date"
                            aria-label="Seleccionar fecha de consulta"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-transparent focus:outline-none text-xs font-medium"
                          />
                        </div>

                        {statusFilter && (
                          <button
                            type="button"
                            onClick={() => setStatusFilter('')}
                            className="px-2.5 py-1 rounded-md bg-teal-50 text-teal-700 text-xs font-semibold"
                          >
                            Filtro: {statusFilter} ✕
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setActiveSection('multiagenda')}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 ml-1"
                        >
                          Ver multiagenda →
                        </button>
                      </div>
                    </div>

                    {/* Tabla de citas del día */}
                    {dataLoading && appointments.length === 0 ? (
                      <div className="py-10 text-center text-sm text-slate-500">
                        Consultando agenda en Supabase PostgreSQL...
                      </div>
                    ) : appointments.length === 0 ? (
                      <div className="py-10 text-center bg-slate-50 rounded-xl border border-slate-100">
                        <p className="text-sm font-semibold text-slate-700">
                          No hay citas registradas para los filtros seleccionados en esta fecha.
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Use el botón "+ Nueva cita" o comparta el enlace público de reserva.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                              <th className="py-3 px-2">Hora</th>
                              <th className="py-3 px-2">Paciente</th>
                              <th className="py-3 px-2">Profesional</th>
                              <th className="py-3 px-2">Estado</th>
                              <th className="py-3 px-2">Pago</th>
                              <th className="py-3 px-2 text-right">•••</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-sm">
                            {displayedHomeAppointments.map((appt) => (
                              <tr
                                key={appt.id}
                                onClick={() => setSelectedAppointmentId(appt.id)}
                                className="hover:bg-slate-50/90 cursor-pointer transition"
                              >
                                <td className="py-3.5 px-2 font-medium text-slate-700 whitespace-nowrap">
                                  {appt.local_time}
                                </td>
                                <td className="py-3.5 px-2 font-medium text-slate-900">
                                  {appt.patient_name}
                                </td>
                                <td className="py-3.5 px-2 text-slate-700">
                                  <span className="inline-flex items-center gap-2">
                                    <span
                                      className="w-2.5 h-2.5 rounded-full shrink-0"
                                      style={{ backgroundColor: appt.professional_color }}
                                    />
                                    {appt.professional_name}
                                  </span>
                                </td>
                                <td className="py-3.5 px-2">
                                  <AttendanceBadge status={appt.attendance_status} />
                                </td>
                                <td className="py-3.5 px-2">
                                  <FinancialBadge status={appt.financial_status} />
                                </td>
                                <td className="py-3.5 px-2 text-right">
                                  <button
                                    type="button"
                                    aria-label={`Gestionar cita de ${appt.patient_name}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedAppointmentId(appt.id);
                                    }}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                                  >
                                    <MoreHorizontal className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setShowAllAppointmentsInHome(!showAllAppointmentsInHome)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                      >
                        {showAllAppointmentsInHome
                          ? 'Mostrar resumen compacto'
                          : `Ver las ${appointments.length} citas →`}
                      </button>
                      <span className="text-[11px] text-slate-400">
                        Haga clic en cualquier cita para cambiar estado, reprogramar, cancelar o cobrar
                      </span>
                    </div>
                  </section>

                  {/* Tarjeta: Agendas del equipo */}
                  <section className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6">
                    <h2 className="text-lg font-bold text-[#0B2138] mb-4">Agendas del equipo</h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                      {(dailySummary?.teamAgendas || []).map((prof) => (
                        <div
                          key={prof.id}
                          className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/40 hover:border-slate-300 transition flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center gap-2.5">
                              <span
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: prof.colorHex }}
                              />
                              <h3 className="font-bold text-sm text-slate-900 truncate">
                                {prof.fullName}
                              </h3>
                            </div>
                            <p className="text-xs text-slate-500 pl-5 mt-0.5">{prof.specialty}</p>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <strong>{prof.appointmentsCount}</strong> citas hoy
                            </span>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedProfessionalFilter(prof.id);
                                  setActiveSection('multiagenda');
                                }}
                                className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                              >
                                Ver agenda
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                {/* Columna Derecha (4 cols): Calendario Mensual Interactivo + Pendientes */}
                <div className="xl:col-span-4 space-y-6">
                  {/* Calendario Mensual */}
                  <section className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-base font-bold text-[#0B2138]">{monthTitle}</h2>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label="Mes anterior"
                          onClick={() =>
                            setCalendarYearMonth((prev) =>
                              prev.month === 1
                                ? { year: prev.year - 1, month: 12 }
                                : { year: prev.year, month: prev.month - 1 }
                            )
                          }
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCalendarYearMonth({ year: 2026, month: 10 });
                            setSelectedDate('2026-10-16');
                          }}
                          className="px-2 py-1 rounded text-xs font-semibold text-teal-700 hover:bg-teal-50"
                        >
                          Hoy
                        </button>
                        <button
                          type="button"
                          aria-label="Mes siguiente"
                          onClick={() =>
                            setCalendarYearMonth((prev) =>
                              prev.month === 12
                                ? { year: prev.year + 1, month: 1 }
                                : { year: prev.year, month: prev.month + 1 }
                            )
                          }
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400 mb-2">
                      {WEEKDAYS_SHORT.map((d, idx) => (
                        <div key={idx} className="py-1">
                          {d}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center text-sm">
                      {calendarCells.map((cell) => {
                        const isSelected = cell.dateStr === selectedDate;
                        return (
                          <button
                            key={cell.dateStr}
                            type="button"
                            onClick={() => setSelectedDate(cell.dateStr)}
                            className={`h-9 w-9 mx-auto rounded-full flex items-center justify-center font-medium transition ${
                              isSelected
                                ? 'bg-[#138A8A] text-white font-bold shadow-xs'
                                : cell.inCurrentMonth
                                ? 'text-slate-800 hover:bg-slate-100'
                                : 'text-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {cell.day}
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  {/* Tarjeta: Pendientes Operativos */}
                  <section className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6">
                    <h2 className="text-lg font-bold text-[#0B2138] mb-4">Pendientes</h2>

                    <div className="space-y-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setStatusFilter('scheduled');
                          setShowAllAppointmentsInHome(true);
                        }}
                        className="w-full p-3.5 rounded-xl bg-slate-50/80 hover:bg-slate-100 border border-slate-200/70 flex items-center justify-between transition"
                      >
                        <span className="flex items-center gap-3 text-sm text-slate-800">
                          <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                            <Clock className="w-4 h-4" />
                          </span>
                          <span>
                            <strong>{dailySummary?.kpis.toConfirm ?? 0}</strong> citas por confirmar
                          </span>
                        </span>
                        <ArrowRightIcon className="w-4 h-4 text-slate-400" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveSection('cobros')}
                        className="w-full p-3.5 rounded-xl bg-slate-50/80 hover:bg-slate-100 border border-slate-200/70 flex items-center justify-between transition"
                      >
                        <span className="flex items-center gap-3 text-sm text-slate-800">
                          <span className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                            <DollarSign className="w-4 h-4" />
                          </span>
                          <span>
                            <strong>{dailySummary?.kpis.pendingBalanceCount ?? 0}</strong> saldos
                            pendientes (
                            {formatMxnCents(dailySummary?.kpis.pendingBalanceTotalCents ?? 0)})
                          </span>
                        </span>
                        <ArrowRightIcon className="w-4 h-4 text-slate-400" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveSection('multiagenda')}
                        className="w-full p-3.5 rounded-xl bg-slate-50/80 hover:bg-slate-100 border border-slate-200/70 flex items-center justify-between transition"
                      >
                        <span className="flex items-center gap-3 text-sm text-slate-800">
                          <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                            <RefreshCw className="w-4 h-4" />
                          </span>
                          <span>
                            <strong>{dailySummary?.kpis.rescheduledRequestsCount ?? 0}</strong>{' '}
                            cambios/reprogramaciones hoy
                          </span>
                        </span>
                        <ArrowRightIcon className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                  </section>
                </div>
              </div>
            </>
          )}

          {/* ================================================================= */}
          {/* SECCIÓN 2: MULTIAGENDA POR COLUMNAS DE ESPECIALISTA + BLOQUEOS    */}
          {/* ================================================================= */}
          {activeSection === 'multiagenda' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-[#0B2138]">
                    Multiagenda del Núcleo
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatSpanishLongDate(selectedDate)} · Control central por Asistente e individual por cada especialista
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                  />

                  <select
                    value={selectedProfessionalFilter}
                    disabled={user.role === 'professional'}
                    onChange={(e) => setSelectedProfessionalFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                  >
                    <option value="">Todas las especialistas ({professionals.length})</option>
                    {professionals.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    disabled={isOffline}
                    onClick={() => setShowNewAppointmentModal(true)}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Nueva cita
                  </button>
                </div>
              </div>

              {/* Columnas por especialista */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                {professionals
                  .filter(
                    (p) => !selectedProfessionalFilter || p.id === selectedProfessionalFilter
                  )
                  .map((prof) => {
                    const profAppts = appointments.filter((a) => a.professional_id === prof.id);
                    const profBlocks = availabilityBlocks.filter(
                      (b) =>
                        b.professional_id === prof.id &&
                        b.starts_at.startsWith(selectedDate)
                    );

                    return (
                      <div
                        key={prof.id}
                        className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col"
                      >
                        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-3.5 h-3.5 rounded-full"
                              style={{ backgroundColor: prof.color_hex }}
                            />
                            <div>
                              <h2 className="font-bold text-sm text-slate-900">
                                {prof.full_name}
                              </h2>
                              <p className="text-xs text-slate-500">
                                {prof.specialty} · {prof.default_resource_name || 'Consultorio'}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={isOffline}
                            onClick={() => {
                              setNewAppointmentProfPreset(prof.id);
                              setShowNewAppointmentModal(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-semibold"
                          >
                            + Agendar
                          </button>
                        </div>

                        <div className="p-4 space-y-3 flex-1">
                          {profBlocks.map((b) => (
                            <div
                              key={b.id}
                              className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs"
                            >
                              <span className="font-bold text-amber-900 uppercase block">
                                Bloqueo de horario ({b.kind})
                              </span>
                              <span className="text-amber-800">{b.reason}</span>
                            </div>
                          ))}

                          {profAppts.length === 0 ? (
                            <div className="py-8 text-center text-xs text-slate-400">
                              Sin citas registradas en esta fecha.
                            </div>
                          ) : (
                            profAppts.map((appt) => (
                              <div
                                key={appt.id}
                                onClick={() => setSelectedAppointmentId(appt.id)}
                                className="p-3.5 rounded-xl border border-slate-200 hover:border-teal-500 cursor-pointer transition space-y-2 bg-white shadow-2xs"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-teal-700">
                                    {appt.local_time} - {appt.local_end_time}
                                  </span>
                                  <span className="text-[11px] text-slate-400 font-mono">
                                    {appt.folio}
                                  </span>
                                </div>
                                <div className="font-bold text-sm text-slate-900">
                                  {appt.patient_name}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {appt.service_name} · {appt.resource_name}
                                </div>
                                <div className="flex items-center justify-between pt-1">
                                  <AttendanceBadge status={appt.attendance_status} />
                                  <FinancialBadge status={appt.financial_status} />
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* SECCIÓN 3: DIRECTORIO DE PACIENTES (Con detección de duplicados)  */}
          {/* ================================================================= */}
          {activeSection === 'pacientes' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-[#0B2138]">Directorio de Pacientes</h1>
                  <p className="text-xs text-slate-500">
                    Aislado por organización y rol. El teléfono no fusiona automáticamente expedientes (Regla A20).
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-500">
                      <th className="py-3 px-3">Paciente</th>
                      <th className="py-3 px-3">Teléfono</th>
                      <th className="py-3 px-3">Correo</th>
                      <th className="py-3 px-3">Citas</th>
                      <th className="py-3 px-3">Estado de Teléfono</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {patientsList.map((pat) => (
                      <tr key={pat.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-semibold text-slate-900">{pat.full_name}</td>
                        <td className="py-3 px-3 text-slate-700">{pat.phone_display}</td>
                        <td className="py-3 px-3 text-slate-500">{pat.email || '—'}</td>
                        <td className="py-3 px-3 font-semibold text-slate-700">
                          {pat.total_appointments}
                        </td>
                        <td className="py-3 px-3">
                          {Number(pat.shared_phone_count) > 1 ? (
                            <span className="px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                              Teléfono compartido ({pat.shared_phone_count} pacientes · Revisión manual)
                            </span>
                          ) : (
                            <span className="text-xs text-emerald-700 font-medium">
                              Contacto único
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* SECCIÓN 3.5: EXPEDIENTES CLÍNICOS INDIVIDUALES POR ESPECIALIDAD   */}
          {/* ================================================================= */}
          {activeSection === 'expedientes' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-[#0B2138]">
                      Expedientes Clínicos por Especialidad
                    </h1>
                    <p className="text-xs text-slate-500">
                      Aislamiento estricto por especialista (PostgreSQL RLS): cada doctora consulta y edita únicamente sus propios expedientes clínicos.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold">
                    Sesión activa: {user.fullName}
                  </span>
                </div>

                {user.role === 'reception' ? (
                  <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 space-y-2 text-amber-950">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <ShieldAlert className="w-5 h-5 text-amber-700" />
                      Privacidad Clínica Activa para el Rol de Asistente
                    </div>
                    <p className="text-xs leading-relaxed">
                      Como <strong>Asistente ({user.fullName})</strong>, tienes control total de las agendas, citas, reprogramaciones, confirmaciones y cobros de las 4 especialistas (Ginecóloga, Internista, Nutrióloga y Psicóloga), pero el motor de seguridad de base de datos (Row Level Security) bloquea la lectura de notas clínicas privadas.
                    </p>
                    <p className="text-xs font-semibold text-amber-900 pt-1">
                      Para ver y capturar expedientes clínicos en este demo, cambia de cuenta en el menú superior derecho a cualquiera de las 4 especialistas (`Ginecóloga`, `Internista`, `Nutrióloga` o `Psicóloga`).
                    </p>
                  </div>
                ) : (
                  <>
                    {clinicalError && (
                      <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-semibold">
                        {clinicalError}
                      </div>
                    )}

                    {ehrFeedback && (
                      <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900 font-semibold">
                        {ehrFeedback}
                      </div>
                    )}

                    <div className="grid lg:grid-cols-12 gap-6 items-start">
                      {/* Listado de notas clínicas de la especialista */}
                      <div className="lg:col-span-7 space-y-4">
                        <h2 className="text-base font-bold text-[#0B2138]">
                          Historial de notas clínicas autorizadas ({clinicalRecords.length})
                        </h2>

                        {clinicalRecords.length === 0 ? (
                          <div className="p-8 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                            No hay notas clínicas registradas para esta especialista todavía.
                          </div>
                        ) : (
                          clinicalRecords.map((rec) => (
                            <div
                              key={rec.id}
                              className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                                <div>
                                  <span className="font-bold text-sm text-slate-900">
                                    Paciente: {rec.patient_name}
                                  </span>
                                  <span className="text-xs text-slate-500 ml-2">
                                    ({rec.patient_phone})
                                  </span>
                                </div>
                                <span className="px-2.5 py-0.5 rounded-md bg-teal-100 text-teal-900 text-xs font-bold">
                                  {rec.professional_name} · {rec.professional_specialty}
                                </span>
                              </div>

                              <div className="text-xs space-y-1.5">
                                <div>
                                  <strong className="text-slate-700">Motivo de consulta:</strong>{' '}
                                  <span className="text-slate-900 font-semibold">
                                    {rec.chief_complaint}
                                  </span>
                                </div>
                                {rec.subjective_notes && (
                                  <div>
                                    <strong className="text-slate-700">Subjetivo / Evolución:</strong>{' '}
                                    <span className="text-slate-600">{rec.subjective_notes}</span>
                                  </div>
                                )}
                                {rec.objective_notes && (
                                  <div>
                                    <strong className="text-slate-700">Exploración / Objetivo:</strong>{' '}
                                    <span className="text-slate-600">{rec.objective_notes}</span>
                                  </div>
                                )}
                                {rec.diagnosis && (
                                  <div>
                                    <strong className="text-slate-700">Diagnóstico:</strong>{' '}
                                    <span className="text-teal-800 font-semibold">
                                      {rec.diagnosis}
                                    </span>
                                  </div>
                                )}
                                {rec.treatment_plan && (
                                  <div>
                                    <strong className="text-slate-700">Plan y Tratamiento:</strong>{' '}
                                    <span className="text-slate-800">{rec.treatment_plan}</span>
                                  </div>
                                )}
                              </div>

                              {/* Signos vitales y campos específicos de la especialidad */}
                              <div className="flex flex-wrap gap-2 pt-1">
                                {Object.entries(rec.vital_signs || {}).map(([k, v]) => (
                                  <span
                                    key={k}
                                    className="px-2 py-1 rounded bg-white border border-slate-200 text-[11px] text-slate-700"
                                  >
                                    <strong>{k}:</strong> {String(v)}
                                  </span>
                                ))}
                                {Object.entries(rec.specialty_data || {}).map(([k, v]) => (
                                  <span
                                    key={k}
                                    className="px-2 py-1 rounded bg-blue-50 border border-blue-200 text-[11px] text-blue-900"
                                  >
                                    <strong>{k}:</strong> {String(v)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Formulario de captura de nota clínica */}
                      <form
                        onSubmit={handleCreateClinicalRecord}
                        className="lg:col-span-5 p-5 rounded-2xl border border-slate-200 bg-white space-y-3.5"
                      >
                        <h3 className="text-base font-bold text-[#0B2138]">
                          Registrar nueva nota de expediente
                        </h3>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Paciente *
                          </label>
                          <select
                            value={ehrPatientId}
                            onChange={(e) => setEhrPatientId(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                          >
                            {patientsList.map((pat) => (
                              <option key={pat.id} value={pat.id}>
                                {pat.full_name} ({pat.phone_display})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Motivo de consulta *
                          </label>
                          <input
                            type="text"
                            required
                            value={ehrChiefComplaint}
                            onChange={(e) => setEhrChiefComplaint(e.target.value)}
                            placeholder="Ej. Control prenatal / Seguimiento nutricional / Terapia"
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Interrogatorio / Notas subjetivas
                          </label>
                          <textarea
                            rows={2}
                            value={ehrSubjective}
                            onChange={(e) => setEhrSubjective(e.target.value)}
                            placeholder="Síntomas, evolución reportada por el paciente..."
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Exploración / Hallazgos objetivos
                          </label>
                          <textarea
                            rows={2}
                            value={ehrObjective}
                            onChange={(e) => setEhrObjective(e.target.value)}
                            placeholder="Signos clínicos, antropometría, estudios..."
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Peso (kg)
                            </label>
                            <input
                              type="text"
                              value={ehrWeight}
                              onChange={(e) => setEhrWeight(e.target.value)}
                              placeholder="Ej. 64.5"
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Presión Arterial
                            </label>
                            <input
                              type="text"
                              value={ehrBp}
                              onChange={(e) => setEhrBp(e.target.value)}
                              placeholder="Ej. 118/76"
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Dato de especialidad (Clave)
                            </label>
                            <input
                              type="text"
                              value={ehrSpecialtyFieldKey}
                              onChange={(e) => setEhrSpecialtyFieldKey(e.target.value)}
                              placeholder="Ej. FUM / HbA1c / %Grasa / GAD-7"
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Valor
                            </label>
                            <input
                              type="text"
                              value={ehrSpecialtyFieldVal}
                              onChange={(e) => setEhrSpecialtyFieldVal(e.target.value)}
                              placeholder="Ej. 14 SDG / 6.1% / 22%"
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Diagnóstico
                          </label>
                          <input
                            type="text"
                            value={ehrDiagnosis}
                            onChange={(e) => setEhrDiagnosis(e.target.value)}
                            placeholder="Diagnóstico clínico o nutricional"
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Plan de tratamiento / Indicaciones
                          </label>
                          <textarea
                            rows={2}
                            value={ehrTreatment}
                            onChange={(e) => setEhrTreatment(e.target.value)}
                            placeholder="Receta, plan alimenticio o acuerdo terapéutico..."
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isOffline}
                          className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs"
                        >
                          Guardar en expediente clínico privado
                        </button>
                      </form>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* SECCIÓN 4: ESPECIALISTAS, WHATSAPP INDIVIDUAL Y HORARIOS          */}
          {/* ================================================================= */}
          {activeSection === 'profesionales' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div>
                    <h1 className="text-2xl font-bold text-[#0B2138]">
                      Especialistas, WhatsApp Individual y Servicios
                    </h1>
                    <p className="text-xs text-slate-500">
                      Cada especialista cuenta con su propia instancia de WhatsApp en Evolution API (`whatsapp.dragendas.com`) y sincronización con Doctoralia.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowShareLinksModal(true)}
                      className="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <Link2 className="w-4 h-4" /> Compartir enlaces públicos
                    </button>
                  </div>
                </div>

                {configFeedback && (
                  <div className="mb-4 p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-xs font-semibold text-teal-900">
                    {configFeedback}
                  </div>
                )}

                {doctoraliaFeedback && (
                  <div className="mb-4 p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-900">
                    {doctoraliaFeedback}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                  {professionals.map((prof) => {
                    const profServices = services.filter((s) => s.professional_id === prof.id);
                    const profRules = availabilityRules.filter(
                      (r) => r.professional_id === prof.id && r.is_active
                    );
                    const isWaConnected = prof.whatsapp_status === 'connected';

                    return (
                      <div
                        key={prof.id}
                        className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4 flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-2 font-bold text-base text-slate-900">
                              <span
                                className="w-3.5 h-3.5 rounded-full"
                                style={{ backgroundColor: prof.color_hex }}
                              />
                              {prof.full_name}
                            </span>
                            <button
                              type="button"
                              onClick={() => navigateTo(`/reservar/${user.organizationSlug}/${prof.slug}`)}
                              className="text-xs font-semibold text-teal-700 hover:underline"
                            >
                              Enlace público ↗
                            </button>
                          </div>
                          <p className="text-xs text-slate-600">
                            {prof.specialty} · {prof.default_resource_name}
                          </p>

                          {/* Tarjeta de estado de WhatsApp Individual (Evolution API) */}
                          <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold uppercase text-slate-500 flex items-center gap-1">
                                <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                                WhatsApp Propio
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isWaConnected
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                                }`}
                              >
                                {isWaConnected ? 'Conectado' : 'QR Listo'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-600 space-y-0.5">
                              <div>
                                Instancia:{' '}
                                <code className="font-mono font-semibold text-slate-800">
                                  {prof.whatsapp_instance_name || `consultorio-${prof.slug}`}
                                </code>
                              </div>
                              <div>
                                Número:{' '}
                                <strong className="text-slate-800">
                                  {prof.whatsapp_phone || 'Pendiente de escanear QR'}
                                </strong>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => openWhatsAppLinkModal(prof)}
                              className="w-full py-1.5 px-3 rounded-lg bg-[#0B2138] hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition"
                            >
                              <QrCode className="w-3.5 h-3.5 text-teal-400" />
                              Vincular WhatsApp / Probar
                            </button>
                          </div>

                          {/* Estado de Doctoralia por especialista */}
                          <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold uppercase text-slate-500 flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                                Sincronización Doctoralia
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                                Activa
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSimulateDoctoraliaBooking(prof.id)}
                              className="w-full py-1.5 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-semibold transition"
                            >
                              Simular cita desde Doctoralia
                            </button>
                          </div>

                          <div>
                            <h3 className="text-[11px] font-bold uppercase text-slate-400 mb-1.5">
                              Servicios Configurados
                            </h3>
                            <div className="space-y-1.5">
                              {profServices.map((srv) => (
                                <div
                                  key={srv.id}
                                  className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs flex items-center justify-between"
                                >
                                  <div>
                                    <div className="font-semibold text-slate-800">{srv.name}</div>
                                    <div className="text-slate-500">
                                      {srv.duration_minutes} min ·{' '}
                                      {srv.default_resource_name || 'Consultorio base'}
                                    </div>
                                  </div>
                                  <strong className="text-slate-900">
                                    {formatMxnCents(srv.price_cents)}
                                  </strong>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <h3 className="text-[11px] font-bold uppercase text-slate-400 mb-1">
                              Jornada Semanal Activa
                            </h3>
                            <p className="text-xs text-slate-600">
                              {profRules.length > 0
                                ? `Lunes a Sábado · ${profRules[0].start_local_time.slice(
                                    0,
                                    5
                                  )} a ${profRules[0].end_local_time.slice(0, 5)} hrs`
                                : 'Sin horario configurado'}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Formularios para agregar Servicio y Bloquear Horario */}
              {user.role !== 'reception' && (
                <div className="grid md:grid-cols-2 gap-6">
                  <form
                    onSubmit={handleCreateService}
                    className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4"
                  >
                    <h2 className="text-base font-bold text-[#0B2138]">
                      Agregar nuevo servicio médico
                    </h2>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Especialista
                        </label>
                        <select
                          value={newSrvProfId}
                          onChange={(e) => setNewSrvProfId(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                        >
                          {professionals.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.full_name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Consultorio requerido
                        </label>
                        <select
                          value={newSrvResourceId}
                          onChange={(e) => setNewSrvResourceId(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                        >
                          <option value="">Consultorio por defecto</option>
                          {resources.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nombre del servicio *
                      </label>
                      <input
                        type="text"
                        required
                        value={newSrvName}
                        onChange={(e) => setNewSrvName(e.target.value)}
                        placeholder="Ej. Consulta de Seguimiento"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Duración (minutos)
                        </label>
                        <select
                          value={newSrvDuration}
                          onChange={(e) => setNewSrvDuration(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                        >
                          <option value="20">20 minutos</option>
                          <option value="30">30 minutos</option>
                          <option value="45">45 minutos</option>
                          <option value="60">60 minutos</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Precio (MXN)
                        </label>
                        <input
                          type="number"
                          min="0"
                          required
                          value={newSrvPricePesos}
                          onChange={(e) => setNewSrvPricePesos(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isOffline}
                      className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
                    >
                      Guardar servicio en catálogo
                    </button>
                  </form>

                  <form
                    onSubmit={handleCreateBlock}
                    className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4"
                  >
                    <h2 className="text-base font-bold text-[#0B2138]">
                      Registrar bloqueo de agenda o ausencia (A09)
                    </h2>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Especialista
                        </label>
                        <select
                          value={blockProfId}
                          onChange={(e) => setBlockProfId(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                        >
                          {professionals.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.full_name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Fecha
                        </label>
                        <input
                          type="date"
                          value={blockDate}
                          onChange={(e) => setBlockDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Hora inicio
                        </label>
                        <input
                          type="time"
                          value={blockStartTime}
                          onChange={(e) => setBlockStartTime(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Hora fin
                        </label>
                        <input
                          type="time"
                          value={blockEndTime}
                          onChange={(e) => setBlockEndTime(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Motivo del bloqueo *
                      </label>
                      <input
                        type="text"
                        required
                        value={blockReason}
                        onChange={(e) => setBlockReason(e.target.value)}
                        placeholder="Ej. Congreso médico / Reunión clínica"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isOffline}
                      className="px-4 py-2 rounded-xl bg-[#0B2138] hover:bg-navy-800 text-white text-xs font-semibold"
                    >
                      Bloquear horario (verifica no traslape con citas)
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* SECCIÓN 5: COBROS Y CAJA (Libro Mayor Inmutable en MXN)           */}
          {/* ================================================================= */}
          {activeSection === 'cobros' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-[#0B2138]">
                    Cobros, Saldos y Libro Mayor Financiero
                  </h1>
                  <p className="text-xs text-slate-500">
                    Movimientos inmutables en centavos MXN. Ningún movimiento se borra: los ajustes se registran como reversos.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-500">
                      <th className="py-3 px-3">Folio Cita</th>
                      <th className="py-3 px-3">Paciente</th>
                      <th className="py-3 px-3">Especialista</th>
                      <th className="py-3 px-3">Tipo</th>
                      <th className="py-3 px-3">Método</th>
                      <th className="py-3 px-3">Importe</th>
                      <th className="py-3 px-3">Registró</th>
                      <th className="py-3 px-3 text-right">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {movementsList.map((mov) => (
                      <tr key={mov.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-mono font-semibold text-slate-700">
                          {mov.folio}
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-900">
                          {mov.patient_name}
                        </td>
                        <td className="py-3 px-3 text-slate-600">{mov.professional_name}</td>
                        <td className="py-3 px-3 font-semibold capitalize">
                          {mov.movement_type === 'charge'
                            ? 'Cargo'
                            : mov.movement_type === 'payment'
                            ? 'Pago'
                            : mov.movement_type === 'reversal'
                            ? 'Reverso'
                            : mov.movement_type}
                        </td>
                        <td className="py-3 px-3 text-slate-600">{mov.payment_method || '—'}</td>
                        <td
                          className={`py-3 px-3 font-bold ${
                            mov.movement_type === 'payment'
                              ? 'text-emerald-700'
                              : mov.movement_type === 'reversal'
                              ? 'text-rose-700'
                              : 'text-slate-900'
                          }`}
                        >
                          {formatMxnCents(Number(mov.amount_cents))} MXN
                        </td>
                        <td className="py-3 px-3 text-slate-500">{mov.recorded_by_label}</td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedAppointmentId(mov.appointment_id)}
                            className="text-teal-700 font-semibold hover:underline"
                          >
                            Abrir cita / cobrar →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* SECCIÓN 6: REPORTES Y COLA DE COMUNICACIONES (Sección 16 y 10)    */}
          {/* ================================================================= */}
          {activeSection === 'reportes' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
                <div>
                  <h1 className="text-2xl font-bold text-[#0B2138]">
                    Reportes Operativos, Ingresos y Atribución
                  </h1>
                  <p className="text-xs text-slate-500">
                    Indicadores calculados con denominadores explícitos (Octubre 2026 · {user.timezone}).
                  </p>
                </div>

                {reportMetrics && (
                  <>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-xs text-slate-500">Tasa de Asistencia Resuelta</span>
                        <div className="text-2xl font-bold text-slate-900 mt-1">
                          {reportMetrics.indicators.attendanceRatePercent}%
                        </div>
                        <span className="text-[11px] text-slate-500">
                          Denominador explícito: {reportMetrics.indicators.attendanceNumerator}{' '}
                          atendidas / {reportMetrics.indicators.attendanceDenominator} resueltas
                        </span>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-xs text-slate-500">Tasa de Cancelación</span>
                        <div className="text-2xl font-bold text-slate-900 mt-1">
                          {reportMetrics.indicators.cancellationRatePercent}%
                        </div>
                        <span className="text-[11px] text-slate-500">
                          {reportMetrics.indicators.cancellationNumerator} canceladas /{' '}
                          {reportMetrics.indicators.cancellationDenominator} citas del periodo
                        </span>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-xs text-slate-500">Ingreso Cobrado Neto</span>
                        <div className="text-2xl font-bold text-emerald-700 mt-1">
                          {formatMxnCents(reportMetrics.indicators.netCollectedCents)}
                        </div>
                        <span className="text-[11px] text-slate-500">
                          Pagos menos devoluciones/reversos
                        </span>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-xs text-slate-500">Saldo Pendiente por Cobrar</span>
                        <div className="text-2xl font-bold text-rose-700 mt-1">
                          {formatMxnCents(reportMetrics.indicators.pendingBalanceCents)}
                        </div>
                        <span className="text-[11px] text-slate-500">
                          Cargos netos vigentes menos cobros
                        </span>
                      </div>
                    </div>

                    {/* Resultados separados por especialista */}
                    <div>
                      <h3 className="text-xs font-bold uppercase text-slate-500 mb-2">
                        Desglose por especialista del núcleo
                      </h3>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {reportMetrics.byProfessional.map((bp: any) => (
                          <div
                            key={bp.professionalName}
                            className="p-4 rounded-xl border border-slate-200 text-xs space-y-1"
                          >
                            <strong className="text-sm text-slate-900 block">
                              {bp.professionalName}
                            </strong>
                            <div>Total citas: {bp.total}</div>
                            <div>Atendidas: {bp.completed} · Canceladas: {bp.cancelled}</div>
                            <div className="text-emerald-700 font-semibold">
                              Cobrado: {formatMxnCents(bp.collectedCents)}
                            </div>
                            <div className="text-rose-700 font-semibold">
                              Saldo pendiente: {formatMxnCents(bp.pendingCents)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Cola de Recordatorios de Servidor (Outbox) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                <h2 className="text-lg font-bold text-[#0B2138]">
                  Cola de Recordatorios Automáticos por WhatsApp (`notification_jobs`)
                </h2>
                <p className="text-xs text-slate-500">
                  Los recordatorios salen desde el WhatsApp personal de cada especialista en Evolution API, se invalidan al reprogramar/cancelar (A06/A17) y conservan la cita si falla el proveedor (A16).
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-2 px-3">Folio</th>
                        <th className="py-2 px-3">Paciente</th>
                        <th className="py-2 px-3">Especialista</th>
                        <th className="py-2 px-3">Tipo / Versión</th>
                        <th className="py-2 px-3">Programado</th>
                        <th className="py-2 px-3">Estado</th>
                        <th className="py-2 px-3">Detalle / Error</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {notificationJobs.slice(0, 15).map((j) => (
                        <tr key={j.id}>
                          <td className="py-2 px-3 font-mono">{j.folio}</td>
                          <td className="py-2 px-3 font-medium">{j.patient_name}</td>
                          <td className="py-2 px-3 text-slate-700">{j.professional_name}</td>
                          <td className="py-2 px-3">
                            {j.job_type} (v{j.appointment_version})
                          </td>
                          <td className="py-2 px-3">
                            {new Date(j.scheduled_for).toLocaleString('es-MX')}
                          </td>
                          <td className="py-2 px-3 font-semibold">{j.status}</td>
                          <td className="py-2 px-3 text-rose-600">{j.last_error || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* SECCIÓN 7: PANEL DE CONFIGURACIÓN (EVOLUTION API Y DOCTORALIA)    */}
          {/* ================================================================= */}
          {activeSection === 'configuracion' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-[#0B2138]">
                      Panel de Configuración · Evolution API, WhatsApp por Especialista y Doctoralia
                    </h1>
                    <p className="text-xs text-slate-500">
                      Configure su servidor Docker de Evolution API (`https://whatsapp.dragendas.com`), vincule el WhatsApp de cada doctora y sincronice citas de Doctoralia.
                    </p>
                  </div>
                </div>

                {configFeedback && (
                  <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-xs font-semibold text-teal-900">
                    {configFeedback}
                  </div>
                )}

                {doctoraliaFeedback && (
                  <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-900">
                    {doctoraliaFeedback}
                  </div>
                )}

                {orgSettings && (
                  <div className="grid sm:grid-cols-2 gap-4 text-sm">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-xs font-bold uppercase text-slate-400">
                        Organización y Dominio Demo
                      </span>
                      <div className="font-bold text-slate-900">
                        {orgSettings.organization?.name}
                      </div>
                      <div className="text-xs text-slate-600">
                        URL del Demo: <code>https://multiagenda.dragendas.com</code>
                      </div>
                      <div className="text-xs text-slate-600">
                        Portal público: <code>/reservar/{orgSettings.organization?.slug}</code>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-xs font-bold uppercase text-slate-400">
                        Sede y Zona Horaria IANA
                      </span>
                      <div className="font-bold text-slate-900">{orgSettings.location?.name}</div>
                      <div className="text-xs text-slate-600">{orgSettings.location?.address}</div>
                      <div className="text-xs text-teal-700 font-semibold">
                        Zona horaria activa: {orgSettings.location?.timezone} · Moneda: MXN
                      </div>
                    </div>
                  </div>
                )}

                {/* Tarjetas de vinculación de WhatsApp para cada especialista */}
                <div className="space-y-3 pt-2">
                  <h2 className="text-base font-bold text-[#0B2138] flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-emerald-600" />
                    1. Vincular WhatsApp Personal de cada Especialista (Instancias en `whatsapp.dragendas.com`)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Cada especialista escanea su propio código QR desde su celular para que las confirmaciones, cambios, cancelaciones y recordatorios salgan con su número personal.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {professionals.map((prof) => {
                      const isConnected = prof.whatsapp_status === 'connected';
                      return (
                        <div
                          key={prof.id}
                          className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5 flex flex-col justify-between"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                                <span
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: prof.color_hex }}
                                />
                                {prof.full_name}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isConnected
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {isConnected ? 'Conectado' : 'QR Listo'}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500">{prof.specialty}</div>
                            <div className="text-[11px] text-slate-600">
                              Instancia:{' '}
                              <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono">
                                {prof.whatsapp_instance_name || `consultorio-${prof.slug}`}
                              </code>
                            </div>
                            <div className="text-[11px] text-slate-600">
                              WhatsApp:{' '}
                              <strong>{prof.whatsapp_phone || 'Sin vincular'}</strong>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => openWhatsAppLinkModal(prof)}
                            className="w-full py-2 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            Configurar QR / Probar Envío
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Formulario de Conexión Evolution API y Plantillas */}
                <form
                  onSubmit={handleSaveIntegrationSettings}
                  className="p-5 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-4"
                >
                  <h2 className="text-base font-bold text-[#0B2138]">
                    2. Servidor Evolution API Docker (`whatsapp.dragendas.com`) y Plantillas Automáticas
                  </h2>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        URL del Servidor Evolution API *
                      </label>
                      <input
                        type="url"
                        required
                        value={evoUrlInput}
                        onChange={(e) => setEvoUrlInput(e.target.value)}
                        placeholder="https://whatsapp.dragendas.com"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Global API Key (AUTHENTICATION_API_KEY de tu Docker)
                      </label>
                      <input
                        type="password"
                        value={evoApiKeyInput}
                        onChange={(e) => setEvoApiKeyInput(e.target.value)}
                        placeholder="Ej. DrAgendas_WA_ClaveSecreta_2026"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Plantilla de Confirmación Automática de Cita
                      </label>
                      <textarea
                        rows={2}
                        value={confirmTplInput}
                        onChange={(e) => setConfirmTplInput(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Plantilla de Recordatorio 24h Antes
                      </label>
                      <textarea
                        rows={2}
                        value={rem24hTplInput}
                        onChange={(e) => setRem24hTplInput(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Plantilla de Reprogramación / Cambio
                      </label>
                      <textarea
                        rows={2}
                        value={rescheduleTplInput}
                        onChange={(e) => setRescheduleTplInput(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Plantilla de Cancelación
                      </label>
                      <textarea
                        rows={2}
                        value={cancelTplInput}
                        onChange={(e) => setCancelTplInput(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Plantilla de Recordatorio 1h Antes
                      </label>
                      <textarea
                        rows={2}
                        value={rem1hTplInput}
                        onChange={(e) => setRem1hTplInput(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] text-slate-500">
                      Variables dinámicas soportadas: <code>{'{{paciente}}'}</code>,{' '}
                      <code>{'{{especialista}}'}</code>, <code>{'{{servicio}}'}</code>,{' '}
                      <code>{'{{fecha}}'}</code>, <code>{'{{hora}}'}</code>,{' '}
                      <code>{'{{sede}}'}</code>, <code>{'{{link}}'}</code>
                    </span>
                    <button
                      type="submit"
                      disabled={isOffline}
                      className="px-4 py-2 rounded-xl bg-[#0B2138] hover:bg-slate-800 text-white text-xs font-semibold"
                    >
                      Guardar configuración de Evolution API
                    </button>
                  </div>
                </form>

                {/* Sincronización con Doctoralia */}
                <div className="p-5 rounded-2xl border border-blue-200 bg-blue-50/40 space-y-3">
                  <h2 className="text-base font-bold text-[#0B2138] flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    3. Puente de Sincronización con Doctoralia (Reflejar citas en Multiagenda)
                  </h2>
                  <p className="text-xs text-slate-600">
                    Cuando un paciente agenda en el perfil de Doctoralia de cualquiera de las 4 especialistas, el puente captura la reserva, bloquea el horario en Dr Agenda Núcleos y dispara la confirmación desde el WhatsApp personal de esa especialista.
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <select
                      value={doctoraliaSimProfId}
                      onChange={(e) => setDoctoraliaSimProfId(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-blue-300 text-xs font-semibold bg-white"
                    >
                      {professionals.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name} ({p.specialty})
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => handleSimulateDoctoraliaBooking()}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs"
                    >
                      <Sparkles className="w-4 h-4" />
                      Probar recepción de cita desde Doctoralia ahora
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modal de Vinculación de WhatsApp Personal por Especialista (Evolution API QR) */}
      {waModalProf && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-xl w-full overflow-hidden my-8">
            <div className="bg-[#0B2138] text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-teal-400" />
                  WhatsApp Personal · {waModalProf.full_name}
                </h2>
                <p className="text-xs text-slate-300">
                  Evolution API ({evoUrlInput}) · Instancia individual para mensajes automatizados
                </p>
              </div>
              <button
                type="button"
                onClick={() => setWaModalProf(null)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[82vh] overflow-y-auto text-xs">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nombre de Instancia en Evolution API
                  </label>
                  <input
                    type="text"
                    value={waInstanceInput}
                    onChange={(e) => setWaInstanceInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Número de WhatsApp de la Especialista
                  </label>
                  <input
                    type="tel"
                    value={waPhoneInput}
                    onChange={(e) => setWaPhoneInput(e.target.value)}
                    placeholder="+525512345678"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={waLoading}
                  onClick={handleGenerateQr}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold inline-flex items-center gap-1.5"
                >
                  <QrCode className="w-4 h-4" />
                  {waLoading ? 'Conectando con Evolution API...' : 'Generar QR de Vinculación'}
                </button>

                <button
                  type="button"
                  disabled={waLoading}
                  onClick={() => handleConfirmWhatsAppLink('connected')}
                  className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold"
                >
                  Marcar como Conectado
                </button>

                <button
                  type="button"
                  disabled={waLoading}
                  onClick={() => handleConfirmWhatsAppLink('disconnected')}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-semibold"
                >
                  Desvincular
                </button>
              </div>

              {waQrData && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
                  {waQrData.qrBase64 && (
                    <img
                      src={waQrData.qrBase64}
                      alt="Código QR de WhatsApp Evolution API"
                      className="w-44 h-44 rounded-xl border border-slate-200 bg-white p-2 shrink-0"
                    />
                  )}
                  <div className="space-y-2">
                    <div className="font-bold text-slate-900">
                      Escanea desde el WhatsApp de {waModalProf.full_name}
                    </div>
                    <p className="text-slate-600 leading-relaxed">{waQrData.message}</p>
                    <ol className="list-decimal pl-4 text-slate-600 space-y-1">
                      <li>Abre WhatsApp en el celular de la {waModalProf.full_name}.</li>
                      <li>Ve a <strong>Dispositivos vinculados → Vincular un dispositivo</strong>.</li>
                      <li>Escanea este código QR para activar los envíos automáticos.</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Prueba de envío de mensaje automatizado desde el número de la especialista */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <h3 className="font-bold text-sm text-[#0B2138] flex items-center gap-1.5">
                  <Send className="w-4 h-4 text-teal-600" />
                  Probar mensaje automático desde el WhatsApp de {waModalProf.full_name}
                </h3>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Tipo de mensaje automático
                    </label>
                    <select
                      value={waTestTemplate}
                      onChange={(e) => setWaTestTemplate(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="confirm">Confirmación de cita agendada</option>
                      <option value="reminder_24h">Recordatorio automático 24h antes</option>
                      <option value="reminder_1h">Recordatorio automático 1h antes</option>
                      <option value="reschedule">Aviso de cambio / reprogramación</option>
                      <option value="cancel">Aviso de cancelación de cita</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Teléfono destino de prueba
                    </label>
                    <input
                      type="tel"
                      value={waTestRecipient}
                      onChange={(e) => setWaTestRecipient(e.target.value)}
                      placeholder="+525511223344"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={waLoading}
                  onClick={handleSendWhatsAppTest}
                  className="px-4 py-2 rounded-xl bg-[#0B2138] hover:bg-slate-800 text-white font-semibold inline-flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5 text-teal-400" />
                  Enviar WhatsApp de prueba ahora
                </button>

                {waTestResult && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1.5 text-emerald-950">
                    <div className="font-bold">
                      Mensaje despachado desde instancia{' '}
                      <code>{waTestResult.instanceName}</code> ({waTestResult.senderPhone}) →{' '}
                      {waTestResult.recipientPhone}
                    </div>
                    <div className="p-2.5 rounded-lg bg-white border border-emerald-200 text-slate-800 italic">
                      "{waTestResult.renderedMessage}"
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modales Operativos */}
      {showNewAppointmentModal && (
        <NewAppointmentModal
          user={user}
          professionals={professionals}
          services={services}
          resources={resources}
          defaultDate={selectedDate}
          defaultProfessionalId={newAppointmentProfPreset}
          isOffline={isOffline}
          onClose={() => setShowNewAppointmentModal(false)}
          onCreated={() => {
            setShowNewAppointmentModal(false);
            refreshAllData();
          }}
        />
      )}

      {showShareLinksModal && (
        <ShareLinksModal
          orgSlug={user.organizationSlug}
          orgName={user.organizationName}
          professionals={professionals}
          onClose={() => setShowShareLinksModal(false)}
          onOpenPublicBooking={(profSlug) => {
            setShowShareLinksModal(false);
            navigateTo(
              profSlug
                ? `/reservar/${user.organizationSlug}/${profSlug}`
                : `/reservar/${user.organizationSlug}`
            );
          }}
        />
      )}

      {selectedAppointmentId && (
        <AppointmentDetailModal
          user={user}
          appointmentId={selectedAppointmentId}
          isOffline={isOffline}
          onClose={() => setSelectedAppointmentId(null)}
          onUpdated={() => refreshAllData()}
          onOpenManagePortal={(tok) => {
            setSelectedAppointmentId(null);
            navigateTo(`/gestionar/${tok}`);
          }}
        />
      )}
    </div>
  );
};

