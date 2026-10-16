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
} from 'lucide-react';
import { apiFetch, clearToken, getSavedToken, saveToken } from './client/api';
import { AttendanceBadge, FinancialBadge, ORIGIN_LABELS } from './client/badges';
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
  DailySummaryReportDTO,
  FinancialMovementDTO,
  ProfessionalDTO,
  ResourceDTO,
  ServiceDTO,
} from './shared/types';

type StaffSection =
  | 'inicio'
  | 'multiagenda'
  | 'pacientes'
  | 'profesionales'
  | 'cobros'
  | 'reportes'
  | 'configuracion';

const WEEKDAYS_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const WEEKDAYS_FULL = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

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
  const [movementsList, setMovementsList] = useState<FinancialMovementDTO[]>([]);
  const [reportMetrics, setReportMetrics] = useState<any | null>(null);
  const [notificationJobs, setNotificationJobs] = useState<any[]>([]);
  const [orgSettings, setOrgSettings] = useState<any | null>(null);
  const [dataLoading, setDataLoading] = useState<boolean>(false);

  // Modales operativos
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);
  const [newAppointmentProfPreset, setNewAppointmentProfPreset] = useState<string | undefined>(
    undefined
  );
  const [showShareLinksModal, setShowShareLinksModal] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

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

      if (!newSrvProfId && catalogRes.professionals[0]) {
        setNewSrvProfId(catalogRes.professionals[0].id);
      }
      if (!blockProfId && catalogRes.professionals[0]) {
        setBlockProfId(catalogRes.professionals[0].id);
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
      setConfigFeedback('Servicio creado y publicado en la agenda del profesional.');
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
                Acceso rápido de prueba por rol (Contraseña: Demo2026!)
              </span>
              <div className="space-y-1.5">
                {[
                  {
                    label: 'Laura · Recepción',
                    email: 'laura@nucleodemo.mx',
                    badge: 'Recepción',
                  },
                  {
                    label: 'Dr. Alejandro Vega · Administrador',
                    email: 'admin@nucleodemo.mx',
                    badge: 'Admin',
                  },
                  {
                    label: 'Dra. Sofía García · Medicina general',
                    email: 'sofia@nucleodemo.mx',
                    badge: 'Profesional',
                  },
                  {
                    label: 'Dr. Pablo Ruiz · Cardiología',
                    email: 'pablo@nucleodemo.mx',
                    badge: 'Profesional',
                  },
                  {
                    label: 'Lic. Elena Martínez · Nutrición',
                    email: 'elena@nucleodemo.mx',
                    badge: 'Profesional',
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
                { id: 'profesionales', label: 'Profesionales', icon: UserCheck },
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
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 text-xs">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <div className="font-bold text-slate-900">{user.fullName}</div>
                    <div className="text-slate-500">{user.email}</div>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded bg-teal-50 text-teal-700 font-semibold uppercase text-[10px]">
                      Rol activo: {user.role}
                    </span>
                  </div>

                  <div className="px-4 py-2 border-b border-slate-100">
                    <span className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5">
                      Cambiar cuenta para probar permisos (A10/A11)
                    </span>
                    {[
                      { label: 'Laura · Recepción', email: 'laura@nucleodemo.mx' },
                      { label: 'Dr. Alejandro Vega · Admin', email: 'admin@nucleodemo.mx' },
                      { label: 'Dra. Sofía García (Medicina general)', email: 'sofia@nucleodemo.mx' },
                      { label: 'Dr. Pablo Ruiz (Cardiología)', email: 'pablo@nucleodemo.mx' },
                      { label: 'Lic. Elena Martínez (Nutrición)', email: 'elena@nucleodemo.mx' },
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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          {/* SECCIÓN 2: MULTIAGENDA POR COLUMNAS DE PROFESIONAL + BLOQUEOS     */}
          {/* ================================================================= */}
          {activeSection === 'multiagenda' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-[#0B2138]">
                    Multiagenda del Núcleo
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatSpanishLongDate(selectedDate)} · Columnas sincronizadas por especialista y consultorio
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
                    <option value="">Todos los profesionales ({professionals.length})</option>
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

              {/* Columnas por profesional */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
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
          {/* SECCIÓN 4: PROFESIONALES, SERVICIOS, PRECIOS Y HORARIOS           */}
          {/* ================================================================= */}
          {activeSection === 'profesionales' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div>
                    <h1 className="text-2xl font-bold text-[#0B2138]">
                      Profesionales, Servicios y Horarios
                    </h1>
                    <p className="text-xs text-slate-500">
                      Configure duración, precios en MXN, consultorios asignados, bloqueos y enlaces públicos.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowShareLinksModal(true)}
                    className="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <Link2 className="w-4 h-4" /> Compartir enlaces públicos
                  </button>
                </div>

                {configFeedback && (
                  <div className="mb-4 p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-xs font-semibold text-teal-900">
                    {configFeedback}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {professionals.map((prof) => {
                    const profServices = services.filter((s) => s.professional_id === prof.id);
                    const profRules = availabilityRules.filter(
                      (r) => r.professional_id === prof.id && r.is_active
                    );

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
                          Profesional
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
                          Profesional
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
                      <th className="py-3 px-3">Profesional</th>
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

                    {/* Resultados separados por profesional */}
                    <div>
                      <h3 className="text-xs font-bold uppercase text-slate-500 mb-2">
                        Desglose por profesional del núcleo
                      </h3>
                      <div className="grid sm:grid-cols-3 gap-4">
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
                  Cola de Recordatorios y Comunicaciones de Servidor (`notification_jobs`)
                </h2>
                <p className="text-xs text-slate-500">
                  Los recordatorios se ejecutan en servidor, se invalidan al reprogramar/cancelar (A06/A17) y conservan la cita si falla el proveedor (A16).
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-2 px-3">Folio</th>
                        <th className="py-2 px-3">Paciente</th>
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
          {/* SECCIÓN 7: CONFIGURACIÓN DEL NÚCLEO, SEDE E INTEGRACIONES         */}
          {/* ================================================================= */}
          {activeSection === 'configuracion' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                <h1 className="text-2xl font-bold text-[#0B2138]">
                  Configuración del Núcleo, Sede e Integraciones
                </h1>
                {orgSettings && (
                  <div className="grid sm:grid-cols-2 gap-4 text-sm">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-xs font-bold uppercase text-slate-400">
                        Organización (Tenant Aislado)
                      </span>
                      <div className="font-bold text-slate-900">
                        {orgSettings.organization?.name}
                      </div>
                      <div className="text-xs text-slate-600">
                        Slug público: <code>/reservar/{orgSettings.organization?.slug}</code>
                      </div>
                      <div className="text-xs text-slate-600">
                        Moneda oficial: <strong>{orgSettings.organization?.currency}</strong>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-xs font-bold uppercase text-slate-400">
                        Sede y Zona Horaria IANA
                      </span>
                      <div className="font-bold text-slate-900">{orgSettings.location?.name}</div>
                      <div className="text-xs text-slate-600">{orgSettings.location?.address}</div>
                      <div className="text-xs text-teal-700 font-semibold">
                        Zona horaria activa: {orgSettings.location?.timezone}
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-4 rounded-xl border border-slate-200 space-y-2">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600" />
                    Estado de Integraciones (Entrega P0 vs Expansión P1)
                  </h3>
                  <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-5">
                    <li>
                      <strong>WhatsApp Manual (Activo en P0):</strong> La recepción comparte enlaces específicos por profesional (`/reservar/nucleo-demo/...`) desde WhatsApp Business sin simular lectura de bandeja ni llamadas.
                    </li>
                    <li>
                      <strong>WhatsApp Cloud API Oficial (Preparado para P1):</strong> Interfaces de cola y outbox (`notification_jobs` / `outbox_events`) listas; deshabilitado hasta contar con número verificado y plantillas aprobadas por Meta.
                    </li>
                    <li>
                      <strong>Pagos Online y Webhooks (Preparado para P1):</strong> El motor financiero ya opera con libro mayor inmutable en centavos MXN; los cobros en P0 se registran manualmente en recepción/caja.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

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
