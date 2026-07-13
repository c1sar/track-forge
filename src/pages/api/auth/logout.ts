import type { APIRoute } from 'astro';

import { destroySession } from '@/features/auth/lib/session';
import { getEnv } from '@/shared/lib/env';
import { jsonOk, toErrorResponse } from '@/shared/lib/errors';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  try {
    const env = getEnv();
    await destroySession(env.APP_KV, context.cookies);
    return jsonOk({});
  } catch (error) {
    return toErrorResponse(error);
  }
};
