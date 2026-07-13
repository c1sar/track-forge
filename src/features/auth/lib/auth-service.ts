import { AppError } from '@/shared/lib/errors';

import type { CredentialsInput } from '../schemas';
import { hashPassword, verifyPassword } from './password';
import type { SessionUser } from './types';
import { UserRepository } from './user-repository';

/** Registra un usuario nuevo. Falla si el email ya existe. */
export async function registerUser(
  db: D1Database,
  credentials: CredentialsInput,
): Promise<SessionUser> {
  const repository = new UserRepository(db);
  const email = credentials.email.toLowerCase();

  const existing = await repository.findByEmail(email);
  if (existing) {
    throw new AppError('Ya existe una cuenta con ese email.', 409, 'email_taken');
  }

  const passwordHash = await hashPassword(credentials.password);
  const user = await repository.create({ email, passwordHash });

  return { id: user.id, email: user.email };
}

/** Verifica credenciales y devuelve el usuario, o falla con 401. */
export async function authenticateUser(
  db: D1Database,
  credentials: CredentialsInput,
): Promise<SessionUser> {
  const repository = new UserRepository(db);
  const email = credentials.email.toLowerCase();

  const user = await repository.findByEmail(email);
  if (!user) {
    throw new AppError('Email o contraseña incorrectos.', 401, 'invalid_credentials');
  }

  const valid = await verifyPassword(credentials.password, user.password_hash);
  if (!valid) {
    throw new AppError('Email o contraseña incorrectos.', 401, 'invalid_credentials');
  }

  return { id: user.id, email: user.email };
}
