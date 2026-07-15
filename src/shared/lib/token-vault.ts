import { decryptJson, encryptJson } from './crypto';
import { requireSecret } from './env';

/**
 * Bóveda genérica de secretos por proveedor, cifrados con AES-256-GCM en KV.
 *
 * Cada integración persiste aquí su payload de sesión (forma libre `T`), nunca
 * en D1. La clave sigue el patrón `${provider}_tokens:${userId}`, idéntico al
 * esquema histórico de Garmin (`garmin_tokens:<userId>`), por lo que no
 * requiere migrar entradas existentes.
 *
 * El mismo patrón sirve para otros secretos de usuario (p.ej. API keys BYOK
 * para modelos de AI premium) usando otro prefijo de proveedor.
 */
export function providerTokenKey(provider: string, userId: string): string {
  return `${provider}_tokens:${userId}`;
}

export async function saveProviderTokens<T>(
  env: Env,
  provider: string,
  userId: string,
  tokens: T,
): Promise<void> {
  const key = requireSecret(env, 'TOKEN_ENCRYPTION_KEY');
  await env.APP_KV.put(providerTokenKey(provider, userId), await encryptJson(tokens, key));
}

export async function loadProviderTokens<T>(
  env: Env,
  provider: string,
  userId: string,
): Promise<T | null> {
  const raw = await env.APP_KV.get(providerTokenKey(provider, userId));
  if (!raw) {
    return null;
  }
  const key = requireSecret(env, 'TOKEN_ENCRYPTION_KEY');
  return decryptJson<T>(raw, key);
}

export async function deleteProviderTokens(
  env: Env,
  provider: string,
  userId: string,
): Promise<void> {
  await env.APP_KV.delete(providerTokenKey(provider, userId));
}
