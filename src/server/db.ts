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

let cachedSql: Sql | null = null;
let cachedDbUrl: string | null = null;

export function getSql(env?: ServerEnv): Sql {
  const dbUrl =
    env?.DATABASE_URL ||
    (typeof process !== 'undefined' ? process.env.DATABASE_URL : undefined) ||
    DEFAULT_LOCAL_DB_URL;

  const isCloudflareWorker =
    typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers';

  if (isCloudflareWorker) {
    return postgres(dbUrl, {
      max: 2,
      idle_timeout: 1,
      connect_timeout: 10,
      prepare: false,
      fetch_types: false,
      onnotice: () => {},
    });
  }

  if (!cachedSql || cachedDbUrl !== dbUrl) {
    cachedSql = postgres(dbUrl, {
      max: 15,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
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
