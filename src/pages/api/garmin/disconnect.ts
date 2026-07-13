import type { APIRoute } from 'astro';

import { requireUser } from '@/features/auth/lib/guard';
import { disconnectGarmin } from '@/features/garmin-connect/lib/connect-service';
import { getEnv } from '@/shared/lib/env';
import { jsonOk, toErrorResponse } from '@/shared/lib/errors';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  try {
    const user = requireUser(context);
    const env = getEnv();
    await disconnectGarmin(env, user.id);
    return jsonOk({});
  } catch (error) {
    return toErrorResponse(error);
  }
};
