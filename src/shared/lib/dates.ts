/** Utilidades de fechas en formato ISO YYYY-MM-DD (UTC). */

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

/** Devuelve las últimas `count` fechas (incluye hoy), de más antigua a más reciente. */
export function lastNDates(count: number): string[] {
  const dates: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    dates.push(isoDaysAgo(i));
  }
  return dates;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) {
    return false;
  }
  const time = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(time);
}
