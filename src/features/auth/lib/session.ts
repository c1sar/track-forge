import type { AstroCookies } from 'astro';

import { bytesToBase64 } from '@/shared/lib/encoding';

import type { SessionUser } from './types';

export const SESSION_COOKIE = 'gc_session';
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const KV_PREFIX = 'session:';

interface SessionRecord extends SessionUser {
  createdAt: string;
}

function generateSessionId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return bytesToBase64(bytes).replace(/[+/=]/g, (c) => ({ '+': '-', '/': '_', '=': '' })[c] ?? c);
}

function kvKey(sessionId: string): string {
  return `${KV_PREFIX}${sessionId}`;
}

/** Crea una sesión en KV y fija la cookie httpOnly. */
export async function createSession(
  kv: KVNamespace,
  cookies: AstroCookies,
  user: SessionUser,
): Promise<void> {
  const sessionId = generateSessionId();
  const record: SessionRecord = { ...user, createdAt: new Date().toISOString() };

  await kv.put(kvKey(sessionId), JSON.stringify(record), {
    expirationTtl: SESSION_TTL_SECONDS,
  });

  cookies.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

/** Resuelve la sesión actual desde la cookie, o null si no existe/expiró. */
export async function readSession(
  kv: KVNamespace,
  cookies: AstroCookies,
): Promise<SessionUser | null> {
  const sessionId = cookies.get(SESSION_COOKIE)?.value;
  if (!sessionId) {
    return null;
  }

  const record = await kv.get<SessionRecord>(kvKey(sessionId), 'json');
  if (!record) {
    return null;
  }

  return { id: record.id, email: record.email };
}

/** Elimina la sesión de KV y borra la cookie. */
export async function destroySession(kv: KVNamespace, cookies: AstroCookies): Promise<void> {
  const sessionId = cookies.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    await kv.delete(kvKey(sessionId));
  }
  cookies.delete(SESSION_COOKIE, { path: '/' });
}
