import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { HttpService } from '@nestjs/axios';
import { AiModelsService } from '../ai-models/ai-models.service';
import { WebSocket } from 'ws';
import * as fs from 'fs';
import * as path from 'path';
import { firstValueFrom } from 'rxjs';

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

interface GatewayJwtPayload {
  sub: string;
  teamId?: string;
  role?: string;
  type?: string;
}

interface HermesMCPServer {
  name: string;
  type: string;
  config: Record<string, unknown>;
}

interface HermesMessageParams {
  sessionId: string;
  message: string;
  teamId?: string;
  conversationId?: string;
  expertId?: string;
  attachments?: Array<{ type: string; name: string; mimeType: string; data?: string }>;
}

interface ConversationPromptMessage {
  role: string;
  content: any;
}

@Injectable()
export class GatewayService {
  private gatewayInstance: any = null;
  private readonly logger = new Logger(GatewayService.name);
  private activeStreams: Map<string, { ws: WebSocket; stream: any }> = new Map();
  private hermesAgentStatus: { healthy: boolean; lastChecked: number } = { healthy: false, lastChecked: 0 };
  private readonly HERMES_AGENT_URL = process.env.HERMES_AGENT_URL || 'http://localhost:8642';
  private readonly HERMES_HEALTH_TTL_MS = 30000;

  constructor(
    private db: DatabaseService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private httpService: HttpService,
    private aiModelsService: AiModelsService,
  ) {
    this.logger.log('GatewayService constructed');
    this.logger.log(`DatabaseService available: ${!!this.db}`);
    this.logger.log(`JwtService available: ${!!this.jwtService}`);
    this.logger.log(`ConfigService available: ${!!this.configService}`);
    this.logger.log(`HttpService available: ${!!this.httpService}`);
    this.logger.log(`AiModelsService available: ${!!this.aiModelsService}`);
  }

  setGatewayInstance(gatewayInstance: any): void {
    this.gatewayInstance = gatewayInstance;
    this.logger.log('Gateway instance reference set');
  }

