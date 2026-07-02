import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { HttpService } from '@nestjs/axios';
import { AiModelsService } from '../ai-models/ai-models.service';
import { QuotaService } from '../quota/quota.service';
import { SkillsService } from '../skills/skills.service';
import { WebSocket } from 'ws';
import * as fs from 'fs';
import * as path from 'path';
import { GatewayConnectionService } from './gateway-connection.service';
import { GatewayUsageService } from './gateway-usage.service';
import { GatewayProviderResolutionService } from './gateway-provider-resolution.service';
import { GatewayExtensionsService } from './gateway-extensions.service';
import { GatewayPromptContextService } from './gateway-prompt-context.service';
import { GatewayLingqiService } from './gateway-lingqi.service';
import { GatewayHermesService } from './gateway-hermes.service';

/**
 * Thin facade for the gateway cluster. All ~50 cluster public methods are
 * dynamically copied onto this instance via the `copyPrototypeMethods`
 * helper in the constructor, so `gateway.gateway.ts` keeps calling
 * `service.connect()` / `service.login()` / `service.sendHermesMessage()` /
 * `service.getAllExtensions()` without changes. The 2 facade-only methods
 * (`setGatewayInstance`, `sendStreamEvent`) sit alongside the assigned
 * methods, as do the inline `generateConfig` + 7 conversation/config/usage
 * methods that don't fit any cluster.
 *
 * Facade-private state (double-spend guards):
 *   - `activeStreams` Map — owned by facade, shared with hermesService
 *     via HermesStateCallbacks (slice 6). After Object.assign the
 *     cluster's `state.setActiveStream(...)` still mutates the same
 *     facade-owned map.
 *   - `refundedLingqiMessages` Set — owned by facade, shared with
 *     lingqiService via LingqiStateCallbacks (slice 6).
 */
@Injectable()
export class GatewayService {
  private gatewayInstance: any = null;
  private readonly logger = new Logger(GatewayService.name);
  private readonly activeStreams = new Map<string, unknown>();
  private readonly refundedLingqiMessages = new Set<string>();
  private declare httpService: HttpService;

  constructor(
    private db: DatabaseService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private _httpService: HttpService,
    private aiModelsService: AiModelsService,
    private quotaService: QuotaService,
    private skillsService: SkillsService,
    private readonly connectionService: GatewayConnectionService,
    private readonly usageService: GatewayUsageService,
    private readonly providerResolutionService: GatewayProviderResolutionService,
    private readonly extensionsService: GatewayExtensionsService,
    private readonly promptContextService: GatewayPromptContextService,
    private readonly lingqiService: GatewayLingqiService,
    private readonly hermesService: GatewayHermesService,
  ) {
    // Why a custom helper instead of plain `Object.assign(this, cluster)`:
    // `Object.assign` only copies OWN enumerable properties; TypeScript
    // `async methodName() {}` puts methods on the PROTOTYPE so plain
    // Object.assign silently drops them. We walk each cluster's prototype
    // and install own, writable, configurable properties bound to the
    // cluster instance — `jest.spyOn(service, 'm')` can then override
    // them at test time (AC-12).
    for (const cluster of [
      this.connectionService,
      this.usageService,
      this.providerResolutionService,
      this.extensionsService,
      this.promptContextService,
      this.lingqiService,
      this.hermesService,
    ]) this.copyPrototypeMethods(cluster);

    // Spec contract: ~30 spec tests mutate `(service as any).httpService = X`
    // to inject a stubbed HttpService. The cluster's `httpService` is a
    // private field, so we define a write-through accessor on the facade
    // that updates both the local ref AND `hermesService.httpService`
    // (the only cluster that consumes it directly).
    let httpRef: HttpService = this._httpService;
    Object.defineProperty(this, 'httpService', {
      configurable: true,
      enumerable: true,
      get: () => httpRef,
      set: (v: HttpService) => {
        httpRef = v;
        (this.hermesService as unknown as { httpService: HttpService }).httpService = v;
      },
    });
  }

  setGatewayInstance(gatewayInstance: any): void {
    this.gatewayInstance = gatewayInstance;
    this.logger.log('Gateway instance reference set');
  }

  /** Copy public instance methods from `source` (a cluster service) onto
   *  `this` (the facade) as own, writable, configurable properties bound
   *  to the cluster instance. See constructor comment for rationale. */
  private copyPrototypeMethods(source: object): void {
    const proto = Object.getPrototypeOf(source);
    if (!proto || proto === Object.prototype) return;
    this.copyPrototypeMethods(proto);
    for (const name of Object.getOwnPropertyNames(proto)) {
      if (name === 'constructor') continue;
      const d = Object.getOwnPropertyDescriptor(proto, name);
      if (!d || typeof d.value !== 'function' || name.startsWith('_')) continue;
      Object.defineProperty(this, name, { value: d.value.bind(source), writable: true, enumerable: false, configurable: true });
    }
  }

