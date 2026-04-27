/**
 * Usage Repository - SQLite 实现
 * 
 * 管理 API 调用用量记录的 CRUD 操作和统计分析
 */

import { SqliteRepository } from './sqlite-adapter';
import { IUsageRepository, UsageRecord } from './interfaces';

export class SqliteUsageRepository extends SqliteRepository implements IUsageRepository {
  /**
   * 创建 usage_records 表
   */
  protected async createTables(): Promise<void> {
    await this.execute(`
      CREATE TABLE IF NOT EXISTS usage_records (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        session_id TEXT NOT NULL REFERENCES sessions(id),
        conversation_id TEXT NOT NULL REFERENCES conversations(id),
        message_id TEXT NOT NULL REFERENCES messages(id),
        model TEXT NOT NULL,
        input_tokens INTEGER NOT NULL,
        output_tokens INTEGER NOT NULL,
        cost REAL NOT NULL,
        timestamp TEXT NOT NULL
      )
    `);

    // 创建复合索引以加速用户+时间范围查询
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_usage_user_timestamp
      ON usage_records(user_id, timestamp)
    `);

    // 创建索引以加速会话查询
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_usage_session_id
      ON usage_records(session_id)
    `);

    // 创建索引以加速对话查询
    await this.execute(`
      CREATE INDEX IF NOT EXISTS idx_usage_conversation_id
      ON usage_records(conversation_id)
    `);
  }

  /**
   * 记录一次 API 调用的用量
   */
  async record(usage: Omit<UsageRecord, 'id'>): Promise<UsageRecord> {
    const id = this.generateId();

    await this.execute(
      `INSERT INTO usage_records 
       (id, user_id, session_id, conversation_id, message_id, model, input_tokens, output_tokens, cost, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        usage.userId,
        usage.sessionId,
        usage.conversationId,
        usage.messageId,
        usage.model,
        usage.inputTokens,
        usage.outputTokens,
        usage.cost,
        this.mapDate(usage.timestamp),
      ]
    );

    return { ...usage, id };
  }

  /**
   * 查找用户在指定时间段内的用量记录
   */
  async findByUserId(userId: string, period: { start: Date; end: Date }): Promise<UsageRecord[]> {
    const results = await this.query(
      `SELECT * FROM usage_records 
       WHERE user_id = ? AND timestamp >= ? AND timestamp <= ?
       ORDER BY timestamp DESC`,
      [userId, this.mapDate(period.start), this.mapDate(period.end)]
    );

    return results.map(row => this.mapToUsageRecord(row));
  }

  /**
   * 获取用户在指定时间段内的用量统计
   */
  async getStats(userId: string, period: { start: Date; end: Date }): Promise<{
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCost: number;
    requestCount: number;
  }> {
    const results = await this.query(
      `SELECT 
         COALESCE(SUM(input_tokens), 0) as total_input,
         COALESCE(SUM(output_tokens), 0) as total_output,
         COALESCE(SUM(cost), 0) as total_cost,
         COUNT(*) as request_count
       FROM usage_records
       WHERE user_id = ? AND timestamp >= ? AND timestamp <= ?`,
      [userId, this.mapDate(period.start), this.mapDate(period.end)]
    );

    if (!results || results.length === 0) {
      return {
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCost: 0,
        requestCount: 0,
      };
    }

    const row = results[0];
    return {
      totalInputTokens: Number(row.total_input),
      totalOutputTokens: Number(row.total_output),
      totalCost: Number(row.total_cost),
      requestCount: Number(row.request_count),
    };
  }

  /**
   * 删除指定日期之前的旧记录(用于数据清理)
   */
  async deleteOlderThan(date: Date): Promise<number> {
    const result = await this.execute(
      'DELETE FROM usage_records WHERE timestamp < ?',
      [this.mapDate(date)]
    );

    return result.rowsAffected;
  }

  /**
   * 将数据库行映射为 UsageRecord 对象
   */
  private mapToUsageRecord(row: any): UsageRecord {
    return {
      id: row.id,
      userId: row.user_id,
      sessionId: row.session_id,
      conversationId: row.conversation_id,
      messageId: row.message_id,
      model: row.model,
      inputTokens: Number(row.input_tokens),
      outputTokens: Number(row.output_tokens),
      cost: Number(row.cost),
      timestamp: this.unmapDate(row.timestamp),
    };
  }
}
