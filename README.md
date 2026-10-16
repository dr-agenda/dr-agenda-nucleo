# Dr Agenda Núcleos — Multiagenda Médica PWA

Aplicación Web Progresiva (PWA) diseñada para administrar las agendas de múltiples profesionales de la salud dentro de un núcleo de consultorios, con recepción centralizada, enlaces de reserva pública por especialista, control transaccional de concurrencia en consultorios compartidos y aislamiento estricto multi-organización (`Row Level Security` en PostgreSQL).

---

## 1. Arquitectura y Decisiones Técnicas

### Stack Obligatorio Implementado
| Capa | Tecnología | Justificación Técnica |
| :--- | :--- | :--- |
| **Alojamiento y Edge Server** | **Cloudflare Workers (con Static Assets) + Hono** | De acuerdo con la documentación oficial vigente de Cloudflare (2025–2026), **Workers con Static Assets** (`wrangler.jsonc` con `assets.directory = "./dist"` y `not_found_handling = "single-page-application"`) reemplaza la separación histórica entre Pages y Workers: sirve la PWA compilada por Vite desde la caché global de Cloudflare sin costo de cómputo y enruta `/api/v1/*` al mismo Worker tipado en una sola unidad atómica de despliegue, compartiendo variables de entorno, secretos y versionado. |
| **Base de Datos, Identidad y RLS** | **Supabase (PostgreSQL 15+)** | Provee `btree_gist` para restricciones de exclusión (`EXCLUDE USING gist`) que impiden físicamente traslapes de horario por profesional o consultorio a nivel de motor de base de datos, además de políticas `ROW LEVEL SECURITY` (`FORCE ROW LEVEL SECURITY`) basadas en `auth.uid()`. |
| **Frontend y PWA** | **React 19 + Vite + TypeScript + Tailwind CSS** | Interfaz institucional en español (`es-MX`), moneda `MXN` (almacenada en centavos enteros) y conversión dinámica de zonas horarias IANA (`America/Mexico_City`). Incluye `manifest.webmanifest` y Service Worker (`public/sw.js`) que cachea exclusivamente el shell estático y **jamás almacena respuestas de `/api/*` ni datos de pacientes**. |
| **Control de Versiones y CI** | **Git + GitHub Actions** | Flujo automatizado en `.github/workflows/ci.yml` que levanta PostgreSQL 15, ejecuta `tsc --noEmit`, aplica las migraciones de `supabase/migrations/`, carga el seed de prueba, corre la matriz de pruebas de aceptación (`A01–A27`) y compila el bundle de producción. |

### Estructura de Carpetas
```text
dr-agenda-nucleo/
├── .github/workflows/ci.yml      # Automatización CI (tipos, migraciones, pruebas A01-A27 y build)
├── public/
│   ├── icon.svg                  # Icono institucional de la PWA
│   ├── manifest.webmanifest      # Web App Manifest instalable
│   └── sw.js                     # Service Worker seguro (solo shell estático, sin caché de API)
├── scripts/
│   ├── migrate.ts                # Ejecutor de migraciones SQL hacia Supabase / PostgreSQL
│   └── seed.ts                   # Proceso separado de carga de datos ficticios de demostración
├── src/
│   ├── client/
│   │   ├── api.ts                # Cliente HTTP con bloqueo sin conexión (A18) y claves de idempotencia
│   │   ├── AppointmentModals.tsx # Modales de Nueva Cita, Compartir Enlace WhatsApp y Detalle/Cobros
│   │   ├── badges.tsx            # Etiquetas accesibles (texto + icono + color) de atención y pago
│   │   └── PublicBookingPortal.tsx # Reserva pública (/reservar/...) y autogestión (/gestionar/...)
│   ├── server/
│   │   ├── app.ts                # Contrato completo de API REST (/api/v1/*) con Hono
│   │   ├── auth.ts               # Sesiones firmadas y validación de usuario/membresía activa (A21)
│   │   ├── availability.ts       # Motor de disponibilidad en zona IANA, jornada, descansos y recursos
│   │   ├── booking-service.ts    # Operaciones transaccionales atómicas, GiST, idempotencia y libro mayor
│   │   ├── db.ts                 # Conexión PostgreSQL/Supabase y ejecutor RLS (withUserRls)
│   │   └── dev-server.ts         # Servidor local de desarrollo (puerto 8787)
│   ├── shared/
│   │   ├── timezone.ts           # Conversión UTC <-> IANA (America/Mexico_City) y formato MXN
│   │   └── types.ts              # Contratos tipados compartidos entre frontend y backend
│   ├── App.tsx                   # Panel principal (Inicio, Multiagenda, Pacientes, Profesionales, Cobros, Reportes)
│   ├── main.tsx                  # Punto de entrada React y registro de Service Worker
│   └── worker.ts                 # Punto de entrada para Cloudflare Workers
├── supabase/
│   ├── config.toml               # Configuración oficial de Supabase CLI
│   ├── migrations/
│   │   └── 20261016000001_init_dr_agenda_nucleos.sql # Esquema, GiST, triggers inmutables y RLS
│   └── seed.sql                  # Seed base para Supabase CLI
├── tests/
│   └── acceptance-matrix.test.ts # Suite automatizada Vitest para escenarios A01–A27
├── .env.example                  # Plantilla de variables de entorno con valores ficticios
├── package.json
├── tsconfig.json
├── vite.config.ts
└── wrangler.jsonc                # Configuración de despliegue Cloudflare Workers (dev, staging, prod)
```

