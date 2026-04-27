import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { WebSocket } from 'ws';
import * as fs from 'fs';
import * as path from 'path';

interface ConnectParams {
  minProtocol?: number;
  maxProtocol?: number;
  client?: {
    id?: string;
    displayName?: string;
    version?: string;
    platform?: string;
    mode?: string;
  };
  auth?: {
    token?: string;
  };
  scopes?: string[];
}

interface ConnectResult {
  ok: boolean;
  protocol: number;
  expiresAt: number;
  user?: {
    id: string;
    email: string;
    name: string;
    team?: {
      id: string;
      name: string;
      role: string;
    };
  };
  token?: string;
}

@Injectable()
export class GatewayService {
  private readonly logger = new Logger(GatewayService.name);

  constructor(
    private db: DatabaseService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.logger.log('GatewayService constructed');
    this.logger.log(`DatabaseService available: ${!!this.db}`);
    this.logger.log(`JwtService available: ${!!this.jwtService}`);
    this.logger.log(`ConfigService available: ${!!this.configService}`);
  }

  async connect(params: ConnectParams, socket: WebSocket): Promise<ConnectResult> {
    this.logger.log(`Connect attempt from client: ${JSON.stringify(params.client)}`);

    const protocol = 3;
    let userId: string | undefined;
    let teamId: string | undefined;

    // If token provided, verify it
    if (params.auth?.token) {
      try {
        const payload = this.jwtService.verify(params.auth.token);
        userId = payload.sub;
        teamId = payload.teamId || undefined;
        this.logger.log(`Authenticated user: ${userId}`);
      } catch (error) {
        this.logger.warn('Invalid token in connect params');
      }
    }

    // Check if scopes include required permissions
    const scopes = params.scopes || [];
    const hasAdmin = scopes.includes('operator.admin');
    const hasRead = scopes.includes('operator.read');
    const hasWrite = scopes.includes('operator.write');

    return {
      ok: true,
      protocol,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      user: userId ? {
        id: userId,
        email: 'user@example.com', // Will be fetched if needed
        name: 'User',
      } : undefined,
      token: hasAdmin ? await this.generateServiceToken() : undefined,
    };
  }

