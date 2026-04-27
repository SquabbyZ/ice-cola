/**
 * Expert Prompt Repository - SQLite 实现
 */

import { SqliteRepository } from './sqlite-adapter';
import { IExpertPromptRepository, ExpertPrompt } from './interfaces';

export class SqliteExpertPromptRepository extends SqliteRepository implements IExpertPromptRepository {
  protected async createTables(): Promise<void> {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS expert_prompts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        system_prompt TEXT NOT NULL,
        tags TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_expert_prompts_user_id
      ON expert_prompts(user_id)
    `);
  }

  async create(prompt: Omit<ExpertPrompt, 'id' | 'createdAt' | 'updatedAt'>): Promise<ExpertPrompt> {
    const id = this.generateId();
    const now = this.now();
    const tagsJson = JSON.stringify(prompt.tags);

    await this.execute(
      'INSERT INTO expert_prompts (id, user_id, name, description, system_prompt, tags, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, prompt.userId, prompt.name, prompt.description, prompt.systemPrompt, tagsJson, prompt.isActive ? 1 : 0, now, now]
    );

    return {
      ...prompt,
      id,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };
  }

  async findById(id: string): Promise<ExpertPrompt | null> {
    const results = await this.query('SELECT * FROM expert_prompts WHERE id = ?', [id]);
    if (!results || results.length === 0) return null;
    return this.mapToExpertPrompt(results[0]);
  }

  async findByUserId(userId: string): Promise<ExpertPrompt[]> {
    const results = await this.query(
      'SELECT * FROM expert_prompts WHERE user_id = ? ORDER BY updated_at DESC',
      [userId]
    );
    return results.map(row => this.mapToExpertPrompt(row));
  }

  async findActiveByUserId(userId: string): Promise<ExpertPrompt[]> {
    const results = await this.query(
      'SELECT * FROM expert_prompts WHERE user_id = ? AND is_active = 1 ORDER BY updated_at DESC',
      [userId]
    );
    return results.map(row => this.mapToExpertPrompt(row));
  }

  async searchByTags(userId: string, tags: string[]): Promise<ExpertPrompt[]> {
    // 简单实现:查找包含任一标签的 prompts
    const allPrompts = await this.findByUserId(userId);
    return allPrompts.filter(prompt => 
      tags.some(tag => prompt.tags.includes(tag))
    );
  }

  async update(id: string, updates: Partial<ExpertPrompt>): Promise<ExpertPrompt> {
    const existing = await this.findById(id);
    if (!existing) throw new Error(`ExpertPrompt ${id} not found`);

    const now = this.now();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }

    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }

    if (updates.systemPrompt !== undefined) {
      fields.push('system_prompt = ?');
      values.push(updates.systemPrompt);
    }

    if (updates.tags !== undefined) {
      fields.push('tags = ?');
      values.push(JSON.stringify(updates.tags));
    }

    if (updates.isActive !== undefined) {
      fields.push('is_active = ?');
      values.push(updates.isActive ? 1 : 0);
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await this.execute(`UPDATE expert_prompts SET ${fields.join(', ')} WHERE id = ?`, values);

    return { ...existing, ...updates, updatedAt: new Date(now) };
  }

  async delete(id: string): Promise<void> {
    await this.execute('DELETE FROM expert_prompts WHERE id = ?', [id]);
  }

  private mapToExpertPrompt(row: any): ExpertPrompt {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description,
      systemPrompt: row.system_prompt,
      tags: JSON.parse(row.tags),
      isActive: row.is_active === 1,
      createdAt: this.unmapDate(row.created_at),
      updatedAt: this.unmapDate(row.updated_at),
    };
  }
}
