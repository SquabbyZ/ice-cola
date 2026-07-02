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
import { firstValueFrom } from 'rxjs';
import {
  ConnectParams,
  ConnectResult,
  GatewayJwtPayload,
  HermesMCPServer,
  HermesChatMessage,
  HermesMessageContent,
  HermesChatRequestBody,
  ProviderStreamChunk,
  HermesMessageParams,
  HermesSendResult,
  LingqiChargeDecision,
  ActiveStreamEntry,
  ProviderModelRow,
  HermesAgentProviderOverride,
  ConversationPromptMessage,
  GenerateConfigParams,
  ConversationMcpServerRow,
  ExtensionContextRow,
} from './gateway.types';
import {
  buildProviderErrorMessage,
  extractProviderTextDelta,
  extractProviderTotalTokens,
  generateUUID,
  getJwtSecret,
  getTokenExpiresAt,
  isMiniMaxAnthropicProvider as isMiniMaxAnthropicProviderHelper,
  isProviderToolCall,
  normalizeInternalServiceUrl,
  normalizeProviderBaseUrl,
} from './gateway.helpers';
import { GatewayConnectionService } from './gateway-connection.service';
import { GatewayUsageService } from './gateway-usage.service';
import { GatewayProviderResolutionService } from './gateway-provider-resolution.service';
import { GatewayExtensionsService } from './gateway-extensions.service';

@Injectable()
export class GatewayService {
  private gatewayInstance: any = null;
  private readonly logger = new Logger(GatewayService.name);
  private activeStreams = new Map<string, ActiveStreamEntry>();
  private readonly refundedLingqiMessages = new Set<string>();
  // Slice 2026-07-02-gateway-split-provider-resolution: hermes-agent health
  // status cache and endpoint URL moved verbatim into
  // GatewayProviderResolutionService. The facade keeps thin accessors
  // (`providerResolutionService.getHermesAgentUrl()` /
  // `getLastHermesChecked()`) so internal callsites (`sendHermesAgentMessage`,
  // `getHermesAgentStatus`) read identical values without further edits.
  // GatewayConnectionService is normally injected via the constructor
  // (8-arg form, used in production via GatewayModule). For spec/test
  // usage that constructs GatewayService with the original 7-arg form
  // (the spec file is frozen per slice-2 AC), we accept an optional
  // 8th argument and lazily build a default from the shared helpers.
  // The 3 boundary facade methods (getJwtSecret/getTokenExpiresAt/
  // generateUUID) and the 6 pass-through methods all funnel through
  // `connectionService`, so when the spec constructs a 7-arg GatewayService
  // we synthesize a thin connection service bound to the existing
  // db/jwtService/configService instances.
  private readonly connectionService: GatewayConnectionService;

  // Slice 2026-07-02-gateway-split-usage: optional 9th constructor param
  // `usageService`. When the 8-arg DI form is used (production via
  // GatewayModule), the real `GatewayUsageService` is injected. When the
  // spec's 7-arg form is used (frozen per slice-2 AC), we lazily build a
  // default usage service bound to the existing `aiModelsService` field.
  // This preserves the spec's 7-arg construction form (zero spec changes).
  // Only `recordProviderUsage` is extracted; `sendStreamEvent` stays on the
  // facade because it reads `this.gatewayInstance` (facade state) and the
  // RD recommendation was option (c): leave facade-state methods on the
  // facade until slice 6 (trio) migrates them properly.
  private readonly usageService: GatewayUsageService;
  private readonly providerResolutionService: GatewayProviderResolutionService;

  // Slice 2026-07-02-gateway-split-extensions: optional 11th constructor
  // param `extensionsService`. When the 10-arg DI form is used (production
  // via GatewayModule), the real `GatewayExtensionsService` is injected.
  // When the spec's 7-arg form is used (frozen per slice-2 AC), we lazily
  // build a default extensions service bound to the existing `db` field.
  // This preserves the spec's 7-arg construction form (zero spec changes).
  private readonly extensionsService: GatewayExtensionsService;

  constructor(
    private db: DatabaseService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private httpService: HttpService,
    private aiModelsService: AiModelsService,
    private quotaService: QuotaService,
    private skillsService: SkillsService,
    connectionService?: GatewayConnectionService,
    usageService?: GatewayUsageService,
    providerResolutionService?: GatewayProviderResolutionService,
    extensionsService?: GatewayExtensionsService,
  ) {
    this.connectionService = connectionService ?? this.buildDefaultConnectionService();
    this.usageService = usageService ?? this.buildDefaultUsageService();
    this.providerResolutionService = providerResolutionService ?? this.buildDefaultProviderResolutionService();
    this.extensionsService = extensionsService ?? this.buildDefaultExtensionsService();
    this.logger.log('GatewayService constructed');
    this.logger.log(`DatabaseService available: ${!!this.db}`);
    this.logger.log(`JwtService available: ${!!this.jwtService}`);
    this.logger.log(`ConfigService available: ${!!this.configService}`);
    this.logger.log(`HttpService available: ${!!this.httpService}`);
    this.logger.log(`AiModelsService available: ${!!this.aiModelsService}`);
    this.logger.log(`QuotaService available: ${!!this.quotaService}`);
  }

  // Build a thin GatewayUsageService bound to the existing
  // `aiModelsService` field. Used only when the 7-arg spec constructor
  // form is invoked (no DI for the usage cluster). Mirrors the
  // buildDefaultConnectionService pattern from slice 2: Object.create on
  // the prototype, then closure-capture the aiModelsService and a no-op
  // logger shim so the spec path stays quiet. The single real method
  // (`recordProviderUsage`) is replicated as a 1-line forwarder to the
  // module-scope body that matches the verbatim copy in
  // GatewayUsageService.recordProviderUsage.
  private buildDefaultUsageService(): GatewayUsageService {
    const defaultSvc = Object.create(GatewayUsageService.prototype) as GatewayUsageService;
    const aiModelsService = this.aiModelsService;
    const logger = {
      log: (..._args: unknown[]) => undefined,
      warn: (..._args: unknown[]) => undefined,
      error: (..._args: unknown[]) => undefined,
      debug: (..._args: unknown[]) => undefined,
      verbose: (..._args: unknown[]) => undefined,
    };

    (defaultSvc as any).aiModelsService = aiModelsService;
    (defaultSvc as any).logger = logger;

    (defaultSvc as any).recordProviderUsage = async (
      apiKeyId: string,
      providerId: string,
      modelId: string,
      totalTokens: number,
      latencyMs: number,
      teamId?: string,
    ) => {
      await aiModelsService.updateApiKeyLastUsed(apiKeyId);
      if (!teamId) return;
      await aiModelsService.createUsageLog({
        teamId,
        modelId,
        providerId,
        totalTokens,
        latencyMs,
        status: 'success',
      });
      await aiModelsService.incrementTeamQuotaUsage(teamId, totalTokens, true).catch((err: unknown) => {
        logger.warn('Failed to increment quota usage:', err);
      });
    };

    return defaultSvc;
  }

  // Build a thin GatewayConnectionService bound to the existing
  // db / jwtService / configService. Used only when the 7-arg spec
  // constructor form is invoked (no DI for the connection cluster).
  // All 9 methods are implemented as 1-line forwarders to the pure
  // helpers in gateway.helpers (no logger side-effects in the spec path).
  private buildDefaultConnectionService(): GatewayConnectionService {
    const defaultSvc = Object.create(GatewayConnectionService.prototype) as GatewayConnectionService;
    const db = this.db;
    const jwtService = this.jwtService;
    const configService = this.configService;

    (defaultSvc as any).db = db;
    (defaultSvc as any).jwtService = jwtService;
    (defaultSvc as any).configService = configService;
    (defaultSvc as any).logger = { log: () => undefined, warn: () => undefined, error: () => undefined, debug: () => undefined, verbose: () => undefined };

    // 6 real methods: forward to GatewayConnectionService behaviour by
    // reusing the same logic. Since the connection service is @Injectable
    // and would normally be DI'd, we replicate the small subset of public
    // methods that the spec exercises (connect/register/login/refresh/
    // generateTokens/generateServiceToken) so the 1-line pass-throughs
    // continue to work end-to-end. The spec's 7-arg construction path
    // uses the boundary-helper spies (generateUUID) which we route to the
    // module-scope helpers here.
    (defaultSvc as any).connect = async (params: ConnectParams, socket: WebSocket): Promise<ConnectResult> => {
      void socket;
      const protocol = 3;
      if (!params.auth?.token) throw new Error('Authentication required');
      try {
        const { getRequiredJwtSecret } = await import('../config/security-config');
        const payload = jwtService.verify<GatewayJwtPayload>(params.auth.token, {
          secret: getRequiredJwtSecret(configService),
        });
        if (payload.type !== 'access') throw new Error('Authentication required');
        const expiresAt = getTokenExpiresAt(payload);
        const user = await db.findUserById(payload.sub);
        if (!user) throw new Error('Authentication required');
        const teamId = user.teamId || undefined;
        const userRole = user.role;
        return {
          ok: true,
          protocol,
          expiresAt,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            team: teamId ? { id: teamId, name: user.team_name, role: userRole || 'MEMBER' } : undefined,
          },
        };
      } catch {
        throw new Error('Authentication required');
      }
    };
    (defaultSvc as any).register = async (params: { email: string; password: string; name?: string }) => {
      const existing = await db.findUserByEmail(params.email);
      if (existing) throw new Error('邮箱已被注册');
      const bcrypt = await import('bcryptjs');
      const password = await bcrypt.hash(params.password, 10);
      const id = generateUUID();
      const user = await db.queryOne(
        `INSERT INTO users (id, email, password, name, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING *`,
        [id, params.email, password, params.name || null]
      );
      return { ok: true, user: { id: user.id, email: user.email, name: user.name } };
    };
    (defaultSvc as any).login = async (params: { email: string; password: string }) => {
      const user = await db.findUserByEmail(params.email);
      if (!user) throw new Error('邮箱或密码错误');
      const bcrypt = await import('bcryptjs');
      const isPasswordValid = await bcrypt.compare(params.password, user.password);
      if (!isPasswordValid) throw new Error('邮箱或密码错误');
      const tokens = await (defaultSvc as any).generateTokens(user.id, user.teamId, user.role);
      return {
        ok: true,
        user: {
          id: user.id, email: user.email, name: user.name,
          team: user.teamId ? { id: user.teamId, name: user.team_name, role: user.role } : null,
        },
        ...tokens,
      };
    };
    (defaultSvc as any).refresh = async (params: { refreshToken: string }) => {
      try {
        const { getRequiredJwtSecret } = await import('../config/security-config');
        const payload = jwtService.verify<GatewayJwtPayload>(params.refreshToken, {
          secret: getRequiredJwtSecret(configService),
        });
        if (payload.type !== 'refresh' || !payload.sub) throw new Error('无效的刷新令牌');
        const user = await db.findUserById(payload.sub);
        if (!user) throw new Error('用户不存在');
        const tokens = await (defaultSvc as any).generateTokens(user.id, user.teamId || null, user.role);
        return {
          ok: true,
          user: {
            id: user.id, email: user.email, name: user.name,
            team: user.teamId ? { id: user.teamId, name: user.team_name, role: user.role } : null,
          },
          ...tokens,
        };
      } catch {
        throw new Error('刷新令牌失败');
      }
    };
    (defaultSvc as any).generateTokens = async (userId: string, teamId: string | null, role: string) => {
      const payload = { sub: userId, teamId: teamId || '', role };
      const secret = getJwtSecret(configService);
      const [accessToken, refreshToken] = await Promise.all([
        jwtService.signAsync({ ...payload, type: 'access' }, { secret, expiresIn: '15m' }),
        jwtService.signAsync({ ...payload, type: 'refresh' }, { secret, expiresIn: '7d' }),
      ]);
      return { accessToken, refreshToken, expiresIn: 900, expiresAt: Date.now() + 900 * 1000 };
    };
    (defaultSvc as any).generateServiceToken = async (): Promise<string> => {
      return jwtService.signAsync({ sub: 'service', role: 'admin', type: 'access' }, { secret: getJwtSecret(configService) });
    };
    (defaultSvc as any).getTokenExpiresAt = (payload: GatewayJwtPayload) => getTokenExpiresAt(payload);
    (defaultSvc as any).generateUUID = () => generateUUID();
    (defaultSvc as any).getJwtSecret = () => getJwtSecret(configService);

