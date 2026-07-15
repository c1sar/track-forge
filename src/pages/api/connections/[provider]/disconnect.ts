import type { APIRoute } from 'astro';

import { requireUser } from '@/features/auth/lib/guard';
import { disconnectProvider } from '@/features/connections/lib/connections-service';
import { getEnv } from '@/shared/lib/env';
import { jsonOk, toErrorResponse } from '@/shared/lib/errors';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  try {
    const user = requireUser(context);
    const env = getEnv();
    await disconnectProvider(env, user.id, context.params.provider ?? '');
    return jsonOk({});
  } catch (error) {
    return toErrorResponse(error);
  }
};