---

## 2. Cómo Ejecutar el Proyecto Localmente

### Requisitos Previos
- **Node.js** `>= 22.x`
- **PostgreSQL 15+** o **Supabase CLI / Docker** en el puerto `54322` (por defecto `postgresql://postgres:postgres@127.0.0.1:54322/postgres`).

### Paso 1: Instalar dependencias
```bash
npm install
```

### Paso 2: Levantar PostgreSQL local (si aún no está corriendo)
```bash
docker run -d --name dr_agenda_nucleo_db -p 127.0.0.1:54322:5432 \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=postgres \
  postgres:15-alpine
```

### Paso 3: Aplicar migraciones y cargar datos ficticios (Seed separado)
```bash
npm run db:reset
```
*Nota: También puede ejecutar únicamente las migraciones con `npm run db:migrate` o únicamente el seed con `npm run db:seed`.*

### Paso 4: Iniciar servidor backend y frontend
En una terminal inicie el servidor API (puerto `8787`):
```bash
npm run dev
```
En otra terminal inicie Vite con Hot Module Replacement (puerto `5173`):
```bash
npm run dev:vite
```
Abra `http://localhost:5173` en su navegador.

### Cuentas Ficticias de Prueba (Contraseña para todas: `Demo2026!`)
| Usuario | Correo | Rol | Alcance |
| :--- | :--- | :--- | :--- |
| **Laura Méndez** | `laura@nucleodemo.mx` | `reception` | Recepción de **Núcleo Demo** (acceso a las 3 agendas, cobros y enlaces) |
| **Dr. Alejandro Vega** | `admin@nucleodemo.mx` | `admin` | Administrador de **Núcleo Demo** (configuración, catálogo, reversos y reportes) |
| **Dra. Sofía García** | `sofia@nucleodemo.mx` | `professional` | Medicina general (acceso exclusivo a su propia agenda y pacientes) |
| **Dr. Pablo Ruiz** | `pablo@nucleodemo.mx` | `professional` | Cardiología (acceso exclusivo a su propia agenda y pacientes) |
| **Lic. Elena Martínez** | `elena@nucleodemo.mx` | `professional` | Nutrición (acceso exclusivo a su propia agenda y pacientes) |
| **Roberto Garza** | `intruder@nucleonorte.mx` | `admin` | Administrador de **Núcleo Norte Privado** (para pruebas negativas de aislamiento A10) |

---

## 3. Variables de Entorno

Consulte `.env.example`. Nunca suba claves reales ni `.dev.vars` al repositorio:
- `ENVIRONMENT`: `development` | `staging` | `production`
- `PUBLIC_APP_URL`: URL pública base para enlaces de reserva y autogestión
- `DATABASE_URL`: Cadena de conexión PostgreSQL de Supabase (Direct o Session Pooler / Hyperdrive)
- `SUPABASE_URL`: URL del proyecto de Supabase
- `SUPABASE_ANON_KEY`: Clave anónima pública de Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Clave privilegiada de servidor (exclusiva del backend Worker, jamás expuesta al navegador)
- `APP_JWT_SECRET`: Secreto de servidor (mínimo 32 caracteres) para firma de sesiones

---

## 4. Cómo Ejecutar las Pruebas Automatizadas

Ejecute la suite completa de verificación de tipos y pruebas de aceptación (`A01–A27`):
```bash
npm run typecheck
npm test
```

