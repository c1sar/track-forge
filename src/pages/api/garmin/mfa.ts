import type { APIRoute } from 'astro';

import { requireUser } from '@/features/auth/lib/guard';
import { resumeGarminConnection } from '@/features/garmin-connect/lib/connect-service';
import { mfaRequestSchema } from '@/features/garmin-connect/schemas';
import { syncUserMetrics } from '@/features/sync/lib/sync-service';
import { getEnv, getExecutionContext } from '@/shared/lib/env';
import { jsonOk, toErrorResponse } from '@/shared/lib/errors';
import { parseJsonBody } from '@/shared/lib/validation';

export const prerender = false;

const INITIAL_SYNC_DAYS = 14;

export const POST: APIRoute = async (context) => {
  try {
    const user = requireUser(context);
    const env = getEnv();
    const { mfaSessionId, mfaCode } = await parseJsonBody(context.request, mfaRequestSchema);

    const result = await resumeGarminConnection(env, user.id, mfaSessionId, mfaCode);

    const executionCtx = getExecutionContext(context);
    const syncPromise = syncUserMetrics(env, user.id, { days: INITIAL_SYNC_DAYS }).catch(
      () => undefined,
    );
    if (executionCtx) {
      executionCtx.waitUntil(syncPromise);
    }

    return jsonOk({ status: result.status, displayName: result.displayName });
  } catch (error) {
    return toErrorResponse(error);
  }
};
