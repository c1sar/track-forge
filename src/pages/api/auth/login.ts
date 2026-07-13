import type { APIRoute } from 'astro';

import { authenticateUser } from '@/features/auth/lib/auth-service';
import { createSession } from '@/features/auth/lib/session';
import { credentialsSchema } from '@/features/auth/schemas';
import { getEnv } from '@/shared/lib/env';
import { jsonOk, toErrorResponse } from '@/shared/lib/errors';
import { parseJsonBody } from '@/shared/lib/validation';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  try {
    const env = getEnv();
    const credentials = await parseJsonBody(context.request, credentialsSchema);
    const user = await authenticateUser(env.DB, credentials);
    await createSession(env.APP_KV, context.cookies, user);
    return jsonOk({ user });
  } catch (error) {
    return toErrorResponse(error);
  }
};