### Escenarios Verificados Automáticamente en `tests/acceptance-matrix.test.ts`
1. **A01 & A04:** Reserva pública desde `/api/v1/public/nucleo-demo/bookings` persiste en la agenda correcta y la clave de idempotencia impide duplicados por doble clic.
2. **A02 & A03:** Dos solicitudes simultáneas (`Promise.all`) al mismo horario y profesional producen exactamente **una** cita confirmada (`201`) y un rechazo por conflicto (`409`).
3. **A05, A06 & A26:** Una reprogramación hacia un horario ocupado falla con `409` y conserva intacta la cita original; una reprogramación válida incrementa `version`, guarda el antes/después en `appointment_events` e invalida recordatorios previos; un cambio con versión obsoleta devuelve `409 VERSION_CONFLICT`.
4. **A07:** Dos profesionales que comparten un mismo consultorio físico (`Consultorio 2`) no pueden agendarse a la misma hora (`409`).
5. **A08 & A09:** Un servicio cuya duración + margen excede el fin de jornada es rechazado (`422 OUTSIDE_WORKING_HOURS`), y un bloqueo de horario impide reservas en ese intervalo (`409`).
6. **A10 & A11:** Pruebas negativas de seguridad: un usuario de otro núcleo (`intruder@nucleonorte.mx`) no puede leer ni cancelar citas de `Núcleo Demo` aunque conozca su UUID; una profesional (`sofia@nucleodemo.mx`) no puede leer ni modificar la agenda de otro médico (`Dr. Pablo Ruiz`).
7. **A12, A13, A14 & A15:** Marcar una cita como `Atendida` no altera su estado financiero (`Pendiente`); un pago parcial calcula el saldo exacto; los reversos son inmutables (el trigger PostgreSQL impide `DELETE`/`UPDATE` en `financial_movements`); una cita futura no puede marcarse como `No asistió` (`422`); y cancelar libera el espacio conservando el historial.
8. **A16, A17 & A27:** La cola de recordatorios omite envíos vencidos, invalida tareas obsoletas al cancelar y conserva la cita si el proveedor falla.
9. **A19, A20, A21, A22 & A23:** Los indicadores del Inicio cambian según la fecha consultada; dos pacientes con el mismo teléfono no se fusionan automáticamente; revocar un usuario invalida su sesión de inmediato; tokens inválidos devuelven `401`; cambiar precios del catálogo conserva el importe histórico acordado en citas previas.

---

## 5. Despliegue en Cloudflare Workers

1. Autentique Wrangler en su cuenta de Cloudflare:
   ```bash
   npx wrangler login
   ```
2. Configure los secretos del entorno en Cloudflare:
   ```bash
   npx wrangler secret put DATABASE_URL --env staging
   npx wrangler secret put APP_JWT_SECRET --env staging
   npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env staging
   ```
3. Compile y despliegue:
   ```bash
   npm run build
   npx wrangler deploy --env staging
   ```

---

## 6. Backlog Priorizado (Entregas y Estado)

### Entrega 1 — Flujo Funcional Completo P0 (✅ Implementado)
- [x] Esquema multitenant Supabase PostgreSQL con RLS forzado y llaves compuestas `(id, organization_id)`.
- [x] Restricciones GiST (`btree_gist`) contra dobles reservas de profesional y consultorio.
- [x] Inicio de sesión, cierre de sesión y diferenciación de permisos (Administrador, Recepción, Profesional).
- [x] Dashboard de Inicio fiel a la referencia visual conectado 100% a consultas reales por fecha y zona horaria.
- [x] Multiagenda por columnas, creación de citas desde recepción y bloqueo de horarios.
- [x] Portal público de reserva por profesional (`/reservar/:orgSlug/:profSlug`) y compartición manual por WhatsApp.
- [x] Portal de autogestión de cita para el paciente con token seguro hasheado (`/gestionar/:token`).
- [x] Estados de atención separados del estado financiero, cobros parciales/totales y reversos inmutables.
- [x] PWA con `manifest.webmanifest`, Service Worker seguro y bloqueo de operaciones sin conexión.

### Entrega 2 — Endurecimiento Operativo P0+ (Pendiente)
- [ ] Exportación de reportes en CSV firmados temporalmente en almacenamiento privado de Supabase Storage.
- [ ] Worker programado (Cloudflare Cron Trigger) para despacho automático de correo transaccional (`Resend` / SMTP) desde `notification_jobs`.
- [ ] MFA administrativo (TOTP) y flujo de invitación por correo.

### Entrega 3 — Expansión P1 (Pendiente bajo acuerdo independiente)
- [ ] Integración con WhatsApp Business Cloud API oficial (plantillas aprobadas, consentimiento y webhooks firmados).
- [ ] Pasarela de pagos online para anticipos con expiración de apartado en servidor.
- [ ] Lista de espera automatizada y citas recurrentes (series).

---

## 7. Dependencias, Costos Potenciales y Limitaciones Conocidas

- **Proveedores base:** Cloudflare Workers (plan Free o Paid desde \$5 USD/mes), Supabase (plan Free para desarrollo/pruebas o Pro desde \$25 USD/mes en producción con respaldos continuos Point-in-Time Recovery para cumplir RPO de 1 h).
- **Bloqueos externos identificados en este entorno local:**
  - `wrangler` no tiene una sesión autenticada de Cloudflare (`wrangler login` pendiente por parte del propietario de la cuenta).
  - `supabase` CLI no tiene un token remoto enlazado (`SUPABASE_ACCESS_TOKEN` pendiente para `supabase db push` hacia la nube; las migraciones y pruebas corren localmente contra PostgreSQL 15 en el puerto `54322`).
  - `gh` CLI / remoto de GitHub: el repositorio Git local está inicializado en la rama `main` con commits limpios y `.github/workflows/ci.yml` listo para hacer `git push` en cuanto se agregue el `remote origin`.
