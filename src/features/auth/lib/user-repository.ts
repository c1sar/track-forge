import type { UserRow } from './types';

/** Acceso a la tabla `users` en D1. */
export class UserRepository {
  constructor(private readonly db: D1Database) {}

  async findByEmail(email: string): Promise<UserRow | null> {
    return this.db
      .prepare('SELECT id, email, password_hash, created_at, timezone FROM users WHERE email = ?')
      .bind(email)
      .first<UserRow>();
  }

  async findById(id: string): Promise<UserRow | null> {
    return this.db
      .prepare('SELECT id, email, password_hash, created_at, timezone FROM users WHERE id = ?')
      .bind(id)
      .first<UserRow>();
  }

  async create(input: { email: string; passwordHash: string }): Promise<UserRow> {
    const row: UserRow = {
      id: crypto.randomUUID(),
      email: input.email,
      password_hash: input.passwordHash,
      created_at: new Date().toISOString(),
      timezone: null,
    };

    await this.db
      .prepare('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)')
      .bind(row.id, row.email, row.password_hash, row.created_at)
      .run();

    return row;
  }

  async updateTimezone(userId: string, timezone: string | null): Promise<void> {
    await this.db
      .prepare('UPDATE users SET timezone = ? WHERE id = ?')
      .bind(timezone, userId)
      .run();
  }

  async getTimezone(userId: string): Promise<string | null> {
    const row = await this.db
      .prepare('SELECT timezone FROM users WHERE id = ?')
      .bind(userId)
      .first<{ timezone: string | null }>();
    return row?.timezone ?? null;
  }
}
