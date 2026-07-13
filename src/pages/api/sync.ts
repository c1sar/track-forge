import type { APIRoute } from 'astro';

import { requireUser } from '@/features/auth/lib/guard';
import { DEFAULT_SYNC_DAYS, syncUserMetrics } from '@/features/sync/lib/sync-service';
import { getEnv } from '@/shared/lib/env';
import { jsonOk, toErrorResponse } from '@/shared/lib/errors';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  try {
    const user = requireUser(context);
    const env = getEnv();

    const daysParam = Number(new URL(context.request.url).searchParams.get('days'));
    const days = Number.isFinite(daysParam) && daysParam > 0 ? daysParam : DEFAULT_SYNC_DAYS;

    const result = await syncUserMetrics(env, user.id, days);
    return jsonOk({ result });
  } catch (error) {
    return toErrorResponse(error);
  }
};