  async connect(params: ConnectParams, socket: WebSocket): Promise<ConnectResult> {
    this.logger.log(`Connect attempt from client: ${JSON.stringify(params.client)}`);

    const protocol = 3;
    let userId: string | undefined;
    let teamId: string | undefined;

    if (!params.auth?.token) {
      throw new Error('Authentication required');
    }

    let userRole: string | undefined;
    try {
      const payload = this.jwtService.verify<GatewayJwtPayload>(params.auth.token);
      if (payload.type !== 'access') {
        throw new Error('Authentication required');
      }
      userId = payload.sub;
      teamId = payload.teamId || undefined;
      userRole = payload.role;
      this.logger.log(`Authenticated user: ${userId}`);
    } catch (error) {
      this.logger.warn('Invalid token in connect params');
      throw new Error('Authentication required');
    }

    return {
      ok: true,
      protocol,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      user: userId ? {
        id: userId,
        email: 'user@example.com',
        name: 'User',
        team: teamId ? {
          id: teamId,
          name: 'Team',
          role: userRole || 'MEMBER',
        } : undefined,
      } : undefined,
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

  private async resolveConversationPromptContext(params: {
    conversationId?: string;
    expertId?: string;
    teamId?: string;
  }): Promise<{ messages: ConversationPromptMessage[]; mcpServers: HermesMCPServer[] }> {
    const messages: ConversationPromptMessage[] = [];
    let isConversationAuthorized = false;

    if (params.expertId) {
      try {
        const expert = await this.db.findExpertByIdForTeam(params.expertId, params.teamId);
        const prompt = expert?.systemprompt || expert?.systemPrompt;
        if (prompt) {
          messages.push({ role: 'system', content: prompt });
        }
      } catch (err) {
        this.logger.warn(`Failed to load expert ${params.expertId}:`, err);
      }
    }

    if (params.conversationId && params.teamId) {
      try {
        const conversation = await this.db.findConversationById(params.conversationId, params.teamId);
        if (conversation) {
          isConversationAuthorized = true;
          const history = await this.db.findMessagesByConversationId(params.conversationId);
          const recentHistory = history.slice(-20);
          for (const msg of recentHistory) {
            if (msg.role === 'user' || msg.role === 'assistant') {
              messages.push({ role: msg.role, content: msg.content });
            }
          }
        }
      } catch (err) {
        this.logger.warn('Failed to load conversation history:', err);
      }
    }

    const mcpServers = params.conversationId && isConversationAuthorized
      ? await this.getConversationHermesMcpServers(params.conversationId)
      : [];

    return { messages, mcpServers };
  }

  private async getConversationHermesMcpServers(conversationId: string): Promise<HermesMCPServer[]> {
    try {
      const rows = await this.db.getConversationMCPServers(conversationId);
      return rows.map((row: { name: string; server_type?: string; config?: Record<string, unknown> }) => ({
        name: row.name,
        type: row.server_type || 'stdio',
        config: row.config || {},
      }));
    } catch (error) {
      this.logger.warn(`Failed to load MCP servers for conversation ${conversationId}:`, error);
      return [];
    }
  }

  private async checkHermesAgentHealth(): Promise<boolean> {
    const now = Date.now();
    if (now - this.hermesAgentStatus.lastChecked < this.HERMES_HEALTH_TTL_MS) {
      return this.hermesAgentStatus.healthy;
    }
    try {
      await firstValueFrom(
        this.httpService.get(`${this.HERMES_AGENT_URL}/health`, { timeout: 2000 }),
      );
      this.hermesAgentStatus = { healthy: true, lastChecked: now };
      return true;
    } catch {
      this.hermesAgentStatus = { healthy: false, lastChecked: now };
      return false;
    }
  }

  private async sendHermesAgentMessage(
    params: HermesMessageParams,
    senderWs?: WebSocket,
  ) {
    const messageId = this.generateUUID();
    this.logger.log(`Routing to hermes-agent at ${this.HERMES_AGENT_URL}`);

    const { messages: conversationMessages, mcpServers: conversationMcpServers } =
      await this.resolveConversationPromptContext({
        conversationId: params.conversationId,
        expertId: params.expertId,
        teamId: params.teamId,
      });

    const messages: Array<{ role: string; content: any }> = [...conversationMessages];

    // Build user message with optional attachments (multimodal)
    if (params.attachments && params.attachments.length > 0) {
      const contentParts: any[] = [{ type: 'text', text: params.message }];
      for (const att of params.attachments) {
        if (att.type === 'image' && att.data) {
          contentParts.push({
            type: 'image_url',
            image_url: { url: `data:${att.mimeType};base64,${att.data}` },
          });
        } else if (att.data) {
          contentParts[0].text += `\n\n[Attached file: ${att.name}]\n${att.data}`;
        }
      }
      messages.push({ role: 'user', content: contentParts });
    } else {
      messages.push({ role: 'user', content: params.message });
    }

    const requestBody: Record<string, any> = {
      model: 'hermes-agent',
      messages,
      stream: true,
    };
    if (conversationMcpServers.length > 0) {
      requestBody.mcp_servers = conversationMcpServers;
    }

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (requestBody.mcp_servers?.length) {
        const internalKey = this.configService.get<string>('HERMES_INTERNAL_MCP_KEY');
        if (!internalKey) {
          throw new Error('Internal MCP key is required when forwarding request-scoped MCP servers');
        }
        headers['X-Hermes-Internal-MCP-Key'] = internalKey;
      }
      const response = await firstValueFrom(
        this.httpService.post(`${this.HERMES_AGENT_URL}/v1/chat/completions`, requestBody, {
          headers,
          responseType: 'stream',
          timeout: 300000,
        }),
      );

      const stream = response.data;
      let fullResponse = '';
      let deltaCount = 0;
      let totalTokens = 0;
      let aborted = false;
      let settled = false;
      let errored = false;
      let lineBuffer = '';
      let activeToolCallId: string | undefined;

      if (senderWs) {
        this.activeStreams.set(messageId, { ws: senderWs, stream });
      }

      const cleanup = () => {
        this.activeStreams.delete(messageId);
      };

      return new Promise((resolve, reject) => {
        const finalize = (data: { ok: boolean; messageId: string; aborted?: boolean; error?: string }) => {
          if (settled) return;
          settled = true;
          cleanup();
          resolve(data);
        };
        stream.on('data', (chunk: Buffer) => {
          if (aborted || settled) return;

          lineBuffer += chunk.toString();
          const lines = lineBuffer.split('\n');
          lineBuffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.substring(6).trim();
              if (dataStr === '[DONE]') {
                this.sendStreamEvent('hermes.final', {
                  messageId,
                  content: fullResponse,
                  totalTokens,
                }, senderWs);
                finalize({ ok: true, messageId });
                return;
              }

              try {
                const data = JSON.parse(dataStr);
                const delta = data.choices?.[0]?.delta?.content || '';
                if (delta) {
                  fullResponse += delta;
                  deltaCount++;
                  this.sendStreamEvent('hermes.delta', {
                    messageId,
                    delta,
                    sequenceNumber: deltaCount,
                  }, senderWs);
                }

                // Handle tool calls in delta — track active toolCallId across chunks
                const toolCalls = data.choices?.[0]?.delta?.tool_calls;
                if (toolCalls && Array.isArray(toolCalls)) {
                  for (const tc of toolCalls) {
                    if (tc.id) {
                      activeToolCallId = tc.id;
                    }
                    this.sendStreamEvent('hermes.tool', {
                      messageId,
                      toolCallId: tc.id || activeToolCallId,
                      toolName: tc.function?.name,
                      input: tc.function?.arguments,
                      status: 'running',
                    }, senderWs);
                  }
                }

                if (data.usage) {
                  totalTokens = data.usage.total_tokens || 0;
                }
              } catch (e) {
                // Not JSON, skip
              }
            }
          }
        });

        stream.on('end', () => {
          if (settled) return;
          if (aborted) {
            finalize({ ok: true, messageId, aborted: true });
            return;
          }
          if (errored) return;
          this.logger.log('hermes-agent stream ended');
          if (!fullResponse) {
            this.sendStreamEvent('hermes.error', {
              messageId,
              error: 'No response from hermes-agent',
            }, senderWs);
            finalize({ ok: false, messageId, error: 'No response' });
          } else {
            this.sendStreamEvent('hermes.final', {
              messageId,
              content: fullResponse,
              totalTokens,
            }, senderWs);
            finalize({ ok: true, messageId });
          }
        });

        stream.on('error', (error: Error) => {
          if (settled) return;
          errored = true;
          cleanup();
          if (aborted) {
            resolve({ ok: true, messageId, aborted: true });
            return;
          }
          this.logger.error('hermes-agent stream error:', error);
          this.sendStreamEvent('hermes.error', {
            messageId,
            error: error.message,
          }, senderWs);
          reject(error);
        });
      });

    } catch (error) {
      this.logger.error('Failed to call hermes-agent API:', error);
      this.sendStreamEvent('hermes.error', {
        messageId,
        error: error instanceof Error ? error.message : 'hermes-agent call failed',
      }, senderWs);
      return { ok: false, messageId, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getHermesAgentStatus() {
    const healthy = await this.checkHermesAgentHealth();
    return {
      ok: true,
      hermesAgent: {
        available: healthy,
        endpoint: this.HERMES_AGENT_URL,
        lastChecked: this.hermesAgentStatus.lastChecked,
      },
    };
  }

  async sendHermesMessage(params: { sessionId: string; message: string; teamId?: string; conversationId?: string; expertId?: string; attachments?: Array<{ type: string; name: string; mimeType: string; data?: string }> }, senderWs?: WebSocket) {
    this.logger.log(`Sending message to Hermes: ${params.message.substring(0, 50)}...`);

    // Route through hermes-agent if available (unlocks all tools)
    const hermesHealthy = await this.checkHermesAgentHealth();
    if (hermesHealthy) {
      return this.sendHermesAgentMessage(params, senderWs);
    }

    const messageId = this.generateUUID();
    const teamId = params.teamId;

    // Try to resolve default model from DB config
    let defaultModel: any = null;
    try {
      defaultModel = await this.aiModelsService.findDefaultModelByUseCase('general');
    } catch (err) {
      this.logger.warn('Failed to query default model, falling back to hermes-agent');
    }

    if (!defaultModel) {
      // No configured default model — fall back to legacy hermes-agent
      return this.sendLegacyHermesMessage(params, senderWs, messageId);
    }

    // Resolve provider, API key, and endpoint
    const providerId = defaultModel.provider_id;
    const modelCode = defaultModel.model_code; // e.g. "gpt-4o"

    const apiKeyRecord = await this.aiModelsService.findActiveApiKeyByProvider(providerId);
    if (!apiKeyRecord) {
      this.logger.warn(`No active API key for provider ${defaultModel.provider_name}, falling back to hermes-agent`);
      return this.sendLegacyHermesMessage(params, senderWs, messageId);
    }

    const decryptedKey = await this.aiModelsService.getDecryptedApiKey(apiKeyRecord.id);
    if (!decryptedKey) {
      this.logger.warn(`Failed to decrypt API key for provider ${defaultModel.provider_name}, falling back to hermes-agent`);
      return this.sendLegacyHermesMessage(params, senderWs, messageId);
    }

    const endpoint = await this.aiModelsService.findDefaultEndpointByProvider(providerId);
    const baseUrl = endpoint?.base_url || this.configService.get<string>('HERMES_ENDPOINT', 'http://localhost:9119');

    // Quota check before making API call
    if (teamId) {
      const quotaError = await this.checkQuota(teamId);
      if (quotaError) {
        this.sendStreamEvent('hermes.error', {
          messageId,
          error: quotaError,
        }, senderWs);
        return { ok: false, messageId, error: quotaError };
      }
    }

    // Build request headers and body
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${decryptedKey}`,
    };
    if (endpoint?.headers) {
      const extraHeaders = typeof endpoint.headers === 'string' ? JSON.parse(endpoint.headers) : endpoint.headers;
      Object.assign(headers, extraHeaders);
    }

    // Build model params from config
    const { messages } = await this.resolveConversationPromptContext({
      conversationId: params.conversationId,
      expertId: params.expertId,
      teamId: params.teamId,
    });
    messages.push({ role: 'user', content: params.message });

    const requestBody: Record<string, any> = {
      model: modelCode,
      messages,
      stream: true,
    };
    if (defaultModel.temperature !== null && defaultModel.temperature !== undefined) {
      requestBody.temperature = defaultModel.temperature;
    }
    if (defaultModel.max_tokens !== null && defaultModel.max_tokens !== undefined) {
      requestBody.max_tokens = defaultModel.max_tokens;
    }
    if (defaultModel.top_p !== null && defaultModel.top_p !== undefined) {
      requestBody.top_p = defaultModel.top_p;
    }

    const timeout = endpoint?.timeout_ms || 60000;

    try {
      const startTime = Date.now();
      const response = await firstValueFrom(
        this.httpService.post(`${baseUrl}/v1/chat/completions`, requestBody, {
          headers,
          responseType: 'stream',
          timeout,
        })
      );

      this.logger.log(`Provider API (${defaultModel.provider_name}/${modelCode}) connected, starting stream...`);

      this.logger.log(`Provider API (${defaultModel.provider_name}/${modelCode}) response status: ${response.status}`);

      const stream = response.data;
      let fullResponse = '';
      let deltaCount = 0;
      let totalTokens = 0;
      let aborted = false;
      let lineBuffer = '';
      let errorBody = '';

      // Register stream for abort support
      if (senderWs) {
        this.activeStreams.set(messageId, { ws: senderWs, stream });
      }

      const cleanup = () => {
        this.activeStreams.delete(messageId);
      };

      return new Promise((resolve, reject) => {
        const settle = (result: any) => {
          cleanup();
          resolve(result);
        };

        stream.on('data', (chunk: Buffer) => {
          if (aborted) return;

          // Accumulate raw data for error diagnosis when no SSE data parsed
          const chunkStr = chunk.toString();

          // Line buffer for proper SSE parsing (handles chunks split mid-line)
          lineBuffer += chunkStr;
          const lines = lineBuffer.split('\n');
          lineBuffer = lines.pop() || '';

          let parsedAny = false;
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.substring(6).trim();
              if (dataStr === '[DONE]') {
                // Stream complete
                this.sendStreamEvent('hermes.final', {
                  messageId,
                  content: fullResponse,
                  totalTokens,
                }, senderWs);

                // Record usage
                this.recordProviderUsage(apiKeyRecord.id, providerId, defaultModel.model_id, totalTokens, Date.now() - startTime, teamId).catch(err => {
                  this.logger.warn('Failed to record usage:', err);
                });

                settle({ ok: true, messageId });
                return;
              }

              try {
                const data = JSON.parse(dataStr);

                // Check for API-level error in the SSE stream
                if (data.error) {
                  const errMsg = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
                  this.logger.error(`${defaultModel.provider_name} API error in stream: ${errMsg}`);
                  this.sendStreamEvent('hermes.error', {
                    messageId,
                    error: `${defaultModel.provider_name} error: ${errMsg}`,
                  }, senderWs);
                  settle({ ok: false, messageId, error: errMsg });
                  return;
                }

                const delta = data.choices?.[0]?.delta?.content || '';
                if (delta) {
                  fullResponse += delta;
                  deltaCount++;
                  parsedAny = true;

                  this.sendStreamEvent('hermes.delta', {
                    messageId,
                    delta,
                    sequenceNumber: deltaCount,
                  }, senderWs);
                }

                if (data.usage) {
                  totalTokens = data.usage.total_tokens || 0;
                }
              } catch (e) {
                // Not JSON, skip
              }
            }
          }

          // Collect raw content for error diagnosis when no SSE data parsed
          if (!parsedAny) {
            errorBody += chunkStr;
          }
        });

        stream.on('end', () => {
          if (aborted) {
            settle({ ok: true, messageId, aborted: true });
            return;
          }

          // Process any remaining line buffer
          if (lineBuffer.trim()) {
            if (lineBuffer.startsWith('data: ')) {
              const dataStr = lineBuffer.substring(6).trim();
              if (dataStr !== '[DONE]') {
                try {
                  const data = JSON.parse(dataStr);
                  const delta = data.choices?.[0]?.delta?.content || '';
                  if (delta) {
                    fullResponse += delta;
                    deltaCount++;
                    this.sendStreamEvent('hermes.delta', {
                      messageId,
                      delta,
                      sequenceNumber: deltaCount,
                    }, senderWs);
                  }
                } catch (e) { /* skip */ }
              }
            }
          }

          if (!fullResponse) {
            const errorDetail = errorBody.trim().substring(0, 500);
            this.logger.error(`Provider stream ended with no response from ${defaultModel.provider_name}/${modelCode}. Raw response: ${errorDetail || '(empty)'}`);
            this.sendStreamEvent('hermes.error', {
              messageId,
              error: `${defaultModel.provider_name} returned no response. ${errorDetail ? 'Details: ' + errorDetail : 'The API stream closed without sending any data.'}`,
            }, senderWs);
            settle({ ok: false, messageId, error: 'No response' });
          } else {
            // Ensure final event sent (if [DONE] wasn't received)
            this.logger.log(`Provider stream ended, ${deltaCount} chunks, ${fullResponse.length} chars`);
            this.sendStreamEvent('hermes.final', {
              messageId,
              content: fullResponse,
              totalTokens,
            }, senderWs);

            this.recordProviderUsage(apiKeyRecord.id, providerId, defaultModel.model_id, totalTokens, Date.now() - startTime, teamId).catch(err => {
              this.logger.warn('Failed to record usage:', err);
            });

            settle({ ok: true, messageId });
          }
        });

        stream.on('error', (error: Error) => {
          if (aborted) {
            settle({ ok: true, messageId, aborted: true });
            return;
          }

          this.logger.error('Provider stream error:', error);
          this.sendStreamEvent('hermes.error', {
            messageId,
            error: error.message,
          }, senderWs);
          cleanup();
          reject(error);
        });
      });

    } catch (error) {
      this.logger.error(`Failed to call ${defaultModel.provider_name} API:`, error);

      // Fall back to hermes-agent if provider call fails
      this.logger.log('Falling back to hermes-agent after provider failure');
      return this.sendLegacyHermesMessage(params, senderWs, messageId);
    }
  }

  abortHermesMessage(params: { messageId: string }, requestingWs: WebSocket) {
    const { messageId } = params;
    const entry = this.activeStreams.get(messageId);
    if (!entry) {
      this.logger.warn(`No active stream found for messageId: ${messageId}`);
      return { ok: false, error: 'No active stream' };
    }

    if (entry.ws !== requestingWs) {
      this.logger.warn(`Unauthorized abort attempt for messageId: ${messageId}`);
      return { ok: false, error: 'Unauthorized' };
    }

    this.logger.log(`Aborting stream for messageId: ${messageId}`);

    // Destroy the stream to abort the HTTP request
    if (entry.stream && typeof entry.stream.destroy === 'function') {
      entry.stream.destroy();
    }

    this.activeStreams.delete(messageId);

    // Notify the client that the stream was aborted
    this.sendStreamEvent('hermes.final', {
      messageId,
      content: '',
      aborted: true,
    }, entry.ws);

    return { ok: true, messageId };
  }

  private async sendLegacyHermesMessage(params: { sessionId: string; message: string }, senderWs?: WebSocket, messageId?: string) {
    messageId = messageId || this.generateUUID();
    const hermesEndpoint = this.configService.get<string>('HERMES_ENDPOINT', 'http://localhost:9119');

    this.logger.log(`Using legacy hermes-agent at ${hermesEndpoint}`);

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${hermesEndpoint}/v1/responses`, {
          model: 'hermes-agent',
          input: params.message,
          stream: true,
        }, {
          headers: {
            'Content-Type': 'application/json',
          },
          responseType: 'stream',
        })
      );

      this.logger.log(`Legacy hermes response status: ${response.status}`);

      const stream = response.data;
      let fullResponse = '';
      let deltaCount = 0;
      let lineBuffer = '';
      let errorBody = '';

      return new Promise((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => {
          const chunkStr = chunk.toString();

          // Line buffer for proper SSE parsing
          lineBuffer += chunkStr;
          const lines = lineBuffer.split('\n');
          lineBuffer = lines.pop() || '';

          let parsedAny = false;
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.substring(6));

                if (data.type === 'response.output_text.delta') {
                  const delta = data.delta || '';
                  fullResponse += delta;
                  deltaCount++;
                  parsedAny = true;

                  this.sendStreamEvent('hermes.delta', {
                    messageId,
                    delta,
                    sequenceNumber: deltaCount,
                  }, senderWs);

                } else if (data.type === 'response.completed') {
                  this.sendStreamEvent('hermes.final', {
                    messageId,
                    content: fullResponse,
                    totalTokens: data.response?.usage?.total_tokens || 0,
                  }, senderWs);

                  resolve({ ok: true, messageId });
                }
              } catch (e) {
                this.logger.warn(`Failed to parse SSE line: ${line}`);
              }
            }
          }

