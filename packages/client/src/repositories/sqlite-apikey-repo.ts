/**
 * API Key Repository - SQLite 实现
 */

import { SqliteRepository } from './sqlite-adapter';
import { IApiKeyRepository, ApiKey } from './interfaces';

export class SqliteApiKeyRepository extends SqliteRepository implements IApiKeyRepository {
  protected async createTables(): Promise<void> {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        provider TEXT NOT NULL,
        key_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_used_at TEXT
      )
    `);

    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_api_keys_user_id
      ON api_keys(user_id)
    `);
  }

  async create(apiKey: Omit<ApiKey, 'id' | 'createdAt' | 'updatedAt' | 'lastUsedAt'>): Promise<ApiKey> {
    const id = this.generateId();
    const now = this.now();

    await this.execute(
      'INSERT INTO api_keys (id, user_id, provider, key_hash, name, is_active, created_at, updated_at, last_used_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, apiKey.userId, apiKey.provider, apiKey.keyHash, apiKey.name, apiKey.isActive ? 1 : 0, now, now, null]
    );

    return {
      ...apiKey,
      id,
      createdAt: new Date(now),
      updatedAt: new Date(now),
      lastUsedAt: null,
    };
  }

  async findById(id: string): Promise<ApiKey | null> {
    const results = await this.query('SELECT * FROM api_keys WHERE id = ?', [id]);
    if (!results || results.length === 0) return null;
    return this.mapToApiKey(results[0]);
  }

  async findByUserId(userId: string): Promise<ApiKey[]> {
    const results = await this.query('SELECT * FROM api_keys WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    return results.map(row => this.mapToApiKey(row));
  }

  async findActiveByUserId(userId: string): Promise<ApiKey[]> {
    const results = await this.query(
      'SELECT * FROM api_keys WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC',
      [userId]
    );
    return results.map(row => this.mapToApiKey(row));
  }

  async update(id: string, updates: Partial<ApiKey>): Promise<ApiKey> {
    const existing = await this.findById(id);
    if (!existing) throw new Error(`ApiKey ${id} not found`);

    const now = this.now();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }

    if (updates.isActive !== undefined) {
      fields.push('is_active = ?');
      values.push(updates.isActive ? 1 : 0);
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await this.execute(`UPDATE api_keys SET ${fields.join(', ')} WHERE id = ?`, values);

    return { ...existing, ...updates, updatedAt: new Date(now) };
  }

  async markAsUsed(id: string): Promise<ApiKey> {
    const now = this.now();
    await this.execute('UPDATE api_keys SET last_used_at = ?, updated_at = ? WHERE id = ?', [now, now, id]);
    
    const updated = await this.findById(id);
    if (!updated) throw new Error(`ApiKey ${id} not found`);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.execute('DELETE FROM api_keys WHERE id = ?', [id]);
  }

  private mapToApiKey(row: any): ApiKey {
    return {
      id: row.id,
      userId: row.user_id,
      provider: row.provider,
      keyHash: row.key_hash,
      name: row.name,
      isActive: row.is_active === 1,
      createdAt: this.unmapDate(row.created_at),
      updatedAt: this.unmapDate(row.updated_at),
      lastUsedAt: row.last_used_at ? this.unmapDate(row.last_used_at) : null,
    };
  }
}
