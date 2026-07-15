export interface LinkedAccountRow {
  user_id: string;
  provider: string;
  display_name: string | null;
  token_kv_key: string;
  connected_at: string;
  last_sync_at: string | null;
}

/**
 * Acceso a la tabla `linked_accounts` en D1: metadatos de la cuenta vinculada
 * de cada proveedor (una fila por usuario+proveedor). Los tokens NUNCA viven
 * aquí: `token_kv_key` solo referencia la entrada cifrada en KV.
 */
export class LinkedAccountRepository {
  constructor(private readonly db: D1Database) {}

  async findByUser(userId: string, provider: string): Promise<LinkedAccountRow | null> {
    return this.db
      .prepare(
        `SELECT user_id, provider, display_name, token_kv_key, connected_at, last_sync_at
         FROM linked_accounts WHERE user_id = ? AND provider = ?`,
      )
      .bind(userId, provider)
      .first<LinkedAccountRow>();
  }

  async listByUser(userId: string): Promise<LinkedAccountRow[]> {
    const result = await this.db
      .prepare(
        `SELECT user_id, provider, display_name, token_kv_key, connected_at, last_sync_at
         FROM linked_accounts WHERE user_id = ? ORDER BY provider`,
      )
      .bind(userId)
      .all<LinkedAccountRow>();
    return result.results ?? [];
  }

  async upsert(input: {
    userId: string;
    provider: string;
    displayName: string | null;
    tokenKvKey: string;
  }): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO linked_accounts (user_id, provider, display_name, token_kv_key, connected_at, last_sync_at)
         VALUES (?, ?, ?, ?, ?, NULL)
         ON CONFLICT(user_id, provider) DO UPDATE SET
           display_name = excluded.display_name,
           token_kv_key = excluded.token_kv_key,
           connected_at = excluded.connected_at`,
      )
      .bind(
        input.userId,
        input.provider,
        input.displayName,
        input.tokenKvKey,
        new Date().toISOString(),
      )
      .run();
  }

  async updateLastSync(userId: string, provider: string, syncedAt: string): Promise<void> {
    await this.db
      .prepare('UPDATE linked_accounts SET last_sync_at = ? WHERE user_id = ? AND provider = ?')
      .bind(syncedAt, userId, provider)
      .run();
  }

  async delete(userId: string, provider: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM linked_accounts WHERE user_id = ? AND provider = ?')
      .bind(userId, provider)
      .run();
  }
}
