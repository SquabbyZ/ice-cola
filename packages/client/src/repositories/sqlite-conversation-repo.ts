/**
 * Conversation Repository - SQLite 实现
 */

import { SqliteRepository } from './sqlite-adapter';
import { IConversationRepository, Conversation } from './interfaces';

export class SqliteConversationRepository extends SqliteRepository implements IConversationRepository {
  protected async createTables(): Promise<void> {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES sessions(id),
        title TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_conversations_session_id
      ON conversations(session_id)
    `);
  }

  async create(conversation: Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Conversation> {
    const id = this.generateId();
    const now = this.now();

    await this.execute(
      'INSERT INTO conversations (id, session_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [id, conversation.sessionId, conversation.title, now, now]
    );

    return {
      ...conversation,
      id,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };
  }

  async findById(id: string): Promise<Conversation | null> {
    const results = await this.query('SELECT * FROM conversations WHERE id = ?', [id]);
    if (!results || results.length === 0) return null;
    return this.mapToConversation(results[0]);
  }

  async findBySessionId(sessionId: string): Promise<Conversation[]> {
    const results = await this.query(
      'SELECT * FROM conversations WHERE session_id = ? ORDER BY updated_at DESC',
      [sessionId]
    );
    return results.map(row => this.mapToConversation(row));
  }

  async update(id: string, updates: Partial<Conversation>): Promise<Conversation> {
    const existing = await this.findById(id);
    if (!existing) throw new Error(`Conversation ${id} not found`);

    const now = this.now();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await this.execute(`UPDATE conversations SET ${fields.join(', ')} WHERE id = ?`, values);

    return { ...existing, ...updates, updatedAt: new Date(now) };
  }

  async delete(id: string): Promise<void> {
    await this.execute('DELETE FROM conversations WHERE id = ?', [id]);
  }

  private mapToConversation(row: any): Conversation {
    return {
      id: row.id,
      sessionId: row.session_id,
      title: row.title,
      createdAt: this.unmapDate(row.created_at),
      updatedAt: this.unmapDate(row.updated_at),
    };
  }
}
