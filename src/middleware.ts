import { defineMiddleware } from 'astro:middleware';

import { readSession } from '@/features/auth/lib/session';
import { getEnv } from '@/shared/lib/env';

const PROTECTED_PREFIXES = ['/dashboard', '/connect'];
const GUEST_ONLY_PATHS = ['/login', '/register'];

export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.currentUser = null;

  try {
    const env = getEnv();
    context.locals.currentUser = await readSession(env.APP_KV, context.cookies);
  } catch {
    context.locals.currentUser = null;
  }

  const { pathname } = context.url;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected && !context.locals.currentUser) {
    return context.redirect('/login');
  }

  if (GUEST_ONLY_PATHS.includes(pathname) && context.locals.currentUser) {
    return context.redirect('/dashboard');
  }

  return next();
});
