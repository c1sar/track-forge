import type { APIRoute } from 'astro';

import { requireUser } from '@/features/auth/lib/guard';
import { UserRepository } from '@/features/auth/lib/user-repository';
import { isProviderId } from '@/features/connections/lib/registry';
import { getMetrics, resolveRange } from '@/features/metrics/lib/metrics-service';
import { getEnv } from '@/shared/lib/env';
import { jsonError, jsonOk, toErrorResponse } from '@/shared/lib/errors';
import { resolveServerTimeZone } from '@/shared/lib/timezone';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  try {
    const user = requireUser(context);
    const env = getEnv();

    const params = new URL(context.request.url).searchParams;
    // `source` opcional: filtra por integración; sin él, vista fusionada.
    const source = params.get('source') ?? undefined;
    if (source && !isProviderId(source)) {
      return jsonError('Proveedor no soportado.', 400, 'unknown_provider');
    }
    const storedTz = await new UserRepository(env.DB).getTimezone(user.id);
    const tz = resolveServerTimeZone(storedTz, params.get('tz'));
    const range = resolveRange(params.get('from'), params.get('to'), tz);
    const metrics = await getMetrics(env, user.id, range, source);

    return jsonOk({ range, metrics });
  } catch (error) {
    return toErrorResponse(error);
  }
};
