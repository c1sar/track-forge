import { LinkedAccountRepository } from '@/features/connections/lib/linked-account-repository';
import type {
  HealthDataProvider,
  ProviderConnection,
  ProviderDevice,
} from '@/features/connections/lib/provider';
import type { DailyMetric } from '@/features/metrics/lib/types';

import { ConnectApiClient } from './connect-api-client';
import { fetchDayMetrics } from './garmin-metrics-source';
import { deleteTokens } from './token-store';
import { GarminError } from './types';

/**
 * Adapter de Garmin al contrato `HealthDataProvider`. Es la implementación de
 * referencia para futuras integraciones: delega en la librería específica
 * (SSO, API client, extracción de métricas) y en los almacenes compartidos
 * (linked_accounts en D1, tokens cifrados en KV).
 */

const PROVIDER_ID = 'garmin' as const;

const EMPTY_DEVICE: ProviderDevice = { deviceName: null, lastUploadAt: null };

interface LastUsedResponse {
  lastUsedDeviceName?: string | null;
  lastUsedDeviceUploadTime?: number | { gmt?: number | null } | null;
}

/** Parsea timestamps de Garmin (epoch ms o objeto con campo gmt). */
function parseGarminUploadTime(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  if (value && typeof value === 'object' && 'gmt' in value) {
    const gmt = (value as { gmt?: number | null }).gmt;
    if (typeof gmt === 'number' && Number.isFinite(gmt)) {
      return new Date(gmt).toISOString();
    }
  }
  return null;
}

export const garminProvider: HealthDataProvider = {
  id: PROVIDER_ID,

  async getConnection(env: Env, userId: string): Promise<ProviderConnection> {
    const account = await new LinkedAccountRepository(env.DB).findByUser(userId, PROVIDER_ID);
    if (!account) {
      return { connected: false, displayName: null, lastSyncAt: null };
    }
    return {
      connected: true,
      displayName: account.display_name,
      lastSyncAt: account.last_sync_at,
    };
  },

  async disconnect(env: Env, userId: string): Promise<void> {
    await deleteTokens(env, userId);
    await new LinkedAccountRepository(env.DB).delete(userId, PROVIDER_ID);
  },

  /**
   * Última subida del reloj a Garmin Connect (Bluetooth/WiFi). Tolerante a
   * fallos: nunca lanza; devuelve nulls si no hay datos o la API falla.
   */
  async getDevice(env: Env, userId: string): Promise<ProviderDevice> {
    try {
      const client = await ConnectApiClient.forUser(env, userId);
      if (!client) {
        return EMPTY_DEVICE;
      }

      const data = await client.get<LastUsedResponse>('/device-service/deviceservice/mylastused');
      const deviceName =
        typeof data.lastUsedDeviceName === 'string' && data.lastUsedDeviceName.length > 0
          ? data.lastUsedDeviceName
          : null;
      return { deviceName, lastUploadAt: parseGarminUploadTime(data.lastUsedDeviceUploadTime) };
    } catch {
      return EMPTY_DEVICE;
    }
  },

  async fetchDailyMetrics(env: Env, userId: string, dates: string[]): Promise<DailyMetric[]> {
    const client = await ConnectApiClient.forUser(env, userId);
    if (!client) {
      throw new GarminError({
        phase: 'login',
        message: 'No hay una cuenta de Garmin vinculada. Conéctala primero.',
        statusCode: 409,
      });
    }

    const displayName = await client.getDisplayName();
    const metrics: DailyMetric[] = [];
    for (const date of dates) {
      metrics.push(await fetchDayMetrics(client, displayName, date));
    }
    return metrics;
  },
};
