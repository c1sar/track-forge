/**
 * Utilidades de fechas conscientes de zona horaria (IANA).
 *
 * El dia calendario de Garmin corresponde a la zona horaria local del usuario,
 * no a UTC. Estas funciones calculan el `YYYY-MM-DD` del dia calendario en una
 * zona horaria concreta para alinear el sync y las lecturas con Garmin.
 */

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Verifica que un string sea una zona horaria IANA soportada por el runtime. */
export function isValidTimeZone(tz: string | null | undefined): tz is string {
  if (!tz || typeof tz !== 'string') {
    return false;
  }
  try {
    // Lanza RangeError si la zona no existe.
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Resuelve la zona horaria efectiva: la almacenada (si es valida) tiene
 * prioridad; si no, se usa la del runtime; como ultimo recurso, UTC.
 */
export function resolveTimeZone(stored?: string | null): string {
  if (isValidTimeZone(stored)) {
    return stored;
  }
  try {
    const runtimeTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (isValidTimeZone(runtimeTz)) {
      return runtimeTz;
    }
  } catch {
    // ignore
  }
  return 'UTC';
}

/**
 * Resuelve la zona horaria en el servidor. Prioridad: setting guardado por el
 * usuario > zona enviada por el cliente (navegador) > UTC. Nunca usa el runtime
 * del Worker (siempre UTC), por eso no delega en `resolveTimeZone`.
 */
export function resolveServerTimeZone(stored?: string | null, clientTz?: string | null): string {
  if (isValidTimeZone(stored)) {
    return stored;
  }
  if (isValidTimeZone(clientTz)) {
    return clientTz;
  }
  return 'UTC';
}

/**
 * Devuelve el `YYYY-MM-DD` del instante `date` visto en la zona `tz`.
 * Usa el locale `en-CA` que formatea nativamente como ISO (YYYY-MM-DD).
 */
export function isoInTz(date: Date, tz: string): string {
  const zone = isValidTimeZone(tz) ? tz : 'UTC';
  // en-CA => "2026-07-15"
  const formatted = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  return formatted;
}

/** Dia de hoy (YYYY-MM-DD) en la zona `tz`. */
export function todayInTz(tz: string): string {
  return isoInTz(new Date(), tz);
}

/**
 * Devuelve el `YYYY-MM-DD` correspondiente a `days` dias antes de hoy en `tz`.
 * El calculo se hace sobre el dia calendario local, evitando desfases por UTC.
 */
export function isoDaysAgoInTz(days: number, tz: string): string {
  const today = todayInTz(tz);
  return addDaysIso(today, -days);
}

/**
 * Ultimas `count` fechas (incluye hoy) en la zona `tz`, de mas antigua a mas
 * reciente.
 */
export function lastNDatesInTz(count: number, tz: string): string[] {
  const dates: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    dates.push(isoDaysAgoInTz(i, tz));
  }
  return dates;
}

/** Convierte `YYYY-MM-DD` a milisegundos UTC de medianoche (reloj neutral). */
function isoToUtcMs(isoDate: string): number {
  const parts = isoDate.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  return Date.UTC(year, month - 1, day);
}

/** Suma (o resta) `amount` dias a una fecha ISO `YYYY-MM-DD` de forma segura. */
export function addDaysIso(isoDate: string, amount: number): string {
  const shifted = new Date(isoToUtcMs(isoDate) + amount * 86_400_000);
  return shifted.toISOString().slice(0, 10);
}

/** Numero de dias (inclusive) entre dos fechas ISO. `to` debe ser >= `from`. */
export function daysBetweenIso(from: string, to: string): number {
  return Math.round((isoToUtcMs(to) - isoToUtcMs(from)) / 86_400_000) + 1;
}

/** Reexport util: valida formato ISO YYYY-MM-DD y que sea una fecha real. */
export function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) {
    return false;
  }
  const time = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(time);
}
