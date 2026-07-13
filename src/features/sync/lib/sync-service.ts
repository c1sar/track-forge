import { ConnectApiClient } from '@/features/garmin-connect/lib/connect-api-client';
import { GarminAccountRepository } from '@/features/garmin-connect/lib/garmin-account-repository';
import { GarminError } from '@/features/garmin-connect/lib/types';
import { MetricsRepository } from '@/features/metrics/lib/metrics-repository';
import type { DailyMetric } from '@/features/metrics/lib/types';
import { lastNDates } from '@/shared/lib/dates';

import { fetchDayMetrics } from './garmin-metrics-source';

export const DEFAULT_SYNC_DAYS = 7;
export const MAX_SYNC_DAYS = 90;

export interface SyncResult {
  syncedDays: number;
  from: string;
  to: string;
}

/**
 * Sincroniza las métricas wellness de los últimos `days` días para un usuario.
 * Es la unidad reutilizable llamada tanto por el endpoint on-demand como por
 * el consumidor de la cola / cron (ver docs/sync-flow.md).
 */
export async function syncUserMetrics(
  env: Env,
  userId: string,
  days: number = DEFAULT_SYNC_DAYS,
): Promise<SyncResult> {
  const client = await ConnectApiClient.forUser(env, userId);
  if (!client) {
    throw new GarminError({
      phase: 'login',
      message: 'No hay una cuenta de Garmin vinculada. Conéctala primero.',
      statusCode: 409,
    });
  }

  const boundedDays = Math.min(Math.max(1, days), MAX_SYNC_DAYS);
  const dates = lastNDates(boundedDays);
  const displayName = await client.getDisplayName();

  const metrics: DailyMetric[] = [];
  for (const date of dates) {
    metrics.push(await fetchDayMetrics(client, displayName, date));
  }

  await new MetricsRepository(env.DB).upsertMany(userId, metrics);
  await new GarminAccountRepository(env.DB).updateLastSync(userId, new Date().toISOString());

  return {
    syncedDays: metrics.length,
    from: dates[0] ?? '',
    to: dates[dates.length - 1] ?? '',
  };
}