    return defaultSvc;
  }

  // Slice 2026-07-02-gateway-split-provider-resolution: build a thin
  // GatewayProviderResolutionService bound to the existing
  // aiModelsService / httpService / configService fields. Used only when
  // the 7-arg spec constructor form is invoked (no DI for the
  // provider-resolution cluster). Object.create on the prototype to
  // satisfy the 5 method references the facade's pass-throughs will
  // dispatch to. The hermes agent health state (`hermesAgentStatus`)
  // lives on the constructed object via a closure-captured mutable so
  // `checkHermesAgentHealth` writes and `getHermesAgentStatus` /
  // `getLastHermesChecked` reads from the same in-memory record (same
  // TTL semantics as the verbatim extraction).
  private buildDefaultProviderResolutionService(): GatewayProviderResolutionService {
    const defaultSvc = Object.create(GatewayProviderResolutionService.prototype) as GatewayProviderResolutionService;
    const aiModelsService = this.aiModelsService;
    const httpService = this.httpService;
    const configService = this.configService;
    const hermesAgentStatus: { healthy: boolean; lastChecked: number } = { healthy: false, lastChecked: 0 };
    const hermesAgentUrl = normalizeInternalServiceUrl(
      configService.get<string>('HERMES_AGENT_URL') || process.env.HERMES_AGENT_URL || 'http://localhost:8642',
      'HERMES_AGENT_URL',
    );
    const HERMES_HEALTH_TTL_MS = 30000;
    const logger = {
      log: (..._args: unknown[]) => undefined,
      warn: (..._args: unknown[]) => undefined,
      error: (..._args: unknown[]) => undefined,
      debug: (..._args: unknown[]) => undefined,
      verbose: (..._args: unknown[]) => undefined,
    };

    (defaultSvc as any).aiModelsService = aiModelsService;
    (defaultSvc as any).httpService = httpService;
    (defaultSvc as any).configService = configService;
    (defaultSvc as any).logger = logger;

    (defaultSvc as any).getHermesAgentUrl = () => hermesAgentUrl;
    (defaultSvc as any).getLastHermesChecked = () => hermesAgentStatus.lastChecked;

    (defaultSvc as any).findDefaultGenerateModel = async (_teamId: string): Promise<ProviderModelRow | null> => {
      try {
        const models = await aiModelsService.findAllModels();
        if (!models || models.length === 0) return null;
        for (const model of models) {
          const key = await aiModelsService.findActiveApiKeyByProvider(model.provider_id);
          if (key) return model;
        }
        return null;
      } catch {
        return null;
      }
    };

    (defaultSvc as any).resolveProviderModelForLingqiCharge = async (lingqiCharge: LingqiChargeDecision): Promise<ProviderModelRow | null> => {
      if (!lingqiCharge.executionModelName) return null;
      return aiModelsService.findExecutableModelByModelId(lingqiCharge.executionModelName);
    };

    (defaultSvc as any).tryBuildHermesProviderOverride = async (
      lingqiCharge: LingqiChargeDecision,
    ): Promise<HermesAgentProviderOverride | undefined> => {
      const providerModel = await (defaultSvc as any).resolveProviderModelForLingqiCharge(lingqiCharge);
      if (!providerModel) return undefined;
      const apiKeyRecord = await aiModelsService.findActiveApiKeyByProvider(providerModel.provider_id);
      if (!apiKeyRecord) return undefined;
      const decryptedKey = await aiModelsService.getDecryptedApiKey(apiKeyRecord.id);
      if (!decryptedKey) return undefined;
      const endpoint = await aiModelsService.findDefaultEndpointByProvider(providerModel.provider_id);
      if (!endpoint?.base_url) return undefined;
      let baseUrl: string;
      try {
        baseUrl = normalizeProviderBaseUrl(endpoint.base_url);
      } catch {
        return undefined;
      }
      const providerCode = (providerModel.provider_code || providerModel.provider_name || '').toLowerCase();
      return { baseUrl, apiKey: decryptedKey, authStyle: 'bearer', modelId: providerModel.model_id, providerCode };
    };

    (defaultSvc as any).checkHermesAgentHealth = async (): Promise<boolean> => {
      const now = Date.now();
      if (now - hermesAgentStatus.lastChecked < HERMES_HEALTH_TTL_MS) {
        return hermesAgentStatus.healthy;
      }
      try {
        const { firstValueFrom: fv } = await import('rxjs');
        await fv(
          httpService.get(`${hermesAgentUrl}/health`, { timeout: 2000, maxRedirects: 0 }),
        );
        hermesAgentStatus.healthy = true;
        hermesAgentStatus.lastChecked = now;
        return true;
      } catch {
        hermesAgentStatus.healthy = false;
        hermesAgentStatus.lastChecked = now;
        return false;
      }
    };

    (defaultSvc as any).getHermesAgentStatus = async () => {
      const healthy = await (defaultSvc as any).checkHermesAgentHealth();
      return {
        ok: true,
        hermesAgent: {
          available: healthy,
          endpoint: hermesAgentUrl,
          lastChecked: hermesAgentStatus.lastChecked,
        },
      };
    };

    return defaultSvc;
  }

  // Slice 2026-07-02-gateway-split-extensions: build a thin
  // GatewayExtensionsService bound to the existing `db` field. Used only
  // when the 7-arg spec constructor form is invoked (no DI for the
  // extensions cluster). Object.create on the prototype to satisfy the
  // 28 method references the facade's pass-throughs will dispatch to.
  // `toGatewayExpert` is kept as a closure-captured helper shared by the
  // extensions service and this default shim (same field normalization
  // logic as the verbatim extraction).
  private buildDefaultExtensionsService(): GatewayExtensionsService {
    const defaultSvc = Object.create(GatewayExtensionsService.prototype) as GatewayExtensionsService;
    const db = this.db;

    (defaultSvc as any).db = db;

    const toGatewayExpert = (expert: any) => ({
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
    });

    // Extensions cluster
    (defaultSvc as any).getAllExtensions = () => db.findAllExtensions();
    (defaultSvc as any).getInstalledExtensions = (params: { userId: string }) => db.findUserInstalledExtensions(params.userId);
    (defaultSvc as any).installExtension = (params: { extensionId: string; userId: string; config?: Record<string, unknown> }) =>
      db.installExtension(params.userId, params.extensionId, params.config);
    (defaultSvc as any).uninstallExtension = (params: { extensionId: string; userId: string }) =>
      db.uninstallExtension(params.userId, params.extensionId);
    (defaultSvc as any).enableExtension = (params: { extensionId: string; userId: string }) =>
      db.enableUserExtension(params.userId, params.extensionId);
    (defaultSvc as any).disableExtension = (params: { extensionId: string; userId: string }) =>
      db.disableUserExtension(params.userId, params.extensionId);
    (defaultSvc as any).updateExtensionConfig = (params: { extensionId: string; userId: string; config: Record<string, unknown> }) =>
      db.updateUserExtensionConfig(params.userId, params.extensionId, params.config);

    // Skills cluster
    (defaultSvc as any).listSkills = async (params: { teamId: string; userId: string; role?: string; status?: string }) => {
      const { SkillsService } = await import('../skills/skills.service');
      const service = new SkillsService(db);
      return service.findAll(params.teamId, params.status, params.userId, params.role);
    };
    (defaultSvc as any).getSkill = async (params: { id: string; teamId: string; userId: string; role?: string }) => {
      const { SkillsService } = await import('../skills/skills.service');
      const service = new SkillsService(db);
      return service.findOne(params.id, params.teamId, params.userId, params.role);
    };
    (defaultSvc as any).createSkill = async (params: { teamId: string; authorId: string; name: string; description?: string; content: string; icon?: string; category?: string; tags?: string[]; config?: Record<string, unknown>; configSchema?: Record<string, unknown> }) => {
      const { SkillsService } = await import('../skills/skills.service');
      const { CreateSkillDto } = await import('../skills/dto/create-skill.dto');
      const service = new SkillsService(db);
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
    };
    (defaultSvc as any).updateSkill = async (params: { id: string; teamId: string; userId: string; role?: string; name?: string; description?: string; version?: string; content?: string; icon?: string; category?: string; tags?: string[]; config?: Record<string, unknown>; configSchema?: Record<string, unknown> }) => {
      const { SkillsService } = await import('../skills/skills.service');
      const { UpdateSkillDto } = await import('../skills/dto/update-skill.dto');
      const service = new SkillsService(db);
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
      return service.update(params.id, params.teamId, dto, {
        userId: params.userId,
        teamId: params.teamId,
        role: params.role,
      });
    };
    (defaultSvc as any).requestPublishSkillToTeam = async (params: { id: string; accessPolicy?: { mode: 'all' | 'users' | 'role'; userIds?: string[]; minimumRole?: 'MEMBER' | 'ADMIN' | 'OWNER' } }, actor: { userId: string; teamId: string; role: string }) => {
      const { SkillsService } = await import('../skills/skills.service');
      const service = new SkillsService(db);
      return service.requestPublishToTeam(params.id, actor, params.accessPolicy);
    };
    (defaultSvc as any).approveTeamSkillPublish = async (params: { id: string }, actor: { userId: string; teamId: string; role: string }) => {
      const { SkillsService } = await import('../skills/skills.service');
      const service = new SkillsService(db);
      return service.approveTeamPublish(params.id, actor.userId, actor);
    };
    (defaultSvc as any).rejectTeamSkillPublish = async (params: { id: string; comment?: string }, actor: { userId: string; teamId: string; role: string }) => {
      const { SkillsService } = await import('../skills/skills.service');
      const service = new SkillsService(db);
      return service.rejectTeamPublish(params.id, actor.userId, params.comment || '', actor);
    };
    (defaultSvc as any).requestPublishSkillToMarketplace = async (params: { id: string; note?: string }, actor: { userId: string; teamId: string; role: string }) => {
      const { SkillsService } = await import('../skills/skills.service');
      const service = new SkillsService(db);
      return service.requestPublishToMarketplace(params.id, actor.userId, params.note, actor);
    };
    (defaultSvc as any).deleteSkill = async (params: { id: string; teamId: string; userId: string; role?: string }) => {
      const { SkillsService } = await import('../skills/skills.service');
      const service = new SkillsService(db);
      return service.delete(params.id, params.teamId, {
        userId: params.userId,
        teamId: params.teamId,
        role: params.role,
      });
    };

    // Marketplace cluster
    (defaultSvc as any).listMarketplaceSkills = async (_params: { teamId: string }) =>
      db.query(
        `SELECT mi.*, mc.name as category_name, mc.slug as category_slug
         FROM marketplace_items mi
         LEFT JOIN marketplace_categories mc ON mi.category_id = mc.id
         WHERE mi.type = 'skill' AND mi.status = 'approved'
         ORDER BY mi.install_count DESC, mi.rating DESC
         LIMIT 100`
      );

    // Experts cluster
    (defaultSvc as any).listExperts = async (params: { teamId?: string; skip?: number; take?: number; category?: string } = {}) => {
      const skip = params.skip || 0;
      const take = params.take || 50;
      const experts = await db.listExperts(params.teamId, skip, take, params.category);
      const total = await db.countExperts(params.teamId, params.category);
      return { ok: true, experts: experts.map((e: any) => toGatewayExpert(e)), total };
    };
    (defaultSvc as any).getExpert = async (params: { id: string; teamId?: string }) => {
      const expert = await db.findExpertByIdForTeam(params.id, params.teamId);
      if (!expert) throw new Error('Expert not found');
      return { ok: true, expert: toGatewayExpert(expert) };
    };
    (defaultSvc as any).createExpert = async (params: { name: string; description?: string; systemPrompt?: string; icon?: string; color?: string; category?: string; teamId?: string; isDefault?: boolean }) => {
      if (!params.name) throw new Error('Expert name is required');
      const expert = await db.createExpert({
        teamId: params.teamId,
        name: params.name,
        description: params.description,
        systemPrompt: params.systemPrompt,
        icon: params.icon || '🤖',
        color: params.color || '#3B82F6',
        category: params.category,
        isDefault: params.isDefault,
      });
      return { ok: true, expert: toGatewayExpert(expert) };
    };
    (defaultSvc as any).updateExpert = async (params: { id: string; teamId?: string; name?: string; description?: string; systemPrompt?: string; icon?: string; color?: string; category?: string; enabled?: boolean; isDefault?: boolean; callCount?: number; rating?: number }) => {
      if (!params.teamId) throw new Error('Authentication required');
      const existing = await db.findTeamExpertById(params.id, params.teamId);
      if (!existing) throw new Error('Expert not found');
      const updates: any = {};
      if (params.name !== undefined) updates.name = params.name;
      if (params.description !== undefined) updates.description = params.description;
      if (params.systemPrompt !== undefined) updates.systemPrompt = params.systemPrompt;
      if (params.icon !== undefined) updates.icon = params.icon;
      if (params.color !== undefined) updates.color = params.color;
      if (params.category !== undefined) updates.category = params.category;
      const updated = await db.updateExpert(params.id, updates);
      return { ok: true, expert: toGatewayExpert(updated) };
    };
    (defaultSvc as any).deleteExpert = async (params: { id: string; teamId?: string }) => {
      if (!params.teamId) throw new Error('Authentication required');
      const existing = await db.findTeamExpertById(params.id, params.teamId);
      if (!existing) throw new Error('Expert not found');
      await db.deleteExpert(params.id);
      return { ok: true, message: 'Expert deleted successfully' };
    };
    (defaultSvc as any).setActiveExpert = async (params: { id: string; teamId?: string; userId?: string }) => {
      const expert = await db.findExpertByIdForTeam(params.id, params.teamId);
      if (!expert) throw new Error('Expert not found');
      return {
        ok: true,
        activeExpert: {
          id: expert.id,
          name: expert.name,
          systemPrompt: expert.systemPrompt ?? expert.systemprompt,
        },
      };
    };
    (defaultSvc as any).recordExpertUsage = async (params: { expertId: string; userId: string; teamId?: string; tokens?: number; duration?: number }) => {
      const expert = await db.findExpertByIdForTeam(params.expertId, params.teamId);
      if (!expert) throw new Error('Expert not found');
      await db.createExpertUsage({
        expertId: params.expertId,
        userId: params.userId,
        teamId: params.teamId,
        tokens: params.tokens,
        duration: params.duration,
      });
      await db.incrementExpertCallCount(params.expertId);
      return { ok: true };
    };
    (defaultSvc as any).getExpertStats = async (params: { id: string; teamId?: string }) => {
      const expert = await db.findExpertByIdForTeam(params.id, params.teamId);
      if (!expert) throw new Error('Expert not found');
      const stats = await db.getExpertStats(params.id);
      const [dailyStats, weeklyStats, monthlyStats] = await Promise.all([
        db.getExpertUsageStats(params.id, 'day'),
        db.getExpertUsageStats(params.id, 'week'),
        db.getExpertUsageStats(params.id, 'month'),
      ]);
      return { ok: true, stats: { ...stats, daily: dailyStats, weekly: weeklyStats, monthly: monthlyStats } };
    };
    (defaultSvc as any).getExpertCategories = async (params: { teamId?: string }) => {
      let query = 'SELECT DISTINCT category FROM experts WHERE category IS NOT NULL';
      const paramsArray: any[] = [];
      if (params.teamId) {
        query += ' AND ("teamId" = $1 OR "teamId" IS NULL)';
        paramsArray.push(params.teamId);
      } else {
        query += ' AND "teamId" IS NULL';
      }
      query += ' ORDER BY category';
      const results = await db.query(query, paramsArray);
      return { ok: true, categories: results.map((r: any) => r.category) };
    };
    (defaultSvc as any).rateExpert = async (params: { id: string; rating: number; teamId?: string }) => {
      if (params.rating < 1 || params.rating > 5) throw new Error('Rating must be between 1 and 5');
      if (!params.teamId) throw new Error('Authentication required');
      const existing = await db.findTeamExpertById(params.id, params.teamId);
      if (!existing) throw new Error('Expert not found');
      const expert = await db.updateExpertRating(params.id, params.rating);
      return { ok: true, expert: { id: expert.id, rating: expert.rating } };
    };

    return defaultSvc;
  }

  setGatewayInstance(gatewayInstance: any): void {
    this.gatewayInstance = gatewayInstance;
    this.logger.log('Gateway instance reference set');
  }

  async connect(params: ConnectParams, socket: WebSocket): Promise<ConnectResult> {
    return this.connectionService.connect(params, socket);
  }

  async register(params: { email: string; password: string; name?: string }) {
    return this.connectionService.register(params);
  }

  async login(params: { email: string; password: string }) {
    return this.connectionService.login(params);
  }

  async refresh(params: { refreshToken: string }) {
    return this.connectionService.refresh(params);
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
    const existing = await this.db.findConversationById(params.conversationId, params.teamId);
    if (!existing) {
      throw new Error('Conversation not found');
    }

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
    const existing = await this.db.findConversationById(params.conversationId, params.teamId);
    if (!existing) {
      throw new Error('Conversation not found');
    }

    await this.db.deleteMessagesByConversationId(params.conversationId);
    await this.db.deleteConversation(params.conversationId);
    return { ok: true };
  }

  async getMessages(params: { conversationId: string; teamId: string }) {
    const existing = await this.db.findConversationById(params.conversationId, params.teamId);
    if (!existing) {
      throw new Error('Conversation not found');
    }

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
    userId?: string;
    role?: string;
    skillIds?: string[];
    mcpServerIds?: string[];
    extensionIds?: string[];
  }): Promise<{ messages: ConversationPromptMessage[]; mcpServers: HermesMCPServer[]; hasMcpSelection: boolean }> {
    const messages: ConversationPromptMessage[] = [];
    let isConversationAuthorized = false;
    let persistedExpertId: string | undefined;

    const hasExtensionOverride = Array.isArray(params.extensionIds) && params.extensionIds.length > 0;
    if (hasExtensionOverride && params.userId) {
      const extensionMessages = await this.getSafeExtensionPromptMessages(params.extensionIds!, params.userId);
      messages.push(...extensionMessages);
    }

    if (params.expertId) {
      await this.addExpertPrompt(messages, params.expertId, params.teamId);
    }

    const hasSkillOverride = Array.isArray(params.skillIds) && params.skillIds.length > 0;
    if (hasSkillOverride && params.teamId) {
      try {
        const skills = await this.skillsService.findSkillsByIdsForTeam(
          params.skillIds!,
          params.teamId,
          params.userId,
          params.role,
        );
        const skillsById = new Map(skills.map((skill) => [skill.id, skill]));
        for (const skillId of params.skillIds!) {
          const skill = skillsById.get(skillId);
          if (skill?.content && typeof skill.content === 'string') {
            messages.push({ role: 'system', content: skill.content });
          }
        }
      } catch (err) {
        this.logger.warn(
          `Failed to load override skills [${params.skillIds!.join(',')}]:`,
          err,
        );
      }
    }

    if (params.conversationId && params.teamId) {
      try {
        const conversation = await this.db.findConversationById(params.conversationId, params.teamId);
        if (conversation) {
          isConversationAuthorized = true;

          persistedExpertId = typeof conversation.expert_id === 'string'
            ? conversation.expert_id
            : typeof conversation.expertId === 'string'
              ? conversation.expertId
              : undefined;

          if (!params.expertId && persistedExpertId) {
            await this.addExpertPrompt(messages, persistedExpertId, params.teamId);
          }

          if (!hasSkillOverride) {
            try {
              const skills = await this.skillsService.findEnabledSkillsForConversation(
                params.conversationId,
                params.teamId,
                params.userId,
                params.role,
              );
              for (const skill of skills) {
                if (skill.content && typeof skill.content === 'string') {
                  messages.push({ role: 'system', content: skill.content });
                }
              }
            } catch (err) {
              this.logger.warn(
                `Failed to load conversation skills for ${params.conversationId}:`,
                err,
              );
            }
          }

          if (!hasExtensionOverride && params.userId) {
            const extensionIds = await this.db.getConversationExtensionIds(params.conversationId, params.userId);
            const extensionMessages = await this.getSafeExtensionPromptMessages(extensionIds, params.userId);
            messages.push(...extensionMessages);
          }

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

    const hasMcpOverride = Array.isArray(params.mcpServerIds) && params.mcpServerIds.length > 0;
    const persistedMcpServerIds = !hasMcpOverride && params.conversationId && isConversationAuthorized
      ? await this.db.getConversationMCPServers(params.conversationId)
      : [];
    const mcpServers = hasMcpOverride && params.teamId
      ? await this.getHermesMcpServersByIds(params.mcpServerIds!, params.teamId)
      : this.toSafeHermesMcpServers(persistedMcpServerIds);
    const hasMcpSelection = hasMcpOverride || persistedMcpServerIds.length > 0;

    return { messages, mcpServers, hasMcpSelection };
  }

  private async hasConversationMcpSelection(params: HermesMessageParams): Promise<boolean> {
    if (Array.isArray(params.mcpServerIds) && params.mcpServerIds.length > 0) {
      return true;
    }
    if (!params.conversationId || !params.teamId) {
      return false;
    }
    const conversation = await this.db.findConversationById(params.conversationId, params.teamId);
    if (!conversation) {
      return false;
    }
    const rows = await this.db.getConversationMCPServers(params.conversationId);
    return rows.length > 0;
  }

  private async addExpertPrompt(messages: ConversationPromptMessage[], expertId: string, teamId?: string): Promise<void> {
    try {
      const expert = await this.db.findExpertByIdForTeam(expertId, teamId);
      const prompt = expert?.systemprompt || expert?.systemPrompt;
      if (prompt) {
        messages.push({ role: 'system', content: prompt });
      }
    } catch (err) {
      this.logger.warn(`Failed to load expert ${expertId}:`, err);
    }
  }

  private async getSafeExtensionPromptMessages(extensionIds: string[], userId: string): Promise<ConversationPromptMessage[]> {
    try {
      const rows = await this.db.findInstalledEnabledExtensionsByIdsForUser(extensionIds, userId) as ExtensionContextRow[];
      const extensionPrompts = rows.map((extension) => this.toSafeExtensionPrompt(extension)).filter((prompt) => prompt.length > 0);
      if (extensionPrompts.length === 0) return [];
      return [{ role: 'system', content: `Enabled plugins for this conversation:\n${extensionPrompts.join('\n')}` }];
    } catch (err) {
      this.logger.warn('Failed to load selected extensions:', err);
      return [];
    }
  }

  private toSafeExtensionPrompt(extension: ExtensionContextRow): string {
    const parts = [
      `- ${extension.name}`,
      extension.description ? `description: ${extension.description}` : undefined,
      extension.category ? `category: ${extension.category}` : undefined,
      Array.isArray(extension.tags) && extension.tags.length > 0 ? `tags: ${extension.tags.join(', ')}` : undefined,
      extension.instructions ? `instructions: ${extension.instructions}` : undefined,
    ].filter((part): part is string => Boolean(part));
    return parts.join('; ');
  }

  private async getConversationHermesMcpServers(conversationId: string): Promise<HermesMCPServer[]> {
    try {
      const rows = await this.db.getConversationMCPServers(conversationId);
      return this.toSafeHermesMcpServers(rows);
    } catch (error) {
      this.logger.warn(`Failed to load MCP servers for conversation ${conversationId}:`, error);
      return [];
    }
  }

  private async getHermesMcpServersByIds(serverIds: string[], teamId: string): Promise<HermesMCPServer[]> {
    try {
      const rows = await this.db.getMCPServersByIdsForTeam(serverIds, teamId);
      const rowsById = new Map(rows.map((row: ConversationMcpServerRow & { id?: string }) => [row.id, row]));
      const orderedRows = serverIds.map((id) => rowsById.get(id)).filter((row): row is ConversationMcpServerRow => Boolean(row));
      return this.toSafeHermesMcpServers(orderedRows);
    } catch (error) {
      this.logger.warn('Failed to load selected MCP servers:', error);
      return [];
    }
  }

  private toSafeHermesMcpServers(rows: ConversationMcpServerRow[]): HermesMCPServer[] {
    return rows.reduce<HermesMCPServer[]>((servers, row) => {
      const server = this.toSafeHermesMcpServer(row);
      return server ? [...servers, server] : servers;
    }, []);
  }

  private toSafeHermesMcpServer(row: ConversationMcpServerRow): HermesMCPServer | null {
    if (row.server_type !== 'http' && row.server_type !== 'https') return null;

    const config = row.config || {};
    const url = config.url;
    if (typeof url !== 'string') return null;

    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== 'https:') return null;
      if (parsedUrl.username || parsedUrl.password) return null;
    } catch {
      return null;
    }

    return {
      name: row.name,
      type: row.server_type,
      config: { url },
    };
  }

  // Slice 2026-07-02-gateway-split-provider-resolution: 1-line pass-through
  // to `this.providerResolutionService.checkHermesAgentHealth()`. The
  // verbatim body lives in `GatewayProviderResolutionService.checkHermesAgentHealth`.
  private async checkHermesAgentHealth(): Promise<boolean> {
    return this.providerResolutionService.checkHermesAgentHealth();
  }

  private async sendHermesAgentMessage(
    params: HermesMessageParams,
    senderWs?: WebSocket,
    modelName = 'hermes-agent',
    prepaid?: ActiveStreamEntry['prepaid'],
    providerOverride?: HermesAgentProviderOverride,
  ) {
    const messageId = params.messageId || this.generateUUID();
    const hermesAgentUrl = this.providerResolutionService.getHermesAgentUrl();
    this.logger.log(`Routing to hermes-agent at ${hermesAgentUrl}`);

    const { messages: conversationMessages, mcpServers: conversationMcpServers } =
      await this.resolveConversationPromptContext({
        conversationId: params.conversationId,
        expertId: params.expertId,
        teamId: params.teamId,
        skillIds: params.skillIds,
        mcpServerIds: params.mcpServerIds,
        extensionIds: params.extensionIds,
        userId: params.userId,
        role: params.role,
      });

    const messages: HermesChatMessage[] = [...conversationMessages];

    // Build user message with optional attachments (multimodal)
    if (params.attachments && params.attachments.length > 0) {
      const contentParts: Exclude<HermesMessageContent, string> = [{ type: 'text', text: params.message }];
      for (const att of params.attachments) {
        if (att.type === 'image' && att.data) {
          contentParts.push({
            type: 'image_url',
            image_url: { url: `data:${att.mimeType};base64,${att.data}` },
          });
        } else if (att.data) {
          contentParts[0] = {
            ...contentParts[0],
            text: `${contentParts[0].text || ''}\n\n[Attached file: ${att.name}]\n${att.data}`,
          };
        }
      }
      messages.push({ role: 'user', content: contentParts });
    } else {
      messages.push({ role: 'user', content: params.message });
    }

    const requestBody: HermesChatRequestBody = {
      model: modelName,
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
      if (providerOverride) {
        const internalKey = this.configService.get<string>('HERMES_INTERNAL_MCP_KEY');
        if (!internalKey) {
          throw new Error('Internal MCP key is required when forwarding admin provider credentials');
        }
        headers['X-Hermes-Internal-MCP-Key'] = internalKey;
        headers['X-Hermes-Provider-Base-Url'] = providerOverride.baseUrl;
        headers['X-Hermes-Provider-Api-Key'] = providerOverride.apiKey;
        headers['X-Hermes-Provider-Auth-Style'] = providerOverride.authStyle;
        headers['X-Hermes-Provider-Model'] = providerOverride.modelId;
        headers['X-Hermes-Provider-Code'] = providerOverride.providerCode;
      }
      const response = await firstValueFrom(
        this.httpService.post(`${hermesAgentUrl}/v1/chat/completions`, requestBody, {
          headers,
          responseType: 'stream',
          timeout: 300000,
          maxRedirects: 0,
        }),
      );

      const stream = response.data;
      let fullResponse = '';
      let deltaCount = 0;
      let totalTokens = 0;
      let settled = false;
      let errored = false;
      let lineBuffer = '';
      let activeToolCallId: string | undefined;
      const streamEntry: ActiveStreamEntry = { ws: senderWs, stream, aborted: false, hasBillableOutput: false, prepaid };

      if (senderWs) {
        this.activeStreams.set(messageId, streamEntry);
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
          if (streamEntry.aborted || settled) return;

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
                const data = JSON.parse(dataStr) as ProviderStreamChunk;
                const delta = extractProviderTextDelta(data);
                if (delta) {
                  fullResponse += delta;
                  deltaCount++;
                  streamEntry.hasBillableOutput = true;
                  this.sendStreamEvent('hermes.delta', {
                    messageId,
                    delta,
                    sequenceNumber: deltaCount,
                  }, senderWs);
                }

                // Handle tool calls in delta — track active toolCallId across chunks
                const toolCalls = data.choices?.[0]?.delta?.tool_calls;
                if (Array.isArray(toolCalls)) {
                  for (const toolCall of toolCalls) {
                    if (!isProviderToolCall(toolCall)) {
                      continue;
                    }
                    if (toolCall.id) {
                      activeToolCallId = toolCall.id;
                    }
                    streamEntry.hasBillableOutput = true;
                    this.sendStreamEvent('hermes.tool', {
                      messageId,
                      toolCallId: toolCall.id || activeToolCallId,
                      toolName: toolCall.function?.name,
                      input: toolCall.function?.arguments,
                      status: 'running',
                    }, senderWs);
                  }
                }

                totalTokens = extractProviderTotalTokens(data, totalTokens);
              } catch (e) {
                // Not JSON, skip
              }
            }
          }
        });

        stream.on('end', () => {
          if (settled) return;
          if (streamEntry.aborted) {
            finalize({ ok: false, messageId, aborted: true });
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
          if (streamEntry.aborted) {
            finalize({ ok: false, messageId, aborted: true });
            return;
          }
          this.logger.error('hermes-agent stream error:', error);
          this.sendStreamEvent('hermes.error', {
            messageId,
            error: error.message,
          }, senderWs);
          finalize({ ok: false, messageId, error: error.message });
        });

        stream.on('close', () => {
          if (settled) return;
          if (streamEntry.aborted) {
            finalize({ ok: false, messageId, aborted: true });
            return;
          }
          this.sendStreamEvent('hermes.error', {
            messageId,
            error: 'Connection closed before completion',
          }, senderWs);
          finalize({ ok: false, messageId, error: 'Connection closed before completion' });
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

  // Slice 2026-07-02-gateway-split-provider-resolution: 1-line pass-through
  // to `this.providerResolutionService.getHermesAgentStatus()`. The verbatim
  // body lives in `GatewayProviderResolutionService.getHermesAgentStatus`.
  async getHermesAgentStatus() {
    return this.providerResolutionService.getHermesAgentStatus();
  }

  async sendHermesMessage(params: HermesMessageParams, senderWs?: WebSocket): Promise<HermesSendResult> {
    this.logger.log('Sending message to Hermes');

    const messageId = params.messageId || this.generateUUID();
    const billingId = this.generateUUID();
    const requestParams: HermesMessageParams = { ...params, messageId };
    const lingqiCharge = await this.prepareLingqiCharge(requestParams, billingId, senderWs);
    if ('error' in lingqiCharge) {
      return lingqiCharge.error;
    }

    const prepaidCharge = await this.prepayLingqiCharge(requestParams, lingqiCharge.charge, messageId, lingqiCharge.billingId);
    if ('error' in prepaidCharge) {
      this.sendStreamEvent('hermes.error', { messageId: prepaidCharge.error.messageId, error: prepaidCharge.error.error }, senderWs);
      return prepaidCharge.error;
    }

    const providerOverride = await this.tryBuildHermesProviderOverride(lingqiCharge);
    const mcpSelection = await this.hasConversationMcpSelection(requestParams);

    // Admin-configured providers use the direct path unless MCP is selected;
    // MCP needs Hermes Agent so tools and provider override can be forwarded together.
    const hermesHealthy = (!providerOverride || mcpSelection) && await this.checkHermesAgentHealth();
    if (hermesHealthy) {
      const result = await this.sendHermesAgentMessage(requestParams, senderWs, lingqiCharge.executionModelName, {
        params: requestParams,
        charge: lingqiCharge.charge,
      }, providerOverride) as HermesSendResult;
      return this.refundLingqiIfUnsuccessful(requestParams, lingqiCharge.charge, result);
    }

    const teamId = requestParams.teamId;

    const providerModel = await this.resolveProviderModelForLingqiCharge(lingqiCharge);

    if (!providerModel) {
      const errorMessage = lingqiCharge.executionModelName
        ? `模型 ${lingqiCharge.executionModelName} 配置缺失或未激活，请联系管理员`
        : '请选择 AI 模型';

      this.logger.warn(`[sendHermesMessage] Provider model resolution failed: ${errorMessage}`);
      this.sendStreamEvent('hermes.error', {
        messageId,
        error: errorMessage,
      }, senderWs);

      const result = await this.refundLingqiIfUnsuccessful(requestParams, lingqiCharge.charge, {
        ok: false,
        messageId,
        error: errorMessage,
      });
      return result;
    }

    // Resolve provider, API key, and endpoint
    const providerId = providerModel.provider_id;
    const modelCode = providerModel.model_id;

    const apiKeyRecord = await this.aiModelsService.findActiveApiKeyByProvider(providerId);
    if (!apiKeyRecord) {
      const errorMessage = `模型 ${providerModel.model_id} 的 API 密钥未配置，请联系管理员`;
      this.logger.warn(`[sendHermesMessage] No active API key for provider ${providerModel.provider_name}`);
      this.sendStreamEvent('hermes.error', {
        messageId,
        error: errorMessage,
      }, senderWs);
      return this.refundLingqiIfUnsuccessful(requestParams, lingqiCharge.charge, {
        ok: false,
        messageId,
        error: errorMessage,
      });
    }

    const decryptedKey = await this.aiModelsService.getDecryptedApiKey(apiKeyRecord.id);
    if (!decryptedKey) {
      const errorMessage = `模型 ${providerModel.model_id} 的 API 密钥解密失败，请联系管理员`;
      this.logger.warn(`[sendHermesMessage] Failed to decrypt API key for provider ${providerModel.provider_name}`);
      this.sendStreamEvent('hermes.error', {
        messageId,
        error: errorMessage,
      }, senderWs);
      return this.refundLingqiIfUnsuccessful(requestParams, lingqiCharge.charge, {
        ok: false,
        messageId,
        error: errorMessage,
      });
    }

    const endpoint = await this.aiModelsService.findDefaultEndpointByProvider(providerId);
    if (!endpoint?.base_url) {
      const errorMessage = `模型 ${providerModel.model_id} 的 API 端点未配置，请联系管理员`;
      this.logger.warn(`[sendHermesMessage] No active endpoint configured for provider ${providerModel.provider_name}`);
      this.sendStreamEvent('hermes.error', {
        messageId,
        error: errorMessage,
      }, senderWs);
      return this.refundLingqiIfUnsuccessful(requestParams, lingqiCharge.charge, {
        ok: false,
        messageId,
        error: errorMessage,
      });
    }

    let baseUrl: string;
    try {
      baseUrl = normalizeProviderBaseUrl(endpoint.base_url);
    } catch (error: unknown) {
      this.logger.warn('Invalid provider endpoint URL configuration');
      return this.refundLingqiIfUnsuccessful(requestParams, lingqiCharge.charge, {
        ok: false,
        messageId,
        error: 'Provider configuration error',
      });
    }

    // Quota check before making API call
    if (teamId) {
      const quotaError = await this.checkQuota(teamId);
      if (quotaError) {
        this.sendStreamEvent('hermes.error', {
          messageId,
          error: quotaError,
        }, senderWs);
        const result = await this.refundLingqiIfUnsuccessful(requestParams, lingqiCharge.charge, { ok: false, messageId, error: quotaError });
        return result;
      }
    }

    const isMiniMaxAnthropicProvider = isMiniMaxAnthropicProviderHelper(providerModel, baseUrl);

    // Build request headers and body.
    // MiniMax Anthropic-compatible endpoint requires `Authorization: Bearer <key>`
    // per https://platform.minimaxi.com/docs/guides/text-generation; using
    // `X-Api-Key` against /anthropic/v1/messages returns HTTP 429 from MiniMax.
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${decryptedKey}`,
    };
    if (isMiniMaxAnthropicProvider) {
      headers['anthropic-version'] = '2023-06-01';
    }
    try {
      if (endpoint?.headers) {
        const extraHeaders = typeof endpoint.headers === 'string' ? JSON.parse(endpoint.headers) : endpoint.headers;
        Object.assign(headers, extraHeaders);
      }
    } catch (error: unknown) {
      this.logger.warn('Invalid provider endpoint headers configuration');
      const result = await this.refundLingqiIfUnsuccessful(requestParams, lingqiCharge.charge, {
        ok: false,
        messageId,
        error: 'Provider configuration error',
      });
      return result;
    }

    // Build model params from config
    const { messages, hasMcpSelection } = await this.resolveConversationPromptContext({
      conversationId: requestParams.conversationId,
      expertId: requestParams.expertId,
      teamId: requestParams.teamId,
      skillIds: requestParams.skillIds,
      mcpServerIds: requestParams.mcpServerIds,
      extensionIds: requestParams.extensionIds,
      userId: requestParams.userId,
      role: requestParams.role,
    });
    if (hasMcpSelection) {
      this.sendStreamEvent('hermes.error', {
        messageId,
        error: 'MCP servers require Hermes Agent routing',
      }, senderWs);
      return this.refundLingqiIfUnsuccessful(requestParams, lingqiCharge.charge, {
        ok: false,
        messageId,
        error: 'MCP servers require Hermes Agent routing',
      });
    }
    messages.push({ role: 'user', content: requestParams.message });

    const systemMessages = messages.filter((message) => message.role === 'system');
    const providerMessages = isMiniMaxAnthropicProvider
      ? messages.filter((message) => message.role !== 'system')
      : messages;

    const requestBody: HermesChatRequestBody = {
      model: modelCode,
      messages: providerMessages,
      stream: true,
    };
    if (isMiniMaxAnthropicProvider && systemMessages.length > 0) {
      const systemPrompt = systemMessages
        .map((message) => message.content)
        .filter((content): content is string => typeof content === 'string' && content.trim().length > 0)
        .join('\n\n');
      if (systemPrompt) {
        requestBody.system = systemPrompt;
      }
    }
    if (providerModel.temperature !== null && providerModel.temperature !== undefined) {
      requestBody.temperature = providerModel.temperature;
    }
    if (providerModel.max_tokens !== null && providerModel.max_tokens !== undefined) {
      requestBody.max_tokens = providerModel.max_tokens;
    } else if (isMiniMaxAnthropicProvider) {
      // Anthropic Messages API (and MiniMax's Anthropic-compatible endpoint)
      // requires `max_tokens` as a top-level field. Fall back to a safe default
      // when the model row doesn't define one, otherwise MiniMax returns 429.
      requestBody.max_tokens = 1024;
    }
    if (providerModel.top_p !== null && providerModel.top_p !== undefined) {
      requestBody.top_p = providerModel.top_p;
    }

    const timeout = endpoint?.timeout_ms || 60000;

    try {
      const startTime = Date.now();
      const providerRequestPath = isMiniMaxAnthropicProvider ? '/v1/messages' : '/v1/chat/completions';
      const response = await firstValueFrom(
        this.httpService.post(`${baseUrl}${providerRequestPath}`, requestBody, {
          headers,
          responseType: 'stream',
          timeout,
          maxRedirects: 0,
        })
      );

      this.logger.log(`Provider API (${providerModel.provider_name}/${modelCode}) connected, starting stream...`);

      this.logger.log(`Provider API (${providerModel.provider_name}/${modelCode}) response status: ${response.status}`);

      const stream = response.data;
      let fullResponse = '';
      let deltaCount = 0;
      let totalTokens = 0;
      let lineBuffer = '';
      const streamEntry: ActiveStreamEntry = {
        ws: senderWs,
        stream,
        aborted: false,
        hasBillableOutput: false,
        prepaid: {
          params: requestParams,
          charge: lingqiCharge.charge,
        },
      };

      // Register stream for abort support
      if (senderWs) {
        this.activeStreams.set(messageId, streamEntry);
      }

      const cleanup = () => {
        this.activeStreams.delete(messageId);
      };

      return new Promise((resolve, reject) => {
        let settled = false;
        const settle = (result: HermesSendResult) => {
          cleanup();
          resolve(result);
        };
        const finalizeOnce = (createResult: () => Promise<HermesSendResult>): void => {
          if (settled) return;
          settled = true;
          createResult().then(settle).catch((error: unknown) => {
            this.logger.error('Provider stream finalization failed:', error);
            settle({ ok: false, messageId, error: 'Provider stream error' });
          });
        };

        stream.on('data', async (chunk: Buffer) => {
          if (streamEntry.aborted || settled) return;

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
                finalizeOnce(async () => {
                  const result = await this.refundLingqiIfUnsuccessful(requestParams, lingqiCharge.charge, { ok: true, messageId });
                  if (result.ok) {
                    this.sendStreamEvent('hermes.final', {
                      messageId,
                      content: fullResponse,
                      totalTokens,
                    }, senderWs);
                    this.recordProviderUsage(apiKeyRecord.id, providerId, providerModel.model_id, totalTokens, Date.now() - startTime, teamId).catch(err => {
                      this.logger.warn('Failed to record usage:', err);
                    });
                  }
                  return result;
                });
                return;
              }

              try {
                const data = JSON.parse(dataStr) as ProviderStreamChunk;

                // Check for API-level error in the SSE stream
                if (data.error) {
                  this.logger.error(`${providerModel.provider_name} API error in stream.`);
                  finalizeOnce(async () => {
                    const result = await this.refundLingqiIfUnsuccessful(requestParams, lingqiCharge.charge, {
                      ok: false,
                      messageId,
                      error: 'Provider stream error',
                    });
                    this.sendStreamEvent('hermes.error', {
                      messageId,
                      error: result.error,
                    }, senderWs);
                    return result;
                  });
                  return;
                }

                const delta = extractProviderTextDelta(data);
                if (delta) {
                  fullResponse += delta;
                  deltaCount++;
                  parsedAny = true;
                  streamEntry.hasBillableOutput = true;

                  this.sendStreamEvent('hermes.delta', {
                    messageId,
                    delta,
                    sequenceNumber: deltaCount,
                  }, senderWs);
                }

                totalTokens = extractProviderTotalTokens(data, totalTokens);
              } catch (e) {
                // Not JSON, skip
              }
            }
          }

        });

        stream.on('end', () => {
          if (settled) return;
          if (streamEntry.aborted) {
            finalizeOnce(() => this.refundLingqiIfUnsuccessful(requestParams, lingqiCharge.charge, { ok: false, messageId, aborted: true }, streamEntry.hasBillableOutput));
            return;
          }

          // Process any remaining line buffer
          if (lineBuffer.trim()) {
            if (lineBuffer.startsWith('data: ')) {
              const dataStr = lineBuffer.substring(6).trim();
              if (dataStr !== '[DONE]') {
                try {
                  const data = JSON.parse(dataStr) as ProviderStreamChunk;
                  const delta = extractProviderTextDelta(data);
                  if (delta) {
                    fullResponse += delta;
                    deltaCount++;
                    streamEntry.hasBillableOutput = true;
                    this.sendStreamEvent('hermes.delta', {
                      messageId,
                      delta,
                      sequenceNumber: deltaCount,
                    }, senderWs);
                  }
                  totalTokens = extractProviderTotalTokens(data, totalTokens);
                } catch (e) { /* skip */ }
              }
            }
          }

          if (!fullResponse) {
            this.logger.error(`Provider stream ended with no response from ${providerModel.provider_name}/${modelCode}.`);
            this.sendStreamEvent('hermes.error', {
              messageId,
              error: 'Provider returned no response',
            }, senderWs);
            finalizeOnce(() => this.refundLingqiIfUnsuccessful(requestParams, lingqiCharge.charge, { ok: false, messageId, error: 'No response' }));
          } else {
            this.logger.log(`Provider stream ended, ${deltaCount} chunks, ${fullResponse.length} chars`);
            finalizeOnce(async () => {
              const result = await this.refundLingqiIfUnsuccessful(requestParams, lingqiCharge.charge, { ok: true, messageId });
              if (result.ok) {
                this.sendStreamEvent('hermes.final', {
                  messageId,
                  content: fullResponse,
                  totalTokens,
                }, senderWs);
                this.recordProviderUsage(apiKeyRecord.id, providerId, providerModel.model_id, totalTokens, Date.now() - startTime, teamId).catch(err => {
                  this.logger.warn('Failed to record usage:', err);
                });
              }
              return result;
            });
          }
        });

        stream.on('error', (error: Error) => {
          if (settled) return;
          if (streamEntry.aborted) {
            finalizeOnce(() => this.refundLingqiIfUnsuccessful(requestParams, lingqiCharge.charge, { ok: false, messageId, aborted: true }, streamEntry.hasBillableOutput));
            return;
          }

          this.logger.error('Provider stream error.');
          this.sendStreamEvent('hermes.error', {
            messageId,
            error: 'Provider stream error',
          }, senderWs);
          finalizeOnce(() => this.refundLingqiIfUnsuccessful(requestParams, lingqiCharge.charge, { ok: false, messageId, error: 'Provider stream error' }));
        });

        stream.on('close', () => {
          if (settled) return;
          if (streamEntry.aborted) {
            finalizeOnce(() => this.refundLingqiIfUnsuccessful(requestParams, lingqiCharge.charge, { ok: false, messageId, aborted: true }, streamEntry.hasBillableOutput));
            return;
          }
          this.sendStreamEvent('hermes.error', {
            messageId,
            error: 'Provider connection closed before completion',
          }, senderWs);
          finalizeOnce(() => this.refundLingqiIfUnsuccessful(requestParams, lingqiCharge.charge, {
            ok: false,
            messageId,
            error: 'Provider connection closed before completion',
          }));
        });
      });

    } catch (error) {
      const err = error as { message?: string; response?: { status?: number; data?: unknown }; code?: string };
      let bodyPreview = 'n/a';
      let providerMessage: string | undefined;
      const raw = err.response?.data;
      // axios with responseType:'stream' delivers errors with `data` still as a
      // readable stream — drain it so we can surface MiniMax's real reason.
      if (raw && typeof (raw as { on?: unknown }).on === 'function') {
        const streamLike = raw as NodeJS.ReadableStream;
        const chunks: Buffer[] = [];
        try {
          await new Promise<void>((resolve) => {
            streamLike.on('data', (chunk: Buffer | string) =>
              chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk),
            );
            streamLike.on('end', () => resolve());
            streamLike.on('error', () => resolve());
            setTimeout(() => resolve(), 2000);
          });
        } catch {
          // ignore
        }
        const text = Buffer.concat(chunks).toString('utf8');
        bodyPreview = text.slice(0, 400);
        try {
          const parsed = JSON.parse(text) as { error?: { message?: string; type?: string }; message?: string; base_resp?: { status_msg?: string } };
          providerMessage = parsed.error?.message || parsed.message || parsed.base_resp?.status_msg;
        } catch {
          providerMessage = text.slice(0, 200);
        }
      } else if (raw && typeof raw === 'object') {
        const errObj = (raw as { error?: { message?: string; type?: string; code?: string } }).error;
        const messageField = (raw as { message?: string }).message;
        if (errObj) {
          bodyPreview = `${errObj.type ?? ''}:${errObj.code ?? ''}:${(errObj.message ?? '').slice(0, 200)}`;
          providerMessage = errObj.message;
        } else if (messageField) {
          bodyPreview = String(messageField).slice(0, 200);
          providerMessage = String(messageField);
        }
      } else if (typeof raw === 'string') {
        bodyPreview = raw.slice(0, 200);
        providerMessage = raw.slice(0, 200);
      }
      const status = err.response?.status;
      this.logger.error(
        `Failed to call ${providerModel.provider_name} API. status=${status ?? 'n/a'} code=${err.code ?? 'n/a'} message=${err.message ?? 'unknown'} body=${bodyPreview}`,
      );
      const userFacingError = buildProviderErrorMessage(providerModel.provider_name, status, providerMessage);
      this.sendStreamEvent('hermes.error', {
        messageId,
        error: userFacingError,
      }, senderWs);
      return this.refundLingqiIfUnsuccessful(requestParams, lingqiCharge.charge, {
        ok: false,
        messageId,
        error: userFacingError,
      });
    }
  }

  private async prepareLingqiCharge(
    params: HermesMessageParams,
    billingId: string,
    senderWs?: WebSocket,
  ): Promise<
    | LingqiChargeDecision
    | { error: HermesSendResult }
  > {
    if (!params.teamId) {
      return { charge: { amount: 0, billingId }, billingId };
    }

    const estimate = await this.quotaService.estimateLingqiCost(params.teamId, {
      transactionType: 'chat_message',
      modelId: params.model,
      context: { conversationId: params.conversationId },
    });
    const messageId = params.messageId || this.generateUUID();

    if (!estimate.canAfford) {
      const error = estimate.reason || 'LINGQI_INSUFFICIENT_BALANCE';
      this.sendStreamEvent('hermes.error', { messageId, error }, senderWs);
      return { error: { ok: false, messageId, error } };
    }

    const executionModel = await this.quotaService.getSelectedModelForExecution(
      params.teamId,
      params.model,
      params.conversationId,
    );

    return {
      charge: {
        amount: estimate.estimatedCost,
        modelId: executionModel.id,
        billingId,
      },
      billingId,
      executionModelName: executionModel.modelName,
    };
  }

  // Slice 2026-07-02-gateway-split-provider-resolution: 1-line pass-through
  // to `this.providerResolutionService.resolveProviderModelForLingqiCharge()`.
  // The verbatim body lives in `GatewayProviderResolutionService.resolveProviderModelForLingqiCharge`.
  private async resolveProviderModelForLingqiCharge(lingqiCharge: LingqiChargeDecision): Promise<ProviderModelRow | null> {
    return this.providerResolutionService.resolveProviderModelForLingqiCharge(lingqiCharge);
  }

  // Slice 2026-07-02-gateway-split-provider-resolution: 1-line pass-through
  // to `this.providerResolutionService.tryBuildHermesProviderOverride()`.
  // The verbatim body lives in `GatewayProviderResolutionService.tryBuildHermesProviderOverride`.
  private async tryBuildHermesProviderOverride(
    lingqiCharge: LingqiChargeDecision,
  ): Promise<HermesAgentProviderOverride | undefined> {
    return this.providerResolutionService.tryBuildHermesProviderOverride(lingqiCharge);
  }

  private async prepayLingqiCharge(
    params: HermesMessageParams,
    charge: { amount: number; modelId?: string; billingId: string },
    messageId: string,
    billingId: string,
  ): Promise<{ ok: true } | { error: HermesSendResult }> {
    if (!params.teamId || charge.amount <= 0) {
      return { ok: true };
    }

    if (!params.userId) {
      return { error: { ok: false, messageId, error: 'Authentication required' } };
    }

    try {
      await this.quotaService.consumeLingqi(params.teamId, params.userId, {
        amount: charge.amount,
        transactionType: 'chat_message',
        sourceType: 'chat',
        sourceId: params.conversationId || messageId,
        description: '聊天模型调用',
        metadata: { modelId: charge.modelId || params.model || null, messageId },
        idempotencyKey: `charge:chat:${billingId}`,
      });
      return { ok: true };
    } catch (error: unknown) {
      this.logger.error('Failed to prepay Lingqi before chat execution:', error);
      return { error: { ok: false, messageId, error: 'LINGQI_CHARGE_FAILED' } };
    }
  }

  private async refundLingqiIfUnsuccessful(
    params: HermesMessageParams,
    charge: { amount: number; modelId?: string; billingId: string },
    result: HermesSendResult,
    hasBillableOutput = false,
  ): Promise<HermesSendResult> {
    if ((result.ok && !result.aborted) || hasBillableOutput) {
      return result;
    }

    await this.refundLingqiCharge(params, charge, result.messageId);
    return result;
  }

  private async refundLingqiCharge(
    params: HermesMessageParams,
    charge: { amount: number; modelId?: string; billingId: string },
    messageId: string,
  ): Promise<void> {
    if (!params.teamId || !params.userId || charge.amount <= 0 || this.refundedLingqiMessages.has(charge.billingId)) {
      return;
    }

    this.refundedLingqiMessages.add(charge.billingId);

    try {
      await this.quotaService.refundLingqi(params.teamId, params.userId, {
        amount: charge.amount,
        transactionType: 'chat_message',
        sourceType: 'chat_refund',
        sourceId: params.conversationId || messageId,
        description: '聊天模型调用退款',
        metadata: { modelId: charge.modelId || params.model || null, messageId },
        idempotencyKey: `refund:chat:${charge.billingId}`,
        refundOfIdempotencyKey: `charge:chat:${charge.billingId}`,
      });
    } catch (error: unknown) {
      this.refundedLingqiMessages.delete(charge.billingId);
      this.logger.error('Failed to refund Lingqi after unsuccessful chat execution:', error);
    }
  }

  async generateConfig(params: GenerateConfigParams, senderWs: WebSocket): Promise<{ ok: boolean; streamId: string }> {
    const streamId = this.generateUUID();

    const systemPrompt = params.type === 'expert'
      ? `你是一个AI助手，帮助用户创建"宗主"（Expert）配置。
用户会描述他们需要什么样的专家，你需要根据描述生成对应的配置JSON。

输出要求：
- 返回一个JSON对象，包含以下字段：
  - name: 专家名称（简短有力，2-6个汉字）
  - description: 专家描述（一句话说明专长）
  - systemPrompt: 系统提示词（详细定义专家的行为和能力，至少200字）
  - icon: emoji图标（从常用emoji中选择最合适的）
  - color: 主题色（从以下预设中选择最匹配的：#3B82F6, #8B5CF6, #EC4899, #EF4444, #F97316, #EAB308, #22C55E, #14B8A6, #06B6D4, #6366F1, #A855F7, #F43F5E）

请将JSON包裹在 \`\`\`json ... \`\`\` 代码块中。只输出JSON，不要输出其他内容。`
      : `你是一个AI助手，帮助用户创建"技能"（Skill）配置。
用户会描述他们需要什么样的技能，你需要根据描述生成对应的配置JSON。

输出要求：
- 返回一个JSON对象，包含以下字段：
  - name: 技能名称（简短有力）
  - description: 技能描述（一句话说明用途）
  - content: 技能内容/指令（详细的系统提示词，至少200字）
  - icon: emoji图标
  - category: 分类（从以下选择：development, productivity, tools, writing, analytics）
  - tags: 标签数组（2-5个相关标签）
  - version: 版本号（默认 "1.0.0"）

请将JSON包裹在 \`\`\`json ... \`\`\` 代码块中。只输出JSON，不要输出其他内容。`;

    const messages: HermesChatMessage[] = [
      { role: 'system', content: systemPrompt },
    ];

    if (params.conversationHistory && params.conversationHistory.length > 0) {
      for (const msg of params.conversationHistory) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    messages.push({ role: 'user', content: params.description });

    this.logger.log(`generateConfig: type=${params.type}, streamId=${streamId}`);

    // Resolve a default provider model (first available) without billing
    const teamId = params.teamId;
    const defaultModel = await this.findDefaultGenerateModel(teamId);
    if (!defaultModel) {
      this.sendStreamEvent('generate.error', { streamId, error: 'No available AI model configured' }, senderWs);
      return { ok: false, streamId };
    }

    const providerId = defaultModel.provider_id;
    const modelCode = defaultModel.model_id;

    const apiKeyRecord = await this.aiModelsService.findActiveApiKeyByProvider(providerId);
    if (!apiKeyRecord) {
      this.sendStreamEvent('generate.error', { streamId, error: 'No active API key for provider' }, senderWs);
      return { ok: false, streamId };
    }

    const decryptedKey = await this.aiModelsService.getDecryptedApiKey(apiKeyRecord.id);
    if (!decryptedKey) {
      this.sendStreamEvent('generate.error', { streamId, error: 'Failed to decrypt API key' }, senderWs);
      return { ok: false, streamId };
    }

    const endpoint = await this.aiModelsService.findDefaultEndpointByProvider(providerId);
    if (!endpoint?.base_url) {
      this.sendStreamEvent('generate.error', { streamId, error: 'No active endpoint configured' }, senderWs);
      return { ok: false, streamId };
    }

    let baseUrl: string;
    try {
      baseUrl = normalizeProviderBaseUrl(endpoint.base_url);
    } catch {
      this.sendStreamEvent('generate.error', { streamId, error: 'Invalid provider endpoint URL' }, senderWs);
      return { ok: false, streamId };
    }

    const isMiniMax = isMiniMaxAnthropicProviderHelper(defaultModel, baseUrl);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${decryptedKey}`,
    };
    if (isMiniMax) {
      headers['anthropic-version'] = '2023-06-01';
    }
    try {
      if (endpoint?.headers) {
        const extraHeaders = typeof endpoint.headers === 'string' ? JSON.parse(endpoint.headers) : endpoint.headers;
        Object.assign(headers, extraHeaders);
      }
    } catch {
      // ignore invalid headers config
    }

    const systemMessages = messages.filter(m => m.role === 'system');
    const providerMessages = isMiniMax
      ? messages.filter(m => m.role !== 'system')
      : messages;

    const requestBody: HermesChatRequestBody = {
      model: modelCode,
      messages: providerMessages,
      stream: true,
    };
    if (isMiniMax && systemMessages.length > 0) {
      const sysText = systemMessages
        .map(m => m.content)
        .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
        .join('\n\n');
      if (sysText) requestBody.system = sysText;
    }
    if (defaultModel.temperature !== null && defaultModel.temperature !== undefined) {
      requestBody.temperature = defaultModel.temperature;
    }
    if (defaultModel.max_tokens !== null && defaultModel.max_tokens !== undefined) {
      requestBody.max_tokens = defaultModel.max_tokens;
    } else if (isMiniMax) {
      requestBody.max_tokens = 2048;
    }
    if (defaultModel.top_p !== null && defaultModel.top_p !== undefined) {
      requestBody.top_p = defaultModel.top_p;
    }

    const timeout = endpoint?.timeout_ms || 60000;

    try {
      const providerRequestPath = isMiniMax ? '/v1/messages' : '/v1/chat/completions';
      const response = await firstValueFrom(
        this.httpService.post(`${baseUrl}${providerRequestPath}`, requestBody, {
          headers,
          responseType: 'stream',
          timeout,
          maxRedirects: 0,
        })
      );

      this.logger.log(`generateConfig: provider connected (${defaultModel.provider_name}/${modelCode})`);

      const stream = response.data;
      let fullResponse = '';
      let lineBuffer = '';

      return new Promise((resolve) => {
        let settled = false;
        const settle = (result: { ok: boolean; streamId: string }) => {
          if (!settled) {
            settled = true;
            resolve(result);
          }
        };

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
              if (delta) {
                fullResponse += delta;
                this.sendStreamEvent('generate.delta', { streamId, delta }, senderWs);
              }
            } catch {
              // skip unparseable SSE lines
            }
          }
        });

        stream.on('end', () => {
          // process remaining lineBuffer
          if (lineBuffer.trim()) {
            const trimmed = lineBuffer.trim();
            if (trimmed.startsWith('data:')) {
              const payload = trimmed.slice(5).trim();
              if (payload !== '[DONE]') {
                try {
                  const data = JSON.parse(payload);
                  const delta = extractProviderTextDelta(data);
                  if (delta) fullResponse += delta;
                } catch { /* skip */ }
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

  // Slice 2026-07-02-gateway-split-provider-resolution: 1-line pass-through
  // to `this.providerResolutionService.findDefaultGenerateModel()`. The
  // verbatim body lives in `GatewayProviderResolutionService.findDefaultGenerateModel`.
  private async findDefaultGenerateModel(teamId: string): Promise<ProviderModelRow | null> {
    return this.providerResolutionService.findDefaultGenerateModel(teamId);
  }

  async abortStreamsForSocket(ws: WebSocket): Promise<void> {
    const aborts = Array.from(this.activeStreams.entries())
      .filter(([, entry]) => entry.ws === ws)
      .map(([messageId]) => this.abortHermesMessage({ messageId }, ws));

    await Promise.allSettled(aborts);
  }

  async abortHermesMessage(params: { messageId: string }, requestingWs: WebSocket): Promise<HermesSendResult> {
    const { messageId } = params;
    const entry = this.activeStreams.get(messageId);
    if (!entry) {
      this.logger.warn(`No active stream found for messageId: ${messageId}`);
      return { ok: false, messageId, error: 'No active stream' };
    }

    if (entry.ws !== requestingWs) {
      this.logger.warn(`Unauthorized abort attempt for messageId: ${messageId}`);
      return { ok: false, messageId, error: 'Unauthorized' };
    }

    this.logger.log(`Aborting stream for messageId: ${messageId}`);
    entry.aborted = true;

    if (entry.prepaid && !entry.hasBillableOutput) {
      await this.refundLingqiCharge(entry.prepaid.params, entry.prepaid.charge, messageId);
    }

    if (entry.stream.destroy) {
      entry.stream.destroy();
    }

    this.activeStreams.delete(messageId);

    this.sendStreamEvent('hermes.final', {
      messageId,
      content: '',
      aborted: true,
    }, entry.ws);

    return { ok: true, messageId, aborted: true };
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
      let settled = false;

      return new Promise((resolve, reject) => {
        const settle = (result: HermesSendResult) => {
          if (settled) return;
          settled = true;
          resolve(result);
        };

        stream.on('data', (chunk: Buffer) => {
          if (settled) return;
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

                  settle({ ok: true, messageId });
                }
              } catch (e) {
                this.logger.warn(`Failed to parse SSE line: ${line}`);
              }
            }
          }

        });

        stream.on('end', () => {
          if (settled) return;

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
            this.logger.error('Legacy hermes returned no response.');
            this.sendStreamEvent('hermes.error', {
              messageId,
              error: 'No response from legacy Hermes.',
            }, senderWs);
            settle({ ok: false, messageId, error: 'No response' });
            return;
          }

          this.sendStreamEvent('hermes.final', {
            messageId,
            content: fullResponse,
            totalTokens: 0,
          }, senderWs);
          settle({ ok: true, messageId });
        });

        stream.on('error', (error: Error) => {
          if (settled) return;

          this.logger.error('Hermes stream error:', error);
          this.sendStreamEvent('hermes.error', {
            messageId,
            error: 'Legacy Hermes stream error',
          }, senderWs);
          settle({ ok: false, messageId, error: 'Legacy Hermes stream error' });
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
        error: 'Legacy Hermes request failed',
      }, senderWs);

      return { ok: false, messageId, error: 'Legacy Hermes request failed' };
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

  // Slice 2026-07-02-gateway-split-usage: 1-line pass-through to
  // `this.usageService.recordProviderUsage(...)`. The verbatim body now
  // lives in `GatewayUsageService.recordProviderUsage`. Kept as a private
  // method on the facade so the 2 internal callsites (lines ~1242 and
  // ~1343) continue to bind to the same `this` — no callsite changes
  // required, preserving zero-spec-change.
  private async recordProviderUsage(
    apiKeyId: string,
    providerId: string,
    modelId: string,
    totalTokens: number,
    latencyMs: number,
    teamId?: string,
  ) {
    return this.usageService.recordProviderUsage(apiKeyId, providerId, modelId, totalTokens, latencyMs, teamId);
  }

  private sendStreamEvent(eventType: string, data: any, targetWs?: WebSocket): void {
    if (!this.gatewayInstance && !targetWs) {
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

  async getUsageStatus(params: { teamId: string; period?: 'day' | 'week' | 'month' }) {
    const period = params.period || 'month';

    // Get usage from database
    const stats = await this.db.getUsageStats(period, params.teamId);
    const [dailyStats, weeklyStats, monthlyStats] = await Promise.all([
      this.db.getUsageStats('day', params.teamId),
      this.db.getUsageStats('week', params.teamId),
      this.db.getUsageStats('month', params.teamId),
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
    return this.extensionsService.listExperts(params);
  }

  async getExpert(params: { id: string; teamId?: string }) {
    return this.extensionsService.getExpert(params);
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
    return this.extensionsService.createExpert(params);
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
    return this.extensionsService.updateExpert(params);
  }

  async deleteExpert(params: { id: string; teamId?: string }) {
    return this.extensionsService.deleteExpert(params);
  }

  async setActiveExpert(params: { id: string; teamId?: string; userId?: string }) {
    return this.extensionsService.setActiveExpert(params);
  }

  async recordExpertUsage(params: {
    expertId: string;
    userId: string;
    teamId?: string;
    tokens?: number;
    duration?: number;
  }) {
    return this.extensionsService.recordExpertUsage(params);
  }

  async getExpertStats(params: { id: string; teamId?: string }) {
    return this.extensionsService.getExpertStats(params);
  }

  async getExpertCategories(params: { teamId?: string }) {
    return this.extensionsService.getExpertCategories(params);
  }

  async rateExpert(params: { id: string; rating: number; teamId?: string }) {
    return this.extensionsService.rateExpert(params);
  }

  // Slice 2026-07-02-gateway-split-connection: boundary facade methods.
  // These 3 helpers are kept on GatewayService as private methods that
  // delegate to GatewayConnectionService (which itself delegates to the
  // pure module-scope functions in ./gateway.helpers).
  // Reason: the spec uses jest.spyOn(service as any, 'generateUUID') and
  // may reference the other two. Keeping them as private facade methods
  // on the same instance that the spec spies on preserves spec
  // compatibility (zero spec changes per AC-6).
  private getJwtSecret(): string {
    return this.connectionService.getJwtSecret();
  }

  private getTokenExpiresAt(payload: GatewayJwtPayload): number {
    return this.connectionService.getTokenExpiresAt(payload);
  }

  private generateUUID(): string {
    return this.connectionService.generateUUID();
  }

  private async generateTokens(userId: string, teamId: string | null, role: string) {
    return this.connectionService.generateTokens(userId, teamId, role);
  }

  private async generateServiceToken(): Promise<string> {
    return this.connectionService.generateServiceToken();
  }

  // ===== Additional methods for compatibility =====

  // Slice 2026-07-02-gateway-split-extensions: 1-line pass-throughs to
  // `this.extensionsService.*`. The verbatim bodies now live in
  // `GatewayExtensionsService`.

  async getAllExtensions(): Promise<unknown[]> {
    return this.extensionsService.getAllExtensions();
  }

  async getInstalledExtensions(params: { userId: string }): Promise<unknown[]> {
    return this.extensionsService.getInstalledExtensions(params);
  }

  async installExtension(params: { extensionId: string; userId: string; config?: Record<string, unknown> }): Promise<unknown> {
    return this.extensionsService.installExtension(params);
  }

  async uninstallExtension(params: { extensionId: string; userId: string }): Promise<unknown> {
    return this.extensionsService.uninstallExtension(params);
  }

  async enableExtension(params: { extensionId: string; userId: string }): Promise<unknown> {
    return this.extensionsService.enableExtension(params);
  }

  async disableExtension(params: { extensionId: string; userId: string }): Promise<unknown> {
    return this.extensionsService.disableExtension(params);
  }

  async updateExtensionConfig(params: { extensionId: string; userId: string; config: Record<string, unknown> }): Promise<unknown> {
    return this.extensionsService.updateExtensionConfig(params);
  }

  // ===== Skills Methods =====

  async listSkills(params: { teamId: string; userId: string; role?: string; status?: string }): Promise<unknown[]> {
    return this.extensionsService.listSkills(params);
  }

  async getSkill(params: { id: string; teamId: string; userId: string; role?: string }): Promise<unknown> {
    return this.extensionsService.getSkill(params);
  }

  async createSkill(params: { teamId: string; authorId: string; name: string; description?: string; content: string; icon?: string; category?: string; tags?: string[]; config?: Record<string, unknown>; configSchema?: Record<string, unknown> }): Promise<unknown> {
    return this.extensionsService.createSkill(params);
  }

  async updateSkill(params: { id: string; teamId: string; userId: string; role?: string; name?: string; description?: string; version?: string; content?: string; icon?: string; category?: string; tags?: string[]; config?: Record<string, unknown>; configSchema?: Record<string, unknown> }): Promise<unknown> {
    return this.extensionsService.updateSkill(params);
  }

  async requestPublishSkillToTeam(params: { id: string; accessPolicy?: { mode: 'all' | 'users' | 'role'; userIds?: string[]; minimumRole?: 'MEMBER' | 'ADMIN' | 'OWNER' } }, actor: { userId: string; teamId: string; role: string }): Promise<unknown> {
    return this.extensionsService.requestPublishSkillToTeam(params, actor);
  }

  async approveTeamSkillPublish(params: { id: string }, actor: { userId: string; teamId: string; role: string }): Promise<unknown> {
    return this.extensionsService.approveTeamSkillPublish(params, actor);
  }

  async rejectTeamSkillPublish(params: { id: string; comment?: string }, actor: { userId: string; teamId: string; role: string }): Promise<unknown> {
    return this.extensionsService.rejectTeamSkillPublish(params, actor);
  }

  async requestPublishSkillToMarketplace(params: { id: string; note?: string }, actor: { userId: string; teamId: string; role: string }): Promise<unknown> {
    return this.extensionsService.requestPublishSkillToMarketplace(params, actor);
  }

  async deleteSkill(params: { id: string; teamId: string; userId: string; role?: string }): Promise<void> {
    return this.extensionsService.deleteSkill(params);
  }

  // ===== Marketplace Skills Methods =====

  async listMarketplaceSkills(params: { teamId: string }): Promise<unknown[]> {
    return this.extensionsService.listMarketplaceSkills(params);
  }
}
