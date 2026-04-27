/**
 * Session Repository - SQLite 实现
 * 
 * 管理用户会话的 CRUD 操作
 */

import { SqliteRepository } from './sqlite-adapter';
import { ISessionRepository, Session } from './interfaces';

export class SqliteSessionRepository extends SqliteRepository implements ISessionRepository {
  /**
   * 创建 sessions 表
   */
  protected async createTables(): Promise<void> {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // 创建索引以加速查询
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id
      ON sessions(user_id)
    `);

    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_sessions_updated_at
      ON sessions(updated_at DESC)
    `);
  }

  /**
   * 创建新会话
   */
  async create(session: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>): Promise<Session> {
    const id = this.generateId();
    const now = this.now();

    await this.execute(
      'INSERT INTO sessions (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [id, session.userId, session.name, now, now]
    );

    return {
      ...session,
      id,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };
  }

  /**
   * 根据 ID 查找会话
   */
  async findById(id: string): Promise<Session | null> {
    const results = await this.query('SELECT * FROM sessions WHERE id = ?', [id]);
    
    if (!results || results.length === 0) {
      return null;
    }

    return this.mapToSession(results[0]);
  }

  /**
   * 查找用户的所有会话
   */
  async findByUserId(userId: string): Promise<Session[]> {
    const results = await this.query(
      'SELECT * FROM sessions WHERE user_id = ? ORDER BY updated_at DESC',
      [userId]
    );

    return results.map(row => this.mapToSession(row));
  }

  /**
   * 更新会话
   */
  async update(id: string, updates: Partial<Session>): Promise<Session> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Session ${id} not found`);
    }

    const now = this.now();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }

    fields.push('updated_at = ?');
    values.push(now);

    values.push(id);

    await this.execute(
      `UPDATE sessions SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return {
      ...existing,
      ...updates,
      updatedAt: new Date(now),
    };
  }

  /**
   * 删除会话
   */
  async delete(id: string): Promise<void> {
    await this.execute('DELETE FROM sessions WHERE id = ?', [id]);
  }

  /**
   * 将数据库行映射为 Session 对象
   */
  private mapToSession(row: any): Session {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      createdAt: this.unmapDate(row.created_at),
      updatedAt: this.unmapDate(row.updated_at),
    };
  }
}
