import type { APIRoute } from 'astro';

import { requireUser } from '@/features/auth/lib/guard';
import { startGarminConnection } from '@/features/garmin-connect/lib/connect-service';
import { GarminMfaRequiredError } from '@/features/garmin-connect/lib/types';
import { connectRequestSchema } from '@/features/garmin-connect/schemas';
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
    const credentials = await parseJsonBody(context.request, connectRequestSchema);

    const result = await startGarminConnection(env, user.id, credentials);

    // Sincronización inicial en segundo plano tras vincular la cuenta.
    const executionCtx = getExecutionContext(context);
    const syncPromise = syncUserMetrics(env, user.id, { days: INITIAL_SYNC_DAYS }).catch(
      () => undefined,
    );
    if (executionCtx) {
      executionCtx.waitUntil(syncPromise);
    }

    return jsonOk({ status: result.status, displayName: result.displayName });
  } catch (error) {
    if (error instanceof GarminMfaRequiredError) {
      return new Response(
        JSON.stringify({
          ok: false,
          mfaRequired: true,
          mfaSessionId: error.mfaSessionId,
          message: error.message,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    return toErrorResponse(error);
  }
};
