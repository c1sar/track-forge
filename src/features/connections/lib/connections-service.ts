import { UserRepository } from '@/features/auth/lib/user-repository';

import type { ProviderConnection, ProviderDevice } from './provider';
import { getProviderOrThrow } from './registry';

/**
 * Servicio genérico sobre el contrato `HealthDataProvider`: resuelve el
 * proveedor por id (validado contra el registry) y añade los concerns de la
 * app que no pertenecen a ningún proveedor (p.ej. timezone del usuario).
 */

/** Estado de vinculación + timezone efectiva del usuario (concern de app). */
export interface ConnectionStatus extends ProviderConnection {
  /** Zona horaria IANA guardada por el usuario (override). `null` => navegador. */
  timezone: string | null;
}

const EMPTY_DEVICE: ProviderDevice = { deviceName: null, lastUploadAt: null };

export async function getConnectionStatus(
  env: Env,
  userId: string,
  providerId: string,
): Promise<ConnectionStatus> {
  const provider = getProviderOrThrow(providerId);
  const [connection, timezone] = await Promise.all([
    provider.getConnection(env, userId),
    new UserRepository(env.DB).getTimezone(userId),
  ]);
  return { ...connection, timezone };
}

/** Info del dispositivo físico; nulls si el proveedor no la soporta. */
export async function getDeviceStatus(
  env: Env,
  userId: string,
  providerId: string,
): Promise<ProviderDevice> {
  const provider = getProviderOrThrow(providerId);
  if (!provider.getDevice) {
    return EMPTY_DEVICE;
  }
  return provider.getDevice(env, userId);
}

export async function disconnectProvider(
  env: Env,
  userId: string,
  providerId: string,
): Promise<void> {
  await getProviderOrThrow(providerId).disconnect(env, userId);
}
