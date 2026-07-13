import { isoDaysAgo, isValidIsoDate, todayIso } from '@/shared/lib/dates';

import { MetricsRepository } from './metrics-repository';
import { type DailyMetric, rowToDailyMetric } from './types';

export interface MetricsRange {
  from: string;
  to: string;
}

const DEFAULT_RANGE_DAYS = 30;

/** Resuelve un rango de fechas válido a partir de query params opcionales. */
export function resolveRange(fromParam: string | null, toParam: string | null): MetricsRange {
  const to = toParam && isValidIsoDate(toParam) ? toParam : todayIso();
  const from =
    fromParam && isValidIsoDate(fromParam) ? fromParam : isoDaysAgo(DEFAULT_RANGE_DAYS - 1);
  return from <= to ? { from, to } : { from: to, to: from };
}

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
