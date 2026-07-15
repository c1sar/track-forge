import { LinkedAccountRepository } from '@/features/connections/lib/linked-account-repository';

import { ConnectApiClient } from './connect-api-client';
import { consumeMfaState, storeMfaState } from './mfa-store';
import { type GarminAuthTokens, resumeLoginWithMfa, startLogin } from './sso';
import { saveTokens, tokenKvKey } from './token-store';
import { GarminMfaRequiredError } from './types';

/**
 * Flujo de vinculación (link flow) de Garmin: login SSO con credenciales,
 * verificación MFA opcional y persistencia de tokens cifrados + metadatos.
 * El estado/desconexión viven en el adapter `garmin-provider`.
 */

export interface ConnectResult {
  status: 'connected';
  displayName: string | null;
}

const PROVIDER_ID = 'garmin';

const MFA_PROMPT =
  'Garmin requiere verificación MFA. Revisa tu email o app authenticator e introduce el código de 6 dígitos.';

/** Guarda tokens cifrados y actualiza los metadatos de la cuenta vinculada. */
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

  await new LinkedAccountRepository(env.DB).upsert({
    userId,
    provider: PROVIDER_ID,
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
