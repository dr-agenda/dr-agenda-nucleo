import postgres, { type Sql, type TransactionSql } from 'postgres';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface ServerEnv {
  DATABASE_URL?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  APP_JWT_SECRET?: string;
  PUBLIC_APP_URL?: string;
  ENVIRONMENT?: string;
}

const DEFAULT_LOCAL_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const DEFAULT_SUPABASE_POOLER_URL =
  'postgresql://postgres.fpflsnztmdcmwcgtbscw:mzJ7Y_b5AE%25%21g%24B@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require';

let cachedSql: Sql | null = null;
let cachedDbUrl: string | null = null;

export function normalizeDatabaseUrl(rawUrl?: string): string {
  if (!rawUrl || rawUrl.trim() === '') {
    return DEFAULT_SUPABASE_POOLER_URL;
  }

  let str = rawUrl.trim();
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    str = str.slice(1, -1);
  }

  // Si en Cloudflare Worker viene configurado localhost o 127.0.0.1, redirigir a Supabase remoto
  if (str.includes('127.0.0.1') || str.includes('localhost')) {
    return DEFAULT_SUPABASE_POOLER_URL;
  }

  // Si contiene el dominio directo de Supabase (ej. db.fpflsnztmdcmwcgtbscw.supabase.co),
  // este solo cuenta con IPv6 en Supabase gratuito y Cloudflare Worker TCP sockets no puede
  // resolverlo (provoca el error "proxy request failed, cannot connect to the specified address").
  // Se redirige automáticamente al Connection Pooler IPv4 en puerto 6543 (Transaction Mode para Serverless)
  // con el usuario obligatorio postgres.<projectRef>.
  const directMatch = str.match(/@db\.([a-z0-9]+)\.supabase\.co(?::(\d+))?\/([a-zA-Z0-9_\-]+)/);
  if (directMatch) {
    const projectRef = directMatch[1];
    const dbName = directMatch[3] || 'postgres';

    const protoEnd = str.indexOf('://');
    const atIndex = str.indexOf('@');
    if (protoEnd !== -1 && atIndex !== -1) {
      const auth = str.slice(protoEnd + 3, atIndex);
      const colonIndex = auth.indexOf(':');
      let password = colonIndex !== -1 ? auth.slice(colonIndex + 1) : '';
      if (password.includes('%!') && !password.includes('%25!')) {
        password = password.replace(/%!/g, '%25%21');
      }
      if (password.includes('$') && !password.includes('%24')) {
        password = password.replace(/\$/g, '%24');
      }
      return `postgresql://postgres.${projectRef}:${password}@aws-0-us-east-1.pooler.supabase.com:6543/${dbName}?sslmode=require`;
    }
  }

  // Si es el Connection Pooler, asegurar puerto 6543 para Serverless/Cloudflare Workers
  if (str.includes('pooler.supabase.com')) {
    str = str.replace(/:5432\b/, ':6543');
    if (str.includes('%!') && !str.includes('%25!')) {
      str = str.replace(/%!/g, '%25%21');
    }
    if (str.includes('$') && !str.includes('%24')) {
      str = str.replace(/\$/g, '%24');
    }
    if (!str.includes('sslmode=')) {
      str += (str.includes('?') ? '&' : '?') + 'sslmode=require';
    }
    return str;
  }

  return str;
}

export function getSql(env?: ServerEnv): Sql {
  const isCloudflareWorker =
    typeof (globalThis as unknown as { WebSocketPair?: unknown }).WebSocketPair !== 'undefined' ||
    (typeof navigator !== 'undefined' && /Cloudflare/i.test(navigator.userAgent || ''));

  const rawUrl =
    env?.DATABASE_URL ||
    (typeof process !== 'undefined' ? process.env.DATABASE_URL : undefined);

  let dbUrl: string;
  if (!rawUrl || rawUrl.trim() === '') {
    dbUrl = isCloudflareWorker ? DEFAULT_SUPABASE_POOLER_URL : DEFAULT_LOCAL_DB_URL;
  } else {
    dbUrl = isCloudflareWorker ? normalizeDatabaseUrl(rawUrl) : rawUrl;
  }

  const isSupabase = dbUrl.includes('supabase.co') || dbUrl.includes('supabase.com');

  if (isCloudflareWorker) {
    return postgres(dbUrl, {
      max: 1,
      idle_timeout: 0,
      connect_timeout: 10,
      prepare: false,
      fetch_types: false,
      ssl: isSupabase ? 'require' : undefined,
      onnotice: () => {},
    });
  }

  if (!cachedSql || cachedDbUrl !== dbUrl) {
    cachedSql = postgres(dbUrl, {
      max: 15,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
      ssl: isSupabase ? 'require' : undefined,
      onnotice: () => {},
    });
    cachedDbUrl = dbUrl;
  }

  return cachedSql;
}

export function getSupabaseServiceClient(env?: ServerEnv): SupabaseClient | null {
  const url =
    env?.SUPABASE_URL || (typeof process !== 'undefined' ? process.env.SUPABASE_URL : undefined);
  const key =
    env?.SUPABASE_SERVICE_ROLE_KEY ||
    (typeof process !== 'undefined' ? process.env.SUPABASE_SERVICE_ROLE_KEY : undefined);

  if (!url || !key || url.includes('ejemplo-proyecto-ficticio')) {
    return null;
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Ejecuta una transacción PostgreSQL aplicando el contexto de identidad de Supabase Auth
 * (`SET LOCAL ROLE authenticated` + `request.jwt.claims` con `sub = userId`)
 * para que PostgreSQL evalúe todas las políticas Row Level Security (RLS) activas.
 */
export async function withUserRls<T>(
  userId: string,
  fn: (tx: TransactionSql) => Promise<T>,
  env?: ServerEnv
): Promise<T> {
  const sql = getSql(env);
  return sql.begin(async (tx) => {
    const claims = JSON.stringify({
      sub: userId,
      role: 'authenticated',
    });
    await tx`SELECT set_config('request.jwt.claim.sub', ${userId}, true)`;
    await tx`SELECT set_config('request.jwt.claims', ${claims}, true)`;
    await tx.unsafe(`SET LOCAL ROLE authenticated`);
    return fn(tx);
  }) as Promise<T>;
}

/**
 * Ejecuta una transacción privilegiada de servidor (por ejemplo para reserva pública
 * verificada o validación de token de gestión) con rol de servicio.
 */
export async function withServiceTransaction<T>(
  fn: (tx: TransactionSql) => Promise<T>,
  env?: ServerEnv
): Promise<T> {
  const sql = getSql(env);
  return sql.begin(async (tx) => {
    return fn(tx);
  }) as Promise<T>;
}
