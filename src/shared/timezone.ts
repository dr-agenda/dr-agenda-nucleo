/**
 * Utilidades de zona horaria IANA (ej. America/Mexico_City) sin desplazamientos fijos.
 * Todas las fechas en PostgreSQL se guardan como TIMESTAMPTZ (UTC) y se convierten
 * usando la zona IANA configurada en la sede.
 */

export function getLocalParts(utcDate: Date, timeZone: string): {
  year: number;
  month: number;
  day: number;
  weekday: number; // 0=Dom .. 6=Sáb
  hour: number;
  minute: number;
  second: number;
  dateString: string; // YYYY-MM-DD
  timeString: string; // HH:mm
} {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(utcDate);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = part.value;
    }
  }

  const year = Number(map.year);
  const month = Number(map.month);
  const day = Number(map.day);
  let hour = Number(map.hour);
  if (hour === 24) hour = 0;
  const minute = Number(map.minute);
  const second = Number(map.second);

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const weekday = weekdayMap[map.weekday] ?? 0;

  const dateString = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  return { year, month, day, weekday, hour, minute, second, dateString, timeString };
}

/**
 * Convierte una fecha local (YYYY-MM-DD) y hora local (HH:mm o HH:mm:ss)
 * en una zona IANA (ej. America/Mexico_City) a un objeto Date en UTC exacto.
 */
export function localDateTimeToUtc(
  localDateStr: string,
  localTimeStr: string,
  timeZone: string
): Date {
  const [year, month, day] = localDateStr.split('-').map(Number);
  const timeParts = localTimeStr.split(':').map(Number);
  const hour = timeParts[0] || 0;
  const minute = timeParts[1] || 0;
  const second = timeParts[2] || 0;

  // Estimación inicial en UTC
  const utcGuessMs = Date.UTC(year, month - 1, day, hour, minute, second);
  const guessDate = new Date(utcGuessMs);

  // Obtenemos qué hora local representa ese instante en la zona IANA objetivo
  const actualParts = getLocalParts(guessDate, timeZone);
  const actualAsUtcMs = Date.UTC(
    actualParts.year,
    actualParts.month - 1,
    actualParts.day,
    actualParts.hour,
    actualParts.minute,
    actualParts.second
  );

  const diffMs = utcGuessMs - actualAsUtcMs;
  const refinedDate = new Date(utcGuessMs + diffMs);

  // Segunda pasada por si cruzamos transición de horario estacional (DST)
  const verifyParts = getLocalParts(refinedDate, timeZone);
  const verifyAsUtcMs = Date.UTC(
    verifyParts.year,
    verifyParts.month - 1,
    verifyParts.day,
    verifyParts.hour,
    verifyParts.minute,
    verifyParts.second
  );
  const secondDiffMs = utcGuessMs - verifyAsUtcMs;

  return new Date(utcGuessMs + diffMs + secondDiffMs);
}

/**
 * Devuelve el rango [inicioUTC, finUTC) correspondiente a un día completo (00:00:00 a +1 día 00:00:00)
 * en la zona horaria IANA de la sede.
 */
export function getLocalDayUtcBounds(localDateStr: string, timeZone: string): {
  dayStartUtc: Date;
  dayEndUtc: Date;
  weekday: number;
} {
  const dayStartUtc = localDateTimeToUtc(localDateStr, '00:00:00', timeZone);
  const [y, m, d] = localDateStr.split('-').map(Number);
  const nextDay = new Date(Date.UTC(y, m - 1, d + 1));
  const nextDateStr = `${nextDay.getUTCFullYear()}-${String(nextDay.getUTCMonth() + 1).padStart(2, '0')}-${String(nextDay.getUTCDate()).padStart(2, '0')}`;
  const dayEndUtc = localDateTimeToUtc(nextDateStr, '00:00:00', timeZone);
  const { weekday } = getLocalParts(dayStartUtc, timeZone);
  return { dayStartUtc, dayEndUtc, weekday };
}

export function formatMxnCents(cents: number): string {
  const pesos = cents / 100;
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(pesos);
}

export function formatSpanishLongDate(localDateStr: string): string {
  const [y, m, d] = localDateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const raw = new Intl.DateTimeFormat('es-MX', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function normalizeMexicanPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+52${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('52')) {
    return `+${digits}`;
  }
  return `+${digits}`;
}
