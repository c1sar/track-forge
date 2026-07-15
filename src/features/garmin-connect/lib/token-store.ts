import {
  deleteProviderTokens,
  loadProviderTokens,
  providerTokenKey,
  saveProviderTokens,
} from '@/shared/lib/token-vault';

import type { GarminAuthTokens } from './sso';

// Fachada tipada sobre la bóveda genérica (`shared/lib/token-vault`) para los
// tokens OAuth de Garmin. La clave KV resultante (`garmin_tokens:<userId>`) es
// idéntica al esquema histórico: no requiere migración.

const PROVIDER = 'garmin';

export function tokenKvKey(userId: string): string {
  return providerTokenKey(PROVIDER, userId);
}

export async function saveTokens(
  env: Env,
  userId: string,
  tokens: GarminAuthTokens,
): Promise<void> {
  await saveProviderTokens(env, PROVIDER, userId, tokens);
}

export async function loadTokens(env: Env, userId: string): Promise<GarminAuthTokens | null> {
  return loadProviderTokens<GarminAuthTokens>(env, PROVIDER, userId);
}

export async function deleteTokens(env: Env, userId: string): Promise<void> {
  await deleteProviderTokens(env, PROVIDER, userId);
}
