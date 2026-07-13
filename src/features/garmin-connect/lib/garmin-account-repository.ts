export interface GarminAccountRow {
  user_id: string;
  display_name: string | null;
  token_kv_key: string;
  connected_at: string;
  last_sync_at: string | null;
}

/** Acceso a la tabla `garmin_accounts` en D1 (metadatos, nunca tokens). */
export class GarminAccountRepository {
  constructor(private readonly db: D1Database) {}

  async findByUserId(userId: string): Promise<GarminAccountRow | null> {
    return this.db
      .prepare(
        'SELECT user_id, display_name, token_kv_key, connected_at, last_sync_at FROM garmin_accounts WHERE user_id = ?',
      )
      .bind(userId)
      .first<GarminAccountRow>();
  }

  async upsert(input: {
    userId: string;
    displayName: string | null;
    tokenKvKey: string;
  }): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO garmin_accounts (user_id, display_name, token_kv_key, connected_at, last_sync_at)
         VALUES (?, ?, ?, ?, NULL)
         ON CONFLICT(user_id) DO UPDATE SET
           display_name = excluded.display_name,
           token_kv_key = excluded.token_kv_key,
           connected_at = excluded.connected_at`,
      )
      .bind(input.userId, input.displayName, input.tokenKvKey, new Date().toISOString())
      .run();
  }

  async updateLastSync(userId: string, syncedAt: string): Promise<void> {
    await this.db
      .prepare('UPDATE garmin_accounts SET last_sync_at = ? WHERE user_id = ?')
      .bind(syncedAt, userId)
      .run();
  }

  async delete(userId: string): Promise<void> {
    await this.db.prepare('DELETE FROM garmin_accounts WHERE user_id = ?').bind(userId).run();
  }
}
