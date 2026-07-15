import { UserRepository } from '@/features/auth/lib/user-repository';

import type { ConnectionStatus, DeviceLastSync } from '../schemas';
import { ConnectApiClient } from './connect-api-client';
import { GarminAccountRepository } from './garmin-account-repository';
import { consumeMfaState, storeMfaState } from './mfa-store';
import { type GarminAuthTokens, resumeLoginWithMfa, startLogin } from './sso';
import { deleteTokens, saveTokens, tokenKvKey } from './token-store';
import { GarminMfaRequiredError } from './types';

export interface ConnectResult {
  status: 'connected';
  displayName: string | null;
}

const MFA_PROMPT =
  'Garmin requiere verificación MFA. Revisa tu email o app authenticator e introduce el código de 6 dígitos.';

/** Guarda tokens cifrados y actualiza los metadatos de la cuenta Garmin. */
async function persistConnection(
  env: Env,
  userId: string,
  tokens: GarminAuthTokens,
): Promise<string | null> {
  await saveTokens(env, userId, tokens);

  const client = ConnectApiClient.fromTokens(env, userId, tokens);
  let displayName: string | null = null;
  try {
    displayName = await client.getDisplayName();
  } catch {
    // El perfil no es crítico para completar la vinculación.
  }

  await new GarminAccountRepository(env.DB).upsert({
    userId,
    displayName,
    tokenKvKey: tokenKvKey(userId),
  });

  return displayName;
}

/** Paso 1: login con credenciales Garmin. Lanza MFA si es necesario. */
export async function startGarminConnection(
  env: Env,
  userId: string,
  credentials: { email: string; password: string },
): Promise<ConnectResult> {
  const result = await startLogin(credentials.email, credentials.password);

  if (result.status === 'mfa') {
    const mfaSessionId = await storeMfaState(env, userId, result.state);
    throw new GarminMfaRequiredError(mfaSessionId, MFA_PROMPT);
  }

  const displayName = await persistConnection(env, userId, result.tokens);
  return { status: 'connected', displayName };
}

/** Paso 2: verifica el código MFA y completa la vinculación. */
export async function resumeGarminConnection(
  env: Env,
  userId: string,
  mfaSessionId: string,
  mfaCode: string,
): Promise<ConnectResult> {
  const state = await consumeMfaState(env, mfaSessionId, userId);
  const tokens = await resumeLoginWithMfa(state, mfaCode);
  const displayName = await persistConnection(env, userId, tokens);
  return { status: 'connected', displayName };
}

export async function getConnectionStatus(env: Env, userId: string): Promise<ConnectionStatus> {
  const [account, timezone] = await Promise.all([
    new GarminAccountRepository(env.DB).findByUserId(userId),
    new UserRepository(env.DB).getTimezone(userId),
  ]);

  if (!account) {
    return { connected: false, displayName: null, lastSyncAt: null, timezone };
  }
  return {
    connected: true,
    displayName: account.display_name,
    lastSyncAt: account.last_sync_at,
    timezone,
  };
}

export async function disconnectGarmin(env: Env, userId: string): Promise<void> {
  await deleteTokens(env, userId);
  await new GarminAccountRepository(env.DB).delete(userId);
}

interface LastUsedResponse {
  lastUsedDeviceName?: string | null;
  lastUsedDeviceUploadTime?: number | { gmt?: number | null } | null;
}

const EMPTY_DEVICE_SYNC: DeviceLastSync = { deviceName: null, lastUploadAt: null };

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

/**
 * Consulta cuando el reloj/dispositivo subio datos a Garmin Connect por ultima vez.
 * Tolerante a fallos: nunca lanza; devuelve nulls si no hay datos o la API falla.
 */
export async function getDeviceLastSync(env: Env, userId: string): Promise<DeviceLastSync> {
  try {
    const client = await ConnectApiClient.forUser(env, userId);
    if (!client) {
      return EMPTY_DEVICE_SYNC;
    }

    const data = await client.get<LastUsedResponse>('/device-service/deviceservice/mylastused');
    const deviceName =
      typeof data.lastUsedDeviceName === 'string' && data.lastUsedDeviceName.length > 0
        ? data.lastUsedDeviceName
        : null;
    const lastUploadAt = parseGarminUploadTime(data.lastUsedDeviceUploadTime);

    return { deviceName, lastUploadAt };
  } catch {
    return EMPTY_DEVICE_SYNC;
  }
}
