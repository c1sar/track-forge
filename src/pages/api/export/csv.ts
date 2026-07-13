import type { APIRoute } from 'astro';

import { requireUser } from '@/features/auth/lib/guard';
import { buildMetricsCsv, csvFileName } from '@/features/export/lib/csv';
import { getMetrics, resolveRange } from '@/features/metrics/lib/metrics-service';
import { getEnv } from '@/shared/lib/env';
import { toErrorResponse } from '@/shared/lib/errors';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  try {
    const user = requireUser(context);
    const env = getEnv();

    const params = new URL(context.request.url).searchParams;
    const range = resolveRange(params.get('from'), params.get('to'));
    const metrics = await getMetrics(env, user.id, range);
    const csv = buildMetricsCsv(metrics);

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${csvFileName(range.from, range.to)}"`,
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
};
