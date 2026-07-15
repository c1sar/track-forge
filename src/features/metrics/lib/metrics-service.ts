import { AppError } from '@/shared/lib/errors';
import {
  addDaysIso,
  daysBetweenIso,
  isoDaysAgoInTz,
  isValidIsoDate,
  todayInTz,
} from '@/shared/lib/timezone';

import { MetricsRepository } from './metrics-repository';
import { type DailyMetric, rowToDailyMetric } from './types';

export interface MetricsRange {
  from: string;
  to: string;
}

const DEFAULT_RANGE_DAYS = 30;
/** Tope de dias por peticion para evitar rangos abusivos / que rompan la UI. */
export const MAX_RANGE_DAYS = 366;

/**
 * Resuelve un rango de fechas valido a partir de query params opcionales,
 * anclado a la zona horaria del usuario. Aplica limites defensivos:
 * - formatos invalidos => default
 * - futuro => se recorta a hoy
 * - rango invertido => se corrige (swap)
 * - span mayor a MAX_RANGE_DAYS => 400 claro
 */
export function resolveRange(
  fromParam: string | null,
  toParam: string | null,
  tz: string,
): MetricsRange {
  const today = todayInTz(tz);

  let to = toParam && isValidIsoDate(toParam) ? toParam : today;
  let from =
    fromParam && isValidIsoDate(fromParam) ? fromParam : isoDaysAgoInTz(DEFAULT_RANGE_DAYS - 1, tz);

  // Corrige rango invertido.
  if (from > to) {
    [from, to] = [to, from];
  }

  // No permitir fechas futuras respecto al dia local del usuario.
  if (to > today) {
    to = today;
  }
  if (from > today) {
    from = today;
  }

  // Cap defensivo del span.
  if (daysBetweenIso(from, to) > MAX_RANGE_DAYS) {
    throw new AppError(`El rango no puede exceder ${MAX_RANGE_DAYS} dias.`, 400, 'range_too_large');
  }

  return { from, to };
}

/** Rango por defecto (ultimos N dias) para la zona `tz`. */
export function defaultRange(tz: string): MetricsRange {
  return { from: isoDaysAgoInTz(DEFAULT_RANGE_DAYS - 1, tz), to: todayInTz(tz) };
}

export { addDaysIso };

export async function getMetrics(
  env: Env,
  userId: string,
  range: MetricsRange,
): Promise<DailyMetric[]> {
  const rows = await new MetricsRepository(env.DB).listByRange(userId, range.from, range.to);
  return rows.map(rowToDailyMetric);
}

export async function getLatestMetric(env: Env, userId: string): Promise<DailyMetric | null> {
  const row = await new MetricsRepository(env.DB).latest(userId);
  return row ? rowToDailyMetric(row) : null;
}
