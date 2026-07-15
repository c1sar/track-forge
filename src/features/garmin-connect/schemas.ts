import { z } from 'zod';

/** Credenciales de Garmin Connect (paso 1 de la vinculación). */
export const connectRequestSchema = z.object({
  email: z
    .email('Introduce un email válido de Garmin Connect')
    .trim()
    .min(1, 'El email es obligatorio'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

/** Código MFA (paso 2). */
export const mfaRequestSchema = z.object({
  mfaSessionId: z.string().min(1, 'La sesión MFA es obligatoria'),
  mfaCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'El código MFA debe tener exactamente 6 dígitos'),
});

export type ConnectRequest = z.infer<typeof connectRequestSchema>;
export type MfaRequest = z.infer<typeof mfaRequestSchema>;

export interface ConnectionStatus {
  connected: boolean;
  displayName: string | null;
  lastSyncAt: string | null;
  /** Zona horaria IANA guardada por el usuario (override). `null` => usar la del navegador. */
  timezone: string | null;
}
