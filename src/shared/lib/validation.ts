import type { ZodType } from 'zod';

import { AppError } from './errors';

/** Parsea el body JSON de un Request y lo valida con un schema Zod. */
export async function parseJsonBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    throw new AppError('El cuerpo debe ser JSON válido.', 400, 'invalid_json');
  }

  const result = schema.safeParse(payload);
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? 'Datos inválidos.';
    throw new AppError(message, 400, 'validation_error');
  }

  return result.data;
}
