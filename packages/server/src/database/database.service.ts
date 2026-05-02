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
  async createExpert(data: {
    teamId?: string;
    name: string;
    description?: string;
    systemPrompt?: string;
    icon?: string;
    color?: string;
    category?: string;
    isDefault?: boolean;
  }) {
    const id = this.generateUUID();
    return this.queryOne(
      `INSERT INTO experts (id, "teamId", name, description, "systemPrompt", icon, color, category, is_default, enabled, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW(), NOW())
       RETURNING *`,
      [
        id,
        data.teamId || null,
        data.name,
        data.description || null,
        data.systemPrompt || null,
        data.icon || null,
        data.color || null,
        data.category || null,
        data.isDefault ?? false,
      ]
    );
  }

  async listExperts(teamId?: string, skip?: number, take?: number, category?: string) {
    const offset = skip || 0;
    const limit = take || 50;

    let query = 'SELECT * FROM experts WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (teamId) {
      query += ` AND ("teamId" = $${paramIndex} OR "teamId" IS NULL)`;
      params.push(teamId);
      paramIndex++;
    } else {
      query += ` AND "teamId" IS NULL`;
    }

    if (category && category !== 'all') {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    query += ` ORDER BY is_default DESC, "createdAt" DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    return this.query(query, params);
  }

  async countExperts(teamId?: string, category?: string): Promise<number> {
    let query = 'SELECT COUNT(*) as count FROM experts WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (teamId) {
      query += ` AND ("teamId" = $${paramIndex} OR "teamId" IS NULL)`;
      params.push(teamId);
      paramIndex++;
    } else {
      query += ` AND "teamId" IS NULL`;
    }

    if (category && category !== 'all') {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
    }

    const result = await this.queryOne<{ count: string }>(query, params);
    return parseInt(result?.count || '0', 10);
  }

  async findExpertById(id: string) {
    return this.queryOne(
      'SELECT * FROM experts WHERE id = $1',
      [id]
    );
  }

  async updateExpert(id: string, updates: any) {
    const allowedFields = ['name', 'description', 'systemPrompt', 'icon', 'color', 'category', 'enabled', 'is_default', 'call_count', 'rating'];
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (allowedFields.includes(key) && value !== undefined) {
        // Convert camelCase to snake_case
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        fields.push(`"${snakeKey}" = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (fields.length === 0) return this.findExpertById(id);

    fields.push('"updatedAt" = NOW()');
    values.push(id);

    const rows = await this.query(
      `UPDATE experts SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return rows[0];
  }

  async deleteExpert(id: string) {
    return this.queryOne(
      'DELETE FROM experts WHERE id = $1 RETURNING *',
      [id]
    );
  }

  async incrementExpertCallCount(id: string) {
    return this.queryOne(
      'UPDATE experts SET call_count = call_count + 1, "updatedAt" = NOW() WHERE id = $1 RETURNING *',
      [id]
    );
  }

  async updateExpertRating(id: string, rating: number) {
    return this.queryOne(
      'UPDATE experts SET rating = $1, "updatedAt" = NOW() WHERE id = $2 RETURNING *',
      [rating, id]
    );
  }

  async getExpertStats(id: string) {
    const expert = await this.findExpertById(id);
    if (!expert) return null;

    return {
      id: expert.id,
      name: expert.name,
      callCount: expert.call_count || 0,
      rating: expert.rating || 0,
      createdAt: expert.createdAt,
    };
  }

  // Expert usage tracking
  async createExpertUsage(data: {
    expertId: string;
    userId: string;
    teamId?: string;
    tokens?: number;
    duration?: number;
  }) {
    const id = this.generateUUID();
    return this.queryOne(
      `INSERT INTO expert_usage (id, expert_id, user_id, team_id, tokens, duration, "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING *`,
      [id, data.expertId, data.userId, data.teamId || null, data.tokens || 0, data.duration || 0]
    );
  }

  async getExpertUsageStats(expertId: string, period?: 'day' | 'week' | 'month') {
    let startDate: Date;
    const now = new Date();

    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    const result = await this.queryOne<{ total_calls: string; total_tokens: string; avg_duration: string }>(
      `SELECT COALESCE(COUNT(*), 0) as total_calls,
              COALESCE(SUM(tokens), 0) as total_tokens,
              COALESCE(AVG(duration), 0) as avg_duration
       FROM expert_usage
       WHERE expert_id = $1 AND "createdAt" >= $2`,
      [expertId, startDate.toISOString()]
    );

    return {
      totalCalls: parseInt(result?.total_calls || '0', 10),
      totalTokens: parseInt(result?.total_tokens || '0', 10),
      avgDuration: parseFloat(result?.avg_duration || '0'),
    };
  }

  // Expert categories methods
  async createExpertCategory(data: {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    sortOrder?: number;
  }) {
    const id = this.generateUUID();
    return this.queryOne(
      `INSERT INTO expert_categories (id, name, description, icon, color, sort_order, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [id, data.name, data.description || null, data.icon || null, data.color || null, data.sortOrder || 0]
    );
  }

  async listExpertCategories() {
    return this.query(
      'SELECT * FROM expert_categories ORDER BY sort_order ASC, name ASC'
    );
  }

  async findExpertCategoryById(id: string) {
    return this.queryOne(
      'SELECT * FROM expert_categories WHERE id = $1',
      [id]
    );
  }

  async findExpertCategoryByName(name: string) {
    return this.queryOne(
      'SELECT * FROM expert_categories WHERE name = $1',
      [name]
    );
  }

  async updateExpertCategory(id: string, updates: any) {
    const allowedFields = ['name', 'description', 'icon', 'color', 'sort_order'];
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (allowedFields.includes(key) && value !== undefined) {
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        fields.push(`"${snakeKey}" = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (fields.length === 0) return this.findExpertCategoryById(id);

    fields.push('"updatedAt" = NOW()');
    values.push(id);

    const rows = await this.query(
      `UPDATE expert_categories SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return rows[0];
  }

  async deleteExpertCategory(id: string) {
    return this.queryOne(
      'DELETE FROM expert_categories WHERE id = $1 RETURNING *',
      [id]
    );
  }

  // Task Plan methods
  async createTaskPlan(data: {
    id: string;
    conversationId: string;
    userInput: string;
    planData: any;
    status?: string;
  }) {
    return this.queryOne(
      `INSERT INTO task_plans (id, conversation_id, user_input, plan_data, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [data.id, data.conversationId, data.userInput, JSON.stringify(data.planData), data.status || 'planning']
    );
  }

  async findTaskPlanById(planId: string) {
    return this.queryOne(
      'SELECT * FROM task_plans WHERE id = $1',
      [planId]
    );
  }

  async updateTaskPlanStatus(planId: string, status: string) {
    return this.queryOne(
      `UPDATE task_plans SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, planId]
    );
  }

  async updateTaskPlanData(planId: string, planData: any) {
    return this.queryOne(
      `UPDATE task_plans SET plan_data = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [JSON.stringify(planData), planId]
    );
  }

  async findTaskPlansByConversationId(conversationId: string) {
    return this.query(
      'SELECT * FROM task_plans WHERE conversation_id = $1 ORDER BY created_at DESC',
      [conversationId]
    );
  }

  // Extension methods
  async findAllExtensions() {
    return this.query('SELECT * FROM extensions WHERE enabled = true ORDER BY downloads DESC');
  }

  async findExtensionById(id: string) {
    return this.queryOne('SELECT * FROM extensions WHERE id = $1', [id]);
  }

  async findExtensionsByCategory(category: string) {
    return this.query(
      'SELECT * FROM extensions WHERE category = $1 AND enabled = true ORDER BY downloads DESC',
      [category]
    );
  }

  async searchExtensions(query: string) {
    const searchQuery = `%${query}%`;
    return this.query(
      `SELECT * FROM extensions 
       WHERE (name ILIKE $1 OR description ILIKE $1) AND enabled = true 
       ORDER BY downloads DESC`,
      [searchQuery]
    );
  }

  async incrementExtensionDownloads(id: string) {
    return this.queryOne(
      'UPDATE extensions SET downloads = downloads + 1, "updatedAt" = NOW() WHERE id = $1 RETURNING *',
      [id]
    );
  }

  async findUserInstalledExtensions(userId: string) {
    return this.query(
      `SELECT e.*, ue.enabled as user_enabled, ue.config, ue."installedAt"
       FROM extensions e
       INNER JOIN user_extensions ue ON e.id = ue."extensionId"
       WHERE ue."userId" = $1
       ORDER BY ue."installedAt" DESC`,
      [userId]
    );
  }

  async installExtension(userId: string, extensionId: string, config?: any) {
    const id = this.generateUUID();
    return this.queryOne(
      `INSERT INTO user_extensions (id, "extensionId", "userId", enabled, config)
       VALUES ($1, $2, $3, true, $4)
       ON CONFLICT ("extensionId", "userId") DO UPDATE SET enabled = true, "updatedAt" = NOW()
       RETURNING *`,
      [id, extensionId, userId, config ? JSON.stringify(config) : null]
    );
  }

  async uninstallExtension(userId: string, extensionId: string) {
    return this.queryOne(
      'DELETE FROM user_extensions WHERE "extensionId" = $1 AND "userId" = $2 RETURNING *',
      [extensionId, userId]
    );
  }

  async enableUserExtension(userId: string, extensionId: string) {
    return this.queryOne(
      'UPDATE user_extensions SET enabled = true, "updatedAt" = NOW() WHERE "extensionId" = $1 AND "userId" = $2 RETURNING *',
      [extensionId, userId]
    );
  }

  async disableUserExtension(userId: string, extensionId: string) {
    return this.queryOne(
      'UPDATE user_extensions SET enabled = false, "updatedAt" = NOW() WHERE "extensionId" = $1 AND "userId" = $2 RETURNING *',
      [extensionId, userId]
    );
  }

  async updateUserExtensionConfig(userId: string, extensionId: string, config: any) {
    return this.queryOne(
      'UPDATE user_extensions SET config = $1, "updatedAt" = NOW() WHERE "extensionId" = $2 AND "userId" = $3 RETURNING *',
      [JSON.stringify(config), extensionId, userId]
    );
  }

  // Verification code methods
  async createVerificationCode(data: {
    email: string;
    code: string;
    type?: string;
    expiresAt: Date;
  }) {
    const id = this.generateUUID();
    return this.queryOne(
      `INSERT INTO client_verification_codes (id, email, code, type, expires_at, "createdAt")
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [id, data.email, data.code, data.type || 'register', data.expiresAt]
    );
  }

  async findValidVerificationCode(email: string, code: string, type: string = 'register') {
    return this.queryOne(
      `SELECT * FROM client_verification_codes
       WHERE email = $1 AND code = $2 AND type = $3 AND verified = false AND expires_at > NOW()
       ORDER BY "createdAt" DESC LIMIT 1`,
      [email, code, type]
    );
  }

  async markVerificationCodeAsVerified(id: string) {
    return this.queryOne(
      `UPDATE client_verification_codes SET verified = true WHERE id = $1 RETURNING *`,
      [id]
    );
  }

  async incrementVerificationAttempts(id: string) {
    return this.queryOne(
      `UPDATE client_verification_codes SET attempts = attempts + 1 WHERE id = $1 RETURNING *`,
      [id]
    );
  }

  async getVerificationCodeAttempts(email: string, type: string = 'register') {
    const result = await this.queryOne<{ attempts: string }>(
      `SELECT attempts FROM client_verification_codes
       WHERE email = $1 AND type = $2 AND expires_at > NOW()
       ORDER BY "createdAt" DESC LIMIT 1`,
      [email, type]
    );
    return parseInt(result?.attempts || '0', 10);
  }

  async deleteExpiredVerificationCodes(email: string) {
    return this.query(
      `DELETE FROM client_verification_codes WHERE email = $1 AND expires_at < NOW()`,
      [email]
    );
  }

  // Team Invitation methods
  async createTeamInvitation(data: {
    teamId: string;
    email: string;
    invitedBy: string;
    token: string;
    role: string;
    expiresAt: Date;
  }) {
    const id = this.generateUUID();
    return this.queryOne(
      `INSERT INTO team_invitations (id, team_id, email, invited_by, token, role, status, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, NOW())
       RETURNING *`,
      [id, data.teamId, data.email, data.invitedBy, data.token, data.role, data.expiresAt.toISOString()]
    );
  }

  async findTeamInvitationByToken(token: string) {
    return this.queryOne(
      'SELECT * FROM team_invitations WHERE token = $1',
      [token]
    );
  }

  async findTeamInvitationById(id: string) {
    return this.queryOne(
      'SELECT * FROM team_invitations WHERE id = $1',
      [id]
    );
  }

  async findTeamInvitationsByTeamId(teamId: string) {
    return this.query(
      `SELECT ti.*, u.name as inviter_name
       FROM team_invitations ti
       LEFT JOIN users u ON ti.invited_by = u.id
       WHERE ti.team_id = $1
       ORDER BY ti.created_at DESC`,
      [teamId]
    );
  }

  async findTeamInvitationsByEmail(email: string) {
    return this.query(
      'SELECT * FROM team_invitations WHERE email = $1 AND status = $2',
      [email, 'pending']
    );
  }

  async updateTeamInvitationStatus(id: string, status: string) {
    return this.queryOne(
      `UPDATE team_invitations SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
    );
  }

  async deleteTeamInvitation(id: string) {
    return this.queryOne(
      'DELETE FROM team_invitations WHERE id = $1 RETURNING *',
      [id]
    );
  }

  async deleteTeamInvitationByToken(token: string) {
    return this.queryOne(
      'DELETE FROM team_invitations WHERE token = $1 RETURNING *',
      [token]
    );
  }

  async updateUserPassword(userId: string, passwordHash: string) {
    return this.queryOne(
      `UPDATE users SET password = $1, "updatedAt" = NOW() WHERE id = $2 RETURNING *`,
      [passwordHash, userId]
    );
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}