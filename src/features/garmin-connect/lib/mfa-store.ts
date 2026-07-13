import type { MfaSessionState } from './sso';
import { GarminError } from './types';

// Estado MFA pendiente en KV (no en memoria) para que funcione entre isolates.
// Se vincula al userId para impedir que otro usuario reanude una sesión ajena.

const MFA_TTL_SECONDS = 300;

function mfaKey(mfaSessionId: string): string {
  return `mfa:pending:${mfaSessionId}`;
}

interface StoredMfa {
  userId: string;
  state: MfaSessionState;
}

export async function storeMfaState(
  env: Env,
  userId: string,
  state: MfaSessionState,
): Promise<string> {
  const mfaSessionId = crypto.randomUUID();
  const record: StoredMfa = { userId, state };
  await env.APP_KV.put(mfaKey(mfaSessionId), JSON.stringify(record), {
    expirationTtl: MFA_TTL_SECONDS,
  });
  return mfaSessionId;
}

export async function consumeMfaState(
  env: Env,
  mfaSessionId: string,
  userId: string,
): Promise<MfaSessionState> {
  const raw = await env.APP_KV.get(mfaKey(mfaSessionId));
  if (!raw) {
    throw new GarminError({
      phase: 'login',
      message: 'La sesión MFA expiró. Vuelve a iniciar la conexión con Garmin.',
      statusCode: 401,
    });
  }

  const record = JSON.parse(raw) as StoredMfa;
  if (record.userId !== userId) {
    throw new GarminError({
      phase: 'login',
      message: 'Sesión MFA no válida para este usuario.',
      statusCode: 403,
    });
  }

  await env.APP_KV.delete(mfaKey(mfaSessionId));
  return record.state;
}
