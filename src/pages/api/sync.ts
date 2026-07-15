import type { APIRoute } from 'astro';
import { z } from 'zod';

import { requireUser } from '@/features/auth/lib/guard';
import { isProviderId } from '@/features/connections/lib/registry';
import { MAX_SYNC_DAYS, syncUserMetrics } from '@/features/sync/lib/sync-service';
import { getEnv } from '@/shared/lib/env';
import { jsonError, jsonOk, toErrorResponse } from '@/shared/lib/errors';
import { isValidIsoDate, isValidTimeZone } from '@/shared/lib/timezone';

export const prerender = false;

const isoDate = z
  .string()
  .refine((value) => isValidIsoDate(value), { message: 'Fecha invalida (YYYY-MM-DD).' });

const syncBodySchema = z
  .object({
    provider: z
      .string()
      .refine((value) => isProviderId(value), { message: 'Proveedor no soportado.' })
      .optional(),
    from: isoDate.optional(),
    to: isoDate.optional(),
    days: z.number().int().min(1).max(MAX_SYNC_DAYS).optional(),
    tz: z
      .string()
      .refine((value) => isValidTimeZone(value), { message: 'Zona horaria invalida.' })
      .optional(),
  })
  .refine((body) => (body.from == null) === (body.to == null), {
    message: 'Debes enviar `from` y `to` juntos.',
  });

export const POST: APIRoute = async (context) => {
  try {
    const user = requireUser(context);
    const env = getEnv();

    // Acepta body JSON (nuevo) o `?days=` (compat).
    let body: z.infer<typeof syncBodySchema> = {};
    const raw = await context.request.text();
    if (raw.trim().length > 0) {
      let json: unknown;
      try {
        json = JSON.parse(raw);
      } catch {
        return jsonError('El cuerpo debe ser JSON válido.', 400, 'invalid_json');
      }
      const parsed = syncBodySchema.safeParse(json);
      if (!parsed.success) {
        return jsonError(
          parsed.error.issues[0]?.message ?? 'Datos inválidos.',
          400,
          'validation_error',
        );
      }
      body = parsed.data;
    }

    const daysParam = Number(new URL(context.request.url).searchParams.get('days'));
    const days = body.days ?? (Number.isFinite(daysParam) && daysParam > 0 ? daysParam : undefined);

    const result = await syncUserMetrics(env, user.id, {
      provider: body.provider,
      from: body.from,
      to: body.to,
      days,
      clientTz: body.tz,
    });
    return jsonOk({ result });
  } catch (error) {
    return toErrorResponse(error);
  }
};
