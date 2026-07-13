import type { APIContext } from 'astro';

import { AppError } from '@/shared/lib/errors';

import type { SessionUser } from './types';

/** Devuelve el usuario autenticado o lanza 401. Para endpoints protegidos. */
export function requireUser(context: Pick<APIContext, 'locals'>): SessionUser {
  const user = context.locals.currentUser;
  if (!user) {
    throw new AppError('Debes iniciar sesión.', 401, 'unauthorized');
  }
  return user;
}
