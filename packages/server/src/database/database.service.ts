import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;

  constructor(private configService: ConfigService) {
    const databaseUrl = this.configService.get<string>('DATABASE_URL');
    this.pool = new Pool({
      connectionString: databaseUrl,
    });
  }

  async onModuleInit() {
    const client = await this.pool.connect();
    client.release();
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  getPool(): Pool {
    return this.pool;
  }

  async query<T = any>(text: string, params?: any[]): Promise<T[]> {
    const result = await this.pool.query(text, params);
    return result.rows as T[];
  }

  async queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
    const result = await this.pool.query(text, params);
    return (result.rows[0] as T) || null;
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // User methods
  async findUserByEmail(email: string) {
    return this.queryOne(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
  }

  async findUserById(id: string) {
    return this.queryOne(
      'SELECT u.*, t.id as team_id, t.name as team_name FROM users u LEFT JOIN teams t ON u."teamId" = t.id WHERE u.id = $1',
      [id]
    );
  }

  async createUser(data: {
    email: string;
    password: string;
    name?: string;
  }) {
    const id = this.generateUUID();
    return this.queryOne(
      `INSERT INTO users (id, email, password, name, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [id, data.email, data.password, data.name || null]
    );
  }

  // Team methods
  async findTeamById(id: string) {
    return this.queryOne('SELECT * FROM teams WHERE id = $1', [id]);
  }

  async createTeam(data: { name: string }) {
    const id = this.generateUUID();
    return this.queryOne(
      `INSERT INTO teams (id, name, "createdAt", "updatedAt")
       VALUES ($1, $2, NOW(), NOW())
       RETURNING *`,
      [id, data.name]
    );
  }

  // Quota methods
  async findQuotaByTeamId(teamId: string) {
    return this.queryOne('SELECT * FROM quotas WHERE "teamId" = $1', [teamId]);
  }

  async createQuota(data: {
    teamId: string;
    totalAmt: bigint;
    usedAmt: bigint;
    period?: number;
    resetDay?: number;
  }) {
    const id = this.generateUUID();
    return this.queryOne(
      `INSERT INTO quotas (id, "teamId", "totalAmt", "usedAmt", "period", "resetDay", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [id, data.teamId, data.totalAmt.toString(), data.usedAmt.toString(), data.period || 30, data.resetDay || 1]
    );
  }

  async updateQuota(teamId: string, data: { totalAmt?: bigint; usedAmt?: bigint }) {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.totalAmt !== undefined) {
      updates.push(`"totalAmt" = $${paramIndex++}`);
      values.push(data.totalAmt.toString());
    }
    if (data.usedAmt !== undefined) {
      updates.push(`"usedAmt" = $${paramIndex++}`);
      values.push(data.usedAmt.toString());
    }
    updates.push(`"updatedAt" = NOW()`);
    values.push(teamId);

    return this.queryOne(
      `UPDATE quotas SET ${updates.join(', ')} WHERE "teamId" = $${paramIndex} RETURNING *`,
      values
    );
  }

  async incrementQuotaUsed(teamId: string, amount: bigint) {
    return this.queryOne(
      `UPDATE quotas SET "usedAmt" = "usedAmt" + $1, "updatedAt" = NOW()
       WHERE "teamId" = $2 RETURNING *`,
      [amount.toString(), teamId]
    );
  }

  // Quota transaction methods
  async createQuotaTransaction(data: {
    quotaId: string;
    userId: string;
    userName: string;
    amount: bigint;
    balanceBefore: bigint;
    balanceAfter: bigint;
    type: string;
    note?: string;
  }) {
    const id = this.generateUUID();
    return this.queryOne(
      `INSERT INTO quota_transactions (id, "quotaId", "userId", "userName", amount, "balanceBefore", "balanceAfter", type, note, "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       RETURNING *`,
      [id, data.quotaId, data.userId, data.userName, data.amount.toString(), data.balanceBefore.toString(), data.balanceAfter.toString(), data.type, data.note || null]
    );
  }

  // Conversation methods
  async findConversationsByTeamId(teamId: string, skip: number, take: number) {
    return this.query(
      `SELECT c.*, COUNT(m.id) as message_count
       FROM conversations c
       LEFT JOIN messages m ON c.id = m."conversationId"
       WHERE c."teamId" = $1
       GROUP BY c.id
       ORDER BY c."updatedAt" DESC
       LIMIT $2 OFFSET $3`,
      [teamId, take, skip]
    );
  }

  async countConversationsByTeamId(teamId: string): Promise<number> {
    const result = await this.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM conversations WHERE "teamId" = $1',
      [teamId]
    );
    return parseInt(result?.count || '0', 10);
  }

  async findConversationById(conversationId: string, teamId: string) {
    return this.queryOne(
      'SELECT * FROM conversations WHERE id = $1 AND "teamId" = $2',
      [conversationId, teamId]
    );
  }

  async createConversation(data: {
    teamId: string;
    userId: string;
    title: string;
    platform?: string;
    sessionId?: string;
  }) {
    const id = this.generateUUID();
    return this.queryOne(
      `INSERT INTO conversations (id, "teamId", "userId", platform, "sessionId", title, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [id, data.teamId, data.userId, data.platform || 'hermes', data.sessionId || null, data.title]
    );
  }

  async updateConversation(conversationId: string, data: { title?: string; sessionId?: string }) {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(data.title);
    }
    if (data.sessionId !== undefined) {
      updates.push(`"sessionId" = $${paramIndex++}`);
      values.push(data.sessionId);
    }
    updates.push(`"updatedAt" = NOW()`);
    values.push(conversationId);

    return this.queryOne(
      `UPDATE conversations SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
  }

  async deleteConversation(conversationId: string) {
    return this.queryOne(
      'DELETE FROM conversations WHERE id = $1 RETURNING *',
      [conversationId]
    );
  }

  // Message methods
  async findMessagesByConversationId(conversationId: string) {
    return this.query(
      'SELECT * FROM messages WHERE "conversationId" = $1 ORDER BY "createdAt" ASC',
      [conversationId]
    );
  }

  async findLastMessageByConversationId(conversationId: string) {
    return this.queryOne(
      'SELECT * FROM messages WHERE "conversationId" = $1 ORDER BY "createdAt" DESC LIMIT 1',
      [conversationId]
    );
  }

  async createMessage(data: {
    conversationId: string;
    userId?: string;
    role: string;
    content: string;
    model?: string;
    usage?: any;
    metadata?: any;
  }) {
    const id = this.generateUUID();
    return this.queryOne(
      `INSERT INTO messages (id, "conversationId", "userId", role, content, model, usage, metadata, "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING *`,
      [id, data.conversationId, data.userId || null, data.role, data.content, data.model || null, data.usage ? JSON.stringify(data.usage) : null, data.metadata ? JSON.stringify(data.metadata) : null]
    );
  }

  async deleteMessagesByConversationId(conversationId: string) {
    return this.query(
      'DELETE FROM messages WHERE "conversationId" = $1',
      [conversationId]
    );
  }

  // Usage stats methods
  async getUsageStats(period: 'day' | 'week' | 'month') {
    const now = new Date();
    let startDate: Date;
    let groupBy: string;

    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        groupBy = 'hour';
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        groupBy = 'day';
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        groupBy = 'day';
        break;
    }

    const startStr = startDate.toISOString();

    const result = await this.queryOne<{ total_cost: string; total_tokens: string; request_count: string }>(
      `SELECT COALESCE(SUM(usg.cost), 0) as total_cost,
              COALESCE(SUM(usg.input_tokens + usg.output_tokens), 0) as total_tokens,
              COUNT(*) as request_count
       FROM usage usg
       WHERE usg."createdAt" >= $1`,
      [startStr]
    );

    const breakdownResult = await this.query<{ model: string; cost: string; tokens: string }>(
      `SELECT model, COALESCE(SUM(cost), 0) as cost,
              COALESCE(SUM(input_tokens + output_tokens), 0) as tokens
       FROM usage
       WHERE "createdAt" >= $1
       GROUP BY model`,
      [startStr]
    );

    return {
      totalCost: parseFloat(result?.total_cost || '0'),
      totalTokens: parseInt(result?.total_tokens || '0', 10),
      requestCount: parseInt(result?.request_count || '0', 10),
      breakdown: breakdownResult.map(r => ({
        model: r.model,
        cost: parseFloat(r.cost),
        tokens: parseInt(r.tokens, 10),
      })),
    };
  }

  // Expert methods
  async listExperts(skip: number, take: number) {
    return this.query(
      `SELECT * FROM experts ORDER BY "createdAt" DESC LIMIT $1 OFFSET $2`,
      [take, skip]
    );
  }

  async countExperts(): Promise<number> {
    const result = await this.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM experts'
    );
    return parseInt(result?.count || '0', 10);
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}