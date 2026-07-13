import { decryptJson, encryptJson } from '@/shared/lib/crypto';
import { requireSecret } from '@/shared/lib/env';

import type { GarminAuthTokens } from './sso';

// Tokens OAuth cifrados con AES-GCM en KV, uno por usuario.

export function tokenKvKey(userId: string): string {
  return `garmin_tokens:${userId}`;
}

export async function saveTokens(
  env: Env,
  userId: string,
  tokens: GarminAuthTokens,
): Promise<void> {
  const key = requireSecret(env, 'TOKEN_ENCRYPTION_KEY');
  await env.APP_KV.put(tokenKvKey(userId), await encryptJson(tokens, key));
}

export async function loadTokens(env: Env, userId: string): Promise<GarminAuthTokens | null> {
  const raw = await env.APP_KV.get(tokenKvKey(userId));
  if (!raw) {
    return null;
  }
  const key = requireSecret(env, 'TOKEN_ENCRYPTION_KEY');
  return decryptJson<GarminAuthTokens>(raw, key);
}

export async function deleteTokens(env: Env, userId: string): Promise<void> {
  await env.APP_KV.delete(tokenKvKey(userId));
}