  /** Facade-only stream broadcaster — reads `this.gatewayInstance` set by
   *  `setGatewayInstance`. Cluster methods receive this as the
   *  `sendStreamEvent` state callback (slice 6 contract) so they broadcast
   *  without touching the facade instance directly. */
  private sendStreamEvent(eventType: string, data: unknown, targetWs?: WebSocket): void {
    if (!this.gatewayInstance && !targetWs) {
      this.logger.warn('Gateway instance not set, cannot send stream event');
      return;
    }
    const eventMessage = { type: 'evt', event: eventType, data };
    const send = (ws: WebSocket) => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(eventMessage)); };
    if (targetWs) send(targetWs);
    else this.gatewayInstance.clients?.forEach((_: unknown, ws: WebSocket) => send(ws));
  }

  // ===========================================================================
  // Facade-only methods (no cluster fits): conversation CRUD, config file I/O,
  // and aggregate usage/quota reads. Each calls `this.db` directly. These
  // methods were inline on the slice-7 facade and have no natural cluster
  // owner. They are NOT pass-throughs — each has its own implementation, so
  // slice-8 leaves them as facade methods rather than extracting to a new
  // cluster service.
  // ===========================================================================

  async getQuota(params: { teamId?: string }) {
    const teamId = params.teamId;
    if (!teamId) throw new Error('teamId is required');
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
      conversations: conversations.map((c: any) => ({
        id: c.id, teamId: c.teamId, title: c.title, platform: c.platform,
        sessionId: c.sessionId, messageCount: parseInt(c.message_count || '0', 10),
        createdAt: c.createdAt, updatedAt: c.updatedAt,
      })),
      total,
    };
  }

  async createConversation(params: { teamId: string; userId: string; title: string; platform?: string }) {
    const conversation = await this.db.createConversation({
      teamId: params.teamId, userId: params.userId, title: params.title, platform: params.platform,
    });
    return { ok: true, conversation: { id: conversation.id, teamId: conversation.teamId, title: conversation.title, platform: conversation.platform, createdAt: conversation.createdAt } };
  }

  async getConversation(params: { conversationId: string; teamId: string }) {
    const conversation = await this.db.findConversationById(params.conversationId, params.teamId);
    if (!conversation) throw new Error('Conversation not found');
    return { ok: true, conversation: { id: conversation.id, teamId: conversation.teamId, title: conversation.title, platform: conversation.platform, sessionId: conversation.sessionId, createdAt: conversation.createdAt, updatedAt: conversation.updatedAt } };
  }

  async updateConversation(params: { conversationId: string; teamId: string; title?: string }) {
    const existing = await this.db.findConversationById(params.conversationId, params.teamId);
    if (!existing) throw new Error('Conversation not found');
    const conversation = await this.db.updateConversation(params.conversationId, { title: params.title });
    return { ok: true, conversation: { id: conversation.id, title: conversation.title } };
  }

  async deleteConversation(params: { conversationId: string; teamId: string }) {
    const existing = await this.db.findConversationById(params.conversationId, params.teamId);
    if (!existing) throw new Error('Conversation not found');
    await this.db.deleteMessagesByConversationId(params.conversationId);
    await this.db.deleteConversation(params.conversationId);
    return { ok: true };
  }

  async getMessages(params: { conversationId: string; teamId: string }) {
    const existing = await this.db.findConversationById(params.conversationId, params.teamId);
    if (!existing) throw new Error('Conversation not found');
    const messages = await this.db.findMessagesByConversationId(params.conversationId);
    return { ok: true, messages: messages.map((m: any) => ({ id: m.id, conversationId: m.conversationId, role: m.role, content: m.content, model: m.model, usage: m.usage, createdAt: m.createdAt })) };
  }

  private configPath(): string {
    return process.env.OPENCLAW_CONFIG_PATH ||
      (process.platform === 'win32' ? 'C:\\Users\\smallMark\\.openclaw\\openclaw.json' : '/app/config/openclaw.json');
  }

  async getConfig(_params: { key?: string }) {
    const configPath = this.configPath();
    try {
      if (fs.existsSync(configPath)) {
        const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        return { ok: true, config: parsed, parsed, hash: 'current-hash', path: configPath };
      }
      return { ok: true, config: {}, parsed: {}, hash: 'empty-hash', path: configPath };
    } catch (error) {
      this.logger.error(`Failed to read config: ${error}`);
      return { ok: true, config: {}, parsed: {}, hash: 'error-hash', path: configPath };
    }
  }

  async patchConfig(_params: { key: string; value: any }) {
    return { ok: true, message: 'Config updated' };
  }

  async setConfig(params: { raw?: string; baseHash?: string }) {
    const configPath = this.configPath();
    this.logger.log(`Config.set called with raw length: ${params.raw?.length || 0}`);
    try {
      const configDir = path.dirname(configPath);
      if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(configPath, params.raw || '{}', 'utf-8');
      return { ok: true, needsRestart: true, message: 'Config saved successfully' };
    } catch (error) {
      return { ok: true, needsRestart: false, message: `Config saved but restart required: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  async getUsageStatus(params: { teamId: string; period?: 'day' | 'week' | 'month' }) {
    const period = params.period || 'month';
    const stats = await this.db.getUsageStats(period, params.teamId);
    const [dailyStats, weeklyStats, monthlyStats] = await Promise.all([
      this.db.getUsageStats('day', params.teamId),
      this.db.getUsageStats('week', params.teamId),
      this.db.getUsageStats('month', params.teamId),
    ]);
    return { ok: true, period, totalCost: stats.totalCost || 0, totalTokens: stats.totalTokens || 0, requestCount: stats.requestCount || 0, breakdown: stats.breakdown || [], daily: dailyStats, weekly: weeklyStats, monthly: monthlyStats };
  }

  async getQuotaConfig(params: { teamId?: string } = {}) {
    const teamId = params.teamId;
    if (!teamId) return { ok: true, monthlyBudget: 200, warningThreshold: 0.8, hardLimit: true };
    const quota = await this.db.findQuotaByTeamId(teamId);
    return { ok: true, monthlyBudget: quota?.totalAmt ? Number(quota.totalAmt) : 200, warningThreshold: 0.8, hardLimit: true };
  }

  async updateQuotaConfig(params: { teamId?: string; monthlyBudget?: number; warningThreshold?: number; hardLimit?: boolean }) {
    this.logger.log(`Quota config update requested (team-agnostic mode): ${JSON.stringify(params)}`);
    return { ok: true, message: 'Quota config updated (client-side only)' };
  }

  // Facade-only — not delegated to a cluster. `generateConfig` was retained
  // here at slice 7 because it didn't fit any cluster's responsibility
  // boundary (it touches httpService + provider creds + SSE response parsing,
  // not really part of hermes/lingqi/connection/usage). Keeping the body
  // here preserves the gateway.service.ts file size constraint (this method
  // is ~210L but is the last remaining inline business logic on the facade
  // and was approved to stay in the slice-7 cleanup).
  async generateConfig(params: { teamId?: string; type: 'expert' | 'skill'; description: string; conversationHistory?: { role: 'user' | 'assistant'; content: string }[] }, senderWs: WebSocket): Promise<{ ok: boolean; streamId: string }> {
    const { generateUUID: generateUUIDHelper, normalizeProviderBaseUrl, isMiniMaxAnthropicProvider: isMiniMaxHelper, extractProviderTextDelta } = await import('./gateway.helpers');
    return this._generateConfigImpl(params, senderWs, generateUUIDHelper, normalizeProviderBaseUrl, isMiniMaxHelper, extractProviderTextDelta);
  }

  // generateConfig implementation lives here to keep the public method line
  // minimal and bound to the cluster's dependencies. Delegates the
  // SSE/provider plumbing to a private helper.
  private async _generateConfigImpl(
    params: any,
    senderWs: WebSocket,
    generateUUID: () => string,
    normalizeProviderBaseUrl: (url: string) => string,
    isMiniMaxHelper: (model: unknown, baseUrl: string) => boolean,
    extractProviderTextDelta: (data: unknown) => string,
  ): Promise<{ ok: boolean; streamId: string }> {
    const { firstValueFrom } = await import('rxjs');
    const streamId = generateUUID();
    const systemPrompt = params.type === 'expert'
      ? `你是一个AI助手，帮助用户创建"宗主"（Expert）配置。\n用户会描述他们需要什么样的专家，你需要根据描述生成对应的配置JSON。\n\n输出要求：\n- 返回一个JSON对象，包含以下字段：\n  - name: 专家名称（简短有力，2-6个汉字）\n  - description: 专家描述（一句话说明专长）\n  - systemPrompt: 系统提示词（详细定义专家的行为和能力，至少200字）\n  - icon: emoji图标（从常用emoji中选择最合适的）\n  - color: 主题色（从以下预设中选择最匹配的：#3B82F6, #8B5CF6, #EC4899, #EF4444, #F97316, #EAB308, #22C55E, #14B8A6, #06B6D4, #6366F1, #A855F7, #F43F5E）\n\n请将JSON包裹在 \`\`\`json ... \`\`\` 代码块中。只输出JSON，不要输出其他内容。`
      : `你是一个AI助手，帮助用户创建"技能"（Skill）配置。\n用户会描述他们需要什么样的技能，你需要根据描述生成对应的配置JSON。\n\n输出要求：\n- 返回一个JSON对象，包含以下字段：\n  - name: 技能名称（简短有力）\n  - description: 技能描述（一句话说明用途）\n  - content: 技能内容/指令（详细的系统提示词，至少200字）\n  - icon: emoji图标\n  - category: 分类（从以下选择：development, productivity, tools, writing, analytics）\n  - tags: 标签数组（2-5个相关标签）\n  - version: 版本号（默认 "1.0.0"）\n\n请将JSON包裹在 \`\`\`json ... \`\`\` 代码块中。只输出JSON，不要输出其他内容。`;

    const messages: { role: string; content: string }[] = [{ role: 'system', content: systemPrompt }];
    if (params.conversationHistory && params.conversationHistory.length > 0) {
      for (const m of params.conversationHistory) messages.push({ role: m.role, content: m.content });
    }
    messages.push({ role: 'user', content: params.description });

    this.logger.log(`generateConfig: type=${params.type}, streamId=${streamId}`);

    const defaultModel = await (this.providerResolutionService as any).findDefaultGenerateModel(params.teamId);
    if (!defaultModel) {
      this.sendStreamEvent('generate.error', { streamId, error: 'No available AI model configured' }, senderWs);
      return { ok: false, streamId };
    }

    const apiKeyRecord = await this.aiModelsService.findActiveApiKeyByProvider(defaultModel.provider_id);
    if (!apiKeyRecord) {
      this.sendStreamEvent('generate.error', { streamId, error: 'No active API key for provider' }, senderWs);
      return { ok: false, streamId };
    }
    const decryptedKey = await this.aiModelsService.getDecryptedApiKey(apiKeyRecord.id);
    if (!decryptedKey) {
      this.sendStreamEvent('generate.error', { streamId, error: 'Failed to decrypt API key' }, senderWs);
      return { ok: false, streamId };
    }
    const endpoint = await this.aiModelsService.findDefaultEndpointByProvider(defaultModel.provider_id);
    if (!endpoint?.base_url) {
      this.sendStreamEvent('generate.error', { streamId, error: 'No active endpoint configured' }, senderWs);
      return { ok: false, streamId };
    }
    let baseUrl: string;
    try { baseUrl = normalizeProviderBaseUrl(endpoint.base_url); } catch {
      this.sendStreamEvent('generate.error', { streamId, error: 'Invalid provider endpoint URL' }, senderWs);
      return { ok: false, streamId };
    }
    const isMiniMax = isMiniMaxHelper(defaultModel, baseUrl);
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${decryptedKey}` };
    if (isMiniMax) headers['anthropic-version'] = '2023-06-01';
    try {
      if (endpoint?.headers) {
        const extra = typeof endpoint.headers === 'string' ? JSON.parse(endpoint.headers) : endpoint.headers;
        Object.assign(headers, extra);
      }
    } catch { /* ignore */ }

    const systemMessages = messages.filter((m) => m.role === 'system');
    const providerMessages = isMiniMax ? messages.filter((m) => m.role !== 'system') : messages;
    const requestBody: any = { model: defaultModel.model_id, messages: providerMessages, stream: true };
    if (isMiniMax && systemMessages.length > 0) {
      const sysText = systemMessages.map((m) => m.content).filter((c): c is string => typeof c === 'string' && c.trim().length > 0).join('\n\n');
      if (sysText) requestBody.system = sysText;
    }
    if (defaultModel.temperature != null) requestBody.temperature = defaultModel.temperature;
    if (defaultModel.max_tokens != null) requestBody.max_tokens = defaultModel.max_tokens;
    else if (isMiniMax) requestBody.max_tokens = 2048;
    if (defaultModel.top_p != null) requestBody.top_p = defaultModel.top_p;

    const timeout = endpoint?.timeout_ms || 60000;
    try {
      const providerRequestPath = isMiniMax ? '/v1/messages' : '/v1/chat/completions';
      const response = await firstValueFrom(this.httpService.post(`${baseUrl}${providerRequestPath}`, requestBody, {
        headers, responseType: 'stream', timeout, maxRedirects: 0,
      }));
      this.logger.log(`generateConfig: provider connected (${defaultModel.provider_name}/${defaultModel.model_id})`);
      const stream = response.data;
      let fullResponse = '';
      let lineBuffer = '';
      return new Promise((resolve) => {
        let settled = false;
        const settle = (r: { ok: boolean; streamId: string }) => { if (!settled) { settled = true; resolve(r); } };
        stream.on('data', (chunk: Buffer) => {
          if (settled) return;
          lineBuffer += chunk.toString();
          const lines = lineBuffer.split('\n');
          lineBuffer = lines.pop() || '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) continue;
            const payload = trimmed.slice(5).trim();
            if (payload === '[DONE]') continue;
            try {
              const data = JSON.parse(payload);
              const delta = extractProviderTextDelta(data);
              if (delta) { fullResponse += delta; this.sendStreamEvent('generate.delta', { streamId, delta }, senderWs); }
            } catch { /* skip */ }
          }
        });
        stream.on('end', () => {
          if (lineBuffer.trim()) {
            const trimmed = lineBuffer.trim();
            if (trimmed.startsWith('data:')) {
              const payload = trimmed.slice(5).trim();
              if (payload !== '[DONE]') {
                try { const data = JSON.parse(payload); const delta = extractProviderTextDelta(data); if (delta) fullResponse += delta; } catch { /* skip */ }
              }
            }
          }
          this.sendStreamEvent('generate.final', { streamId, content: fullResponse }, senderWs);
          settle({ ok: true, streamId });
        });
        stream.on('error', (error: Error) => {
          this.logger.error('generateConfig stream error:', error);
          this.sendStreamEvent('generate.error', { streamId, error: error.message || 'Stream error' }, senderWs);
          settle({ ok: false, streamId });
        });
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Provider request failed';
      this.logger.error('generateConfig request failed:', error);
      this.sendStreamEvent('generate.error', { streamId, error: msg }, senderWs);
      return { ok: false, streamId };
    }
  }
}

/**
 * TypeScript declaration-merging shim: at runtime, the constructor above
 * copies every public method of each cluster service onto the facade
 * instance (see `copyPrototypeMethods`). The static type of `GatewayService`
 * however sees only the methods declared in the class body. To keep
 * `gateway.gateway.ts` and the spec type-checked (since they call
 * `service.connect()`, `service.listSkills()`, etc. without `as any` casts),
 * we declare-merge interfaces with the same name as the class, picking
 * the public method surface from each cluster service.
 *
 * This is a compile-time shadow only — at runtime the methods are supplied
 * by the `Object.assign`-style copy in the constructor. The interface never
 * instantiates; it only widens the class type so call sites compile.
 *
 * We use one interface per cluster because TypeScript forbids
 * `interface GatewayService extends Pick<GatewayService, ...>` (circular
 * reference), but `interface GatewayService extends Pick<ClusterService, ...>`
 * is allowed since the cluster is a different type.
 *
 * AC-7 ("TypeScript 编译 clean") is satisfied by this shim; AC-9
 * ("gateway.gateway.ts 0 changes") is satisfied because callers see the
 * cluster methods without modification.
 */
type PublicMethodKeys<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

// eslint-disable-next-line @typescript-eslint/no-merged-interface
export interface GatewayService extends Pick<GatewayConnectionService, PublicMethodKeys<GatewayConnectionService>> {}
// eslint-disable-next-line @typescript-eslint/no-merged-interface
export interface GatewayService extends Pick<GatewayUsageService, PublicMethodKeys<GatewayUsageService>> {}
// eslint-disable-next-line @typescript-eslint/no-merged-interface
export interface GatewayService extends Pick<GatewayProviderResolutionService, PublicMethodKeys<GatewayProviderResolutionService>> {}
// eslint-disable-next-line @typescript-eslint/no-merged-interface
export interface GatewayService extends Pick<GatewayExtensionsService, PublicMethodKeys<GatewayExtensionsService>> {}
// eslint-disable-next-line @typescript-eslint/no-merged-interface
export interface GatewayService extends Pick<GatewayPromptContextService, PublicMethodKeys<GatewayPromptContextService>> {}
// eslint-disable-next-line @typescript-eslint/no-merged-interface
export interface GatewayService extends Pick<GatewayLingqiService, PublicMethodKeys<GatewayLingqiService>> {}
// eslint-disable-next-line @typescript-eslint/no-merged-interface
export interface GatewayService extends Pick<GatewayHermesService, PublicMethodKeys<GatewayHermesService>> {}
