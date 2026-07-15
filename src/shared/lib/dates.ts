import { isoInTz, todayInTz } from '@/shared/lib/timezone';

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

const relativeTimeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/** Formatea un ISO timestamp como tiempo relativo ("3 hours ago"). */
export function formatRelativeTime(iso: string, now = Date.now()): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) {
    return 'unknown';
  }

  const diffSec = Math.round((then - now) / 1000);
  const absSec = Math.abs(diffSec);

  if (absSec < 60) {
    return relativeTimeFormatter.format(diffSec, 'second');
  }
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) {
    return relativeTimeFormatter.format(diffMin, 'minute');
  }
  const diffHour = Math.round(diffSec / 3600);
  if (Math.abs(diffHour) < 24) {
    return relativeTimeFormatter.format(diffHour, 'hour');
  }
  const diffDay = Math.round(diffSec / 86_400);
  return relativeTimeFormatter.format(diffDay, 'day');
}

/** True si la ultima subida del reloj a Connect parece desactualizada (>12h o no es hoy). */
export function isWatchUploadStale(
  lastUploadAt: string | null,
  tz: string,
  staleHours = 12,
): boolean {
  if (!lastUploadAt) {
    return false;
  }

  const uploadMs = Date.parse(lastUploadAt);
  if (Number.isNaN(uploadMs)) {
    return false;
  }

  const uploadDay = isoInTz(new Date(uploadMs), tz);
  if (uploadDay !== todayInTz(tz)) {
    return true;
  }

  return (Date.now() - uploadMs) / 3_600_000 > staleHours;
}
