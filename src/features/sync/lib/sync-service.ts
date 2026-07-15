import { UserRepository } from '@/features/auth/lib/user-repository';
import { LinkedAccountRepository } from '@/features/connections/lib/linked-account-repository';
import { getProviderOrThrow } from '@/features/connections/lib/registry';
import { MetricsRepository } from '@/features/metrics/lib/metrics-repository';
import { DAILY_METRIC_FIELDS, type DailyMetric } from '@/features/metrics/lib/types';
import {
  addDaysIso,
  daysBetweenIso,
  isValidIsoDate,
  lastNDatesInTz,
  resolveServerTimeZone,
  todayInTz,
} from '@/shared/lib/timezone';

export const DEFAULT_SYNC_DAYS = 7;
export const MAX_SYNC_DAYS = 90;
export const DEFAULT_PROVIDER = 'garmin';

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
  /** Proveedor a sincronizar (id del registry). Default: garmin. */
  provider?: string | null;
  /** Rango explicito (dias calendario locales del usuario). */
  from?: string | null;
  to?: string | null;
  /** Alternativa al rango: ultimos N dias. */
  days?: number | null;
  /** Zona horaria enviada por el cliente (navegador). El setting guardado gana. */
  clientTz?: string | null;
}

function countFilled(metric: DailyMetric): number {
  return DAILY_METRIC_FIELDS.reduce((acc, field) => (metric[field] != null ? acc + 1 : acc), 0);
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
 * Sincroniza las metricas diarias de un usuario para un proveedor y un rango
 * (o los ultimos N dias). Es provider-agnostico: resuelve la integracion via
 * el registry (`HealthDataProvider`) y persiste con `source = provider`.
 * Unidad reutilizable llamada por el endpoint on-demand y por el link flow.
 */
export async function syncUserMetrics(
  env: Env,
  userId: string,
  options: SyncOptions = {},
): Promise<SyncResult> {
  const provider = getProviderOrThrow(options.provider ?? DEFAULT_PROVIDER);

  const storedTz = await new UserRepository(env.DB).getTimezone(userId);
  const tz = resolveServerTimeZone(storedTz, options.clientTz);
  const dates = resolveSyncDates(options, tz);

  const metrics = await provider.fetchDailyMetrics(env, userId, dates);

  await new MetricsRepository(env.DB).upsertMany(userId, provider.id, metrics);
  await new LinkedAccountRepository(env.DB).updateLastSync(
    userId,
    provider.id,
    new Date().toISOString(),
  );

  const report: SyncDayReport[] = metrics.map((metric) => ({
    date: metric.date,
    filled: countFilled(metric),
    total: DAILY_METRIC_FIELDS.length,
  }));

  return {
    syncedDays: metrics.length,
    daysWithData: report.filter((day) => day.filled > 0).length,
    from: dates[0] ?? '',
    to: dates[dates.length - 1] ?? '',
    report,
  };
}
