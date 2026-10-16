const TOKEN_STORAGE_KEY = 'dr_agenda_nucleos_session_token';

export function getSavedToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function saveToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function generateIdempotencyKey(prefix = 'op'): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${rand}`;
}

export async function apiFetch<T = any>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: unknown;
    idempotencyKey?: string;
    isSimulatedOffline?: boolean;
  } = {}
): Promise<T> {
  const method = options.method || 'GET';
  const isOffline =
    options.isSimulatedOffline || (typeof navigator !== 'undefined' && !navigator.onLine);

  // Regla crítica PWA (Sección 8 y 14 / A18): Sin conexión no confirmar reservas ni cambios
  if (isOffline && method !== 'GET') {
    throw new Error(
      'Sin conexión a internet: la operación fue bloqueada para evitar una confirmación falsa. Reconecte e intente nuevamente.'
    );
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = getSavedToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (options.idempotencyKey) {
    headers['Idempotency-Key'] = options.idempotencyKey;
  }

  const response = await fetch(path, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(data.error || `Error HTTP ${response.status}`) as Error & {
      status?: number;
      code?: string;
      availableSlots?: unknown;
    };
    err.status = response.status;
    err.code = data.code;
    err.availableSlots = data.availableSlots;
    throw err;
  }

  return data as T;
}
