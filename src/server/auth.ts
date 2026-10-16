import crypto from 'node:crypto';
import { getSql, type ServerEnv } from './db';
import type { AuthSessionUser, UserRole } from '../shared/types';

const DEFAULT_SECRET = 'dev_only_secret_key_for_dr_agenda_nucleos_local_testing_32';

function getSecret(env?: ServerEnv): string {
  return (
    env?.APP_JWT_SECRET ||
    (typeof process !== 'undefined' ? process.env.APP_JWT_SECRET : undefined) ||
    DEFAULT_SECRET
  );
}

interface TokenPayload {
  sub: string;
  orgId: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export function signSessionToken(
  payload: { userId: string; organizationId: string; role: UserRole },
  env?: ServerEnv,
  ttlSeconds = 60 * 60 * 12
): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: TokenPayload = {
    sub: payload.userId,
    orgId: payload.organizationId,
    role: payload.role,
    iat: now,
    exp: now + ttlSeconds,
  };
  const headerB64 = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const bodyB64 = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSecret(env))
    .update(`${headerB64}.${bodyB64}`)
    .digest('base64url');
  return `${headerB64}.${bodyB64}.${sig}`;
}

export function verifySessionToken(token: string, env?: ServerEnv): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, bodyB64, sig] = parts;
    const expectedSig = crypto
      .createHmac('sha256', getSecret(env))
      .update(`${headerB64}.${bodyB64}`)
      .digest('base64url');

    if (
      sig.length !== expectedSig.length ||
      !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))
    ) {
      return null;
    }

    const decoded = JSON.parse(Buffer.from(bodyB64, 'base64url').toString('utf-8')) as TokenPayload;
    const now = Math.floor(Date.now() / 1000);
    if (!decoded.exp || decoded.exp < now) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export async function authenticateWithPassword(
  email: string,
  password: string,
  env?: ServerEnv
): Promise<{ user: AuthSessionUser; token: string } | null> {
  const sql = getSql(env);
  const normalizedEmail = email.trim().toLowerCase();

  const rows = await sql`
    SELECT
      u.id AS user_id,
      u.email,
      u.is_active AS user_active,
      m.organization_id,
      m.role,
      m.full_name,
      m.initials,
      m.is_active AS membership_active,
      o.slug AS org_slug,
      o.name AS org_name,
      o.default_timezone,
      o.currency,
      p.id AS professional_id
    FROM auth.users u
    JOIN public.memberships m ON m.user_id = u.id
    JOIN public.organizations o ON o.id = m.organization_id
    LEFT JOIN public.professionals p
      ON p.organization_id = m.organization_id
      AND p.user_id = u.id
      AND p.is_active = true
    WHERE LOWER(u.email) = ${normalizedEmail}
      AND u.encrypted_password = crypt(${password}, u.encrypted_password)
      AND u.is_active = true
      AND m.is_active = true
      AND o.status = 'active'
    ORDER BY m.created_at ASC
    LIMIT 1
  `;

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  const sessionUser: AuthSessionUser = {
    userId: row.user_id,
    email: row.email,
    fullName: row.full_name,
    initials: row.initials,
    organizationId: row.organization_id,
    organizationSlug: row.org_slug,
    organizationName: row.org_name,
    role: row.role as UserRole,
    professionalId: row.professional_id || null,
    timezone: row.default_timezone,
    currency: 'MXN',
  };

  const token = signSessionToken(
    {
      userId: sessionUser.userId,
      organizationId: sessionUser.organizationId,
      role: sessionUser.role,
    },
    env
  );

  return { user: sessionUser, token };
}

/**
 * Resuelve la sesión activa verificando en base de datos que el usuario y su membresía
 * sigan vigentes (cumple A21: Usuario eliminado o revocado pierde acceso inmediatamente).
 * Nunca confía en el organization_id enviado por el navegador.
 */
export async function resolveActiveSessionUser(
  token: string,
  env?: ServerEnv
): Promise<AuthSessionUser | null> {
  const payload = verifySessionToken(token, env);
  if (!payload) return null;

  const sql = getSql(env);
  const rows = await sql`
    SELECT
      u.id AS user_id,
      u.email,
      m.organization_id,
      m.role,
      m.full_name,
      m.initials,
      o.slug AS org_slug,
      o.name AS org_name,
      o.default_timezone,
      p.id AS professional_id
    FROM auth.users u
    JOIN public.memberships m ON m.user_id = u.id AND m.organization_id = ${payload.orgId}
    JOIN public.organizations o ON o.id = m.organization_id
    LEFT JOIN public.professionals p
      ON p.organization_id = m.organization_id
      AND p.user_id = u.id
      AND p.is_active = true
    WHERE u.id = ${payload.sub}
      AND u.is_active = true
      AND m.is_active = true
      AND o.status = 'active'
    LIMIT 1
  `;

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  return {
    userId: row.user_id,
    email: row.email,
    fullName: row.full_name,
    initials: row.initials,
    organizationId: row.organization_id,
    organizationSlug: row.org_slug,
    organizationName: row.org_name,
    role: row.role as UserRole,
    professionalId: row.professional_id || null,
    timezone: row.default_timezone,
    currency: 'MXN',
  };
}
