import type { APIRoute } from 'astro';
import { z } from 'zod';

import { requireUser } from '@/features/auth/lib/guard';
import { UserRepository } from '@/features/auth/lib/user-repository';
import { getEnv } from '@/shared/lib/env';
import { jsonOk, toErrorResponse } from '@/shared/lib/errors';
import { isValidTimeZone } from '@/shared/lib/timezone';
import { parseJsonBody } from '@/shared/lib/validation';

export const prerender = false;

const updateSettingsSchema = z.object({
  timezone: z
    .string()
    .trim()
    .nullable()
    .refine((value) => value === null || value === '' || isValidTimeZone(value), {
      message: 'Zona horaria no valida.',
    })
    .transform((value) => (value === '' ? null : value)),
});

export const GET: APIRoute = async (context) => {
  try {
    const user = requireUser(context);
    const env = getEnv();
    const timezone = await new UserRepository(env.DB).getTimezone(user.id);
    return jsonOk({ settings: { timezone } });
  } catch (error) {
    return toErrorResponse(error);
  }
};

export const PUT: APIRoute = async (context) => {
  try {
    const user = requireUser(context);
    const env = getEnv();
    const { timezone } = await parseJsonBody(context.request, updateSettingsSchema);
    await new UserRepository(env.DB).updateTimezone(user.id, timezone);
    return jsonOk({ settings: { timezone } });
  } catch (error) {
    return toErrorResponse(error);
  }
};
