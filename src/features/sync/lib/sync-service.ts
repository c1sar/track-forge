import { UserRepository } from '@/features/auth/lib/user-repository';
import { ConnectApiClient } from '@/features/garmin-connect/lib/connect-api-client';
import { GarminAccountRepository } from '@/features/garmin-connect/lib/garmin-account-repository';
import { GarminError } from '@/features/garmin-connect/lib/types';
import { MetricsRepository } from '@/features/metrics/lib/metrics-repository';
import type { DailyMetric } from '@/features/metrics/lib/types';
import {
  addDaysIso,
  daysBetweenIso,
  isValidIsoDate,
  lastNDatesInTz,
  resolveServerTimeZone,
  todayInTz,
} from '@/shared/lib/timezone';

import { fetchDayMetrics } from './garmin-metrics-source';

export const DEFAULT_SYNC_DAYS = 7;
export const MAX_SYNC_DAYS = 90;

/** Cuantas metricas no-null se obtuvieron para un dia (de 9 posibles). */
export interface SyncDayReport {
  date: string;
  filled: number;
  total: number;
}

export interface SyncResult {
  syncedDays: number;
  daysWithData: number;
  from: string;
  to: string;
  report: SyncDayReport[];
}

export interface SyncOptions {
  /** Rango explicito (dias calendario locales del usuario). */
  from?: string | null;
  to?: string | null;
  /** Alternativa al rango: ultimos N dias. */
  days?: number | null;
  /** Zona horaria enviada por el cliente (navegador). El setting guardado gana. */
  clientTz?: string | null;
}

/** Numero de campos metricos por dia (excluye `date`). */
const METRIC_FIELDS: Array<keyof DailyMetric> = [
  'steps',
  'sleepSeconds',
  'restingHr',
  'avgStress',
  'bodyBatteryLow',
  'bodyBatteryHigh',
  'hrvWeeklyAvg',
  'spo2Avg',
  'activeCalories',
];

function countFilled(metric: DailyMetric): number {
  return METRIC_FIELDS.reduce((acc, field) => (metric[field] != null ? acc + 1 : acc), 0);
}

/** Resuelve la lista de dias a sincronizar, acotada y TZ-aware. */
function resolveSyncDates(options: SyncOptions, tz: string): string[] {
  const today = todayInTz(tz);
  const { from, to, days } = options;

  if (from && to && isValidIsoDate(from) && isValidIsoDate(to)) {
    let start = from;
    let end = to;
    if (start > end) {
      [start, end] = [end, start];
    }
    // No sincronizar el futuro.
    if (end > today) {
      end = today;
    }
    if (start > today) {
      start = today;
    }
    // Acotar el span.
    const span = daysBetweenIso(start, end);
    if (span > MAX_SYNC_DAYS) {
      start = addDaysIso(end, -(MAX_SYNC_DAYS - 1));
    }
    const dates: string[] = [];
    for (let d = start; d <= end; d = addDaysIso(d, 1)) {
      dates.push(d);
    }
    return dates;
  }

  const boundedDays = Math.min(Math.max(1, days ?? DEFAULT_SYNC_DAYS), MAX_SYNC_DAYS);
  return lastNDatesInTz(boundedDays, tz);
}

/**
 * Sincroniza las metricas wellness de un usuario para un rango (o los ultimos
 * N dias). Es la unidad reutilizable llamada por el endpoint on-demand y por
 * el flujo de conexion (ver docs/sync-flow.md).
 */
export async function syncUserMetrics(
  env: Env,
  userId: string,
  options: SyncOptions = {},
): Promise<SyncResult> {
  const client = await ConnectApiClient.forUser(env, userId);
  if (!client) {
    throw new GarminError({
      phase: 'login',
      message: 'No hay una cuenta de Garmin vinculada. Conéctala primero.',
      statusCode: 409,
    });
  }

  const storedTz = await new UserRepository(env.DB).getTimezone(userId);
  const tz = resolveServerTimeZone(storedTz, options.clientTz);
  const dates = resolveSyncDates(options, tz);
  const displayName = await client.getDisplayName();

  const metrics: DailyMetric[] = [];
  for (const date of dates) {
    metrics.push(await fetchDayMetrics(client, displayName, date));
  }

  await new MetricsRepository(env.DB).upsertMany(userId, metrics);
  await new GarminAccountRepository(env.DB).updateLastSync(userId, new Date().toISOString());

  const report: SyncDayReport[] = metrics.map((metric) => ({
    date: metric.date,
    filled: countFilled(metric),
    total: METRIC_FIELDS.length,
  }));

  return {
    syncedDays: metrics.length,
    daysWithData: report.filter((day) => day.filled > 0).length,
    from: dates[0] ?? '',
    to: dates[dates.length - 1] ?? '',
    report,
  };
}
