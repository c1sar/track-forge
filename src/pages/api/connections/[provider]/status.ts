import type { APIRoute } from 'astro';

import { requireUser } from '@/features/auth/lib/guard';
import { getConnectionStatus } from '@/features/connections/lib/connections-service';
import { getEnv } from '@/shared/lib/env';
import { jsonOk, toErrorResponse } from '@/shared/lib/errors';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  try {
    const user = requireUser(context);
    const env = getEnv();
    const status = await getConnectionStatus(env, user.id, context.params.provider ?? '');
    return jsonOk({ connection: status });
  } catch (error) {
    return toErrorResponse(error);
  }
};