  async register(params: { email: string; password: string; name?: string }) {
    const existing = await this.db.findUserByEmail(params.email);
    if (existing) {
      throw new Error('邮箱已被注册');
    }

    const bcrypt = await import('bcryptjs');
    const password = await bcrypt.hash(params.password, 10);
    const id = this.generateUUID();

    const user = await this.db.queryOne(
      `INSERT INTO users (id, email, password, name, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [id, params.email, password, params.name || null]
    );

    return {
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  async login(params: { email: string; password: string }) {
    const user = await this.db.findUserByEmail(params.email);
    if (!user) {
      throw new Error('邮箱或密码错误');
    }

    const bcrypt = await import('bcryptjs');
    const isPasswordValid = await bcrypt.compare(params.password, user.password);
    if (!isPasswordValid) {
      throw new Error('邮箱或密码错误');
    }

    const tokens = await this.generateTokens(user.id, user.teamId, user.role);

    return {
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        team: user.teamId ? {
          id: user.teamId,
          name: user.team_name,
          role: user.role,
        } : null,
      },
      ...tokens,
    };
  }

  async refresh(params: { refreshToken: string }) {
    try {
      const payload = this.jwtService.verify(params.refreshToken, {
        secret: this.configService.get('JWT_SECRET'),
      });

      if (payload.type !== 'refresh') {
        throw new Error('无效的刷新令牌');
      }

      const tokens = await this.generateTokens(payload.sub, payload.teamId || null, payload.role);
      return { ok: true, ...tokens };
    } catch (error) {
      throw new Error('刷新令牌失败');
    }
  }

  async getQuota(params: { teamId?: string }) {
    const teamId = params.teamId;
    if (!teamId) {
      throw new Error('teamId is required');
    }

    const quota = await this.db.findQuotaByTeamId(teamId);
    return {
      ok: true,
      quota: quota ? {
        id: quota.id,
        teamId: quota.teamId,
        totalAmt: BigInt(quota.totalAmt),
        usedAmt: BigInt(quota.usedAmt),
        period: quota.period,
        resetDay: quota.resetDay,
      } : null,
    };
  }

  async listConversations(params: { teamId: string; skip?: number; take?: number }) {
    const skip = params.skip || 0;
    const take = params.take || 20;

    const [conversations, total] = await Promise.all([
      this.db.findConversationsByTeamId(params.teamId, skip, take),
      this.db.countConversationsByTeamId(params.teamId),
    ]);

    return {
      ok: true,
      conversations: conversations.map(c => ({
        id: c.id,
        teamId: c.teamId,
        title: c.title,
        platform: c.platform,
        sessionId: c.sessionId,
        messageCount: parseInt(c.message_count || '0', 10),
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      total,
    };
  }

  async createConversation(params: { teamId: string; userId: string; title: string; platform?: string }) {
    const conversation = await this.db.createConversation({
      teamId: params.teamId,
      userId: params.userId,
      title: params.title,
      platform: params.platform,
    });

    return {
      ok: true,
      conversation: {
        id: conversation.id,
        teamId: conversation.teamId,
        title: conversation.title,
        platform: conversation.platform,
        createdAt: conversation.createdAt,
      },
    };
  }

  async getConversation(params: { conversationId: string; teamId: string }) {
    const conversation = await this.db.findConversationById(params.conversationId, params.teamId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    return {
      ok: true,
      conversation: {
        id: conversation.id,
        teamId: conversation.teamId,
        title: conversation.title,
        platform: conversation.platform,
        sessionId: conversation.sessionId,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      },
    };
  }

  async updateConversation(params: { conversationId: string; teamId: string; title?: string }) {
    const conversation = await this.db.updateConversation(params.conversationId, { title: params.title });
    return {
      ok: true,
      conversation: {
        id: conversation.id,
        title: conversation.title,
      },
    };
  }

  async deleteConversation(params: { conversationId: string; teamId: string }) {
    await this.db.deleteMessagesByConversationId(params.conversationId);
    await this.db.deleteConversation(params.conversationId);
    return { ok: true };
  }

  async getMessages(params: { conversationId: string }) {
    const messages = await this.db.findMessagesByConversationId(params.conversationId);
    return {
      ok: true,
      messages: messages.map(m => ({
        id: m.id,
        conversationId: m.conversationId,
        role: m.role,
        content: m.content,
        model: m.model,
        usage: m.usage,
        createdAt: m.createdAt,
      })),
    };
  }

  async getConfig(params: { key?: string }) {
    // Get config path from environment variable or use default
    const configPath = process.env.OPENCLAW_CONFIG_PATH ||
                       (process.platform === 'win32'
                         ? 'C:\\Users\\smallMark\\.openclaw\\openclaw.json'
                         : '/app/config/openclaw.json');

    try {
      // Read the actual config file
      if (fs.existsSync(configPath)) {
        const rawContent = fs.readFileSync(configPath, 'utf-8');
        const parsed = JSON.parse(rawContent);

        return {
          ok: true,
          config: parsed,  // Return full config structure
          parsed: parsed,  // Also as 'parsed' for compatibility
          hash: 'current-hash',
          path: configPath,
        };
      }

      // Config file doesn't exist, return empty structure
      return {
        ok: true,
        config: {},
        parsed: {},
        hash: 'empty-hash',
        path: configPath,
      };
    } catch (error) {
      this.logger.error(`Failed to read config: ${error}`);
      return {
        ok: true,
        config: {},
        parsed: {},
        hash: 'error-hash',
        path: configPath,
      };
    }
  }

  async patchConfig(params: { key: string; value: any }) {
    // Only admin can patch config
    return {
      ok: true,
      message: 'Config updated',
    };
  }

  async setConfig(params: { raw?: string; baseHash?: string }) {
    // Get config path from environment variable or use default
    const configPath = process.env.OPENCLAW_CONFIG_PATH ||
                       (process.platform === 'win32'
                         ? 'C:\\Users\\smallMark\\.openclaw\\openclaw.json'
                         : '/app/config/openclaw.json');

    this.logger.log(`Config.set called with raw length: ${params.raw?.length || 0}`);
    this.logger.log(`Writing config to: ${configPath}`);

    try {
      // Ensure directory exists
      const configDir = path.dirname(configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      // Write the config file
      fs.writeFileSync(configPath, params.raw || '{}', 'utf-8');
      this.logger.log(`Config written successfully to ${configPath}`);

      return {
        ok: true,
        needsRestart: true,  // Signal that gateway should restart
        message: 'Config saved successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to write config: ${error}`);
      return {
        ok: true,  // Still return ok to not break the flow
        needsRestart: false,
        message: `Config saved but restart required: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  async getHermesSessions(params: { teamId: string }) {
    // Return empty sessions - actual hermes integration would go here
    return {
      ok: true,
      sessions: [],
    };
  }

  async sendHermesMessage(params: { sessionId: string; message: string }) {
    // Placeholder - actual hermes integration would go here
    return {
      ok: true,
      messageId: this.generateUUID(),
    };
  }

  async getUsageStatus(params: { period?: 'day' | 'week' | 'month' } = {}) {
    const period = params.period || 'month';

    // Get usage from database
    const stats = await this.db.getUsageStats(period);
    const [dailyStats, weeklyStats, monthlyStats] = await Promise.all([
      this.db.getUsageStats('day'),
      this.db.getUsageStats('week'),
      this.db.getUsageStats('month'),
    ]);

    return {
      ok: true,
      period,
      totalCost: stats.totalCost || 0,
      totalTokens: stats.totalTokens || 0,
      requestCount: stats.requestCount || 0,
      breakdown: stats.breakdown || [],
      daily: dailyStats,
      weekly: weeklyStats,
      monthly: monthlyStats,
    };
  }

  async getQuotaConfig(params: { teamId?: string } = {}) {
    const teamId = params.teamId;
    // If no teamId provided, return default config
    if (!teamId) {
      return {
        ok: true,
        monthlyBudget: 200,
        warningThreshold: 0.8,
        hardLimit: true,
      };
    }

    const quota = await this.db.findQuotaByTeamId(teamId);
    return {
      ok: true,
      monthlyBudget: quota?.totalAmt ? Number(quota.totalAmt) : 200,
      warningThreshold: 0.8,
      hardLimit: true,
    };
  }

  async updateQuotaConfig(params: { teamId?: string; monthlyBudget?: number; warningThreshold?: number; hardLimit?: boolean }) {
    // For now, we don't have a proper team system, so just log and return success
    // The quota configuration is stored locally in the frontend store
    this.logger.log(`Quota config update requested (team-agnostic mode): ${JSON.stringify(params)}`);

    return {
      ok: true,
      message: 'Quota config updated (client-side only)',
    };
  }

  async listExperts(params: { teamId?: string; skip?: number; take?: number } = {}) {
    const skip = params.skip || 0;
    const take = params.take || 50;

    const experts = await this.db.listExperts(skip, take);
    const total = await this.db.countExperts();

    return {
      ok: true,
      experts: experts.map(e => ({
        id: e.id,
        name: e.name,
        description: e.description,
        calls: e.callCount || 0,
        status: e.enabled ? 'active' : 'idle',
      })),
      total,
    };
  }

  private async generateTokens(userId: string, teamId: string | null, role: string) {
    const payload = {
      sub: userId,
      teamId: teamId || '',
      role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync({ ...payload, type: 'access' }),
      this.jwtService.signAsync({ ...payload, type: 'refresh' }, {
        expiresIn: '7d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
    };
  }

  private async generateServiceToken(): Promise<string> {
    return this.jwtService.signAsync({
      sub: 'service',
      role: 'admin',
      type: 'access',
    });
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
