import { env } from 'cloudflare:workers';
import type { APIContext } from 'astro';

import { AppError } from './errors';

/** Devuelve el entorno Cloudflare (bindings + secrets) del Worker. */
export function getEnv(): Env {
  return env as unknown as Env;
}

/** ExecutionContext para tareas en segundo plano (waitUntil), si está disponible. */
export function getExecutionContext(
  context: Pick<APIContext, 'locals'>,
): ExecutionContext | undefined {
  return context.locals.cfContext;
}

/** Lee un secreto obligatorio o falla con un error claro de configuración. */
export function requireSecret(env: Env, key: 'TOKEN_ENCRYPTION_KEY' | 'SESSION_SECRET'): string {
  const value = env[key];
  if (!value) {
    throw new AppError(
      `Falta el secreto ${key}. Configúralo en .dev.vars o con wrangler secret.`,
      500,
      'secret_missing',
    );
  }
  return value;
}
