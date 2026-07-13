/**
 * Error de aplicación con código HTTP asociado. Se usa en toda la capa de
 * dominio para propagar fallos de forma tipada hasta los endpoints.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(message: string, statusCode = 500, code = 'internal_error') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export interface ApiErrorBody {
  ok: false;
  code: string;
  message: string;
}

/** Serializa cualquier error a una respuesta JSON segura (sin filtrar internals). */
export function toErrorResponse(error: unknown): Response {
  if (error instanceof AppError) {
    return jsonError(error.message, error.statusCode, error.code);
  }

  return jsonError('Ha ocurrido un error inesperado.', 500, 'internal_error');
}

export function jsonError(message: string, statusCode = 400, code = 'bad_request'): Response {
  const body: ApiErrorBody = { ok: false, code, message };
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function jsonOk<T>(data: T, statusCode = 200): Response {
  return new Response(JSON.stringify({ ok: true, ...data }), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' },
  });
}
