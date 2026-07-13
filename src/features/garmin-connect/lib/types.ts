import { AppError } from '@/shared/lib/errors';

export type GarminPhase = 'init' | 'login' | 'fetch';

/** Fallo de dominio en el flujo Garmin, con la fase donde ocurrió. */
export class GarminError extends AppError {
  readonly phase: GarminPhase;
  readonly detail?: string;

  constructor(options: {
    phase: GarminPhase;
    message: string;
    detail?: string;
    statusCode?: number;
  }) {
    super(options.message, options.statusCode ?? 502, `garmin_${options.phase}`);
    this.name = 'GarminError';
    this.phase = options.phase;
    this.detail = options.detail;
  }
}

/** Garmin solicitó MFA; se devuelve un id para reanudar con el código. */
export class GarminMfaRequiredError extends AppError {
  readonly mfaSessionId: string;

  constructor(mfaSessionId: string, message: string) {
    super(message, 401, 'garmin_mfa_required');
    this.name = 'GarminMfaRequiredError';
    this.mfaSessionId = mfaSessionId;
  }
}
