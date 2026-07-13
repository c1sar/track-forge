import { z } from 'zod';

export const credentialsSchema = z.object({
  email: z.email('Introduce un email válido').trim().min(1, 'El email es obligatorio'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(200, 'La contraseña es demasiado larga'),
});

export type CredentialsInput = z.infer<typeof credentialsSchema>;

export const authResponseSchema = z.object({
  ok: z.literal(true),
  user: z.object({ id: z.string(), email: z.string() }),
});

export type AuthResponse = z.infer<typeof authResponseSchema>;
