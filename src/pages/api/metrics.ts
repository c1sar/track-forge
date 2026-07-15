import type { APIRoute } from 'astro';

import { requireUser } from '@/features/auth/lib/guard';
import { UserRepository } from '@/features/auth/lib/user-repository';
import { getMetrics, resolveRange } from '@/features/metrics/lib/metrics-service';
import { getEnv } from '@/shared/lib/env';
import { jsonOk, toErrorResponse } from '@/shared/lib/errors';
import { resolveServerTimeZone } from '@/shared/lib/timezone';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  try {
    const user = requireUser(context);
    const env = getEnv();

    const params = new URL(context.request.url).searchParams;
    const storedTz = await new UserRepository(env.DB).getTimezone(user.id);
    const tz = resolveServerTimeZone(storedTz, params.get('tz'));
    const range = resolveRange(params.get('from'), params.get('to'), tz);
    const metrics = await getMetrics(env, user.id, range);

    return jsonOk({ range, metrics });
  } catch (error) {
    return toErrorResponse(error);
  }
};