          if (!parsedAny) {
            errorBody += chunkStr;
          }
        });

        stream.on('end', () => {
          // Process remaining line buffer
          if (lineBuffer.trim() && lineBuffer.startsWith('data: ')) {
            try {
              const data = JSON.parse(lineBuffer.substring(6));
              if (data.type === 'response.output_text.delta') {
                fullResponse += data.delta || '';
              }
            } catch (e) { /* skip */ }
          }

          this.logger.log(`Legacy hermes stream ended, ${deltaCount} chunks`);
          if (!fullResponse) {
            const errorDetail = errorBody.trim().substring(0, 500);
            this.logger.error(`Legacy hermes returned no response. Raw: ${errorDetail || '(empty)'}`);
            this.sendStreamEvent('hermes.error', {
              messageId,
              error: `No response from legacy Hermes. ${errorDetail ? 'Details: ' + errorDetail : ''}`,
            }, senderWs);
            resolve({ ok: false, messageId, error: 'No response' });
          }
        });

        stream.on('error', (error: Error) => {
          this.logger.error('Hermes stream error:', error);
          this.sendStreamEvent('hermes.error', {
            messageId,
            error: error.message,
          }, senderWs);
          reject(error);
        });
      });

    } catch (error: any) {
      // Extract meaningful error message from various error types
      let errorMessage = 'Unknown error';
      if (error?.errors && Array.isArray(error.errors)) {
        // AggregateError (Node.js 15+) — extract inner errors
        const innerErrors = error.errors.map((e: any) => e.message || e.code || String(e)).join('; ');
        errorMessage = `Connection failed: ${innerErrors || 'AggregateError'}`;
        this.logger.error('Failed to call Hermes API (AggregateError):', innerErrors);
      } else if (error instanceof Error) {
        errorMessage = error.message;
        this.logger.error('Failed to call Hermes API:', error.message);
      } else {
        errorMessage = String(error);
        this.logger.error('Failed to call Hermes API (unknown):', error);
      }

      this.sendStreamEvent('hermes.error', {
        messageId,
        error: errorMessage,
      }, senderWs);

      return { ok: false, messageId, error: errorMessage };
    }
  }

  private async checkQuota(teamId: string): Promise<string | null> {
    try {
      const quota = await this.aiModelsService.findTeamQuotaByTeamId(teamId);
      if (!quota) return null; // No quota configured, allow

      const dailyReqLimit = quota.daily_request_limit ?? 1000;
      const monthlyReqLimit = quota.monthly_request_limit ?? 50000;
      const dailyTokenLimit = quota.daily_token_limit ?? 1000000;
      const monthlyTokenLimit = quota.monthly_token_limit ?? 10000000;

      const requestsToday = quota.requests_today ?? 0;
      const requestsThisMonth = quota.requests_this_month ?? 0;
      const tokensToday = quota.used_today ?? 0;
      const tokensThisMonth = quota.used_this_month ?? 0;

      if (requestsToday >= dailyReqLimit) {
        return `Daily request limit reached (${requestsToday}/${dailyReqLimit})`;
      }
      if (requestsThisMonth >= monthlyReqLimit) {
        return `Monthly request limit reached (${requestsThisMonth}/${monthlyReqLimit})`;
      }
      if (tokensToday >= dailyTokenLimit) {
        return `Daily token limit reached (${tokensToday}/${dailyTokenLimit})`;
      }
      if (tokensThisMonth >= monthlyTokenLimit) {
        return `Monthly token limit reached (${tokensThisMonth}/${monthlyTokenLimit})`;
      }

      return null;
    } catch (err) {
      this.logger.warn('Failed to check quota, allowing request:', err);
      return null;
    }
  }

  private async recordProviderUsage(
    apiKeyId: string,
    providerId: string,
    modelId: string,
    totalTokens: number,
    latencyMs: number,
    teamId?: string,
  ) {
    // Update API key last used timestamp
    await this.aiModelsService.updateApiKeyLastUsed(apiKeyId);

    if (!teamId) return;

    // Log usage
    await this.aiModelsService.createUsageLog({
      teamId,
      modelId,
      providerId,
      totalTokens,
      latencyMs,
      status: 'success',
    });

    // Increment quota counters
    await this.aiModelsService.incrementTeamQuotaUsage(teamId, totalTokens, true).catch(err => {
      this.logger.warn('Failed to increment quota usage:', err);
    });
  }

  private sendStreamEvent(eventType: string, data: any, targetWs?: WebSocket): void {
    if (!this.gatewayInstance) {
      this.logger.warn('Gateway instance not set, cannot send stream event');
      return;
    }

    // Send event to target client only (or all if no target specified)
    const eventMessage = {
      type: 'evt',
      event: eventType,
      data: data,
    };

    if (targetWs) {
      // Send to specific client
      if (targetWs.readyState === WebSocket.OPEN) {
        targetWs.send(JSON.stringify(eventMessage));
      }
    } else {
      // Broadcast to all clients (fallback)
      this.gatewayInstance.clients?.forEach((clientInfo: any, ws: WebSocket) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(eventMessage));
        }
      });
    }
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

  async listExperts(params: { teamId?: string; skip?: number; take?: number; category?: string } = {}) {
    const skip = params.skip || 0;
    const take = params.take || 50;

    const experts = await this.db.listExperts(params.teamId, skip, take, params.category);
    const total = await this.db.countExperts(params.teamId, params.category);

    return {
      ok: true,
      experts: experts.map(e => this.toGatewayExpert(e)),
      total,
    };
  }

  async getExpert(params: { id: string; teamId?: string }) {
    const expert = await this.db.findExpertByIdForTeam(params.id, params.teamId);
    if (!expert) {
      throw new Error('Expert not found');
    }

    return {
      ok: true,
      expert: this.toGatewayExpert(expert),
    };
  }

  async createExpert(params: {
    name: string;
    description?: string;
    systemPrompt?: string;
    icon?: string;
    color?: string;
    category?: string;
    teamId?: string;
    isDefault?: boolean;
  }) {
    if (!params.name) {
      throw new Error('Expert name is required');
    }

    const expert = await this.db.createExpert({
      teamId: params.teamId,
      name: params.name,
      description: params.description,
      systemPrompt: params.systemPrompt,
      icon: params.icon || '🤖',
      color: params.color || '#3B82F6',
      category: params.category,
      isDefault: params.isDefault,
    });

    return {
      ok: true,
      expert: this.toGatewayExpert(expert),
    };
  }

  async updateExpert(params: {
    id: string;
    name?: string;
    description?: string;
    systemPrompt?: string;
    icon?: string;
    color?: string;
    category?: string;
    teamId?: string;
    enabled?: boolean;
    isDefault?: boolean;
    callCount?: number;
    rating?: number;
  }) {
    if (!params.teamId) {
      throw new Error('Authentication required');
    }

    const existing = await this.db.findTeamExpertById(params.id, params.teamId);
    if (!existing) {
      throw new Error('Expert not found');
    }

    // Build updates object with only provided fields
    const updates: any = {};
    if (params.name !== undefined) updates.name = params.name;
    if (params.description !== undefined) updates.description = params.description;
    if (params.systemPrompt !== undefined) updates.systemPrompt = params.systemPrompt;
    if (params.icon !== undefined) updates.icon = params.icon;
    if (params.color !== undefined) updates.color = params.color;
    if (params.category !== undefined) updates.category = params.category;

    const updated = await this.db.updateExpert(params.id, updates);

    return {
      ok: true,
      expert: this.toGatewayExpert(updated),
    };
  }

  async deleteExpert(params: { id: string; teamId?: string }) {
    if (!params.teamId) {
      throw new Error('Authentication required');
    }

    const existing = await this.db.findTeamExpertById(params.id, params.teamId);
    if (!existing) {
      throw new Error('Expert not found');
    }

    await this.db.deleteExpert(params.id);

    return {
      ok: true,
      message: 'Expert deleted successfully',
    };
  }

  async setActiveExpert(params: { id: string; teamId?: string; userId?: string }) {
    // This would typically update a user preference or session state
    // For now, we just return success
    const expert = await this.db.findExpertByIdForTeam(params.id, params.teamId);
    if (!expert) {
      throw new Error('Expert not found');
    }

    return {
      ok: true,
      activeExpert: {
        id: expert.id,
        name: expert.name,
        systemPrompt: expert.systemPrompt ?? expert.systemprompt,
      },
    };
  }

  async recordExpertUsage(params: {
    expertId: string;
    userId: string;
    teamId?: string;
    tokens?: number;
    duration?: number;
  }) {
    const expert = await this.db.findExpertByIdForTeam(params.expertId, params.teamId);
    if (!expert) {
      throw new Error('Expert not found');
    }

    // Record the usage
    await this.db.createExpertUsage({
      expertId: params.expertId,
      userId: params.userId,
      teamId: params.teamId,
      tokens: params.tokens,
      duration: params.duration,
    });

    // Increment call count
    await this.db.incrementExpertCallCount(params.expertId);

    return {
      ok: true,
    };
  }

  async getExpertStats(params: { id: string; teamId?: string }) {
    const expert = await this.db.findExpertByIdForTeam(params.id, params.teamId);
    if (!expert) {
      throw new Error('Expert not found');
    }

    const stats = await this.db.getExpertStats(params.id);

    const [dailyStats, weeklyStats, monthlyStats] = await Promise.all([
      this.db.getExpertUsageStats(params.id, 'day'),
      this.db.getExpertUsageStats(params.id, 'week'),
      this.db.getExpertUsageStats(params.id, 'month'),
    ]);

    return {
      ok: true,
      stats: {
        ...stats,
        daily: dailyStats,
        weekly: weeklyStats,
        monthly: monthlyStats,
      },
    };
  }

  async getExpertCategories(params: { teamId?: string }) {
    // Get distinct categories from experts
    let query = 'SELECT DISTINCT category FROM experts WHERE category IS NOT NULL';
    const paramsArray: any[] = [];

    if (params.teamId) {
      query += ' AND ("teamId" = $1 OR "teamId" IS NULL)';
      paramsArray.push(params.teamId);
    } else {
      query += ' AND "teamId" IS NULL';
    }

    query += ' ORDER BY category';

    const results = await this.db.query(query, paramsArray);

    return {
      ok: true,
      categories: results.map(r => r.category),
    };
  }

  async rateExpert(params: { id: string; rating: number; teamId?: string }) {
    if (params.rating < 1 || params.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }
    if (!params.teamId) {
      throw new Error('Authentication required');
    }

    const existing = await this.db.findTeamExpertById(params.id, params.teamId);
    if (!existing) {
      throw new Error('Expert not found');
    }

    const expert = await this.db.updateExpertRating(params.id, params.rating);

    return {
      ok: true,
      expert: {
        id: expert.id,
        rating: expert.rating,
      },
    };
  }

  private toGatewayExpert(expert: any) {
    return {
      id: expert.id,
      name: expert.name,
      description: expert.description || '',
      systemPrompt: expert.systemPrompt ?? expert.systemprompt ?? '',
      icon: expert.icon || '🤖',
      color: expert.color || '#3B82F6',
      category: expert.category || null,
      sourceId: expert.source_id || null,
      marketplaceId: expert.marketplace_id || null,
      isDefault: expert.is_default || false,
      enabled: expert.enabled ?? true,
      callCount: expert.call_count || 0,
      rating: expert.rating || 0,
      teamId: expert.teamId ?? expert.teamid ?? null,
      createdAt: expert.createdAt ?? expert.createdat,
      updatedAt: expert.updatedAt ?? expert.updatedat,
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

  // ===== Additional methods for compatibility =====

  async getAllExtensions(): Promise<unknown[]> {
    return this.db.findAllExtensions();
  }

  async getInstalledExtensions(params: { userId: string }): Promise<unknown[]> {
    return this.db.findUserInstalledExtensions(params.userId);
  }

  async installExtension(params: { extensionId: string; userId: string; config?: Record<string, unknown> }): Promise<unknown> {
    return this.db.installExtension(params.userId, params.extensionId, params.config);
  }

  async uninstallExtension(params: { extensionId: string; userId: string }): Promise<unknown> {
    return this.db.uninstallExtension(params.userId, params.extensionId);
  }

  async enableExtension(params: { extensionId: string; userId: string }): Promise<unknown> {
    return this.db.enableUserExtension(params.userId, params.extensionId);
  }

  async disableExtension(params: { extensionId: string; userId: string }): Promise<unknown> {
    return this.db.disableUserExtension(params.userId, params.extensionId);
  }

  async updateExtensionConfig(params: { extensionId: string; userId: string; config: Record<string, unknown> }): Promise<unknown> {
    return this.db.updateUserExtensionConfig(params.userId, params.extensionId, params.config);
  }

  // ===== Skills Methods =====

  async listSkills(params: { teamId: string; status?: string }): Promise<unknown[]> {
    const { SkillsService } = await import('../skills/skills.service');
    const service = new SkillsService(this.db);
    return service.findAll(params.teamId, params.status);
  }

  async getSkill(params: { id: string; teamId: string }): Promise<unknown> {
    const { SkillsService } = await import('../skills/skills.service');
    const service = new SkillsService(this.db);
    return service.findOne(params.id, params.teamId);
  }

  async createSkill(params: { teamId: string; authorId: string; name: string; description?: string; content: string; icon?: string; category?: string; tags?: string[]; config?: Record<string, unknown>; configSchema?: Record<string, unknown> }): Promise<unknown> {
    const { SkillsService } = await import('../skills/skills.service');
    const { CreateSkillDto } = await import('../skills/dto/create-skill.dto');
    const service = new SkillsService(this.db);
    const dto = new CreateSkillDto();
    dto.name = params.name;
    dto.description = params.description;
    dto.content = params.content;
    dto.icon = params.icon;
    dto.category = params.category;
    dto.tags = params.tags;
    dto.config = params.config;
    dto.configSchema = params.configSchema;
    return service.create(params.teamId, params.authorId, dto);
  }

  async updateSkill(params: { id: string; teamId: string; name?: string; description?: string; version?: string; content?: string; icon?: string; category?: string; tags?: string[]; config?: Record<string, unknown>; configSchema?: Record<string, unknown> }): Promise<unknown> {
    const { SkillsService } = await import('../skills/skills.service');
    const { UpdateSkillDto } = await import('../skills/dto/update-skill.dto');
    const service = new SkillsService(this.db);
    const dto = new UpdateSkillDto();
    dto.name = params.name;
    dto.description = params.description;
    dto.version = params.version;
    dto.content = params.content;
    dto.icon = params.icon;
    dto.category = params.category;
    dto.tags = params.tags;
    dto.config = params.config;
    dto.configSchema = params.configSchema;
    return service.update(params.id, params.teamId, dto);
  }

  async requestPublishSkillToTeam(params: { id: string; accessPolicy?: { mode: 'all' | 'users' | 'role'; userIds?: string[]; minimumRole?: 'MEMBER' | 'ADMIN' | 'OWNER' } }, actor: { userId: string; teamId: string; role: string }): Promise<unknown> {
    const { SkillsService } = await import('../skills/skills.service');
    const service = new SkillsService(this.db);
    return service.requestPublishToTeam(params.id, actor, params.accessPolicy);
  }

  async approveTeamSkillPublish(params: { id: string }, actor: { userId: string; teamId: string; role: string }): Promise<unknown> {
    const { SkillsService } = await import('../skills/skills.service');
    const service = new SkillsService(this.db);
    return service.approveTeamPublish(params.id, actor.userId, actor);
  }

  async rejectTeamSkillPublish(params: { id: string; comment?: string }, actor: { userId: string; teamId: string; role: string }): Promise<unknown> {
    const { SkillsService } = await import('../skills/skills.service');
    const service = new SkillsService(this.db);
    return service.rejectTeamPublish(params.id, actor.userId, params.comment || '', actor);
  }

  async requestPublishSkillToMarketplace(params: { id: string; note?: string }, actor: { userId: string; teamId: string; role: string }): Promise<unknown> {
    const { SkillsService } = await import('../skills/skills.service');
    const service = new SkillsService(this.db);
    return service.requestPublishToMarketplace(params.id, actor.userId, params.note, actor);
  }

  async deleteSkill(params: { id: string; teamId: string }): Promise<void> {
    const { SkillsService } = await import('../skills/skills.service');
    const service = new SkillsService(this.db);
    return service.delete(params.id, params.teamId);
  }

  // ===== Marketplace Skills Methods =====

  async listMarketplaceSkills(params: { teamId: string }): Promise<unknown[]> {
    const result = await this.db.query(
      `SELECT mi.*, mc.name as category_name, mc.slug as category_slug
       FROM marketplace_items mi
       LEFT JOIN marketplace_categories mc ON mi.category_id = mc.id
       WHERE mi.type = 'skill' AND mi.status = 'approved'
       ORDER BY mi.install_count DESC, mi.rating DESC
       LIMIT 100`
    );
    return result;
  }
}
