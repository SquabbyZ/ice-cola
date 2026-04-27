/**
 * User Repository - SQLite 实现
 * 
 * 管理用户的 CRUD 操作
 */

import { SqliteRepository } from './sqlite-adapter';
import { IUserRepository, User } from './interfaces';

export class SqliteUserRepository extends SqliteRepository implements IUserRepository {
  /**
   * 创建 users 表
   */
  protected async createTables(): Promise<void> {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        auth_type TEXT NOT NULL CHECK(auth_type IN ('local', 'wechat', 'wecom', 'dingtalk')),
        external_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
  }

  /**
   * 创建新用户
   */
  async create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const id = this.generateId();
    const now = this.now();

    await this.execute(
      'INSERT INTO users (id, auth_type, external_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [id, user.authType, user.externalId, now, now]
    );

    return {
      ...user,
      id,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };
  }

  /**
   * 根据 ID 查找用户
   */
  async findById(id: string): Promise<User | null> {
    const results = await this.query('SELECT * FROM users WHERE id = ?', [id]);
    
    if (!results || results.length === 0) {
      return null;
    }

    return this.mapToUser(results[0]);
  }

  /**
   * 查找所有用户
   */
  async findAll(): Promise<User[]> {
    const results = await this.query('SELECT * FROM users ORDER BY created_at DESC');
    return results.map(row => this.mapToUser(row));
  }

  /**
   * 更新用户信息
   */
  async update(id: string, updates: Partial<User>): Promise<User> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`User ${id} not found`);
    }

    const now = this.now();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.authType !== undefined) {
      fields.push('auth_type = ?');
      values.push(updates.authType);
    }

    if (updates.externalId !== undefined) {
      fields.push('external_id = ?');
      values.push(updates.externalId);
    }

    fields.push('updated_at = ?');
    values.push(now);

    values.push(id);

    await this.execute(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return {
      ...existing,
      ...updates,
      updatedAt: new Date(now),
    };
  }

  /**
   * 删除用户
   */
  async delete(id: string): Promise<void> {
    await this.execute('DELETE FROM users WHERE id = ?', [id]);
  }

  /**
   * 将数据库行映射为 User 对象
   */
  private mapToUser(row: any): User {
    return {
      id: row.id,
      authType: row.auth_type,
      externalId: row.external_id,
      createdAt: this.unmapDate(row.created_at),
      updatedAt: this.unmapDate(row.updated_at),
    };
  }
}
