/**
 * Message Repository - SQLite 实现
 */

import { SqliteRepository } from './sqlite-adapter';
import { IMessageRepository, Message } from './interfaces';

export class SqliteMessageRepository extends SqliteRepository implements IMessageRepository {
  protected async createTables(): Promise<void> {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL REFERENCES conversations(id),
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        model TEXT,
        created_at TEXT NOT NULL
      )
    `);

    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
      ON messages(conversation_id)
    `);
  }

  async create(message: Omit<Message, 'id' | 'createdAt'>): Promise<Message> {
    const id = this.generateId();
    const now = this.now();

    const modelValue = message.model === undefined ? undefined : message.model;
    await this.execute(
      'INSERT INTO messages (id, conversation_id, role, content, model, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, message.conversationId, message.role, message.content, modelValue ?? null, now]
    );

    return {
      ...message,
      model: modelValue,
      id,
      createdAt: new Date(now),
    };
  }

  async findById(id: string): Promise<Message | null> {
    const results = await this.query('SELECT * FROM messages WHERE id = ?', [id]);
    if (!results || results.length === 0) return null;
    return this.mapToMessage(results[0]);
  }

  async findByConversationId(conversationId: string, limit?: number): Promise<Message[]> {
    let sql = 'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC';
    const params: any[] = [conversationId];

    if (limit) {
      sql += ' LIMIT ?';
      params.push(limit);
    }

    const results = await this.query(sql, params);
    return results.map(row => this.mapToMessage(row));
  }

  async update(id: string, updates: Partial<Message>): Promise<Message> {
    const existing = await this.findById(id);
    if (!existing) throw new Error(`Message ${id} not found`);

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.content !== undefined) {
      fields.push('content = ?');
      values.push(updates.content);
    }

    if (updates.model !== undefined) {
      fields.push('model = ?');
      values.push(updates.model);
    }

    values.push(id);

    await this.execute(`UPDATE messages SET ${fields.join(', ')} WHERE id = ?`, values);

    return { ...existing, ...updates };
  }

  async delete(id: string): Promise<void> {
    await this.execute('DELETE FROM messages WHERE id = ?', [id]);
  }

  async deleteByConversationId(conversationId: string): Promise<number> {
    const result = await this.execute('DELETE FROM messages WHERE conversation_id = ?', [conversationId]);
    return result.rowsAffected;
  }

  private mapToMessage(row: any): Message {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      role: row.role,
      content: row.content,
      model: row.model,
      createdAt: this.unmapDate(row.created_at),
    };
  }
}
