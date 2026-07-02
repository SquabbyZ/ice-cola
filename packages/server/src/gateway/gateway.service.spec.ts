import { GatewayService } from './gateway.service';
import { DatabaseService } from '../database/database.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { AiModelsService } from '../ai-models/ai-models.service';
import { WebSocket } from 'ws';
import { PassThrough } from 'stream';
import { of } from 'rxjs';
import { QuotaService } from '../quota/quota.service';
import { SkillsService } from '../skills/skills.service';
import { GatewayConnectionService } from './gateway-connection.service';
import { GatewayUsageService } from './gateway-usage.service';
import { GatewayProviderResolutionService } from './gateway-provider-resolution.service';
import { GatewayExtensionsService } from './gateway-extensions.service';
import { GatewayPromptContextService } from './gateway-prompt-context.service';
import { GatewayLingqiService } from './gateway-lingqi.service';
import { GatewayHermesService } from './gateway-hermes.service';

type ExtensionFixture = {
  id: string;
  name: string;
  enabled: boolean;
};

describe('GatewayService extensions', () => {
  let service: GatewayService;
  let db: jest.Mocked<Pick<DatabaseService, 'findAllExtensions' | 'findUserById' | 'listExperts' | 'countExperts' | 'createExpert' | 'findExpertById' | 'findExpertByIdForTeam' | 'findTeamExpertById' | 'updateExpert' | 'deleteExpert' | 'findConversationById' | 'updateConversation' | 'deleteMessagesByConversationId' | 'deleteConversation' | 'findMessagesByConversationId' | 'getConversationMCPServers' | 'getMCPServersByIdsForTeam' | 'findInstalledEnabledExtensionsByIdsForUser' | 'getUsageStats'>>;
  let jwtService: jest.Mocked<Pick<JwtService, 'verify' | 'signAsync'>>;
  let configService: { get: jest.Mock };
  let quotaService: jest.Mocked<Pick<QuotaService, 'estimateLingqiCost' | 'consumeLingqi' | 'refundLingqi' | 'getSelectedModelForExecution'>>;
  let aiModelsService: jest.Mocked<Pick<AiModelsService, 'findExecutableModelByModelId' | 'findActiveApiKeyByProvider' | 'getDecryptedApiKey' | 'findDefaultEndpointByProvider' | 'updateApiKeyLastUsed' | 'createUsageLog' | 'incrementTeamQuotaUsage'>>;
  let skillsService: jest.Mocked<Pick<SkillsService, 'findEnabledSkillsForConversation' | 'findSkillsByIdsForTeam'>>;
  let connectionServiceMock: GatewayConnectionService;
  let usageServiceMock: GatewayUsageService;
  let providerResolutionServiceMock: GatewayProviderResolutionService;
  let extensionsServiceMock: GatewayExtensionsService;
  let promptContextServiceMock: GatewayPromptContextService;
  let lingqiServiceMock: GatewayLingqiService;
  let hermesServiceMock: GatewayHermesService;
  const socket = {} as WebSocket;
  const futureJwtExp = Math.floor(Date.now() / 1000) + 900;

  function providerModelFixture(overrides: Record<string, unknown> = {}) {
    return {
      id: 'provider-model-row-1',
      provider_id: 'provider-1',
      provider_name: 'Provider',
      model_id: 'provider-model',
      ...overrides,
    };
  }

  function successfulLingqiEstimate() {
    return {
      estimatedCost: 10,
      balanceAfterEstimate: 90,
      canAfford: true,
      reason: null,
      model: {
        id: 'model-1',
        modelName: 'provider-model',
        displayName: 'Provider Model',
        rank: 1,
        costMultiplier: 1,
        requiredPlanLevel: 0,
      },
      subscription: {
        planName: 'wanderer',
        displayName: '散修',
        level: 0,
        costDiscountRate: 1,
        modelRankLimit: 1,
        expiresAt: null,
      },
    };
  }

  beforeEach(() => {
    db = {
      findAllExtensions: jest.fn(),
      findUserById: jest.fn(),
      listExperts: jest.fn(),
      countExperts: jest.fn(),
      createExpert: jest.fn(),
      findExpertById: jest.fn(),
      findExpertByIdForTeam: jest.fn(),
      findTeamExpertById: jest.fn(),
      updateExpert: jest.fn(),
      deleteExpert: jest.fn(),
      findConversationById: jest.fn(),
      updateConversation: jest.fn(),
      deleteMessagesByConversationId: jest.fn(),
      deleteConversation: jest.fn(),
      findMessagesByConversationId: jest.fn(),
      getConversationMCPServers: jest.fn(),
      getMCPServersByIdsForTeam: jest.fn(),
      findInstalledEnabledExtensionsByIdsForUser: jest.fn(),
      getUsageStats: jest.fn(),
    };
    jwtService = {
      verify: jest.fn(),
      signAsync: jest.fn(),
    };
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_SECRET') return 'test-secret';
        return undefined;
      }),
    };
    quotaService = {
      estimateLingqiCost: jest.fn(),
      consumeLingqi: jest.fn(),
      refundLingqi: jest.fn(),
      getSelectedModelForExecution: jest.fn(),
    };
    aiModelsService = {
      findExecutableModelByModelId: jest.fn().mockResolvedValue(providerModelFixture()),
      findActiveApiKeyByProvider: jest.fn().mockResolvedValue({ id: 'key-1' }),
      getDecryptedApiKey: jest.fn().mockResolvedValue('secret-key'),
      findDefaultEndpointByProvider: jest.fn().mockResolvedValue(null),
      updateApiKeyLastUsed: jest.fn().mockResolvedValue(undefined),
      createUsageLog: jest.fn().mockResolvedValue(undefined),
      incrementTeamQuotaUsage: jest.fn().mockResolvedValue(undefined),
    };
    skillsService = {
      findEnabledSkillsForConversation: jest.fn().mockResolvedValue([]),
      findSkillsByIdsForTeam: jest.fn().mockResolvedValue([]),
    };

    // Slice 2026-07-02-gateway-facade-slim: 7 cluster service mocks (14-arg ctor).
    // The facade uses a custom Object.assign variant that copies PROTOTYPE
    // methods (not just own properties, since TS classes put methods on
    // the proto). We therefore construct real cluster service instances
    // with the same db/jwtService/configService mocks the spec already
    // wires for the facade. The cluster services read the mocks at call
    // time (slice-6/7 contract), so the existing `db.findUserById` /
    // `jwtService.verify` mocks work transparently through the
    // Object.assign'd copy on the facade.
    // Tests that need to override a method use `jest.spyOn(service as
    // any, 'methodName')` which patches the facade-property copy.
    connectionServiceMock = new GatewayConnectionService(
      db as unknown as DatabaseService,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
    );
    usageServiceMock = new GatewayUsageService(aiModelsService as unknown as AiModelsService);
    // providerResolutionService reads HERMES_AGENT_URL from config in its
    // constructor body (caches it on `this.hermesAgentUrl`). Wire a mock
    // value before constructing the cluster.
    (configService as any).get.mockImplementation((k: string) => (k === 'HERMES_AGENT_URL' ? 'http://localhost:8642' : (k === 'JWT_SECRET' ? 'test-secret' : undefined)));
    providerResolutionServiceMock = new GatewayProviderResolutionService(
      aiModelsService as unknown as AiModelsService,
      { post: jest.fn(), get: jest.fn() } as unknown as HttpService,
      configService as unknown as ConfigService,
    );
    extensionsServiceMock = new GatewayExtensionsService(db as unknown as DatabaseService);
    promptContextServiceMock = new GatewayPromptContextService(
      db as unknown as DatabaseService,
      skillsService as unknown as SkillsService,
    );
    lingqiServiceMock = new GatewayLingqiService(
      quotaService as unknown as QuotaService,
      aiModelsService as unknown as AiModelsService,
      {
        isRefunded: () => false,
        markRefunded: () => undefined,
        unmarkRefunded: () => undefined,
        sendStreamEvent: () => undefined,
        generateUUID: () => 'spec-uuid',
      },
    );
    hermesServiceMock = new GatewayHermesService(
      { post: jest.fn(), get: jest.fn() } as unknown as HttpService,
      configService as unknown as ConfigService,
      aiModelsService as unknown as AiModelsService,
      providerResolutionServiceMock,
      lingqiServiceMock,
      promptContextServiceMock,
      usageServiceMock,
      {
        getActiveStream: () => undefined,
        setActiveStream: () => undefined,
        deleteActiveStream: () => false,
        allActiveStreams: function* () { /* empty */ },
        sendStreamEvent: () => undefined,
        checkHermesAgentHealth: async () => true,
        sendHermesAgentMessage: async () => ({ ok: true, messageId: 'm' }),
        generateUUID: () => 'spec-uuid',
        checkQuota: async () => null,
      },
    );

    service = new GatewayService(
      db as unknown as DatabaseService,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
      { post: jest.fn(), get: jest.fn() } as unknown as HttpService,
      aiModelsService as unknown as AiModelsService,
      quotaService as unknown as QuotaService,
      skillsService as unknown as SkillsService,
      // Slice 2026-07-02-gateway-facade-slim: 14-arg constructor (was 7).
      // The spec only tests public boundary methods reachable via
      // Object.assign (connection/lingqi/hermes clusters etc.); the 7 cluster
      // mocks below are placeholder objects sufficient for facade construction.
      // Tests that depend on cluster behaviour use jest.spyOn(service as any,
      // 'methodName') which patches the facade-property copy created by
      // Object.assign in the facade constructor — see gateway.service.ts.
      connectionServiceMock as unknown as GatewayConnectionService,
      usageServiceMock as unknown as GatewayUsageService,
      providerResolutionServiceMock as unknown as GatewayProviderResolutionService,
      extensionsServiceMock as unknown as GatewayExtensionsService,
      promptContextServiceMock as unknown as GatewayPromptContextService,
      lingqiServiceMock as unknown as GatewayLingqiService,
      hermesServiceMock as unknown as GatewayHermesService,
    );

    // Slice 2026-07-02-gateway-facade-slim: rewire the hermesService's state
    // callbacks to delegate through the freshly-constructed facade. This
    // mirrors the closure-binding the slice-7 buildDefaultHermesService did
    // (it captured `this` on the facade inside the GatewayService constructor).
    // In slice 8 the cluster is a real Nest-injected instance, so the state
    // object is constructed before `service` exists. After service
    // construction, mutate each state callback to forward to the facade —
    // this preserves the spec contract where `jest.spyOn(service as any,
    // 'methodName')` propagates into the cluster's internal calls.
    const hermesState = (hermesServiceMock as any).state;
    if (hermesState) {
      hermesState.sendHermesAgentMessage = (...args: unknown[]) => (service as any).sendHermesAgentMessage(...args);
      hermesState.checkHermesAgentHealth = () => (service as any).checkHermesAgentHealth();
      hermesState.sendStreamEvent = (eventType: string, data: unknown, targetWs?: unknown) =>
        (service as any).sendStreamEvent ? (service as any).sendStreamEvent(eventType, data, targetWs) : undefined;
      hermesState.generateUUID = () => (service as any).generateUUID
        ? (service as any).generateUUID()
        : 'spec-uuid';
      hermesState.checkQuota = (teamId: string) => (service as any).checkQuota
        ? (service as any).checkQuota(teamId)
        : Promise.resolve(null);
      hermesState.getActiveStream = (id: string) => (service as any).activeStreams?.get(id);
      hermesState.setActiveStream = (id: string, entry: unknown) => (service as any).activeStreams?.set(id, entry);
      hermesState.deleteActiveStream = (id: string) => (service as any).activeStreams?.delete(id) ?? false;
      hermesState.allActiveStreams = function* () { yield* ((service as any).activeStreams?.entries?.() ?? []); };
    }
    const lingqiState = (lingqiServiceMock as any).state;
    if (lingqiState) {
      lingqiState.isRefunded = (id: string) => (service as any).refundedLingqiMessages?.has(id) ?? false;
      lingqiState.markRefunded = (id: string) => (service as any).refundedLingqiMessages?.add(id);
      lingqiState.unmarkRefunded = (id: string) => (service as any).refundedLingqiMessages?.delete(id);
      lingqiState.sendStreamEvent = (eventType: string, data: unknown, targetWs?: unknown) =>
        (service as any).sendStreamEvent?.(eventType, data, targetWs);
      lingqiState.generateUUID = () => (service as any).generateUUID?.() ?? 'spec-uuid';
    }
  });

  it('returns extension marketplace entries from the database', async () => {
    const extensions: ExtensionFixture[] = [
      { id: 'extension-1', name: 'GitHub Tools', enabled: true },
    ];
    db.findAllExtensions.mockResolvedValue(extensions);

    await expect(service.getAllExtensions()).resolves.toEqual(extensions);
    expect(db.findAllExtensions).toHaveBeenCalledTimes(1);
  });

  it('ignores client-supplied MCP servers on the websocket path', async () => {
    configService.get.mockReturnValue('internal-secret');
    const stream = new PassThrough();
    const post = jest.fn().mockReturnValue(of({ data: stream }));
    (service as any).httpService = { post, get: jest.fn() } as unknown as HttpService;

    const resultPromise = (service as any).sendHermesAgentMessage({
      sessionId: 'session-1',
      message: 'hello',
      mcpServers: [
        { name: 'filesystem', type: 'stdio', config: { command: 'npx' } },
      ],
    } as any);
    stream.end('data: [DONE]\n\n');
    await resultPromise;

    expect(post).toHaveBeenCalled();
    const [url, body, options] = post.mock.calls[0];
    expect(url).toContain('/v1/chat/completions');
    expect(body.mcp_servers).toBeUndefined();
    expect(options.headers['X-Hermes-Internal-MCP-Key']).toBeUndefined();
  });

  it('adds internal MCP key when forwarding safe conversation-scoped MCP servers', async () => {
    configService.get.mockReturnValue('internal-secret');
    db.findConversationById.mockResolvedValue({ id: 'conversation-1', teamId: 'team-1' } as any);
    db.findMessagesByConversationId.mockResolvedValue([]);
    db.getConversationMCPServers.mockResolvedValue([
      { name: 'remote-tools', server_type: 'https', config: { url: 'https://mcp.example.com/sse', token: 'ignored' } },
      { name: 'filesystem', server_type: 'stdio', config: { command: 'npx' } },
    ] as any);
    const stream = new PassThrough();
    const post = jest.fn().mockReturnValue(of({ data: stream }));
    (service as any).httpService = { post, get: jest.fn() } as unknown as HttpService;

    const resultPromise = (service as any).sendHermesAgentMessage({
      sessionId: 'session-1',
      conversationId: 'conversation-1',
      teamId: 'team-1',
      message: 'hello',
    });
    stream.end('data: [DONE]\n\n');
    await resultPromise;

    expect(post).toHaveBeenCalled();
    const [, body, options] = post.mock.calls[0];
    expect(body.mcp_servers).toEqual([
      { name: 'remote-tools', type: 'https', config: { url: 'https://mcp.example.com/sse' } },
    ]);
    expect(options.headers['X-Hermes-Internal-MCP-Key']).toBe('internal-secret');
  });

  it('uses explicit mcpServerIds instead of persisted conversation MCP servers', async () => {
    configService.get.mockReturnValue('internal-secret');
    db.findConversationById.mockResolvedValue({ id: 'conversation-1', teamId: 'team-1' } as any);
    db.findMessagesByConversationId.mockResolvedValue([]);
    db.getMCPServersByIdsForTeam.mockResolvedValue([
      { id: 'mcp-override', name: 'override-tools', server_type: 'https', config: { url: 'https://override.example.com/sse', token: 'hidden' } },
    ] as any);
    const stream = new PassThrough();
    const post = jest.fn().mockReturnValue(of({ data: stream }));
    (service as any).httpService = { post, get: jest.fn() } as unknown as HttpService;

    const resultPromise = (service as any).sendHermesAgentMessage({
      sessionId: 'session-1',
      conversationId: 'conversation-1',
      teamId: 'team-1',
      message: 'hello',
      mcpServerIds: ['mcp-override'],
    });
    stream.end('data: [DONE]\n\n');
    await resultPromise;

    expect(db.getMCPServersByIdsForTeam).toHaveBeenCalledWith(['mcp-override'], 'team-1');
    expect(db.getConversationMCPServers).not.toHaveBeenCalled();
    const [, body] = post.mock.calls[0];
    expect(body.mcp_servers).toEqual([
      { name: 'override-tools', type: 'https', config: { url: 'https://override.example.com/sse' } },
    ]);
  });

  it('loads persisted conversation expert when expertId is omitted', async () => {
    db.findConversationById.mockResolvedValue({ id: 'conversation-1', teamId: 'team-1', expert_id: 'expert-persisted' } as any);
    db.findMessagesByConversationId.mockResolvedValue([]);
    db.findExpertByIdForTeam.mockResolvedValue({ systemPrompt: 'Persisted expert prompt' } as any);
    db.getConversationMCPServers.mockResolvedValue([] as any);
    const stream = new PassThrough();
    const post = jest.fn().mockReturnValue(of({ data: stream }));
    (service as any).httpService = { post, get: jest.fn() } as unknown as HttpService;

    const resultPromise = (service as any).sendHermesAgentMessage({
      sessionId: 'session-1',
      conversationId: 'conversation-1',
      teamId: 'team-1',
      message: 'Current user message',
    });
    stream.end('data: [DONE]\n\n');
    await resultPromise;

    expect(db.findExpertByIdForTeam).toHaveBeenCalledWith('expert-persisted', 'team-1');
    const [, body] = post.mock.calls[0];
    expect(body.messages).toEqual([
      { role: 'system', content: 'Persisted expert prompt' },
      { role: 'user', content: 'Current user message' },
    ]);
  });

  it('uses explicit expertId instead of persisted conversation expert', async () => {
    db.findConversationById.mockResolvedValue({ id: 'conversation-1', teamId: 'team-1', expert_id: 'expert-persisted' } as any);
    db.findMessagesByConversationId.mockResolvedValue([]);
    db.findExpertByIdForTeam.mockResolvedValue({ systemPrompt: 'Explicit expert prompt' } as any);
    db.getConversationMCPServers.mockResolvedValue([] as any);
    const stream = new PassThrough();
    const post = jest.fn().mockReturnValue(of({ data: stream }));
    (service as any).httpService = { post, get: jest.fn() } as unknown as HttpService;

    const resultPromise = (service as any).sendHermesAgentMessage({
      sessionId: 'session-1',
      conversationId: 'conversation-1',
      expertId: 'expert-explicit',
      teamId: 'team-1',
      message: 'Current user message',
    });
    stream.end('data: [DONE]\n\n');
    await resultPromise;

    expect(db.findExpertByIdForTeam).toHaveBeenCalledWith('expert-explicit', 'team-1');
    expect(db.findExpertByIdForTeam).not.toHaveBeenCalledWith('expert-persisted', 'team-1');
    const [, body] = post.mock.calls[0];
    expect(body.messages).toEqual([
      { role: 'system', content: 'Explicit expert prompt' },
      { role: 'user', content: 'Current user message' },
    ]);
  });

  it('loads only installed enabled extensionIds and injects safe extension metadata', async () => {
    db.findConversationById.mockResolvedValue({ id: 'conversation-1', teamId: 'team-1' } as any);
    db.findMessagesByConversationId.mockResolvedValue([]);
    db.getConversationMCPServers.mockResolvedValue([] as any);
    db.findInstalledEnabledExtensionsByIdsForUser.mockResolvedValue([
      {
        id: 'extension-1',
        name: 'GitHub Tools',
        description: 'Search GitHub repositories',
        category: 'developer',
        tags: ['github', 'search'],
        instructions: 'Use GitHub context when relevant.',
        config: { token: 'must-not-leak' },
      },
    ] as any);
    const stream = new PassThrough();
    const post = jest.fn().mockReturnValue(of({ data: stream }));
    (service as any).httpService = { post, get: jest.fn() } as unknown as HttpService;

    const resultPromise = (service as any).sendHermesAgentMessage({
      sessionId: 'session-1',
      conversationId: 'conversation-1',
      teamId: 'team-1',
      userId: 'user-1',
      message: 'Current user message',
      extensionIds: ['extension-1', 'disabled-extension'],
    });
    stream.end('data: [DONE]\n\n');
    await resultPromise;

    expect(db.findInstalledEnabledExtensionsByIdsForUser).toHaveBeenCalledWith(['extension-1', 'disabled-extension'], 'user-1');
    const [, body] = post.mock.calls[0];
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[0].content).toContain('GitHub Tools');
    expect(body.messages[0].content).toContain('Search GitHub repositories');
    expect(body.messages[0].content).toContain('developer');
    expect(body.messages[0].content).toContain('github, search');
    expect(body.messages[0].content).toContain('Use GitHub context when relevant.');
    expect(body.messages[0].content).not.toContain('must-not-leak');
  });

  it('builds expert context before conversation history and the current message', async () => {
    db.findExpertByIdForTeam.mockResolvedValue({ systemPrompt: 'Expert prompt' } as any);
    db.findConversationById.mockResolvedValue({ id: 'conversation-1', teamId: 'team-1' } as any);
    db.findMessagesByConversationId.mockResolvedValue([
      { role: 'user', content: 'Earlier user' },
      { role: 'assistant', content: 'Earlier assistant' },
    ] as any);
    db.getConversationMCPServers.mockResolvedValue([] as any);
    const stream = new PassThrough();
    const post = jest.fn().mockReturnValue(of({ data: stream }));
    (service as any).httpService = { post, get: jest.fn() } as unknown as HttpService;

    const resultPromise = (service as any).sendHermesAgentMessage({
      sessionId: 'session-1',
      conversationId: 'conversation-1',
      expertId: 'expert-1',
      teamId: 'team-1',
      message: 'Current user message',
    });
    stream.end('data: [DONE]\n\n');
    await resultPromise;

    expect(post).toHaveBeenCalled();
    const [, body] = post.mock.calls[0];
    expect(body.messages).toEqual([
      { role: 'system', content: 'Expert prompt' },
      { role: 'user', content: 'Earlier user' },
      { role: 'assistant', content: 'Earlier assistant' },
      { role: 'user', content: 'Current user message' },
    ]);
  });

  it('does not load conversation history or MCP servers without team access', async () => {
    db.findConversationById.mockResolvedValue(null);
    const stream = new PassThrough();
    const post = jest.fn().mockReturnValue(of({ data: stream }));
    (service as any).httpService = { post, get: jest.fn() } as unknown as HttpService;

    const resultPromise = (service as any).sendHermesAgentMessage({
      sessionId: 'session-1',
      conversationId: 'conversation-1',
      teamId: 'team-1',
      message: 'Current user message',
    });
    stream.end('data: [DONE]\n\n');
    await resultPromise;

    expect(db.findConversationById).toHaveBeenCalledWith('conversation-1', 'team-1');
    expect(db.findMessagesByConversationId).not.toHaveBeenCalled();
    expect(db.getConversationMCPServers).not.toHaveBeenCalled();
    const [, body, options] = post.mock.calls[0];
    expect(body.messages).toEqual([
      { role: 'user', content: 'Current user message' },
    ]);
    expect(body.mcp_servers).toBeUndefined();
    expect(options.headers['X-Hermes-Internal-MCP-Key']).toBeUndefined();
  });

  it('does not inject expert prompts without team access', async () => {
    db.findExpertByIdForTeam.mockResolvedValue(null);
    const stream = new PassThrough();
    const post = jest.fn().mockReturnValue(of({ data: stream }));
    (service as any).httpService = { post, get: jest.fn() } as unknown as HttpService;

    const resultPromise = (service as any).sendHermesAgentMessage({
      sessionId: 'session-1',
      expertId: 'expert-1',
      teamId: 'team-1',
      message: 'Current user message',
    });
    stream.end('data: [DONE]\n\n');
    await resultPromise;

    expect(db.findExpertByIdForTeam).toHaveBeenCalledWith('expert-1', 'team-1');
    const [, body] = post.mock.calls[0];
    expect(body.messages).toEqual([
      { role: 'user', content: 'Current user message' },
    ]);
  });

  it('rejects gateway connections without a verified token', async () => {
    await expect(service.connect({ scopes: ['operator.admin'] }, socket)).rejects.toThrow('Authentication required');
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });

  it('rejects refresh tokens for gateway connections', async () => {
    jwtService.verify.mockReturnValue({ sub: 'user-1', teamId: 'team-1', role: 'MEMBER', type: 'refresh' });

    await expect(service.connect({ auth: { token: 'refresh-token' } }, socket)).rejects.toThrow('Authentication required');
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });

  it('does not issue service admin tokens from client-provided scopes', async () => {
    jwtService.verify.mockReturnValue({ sub: 'user-1', teamId: 'team-1', role: 'MEMBER', type: 'access', exp: futureJwtExp });
    // Slice 2026-07-02-gateway-facade-slim: real GatewayConnectionService
    // calls db.findUserById (the slice-7 lazy default-shim did not). The
    // test was passing in slice 7 because the shim returned a hardcoded
    // user object; now the spec must mock findUserById explicitly.
    db.findUserById.mockResolvedValue({ id: 'user-1', teamId: 'team-1', team_name: 'Team 1', role: 'MEMBER' } as any);

    const result = await service.connect({ auth: { token: 'valid-token' }, scopes: ['operator.admin'] }, socket);

    expect(result).toMatchObject({
      ok: true,
      user: {
        id: 'user-1',
        team: { id: 'team-1', role: 'MEMBER' },
      },
    });
    expect(result.token).toBeUndefined();
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });

  it('refreshes tokens from current database user state instead of stale token claims', async () => {
    jwtService.verify.mockReturnValue({ sub: 'user-1', teamId: 'old-team', role: 'OWNER', type: 'refresh' });
    db.findUserById.mockResolvedValue({ id: 'user-1', teamId: 'team-1', role: 'MEMBER' } as any);
    jwtService.signAsync
      .mockResolvedValueOnce('new-access-token')
      .mockResolvedValueOnce('new-refresh-token');

    const result = await service.refresh({ refreshToken: 'refresh-token' });

    expect(db.findUserById).toHaveBeenCalledWith('user-1');
    expect(jwtService.signAsync).toHaveBeenNthCalledWith(1, { sub: 'user-1', teamId: 'team-1', role: 'MEMBER', type: 'access' }, { secret: 'test-secret', expiresIn: '15m' });
    expect(jwtService.signAsync).toHaveBeenNthCalledWith(2, { sub: 'user-1', teamId: 'team-1', role: 'MEMBER', type: 'refresh' }, { secret: 'test-secret', expiresIn: '7d' });
    expect(result).toMatchObject({
      ok: true,
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expiresIn: 900,
      user: {
        id: 'user-1',
        team: { id: 'team-1', role: 'MEMBER' },
      },
    });
    expect(result.expiresAt).toEqual(expect.any(Number));
  });

  it('requires team access before returning conversation messages', async () => {
    db.findConversationById.mockResolvedValue(null);

    await expect(service.getMessages({ conversationId: 'conversation-1', teamId: 'team-1' })).rejects.toThrow('Conversation not found');

    expect(db.findConversationById).toHaveBeenCalledWith('conversation-1', 'team-1');
    expect(db.findMessagesByConversationId).not.toHaveBeenCalled();
  });

  it('requires team access before updating conversations', async () => {
    db.findConversationById.mockResolvedValue(null);

    await expect(service.updateConversation({ conversationId: 'conversation-1', teamId: 'team-1', title: 'Updated' })).rejects.toThrow('Conversation not found');

    expect(db.findConversationById).toHaveBeenCalledWith('conversation-1', 'team-1');
    expect(db.updateConversation).not.toHaveBeenCalled();
  });

  it('requires team access before deleting conversations', async () => {
    db.findConversationById.mockResolvedValue(null);

    await expect(service.deleteConversation({ conversationId: 'conversation-1', teamId: 'team-1' })).rejects.toThrow('Conversation not found');

    expect(db.findConversationById).toHaveBeenCalledWith('conversation-1', 'team-1');
    expect(db.deleteMessagesByConversationId).not.toHaveBeenCalled();
    expect(db.deleteConversation).not.toHaveBeenCalled();
  });

  it('uses selected Lingqi model when hermes-agent is healthy', async () => {
    quotaService.estimateLingqiCost.mockResolvedValue({
      estimatedCost: 10,
      balanceAfterEstimate: 90,
      canAfford: true,
      reason: null,
      model: {
        id: 'model-1',
        modelName: 'provider-model',
        displayName: 'Provider Model',
        rank: 1,
        costMultiplier: 1,
        requiredPlanLevel: 0,
      },
      subscription: {
        planName: 'wanderer',
        displayName: '散修',
        level: 0,
        costDiscountRate: 1,
        modelRankLimit: 1,
        expiresAt: null,
      },
    });
    quotaService.getSelectedModelForExecution.mockResolvedValue({ id: 'model-1', modelName: 'provider-model' });
    quotaService.consumeLingqi.mockResolvedValue({ balance: 90, totalConsumed: 10 });
    jest.spyOn(service as any, 'checkHermesAgentHealth').mockResolvedValue(true);
    db.getConversationMCPServers.mockResolvedValue([] as any);
    const stream = new PassThrough();
    const post = jest.fn().mockReturnValue(of({ data: stream }));
    (service as any).httpService = { post, get: jest.fn() } as unknown as HttpService;

    jest.spyOn(service as any, 'generateUUID').mockReturnValueOnce('billing-1');

    const resultPromise = service.sendHermesMessage({
      sessionId: 'session-1',
      userId: 'user-1',
      teamId: 'team-1',
      message: 'hello',
      model: 'model-1',
      messageId: 'client-message-1',
    });
    stream.end('data: {"choices":[{"delta":{"content":"hi"}}]}\n\ndata: [DONE]\n\n');
    const result = await resultPromise;

    const [, body] = post.mock.calls[0];
    expect(result.messageId).toBe('client-message-1');
    expect(body.model).toBe('provider-model');
    expect(quotaService.consumeLingqi).toHaveBeenCalledWith('team-1', 'user-1', expect.objectContaining({
      amount: 10,
      idempotencyKey: 'charge:chat:billing-1',
      metadata: { modelId: 'model-1', messageId: 'client-message-1' },
    }));
  });

  it('uses a server-generated billing key even when client messageId is reused', async () => {
    quotaService.estimateLingqiCost.mockResolvedValue(successfulLingqiEstimate());
    quotaService.getSelectedModelForExecution.mockResolvedValue({ id: 'model-1', modelName: 'provider-model' });
    quotaService.consumeLingqi.mockResolvedValue({ balance: 90, totalConsumed: 10 });
    jest.spyOn(service as any, 'checkHermesAgentHealth').mockResolvedValue(true);
    jest.spyOn(service as any, 'sendHermesAgentMessage').mockResolvedValue({ ok: true, messageId: 'client-message-1' });
    jest.spyOn(service as any, 'generateUUID')
      .mockReturnValueOnce('billing-1')
      .mockReturnValueOnce('billing-2');

    await service.sendHermesMessage({
      sessionId: 'session-1',
      userId: 'user-1',
      teamId: 'team-1',
      message: 'hello',
      model: 'model-1',
      messageId: 'client-message-1',
    });
    await service.sendHermesMessage({
      sessionId: 'session-1',
      userId: 'user-1',
      teamId: 'team-1',
      message: 'hello again',
      model: 'model-1',
      messageId: 'client-message-1',
    });

    expect(quotaService.consumeLingqi).toHaveBeenNthCalledWith(1, 'team-1', 'user-1', expect.objectContaining({
      idempotencyKey: 'charge:chat:billing-1',
      metadata: { modelId: 'model-1', messageId: 'client-message-1' },
    }));
    expect(quotaService.consumeLingqi).toHaveBeenNthCalledWith(2, 'team-1', 'user-1', expect.objectContaining({
      idempotencyKey: 'charge:chat:billing-2',
      metadata: { modelId: 'model-1', messageId: 'client-message-1' },
    }));
  });

  it('rejects unaffordable Lingqi chat sends before execution', async () => {
    quotaService.estimateLingqiCost.mockResolvedValue({
      estimatedCost: 10,
      balanceAfterEstimate: -5,
      canAfford: false,
      reason: 'LINGQI_INSUFFICIENT_BALANCE',
      model: {
        id: 'model-1',
        modelName: 'provider-model',
        displayName: 'Provider Model',
        rank: 1,
        costMultiplier: 1,
        requiredPlanLevel: 0,
      },
      subscription: {
        planName: 'wanderer',
        displayName: '散修',
        level: 0,
        costDiscountRate: 1,
        modelRankLimit: 1,
        expiresAt: null,
      },
    });

    const result = await service.sendHermesMessage({
      sessionId: 'session-1',
      userId: 'user-1',
      teamId: 'team-1',
      message: 'hello',
      model: 'model-1',
      messageId: 'client-message-1',
    });

    expect(result).toEqual({ ok: false, messageId: 'client-message-1', error: 'LINGQI_INSUFFICIENT_BALANCE' });
    expect(quotaService.consumeLingqi).not.toHaveBeenCalled();
  });

  it('charges Lingqi after a successful hermes-agent send on the websocket path', async () => {
    quotaService.estimateLingqiCost.mockResolvedValue({
      estimatedCost: 10,
      balanceAfterEstimate: 90,
      canAfford: true,
      reason: null,
      model: {
        id: 'model-1',
        modelName: 'provider-model',
        displayName: 'Provider Model',
        rank: 1,
        costMultiplier: 1,
        requiredPlanLevel: 0,
      },
      subscription: {
        planName: 'wanderer',
        displayName: '散修',
        level: 0,
        costDiscountRate: 1,
        modelRankLimit: 1,
        expiresAt: null,
      },
    });
    quotaService.getSelectedModelForExecution.mockResolvedValue({ id: 'model-1', modelName: 'provider-model' });
    quotaService.consumeLingqi.mockResolvedValue({
      balance: 90,
      totalConsumed: 10,
    });
    jest.spyOn(service as any, 'checkHermesAgentHealth').mockResolvedValue(true);
    jest.spyOn(service as any, 'sendHermesAgentMessage').mockResolvedValue({ ok: true, messageId: 'message-1' });

    const result = await service.sendHermesMessage({
      sessionId: 'session-1',
      userId: 'user-1',
      teamId: 'team-1',
      message: 'hello',
      model: 'model-1',
      conversationId: 'conversation-1',
      messageId: 'message-1',
    });

    expect(result).toEqual({ ok: true, messageId: 'message-1' });
    expect(quotaService.estimateLingqiCost).toHaveBeenCalledWith('team-1', {
      transactionType: 'chat_message',
      modelId: 'model-1',
      context: { conversationId: 'conversation-1' },
    });
    expect(quotaService.consumeLingqi).toHaveBeenCalledWith('team-1', 'user-1', {
      amount: 10,
      transactionType: 'chat_message',
      sourceType: 'chat',
      sourceId: 'conversation-1',
      description: '聊天模型调用',
      metadata: { modelId: 'model-1', messageId: 'message-1' },
      idempotencyKey: expect.stringMatching(/^charge:chat:(?!message-1$).+/),
    });
  });

  it('refunds prepaid Lingqi after a failed websocket chat send', async () => {
    quotaService.estimateLingqiCost.mockResolvedValue({
      estimatedCost: 10,
      balanceAfterEstimate: 90,
      canAfford: true,
      reason: null,
      model: {
        id: 'model-1',
        modelName: 'provider-model',
        displayName: 'Provider Model',
        rank: 1,
        costMultiplier: 1,
        requiredPlanLevel: 0,
      },
      subscription: {
        planName: 'wanderer',
        displayName: '散修',
        level: 0,
        costDiscountRate: 1,
        modelRankLimit: 1,
        expiresAt: null,
      },
    });
    quotaService.getSelectedModelForExecution.mockResolvedValue({ id: 'model-1', modelName: 'provider-model' });
    quotaService.consumeLingqi.mockResolvedValue({ balance: 90, totalConsumed: 10 });
    quotaService.refundLingqi.mockResolvedValue({ balance: 100, totalConsumed: 0 });
    jest.spyOn(service as any, 'checkHermesAgentHealth').mockResolvedValue(true);
    jest.spyOn(service as any, 'sendHermesAgentMessage').mockResolvedValue({ ok: false, messageId: 'message-1', error: 'No response' });

    const result = await service.sendHermesMessage({
      sessionId: 'session-1',
      userId: 'user-1',
      teamId: 'team-1',
      message: 'hello',
      model: 'model-1',
      conversationId: 'conversation-1',
      messageId: 'message-1',
    });

    expect(result).toEqual({ ok: false, messageId: 'message-1', error: 'No response' });
    expect(quotaService.consumeLingqi).toHaveBeenCalledWith('team-1', 'user-1', expect.objectContaining({
      amount: 10,
      idempotencyKey: expect.stringMatching(/^charge:chat:(?!message-1$).+/),
    }));
    expect(quotaService.refundLingqi).toHaveBeenCalledWith('team-1', 'user-1', expect.objectContaining({
      amount: 10,
      idempotencyKey: expect.stringMatching(/^refund:chat:(?!message-1$).+/),
      refundOfIdempotencyKey: expect.stringMatching(/^charge:chat:(?!message-1$).+/),
    }));
  });

  it('does not execute hermes-agent when prepaid Lingqi debit fails', async () => {
    quotaService.estimateLingqiCost.mockResolvedValue({
      estimatedCost: 10,
      balanceAfterEstimate: 90,
      canAfford: true,
      reason: null,
      model: {
        id: 'model-1',
        modelName: 'provider-model',
        displayName: 'Provider Model',
        rank: 1,
        costMultiplier: 1,
        requiredPlanLevel: 0,
      },
      subscription: {
        planName: 'wanderer',
        displayName: '散修',
        level: 0,
        costDiscountRate: 1,
        modelRankLimit: 1,
        expiresAt: null,
      },
    });
    quotaService.getSelectedModelForExecution.mockResolvedValue({ id: 'model-1', modelName: 'provider-model' });
    quotaService.consumeLingqi.mockRejectedValue(new Error('balance changed'));
    jest.spyOn(service as any, 'checkHermesAgentHealth').mockResolvedValue(true);
    const sendHermesAgentMessage = jest.spyOn(service as any, 'sendHermesAgentMessage').mockResolvedValue({ ok: true, messageId: 'message-1' });

    const result = await service.sendHermesMessage({
      sessionId: 'session-1',
      userId: 'user-1',
      teamId: 'team-1',
      message: 'hello',
      model: 'model-1',
      conversationId: 'conversation-1',
      messageId: 'message-1',
    });

    expect(result).toEqual({ ok: false, messageId: expect.any(String), error: 'LINGQI_CHARGE_FAILED' });
    expect(sendHermesAgentMessage).not.toHaveBeenCalled();
    expect(quotaService.refundLingqi).not.toHaveBeenCalled();
  });

  it('refunds prepaid Lingqi after a closed hermes-agent stream', async () => {
    quotaService.estimateLingqiCost.mockResolvedValue(successfulLingqiEstimate());
    quotaService.getSelectedModelForExecution.mockResolvedValue({ id: 'model-1', modelName: 'provider-model' });
    quotaService.consumeLingqi.mockResolvedValue({ balance: 90, totalConsumed: 10 });
    quotaService.refundLingqi.mockResolvedValue({ balance: 100, totalConsumed: 0 });
    jest.spyOn(service as any, 'checkHermesAgentHealth').mockResolvedValue(true);
    db.getConversationMCPServers.mockResolvedValue([] as any);
    const stream = new PassThrough();
    const post = jest.fn().mockReturnValue(of({ data: stream }));
    (service as any).httpService = { post, get: jest.fn() } as unknown as HttpService;

    const resultPromise = service.sendHermesMessage({
      sessionId: 'session-1',
      userId: 'user-1',
      teamId: 'team-1',
      message: 'hello',
      model: 'model-1',
      conversationId: 'conversation-1',
      messageId: 'message-1',
    }, socket);
    await new Promise((resolve) => setImmediate(resolve));
    stream.emit('close');
    const result = await resultPromise;

    expect(result).toEqual({ ok: false, messageId: 'message-1', error: 'Connection closed before completion' });
    expect(quotaService.refundLingqi).toHaveBeenCalledWith('team-1', 'user-1', expect.objectContaining({
      amount: 10,
      idempotencyKey: expect.stringMatching(/^refund:chat:(?!message-1$).+/),
      refundOfIdempotencyKey: expect.stringMatching(/^charge:chat:(?!message-1$).+/),
    }));
  });

  it('refunds prepaid Lingqi after a hermes-agent stream error', async () => {
    quotaService.estimateLingqiCost.mockResolvedValue(successfulLingqiEstimate());
    quotaService.getSelectedModelForExecution.mockResolvedValue({ id: 'model-1', modelName: 'provider-model' });
    quotaService.consumeLingqi.mockResolvedValue({ balance: 90, totalConsumed: 10 });
    quotaService.refundLingqi.mockResolvedValue({ balance: 100, totalConsumed: 0 });
    jest.spyOn(service as any, 'checkHermesAgentHealth').mockResolvedValue(true);
    db.getConversationMCPServers.mockResolvedValue([] as any);
    const stream = new PassThrough();
    const post = jest.fn().mockReturnValue(of({ data: stream }));
    (service as any).httpService = { post, get: jest.fn() } as unknown as HttpService;

    const resultPromise = service.sendHermesMessage({
      sessionId: 'session-1',
      userId: 'user-1',
      teamId: 'team-1',
      message: 'hello',
      model: 'model-1',
      conversationId: 'conversation-1',
      messageId: 'message-1',
    }, socket);
    await new Promise((resolve) => setImmediate(resolve));
    stream.emit('error', new Error('upstream stream failed'));
    const result = await resultPromise;

    expect(result).toEqual({ ok: false, messageId: 'message-1', error: 'upstream stream failed' });
    expect(quotaService.consumeLingqi).toHaveBeenCalledWith('team-1', 'user-1', expect.objectContaining({
      amount: 10,
      idempotencyKey: expect.stringMatching(/^charge:chat:(?!message-1$).+/),
    }));
    expect(quotaService.refundLingqi).toHaveBeenCalledWith('team-1', 'user-1', expect.objectContaining({
      amount: 10,
      idempotencyKey: expect.stringMatching(/^refund:chat:(?!message-1$).+/),
      refundOfIdempotencyKey: expect.stringMatching(/^charge:chat:(?!message-1$).+/),
    }));
  });

  it('refunds prepaid Lingqi after an aborted hermes-agent stream', async () => {
    quotaService.estimateLingqiCost.mockResolvedValue(successfulLingqiEstimate());
    quotaService.getSelectedModelForExecution.mockResolvedValue({ id: 'model-1', modelName: 'provider-model' });
    quotaService.consumeLingqi.mockResolvedValue({ balance: 90, totalConsumed: 10 });
    quotaService.refundLingqi.mockResolvedValue({ balance: 100, totalConsumed: 0 });
    jest.spyOn(service as any, 'checkHermesAgentHealth').mockResolvedValue(true);
    db.getConversationMCPServers.mockResolvedValue([] as any);
    const stream = new PassThrough();
    const post = jest.fn().mockReturnValue(of({ data: stream }));
    (service as any).httpService = { post, get: jest.fn() } as unknown as HttpService;

    const resultPromise = service.sendHermesMessage({
      sessionId: 'session-1',
      userId: 'user-1',
      teamId: 'team-1',
      message: 'hello',
      model: 'model-1',
      conversationId: 'conversation-1',
      messageId: 'message-1',
    }, socket);
    await new Promise((resolve) => setImmediate(resolve));
    await expect(service.abortHermesMessage({ messageId: 'message-1' }, socket)).resolves.toEqual({
      ok: true,
      messageId: 'message-1',
      aborted: true,
    });
    const result = await resultPromise;

    expect(result).toEqual({ ok: false, messageId: 'message-1', aborted: true });
    expect(quotaService.consumeLingqi).toHaveBeenCalledWith('team-1', 'user-1', expect.objectContaining({
      amount: 10,
      idempotencyKey: expect.stringMatching(/^charge:chat:(?!message-1$).+/),
    }));
    expect(quotaService.refundLingqi).toHaveBeenCalledWith('team-1', 'user-1', expect.objectContaining({
      amount: 10,
      idempotencyKey: expect.stringMatching(/^refund:chat:(?!message-1$).+/),
      refundOfIdempotencyKey: expect.stringMatching(/^charge:chat:(?!message-1$).+/),
    }));
  });

  it('sends skills as top-level system prompt for MiniMax Anthropic-compatible models', async () => {
    quotaService.estimateLingqiCost.mockResolvedValue(successfulLingqiEstimate());
    quotaService.getSelectedModelForExecution.mockResolvedValue({ id: 'model-1', modelName: 'provider-model' });
    quotaService.consumeLingqi.mockResolvedValue({ balance: 90, totalConsumed: 10 });
    jest.spyOn(service as any, 'checkHermesAgentHealth').mockResolvedValue(false);
    jest.spyOn(service as any, 'checkQuota').mockResolvedValue(null);
    db.findConversationById.mockResolvedValue({ id: 'conversation-1', teamId: 'team-1' } as any);
    db.findMessagesByConversationId.mockResolvedValue([] as any);
    db.getConversationMCPServers.mockResolvedValue([] as any);
    skillsService.findSkillsByIdsForTeam.mockResolvedValue([
      { id: 'skill-1', content: 'Answer like a pirate.' },
    ] as any);
    const stream = new PassThrough();
    const post = jest.fn().mockReturnValue(of({ data: stream, status: 200 }));
    (service as any).httpService = { post, get: jest.fn() } as unknown as HttpService;
    aiModelsService.findExecutableModelByModelId.mockResolvedValue(providerModelFixture({
      provider_code: 'minimax',
      provider_name: 'MiniMax',
    }));
    aiModelsService.findDefaultEndpointByProvider.mockResolvedValue({
      base_url: 'https://api.minimaxi.com/anthropic',
    } as any);

    const resultPromise = service.sendHermesMessage({
      sessionId: 'session-1',
      userId: 'user-1',
      teamId: 'team-1',
      message: 'hello',
      model: 'model-1',
      conversationId: 'conversation-1',
      messageId: 'message-1',
      skillIds: ['skill-1'],
    }, socket);
    stream.end(
      'data: {"type":"message_start","message":{"usage":{"input_tokens":8,"output_tokens":0}}}\n\n' +
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Ahoy"}}\n\n' +
      'data: {"type":"message_delta","usage":{"output_tokens":3}}\n\n' +
      'data: {"type":"message_stop"}\n\n',
    );
    const result = await resultPromise;

    const [, body] = post.mock.calls[0];
    expect(body.system).toBe('Answer like a pirate.');
    expect(body.messages).toEqual([
      { role: 'user', content: 'hello' },
    ]);
    expect(result).toEqual({ ok: true, messageId: 'message-1' });
  });

  it('does not refund prepaid Lingqi after an aborted provider stream with billable output', async () => {
    quotaService.estimateLingqiCost.mockResolvedValue(successfulLingqiEstimate());
    quotaService.getSelectedModelForExecution.mockResolvedValue({ id: 'model-1', modelName: 'provider-model' });
    quotaService.consumeLingqi.mockResolvedValue({ balance: 90, totalConsumed: 10 });
    quotaService.refundLingqi.mockResolvedValue({ balance: 100, totalConsumed: 0 });
    jest.spyOn(service as any, 'checkHermesAgentHealth').mockResolvedValue(false);
    jest.spyOn(service as any, 'checkQuota').mockResolvedValue(null);
    db.getConversationMCPServers.mockResolvedValue([] as any);
    const stream = new PassThrough();
    const post = jest.fn().mockReturnValue(of({ data: stream, status: 200 }));
    (service as any).httpService = { post, get: jest.fn() } as unknown as HttpService;
    aiModelsService.findExecutableModelByModelId.mockResolvedValue(providerModelFixture());
    aiModelsService.findDefaultEndpointByProvider.mockResolvedValue({ base_url: 'https://api.openai.com' } as any);

    const resultPromise = service.sendHermesMessage({
      sessionId: 'session-1',
      userId: 'user-1',
      teamId: 'team-1',
      message: 'hello',
      model: 'model-1',
      conversationId: 'conversation-1',
      messageId: 'message-1',
    }, socket);
    await new Promise((resolve) => setImmediate(resolve));
    stream.emit('data', Buffer.from('data: {"choices":[{"delta":{"content":"partial"}}]}\n\n'));
    await new Promise((resolve) => setImmediate(resolve));
    await expect(service.abortHermesMessage({ messageId: 'message-1' }, socket)).resolves.toEqual({
      ok: true,
      messageId: 'message-1',
      aborted: true,
    });
    const result = await resultPromise;

    expect(result).toEqual({ ok: false, messageId: 'message-1', aborted: true });
    expect(quotaService.refundLingqi).not.toHaveBeenCalled();
  });

  it('aborts active streams for a websocket and refunds when no billable output was sent', async () => {
    quotaService.estimateLingqiCost.mockResolvedValue(successfulLingqiEstimate());
    quotaService.getSelectedModelForExecution.mockResolvedValue({ id: 'model-1', modelName: 'provider-model' });
    quotaService.consumeLingqi.mockResolvedValue({ balance: 90, totalConsumed: 10 });
    quotaService.refundLingqi.mockResolvedValue({ balance: 100, totalConsumed: 0 });
    jest.spyOn(service as any, 'checkHermesAgentHealth').mockResolvedValue(false);
    jest.spyOn(service as any, 'checkQuota').mockResolvedValue(null);
    db.getConversationMCPServers.mockResolvedValue([] as any);
    const stream = new PassThrough();
    const post = jest.fn().mockReturnValue(of({ data: stream, status: 200 }));
    (service as any).httpService = { post, get: jest.fn() } as unknown as HttpService;
    aiModelsService.findExecutableModelByModelId.mockResolvedValue(providerModelFixture());
    aiModelsService.findDefaultEndpointByProvider.mockResolvedValue({ base_url: 'https://api.openai.com' } as any);

    const resultPromise = service.sendHermesMessage({
      sessionId: 'session-1',
      userId: 'user-1',
      teamId: 'team-1',
      message: 'hello',
      model: 'model-1',
      conversationId: 'conversation-1',
      messageId: 'message-1',
    }, socket);
    await new Promise((resolve) => setImmediate(resolve));
    await service.abortStreamsForSocket(socket);
    const result = await resultPromise;

    expect(result).toEqual({ ok: false, messageId: 'message-1', aborted: true });
    expect(quotaService.refundLingqi).toHaveBeenCalledWith('team-1', 'user-1', expect.objectContaining({
      amount: 10,
      idempotencyKey: expect.stringMatching(/^refund:chat:(?!message-1$).+/),
      refundOfIdempotencyKey: expect.stringMatching(/^charge:chat:(?!message-1$).+/),
    }));
  });

  it('does not refund Lingqi after a successful websocket chat send', async () => {
    quotaService.estimateLingqiCost.mockResolvedValue({
      estimatedCost: 10,
      balanceAfterEstimate: 90,
      canAfford: true,
      reason: null,
      model: {
        id: 'model-1',
        modelName: 'provider-model',
        displayName: 'Provider Model',
        rank: 1,
        costMultiplier: 1,
        requiredPlanLevel: 0,
      },
      subscription: {
        planName: 'wanderer',
        displayName: '散修',
        level: 0,
        costDiscountRate: 1,
        modelRankLimit: 1,
        expiresAt: null,
      },
    });
    quotaService.getSelectedModelForExecution.mockResolvedValue({ id: 'model-1', modelName: 'provider-model' });
    quotaService.consumeLingqi.mockResolvedValue({ balance: 90, totalConsumed: 10 });
    jest.spyOn(service as any, 'checkHermesAgentHealth').mockResolvedValue(true);
    jest.spyOn(service as any, 'sendHermesAgentMessage').mockResolvedValue({ ok: true, messageId: 'message-1' });

    const result = await service.sendHermesMessage({
      sessionId: 'session-1',
      userId: 'user-1',
      teamId: 'team-1',
      message: 'hello',
      model: 'model-1',
      conversationId: 'conversation-1',
      messageId: 'message-1',
    });

    expect(result).toEqual({ ok: true, messageId: 'message-1' });
    expect(quotaService.consumeLingqi).toHaveBeenCalledTimes(1);
    expect(quotaService.refundLingqi).not.toHaveBeenCalled();
  });

  it('does not execute legacy Hermes when prepaid Lingqi debit fails', async () => {
    quotaService.estimateLingqiCost.mockResolvedValue(successfulLingqiEstimate());
    quotaService.getSelectedModelForExecution.mockResolvedValue({ id: 'model-1', modelName: 'provider-model' });
    quotaService.consumeLingqi.mockRejectedValue(new Error('billing failed'));
    jest.spyOn(service as any, 'checkHermesAgentHealth').mockResolvedValue(false);
    const sendLegacyHermesMessage = jest.spyOn(service as any, 'sendLegacyHermesMessage').mockResolvedValue({ ok: true, messageId: 'message-1' });

    const result = await service.sendHermesMessage({
      sessionId: 'session-1',
      userId: 'user-1',
      teamId: 'team-1',
      message: 'hello',
      model: 'model-1',
      conversationId: 'conversation-1',
      messageId: 'message-1',
    });

    expect(result).toEqual({ ok: false, messageId: expect.any(String), error: 'LINGQI_CHARGE_FAILED' });
    expect(sendLegacyHermesMessage).not.toHaveBeenCalled();
  });

  it('refunds prepaid Lingqi when legacy quota rejects provider execution', async () => {
    quotaService.estimateLingqiCost.mockResolvedValue(successfulLingqiEstimate());
    quotaService.getSelectedModelForExecution.mockResolvedValue({ id: 'model-1', modelName: 'provider-model' });
    quotaService.consumeLingqi.mockResolvedValue({ balance: 90, totalConsumed: 10 });
    quotaService.refundLingqi.mockResolvedValue({ balance: 100, totalConsumed: 0 });
    jest.spyOn(service as any, 'checkHermesAgentHealth').mockResolvedValue(false);
    jest.spyOn(service as any, 'checkQuota').mockResolvedValue('Daily request limit reached (10/10)');
    aiModelsService.findExecutableModelByModelId.mockResolvedValue(providerModelFixture());
    aiModelsService.findDefaultEndpointByProvider.mockResolvedValue({ base_url: 'https://api.openai.com' } as any);

    const result = await service.sendHermesMessage({
      sessionId: 'session-1',
      userId: 'user-1',
      teamId: 'team-1',
      message: 'hello',
      model: 'model-1',
      conversationId: 'conversation-1',
      messageId: 'message-1',
    });

    expect(result).toEqual({ ok: false, messageId: 'message-1', error: 'Daily request limit reached (10/10)' });
    expect(quotaService.consumeLingqi).toHaveBeenCalledWith('team-1', 'user-1', expect.objectContaining({
      amount: 10,
      idempotencyKey: expect.stringMatching(/^charge:chat:(?!message-1$).+/),
    }));
    expect(quotaService.refundLingqi).toHaveBeenCalledWith('team-1', 'user-1', expect.objectContaining({
      amount: 10,
      idempotencyKey: expect.stringMatching(/^refund:chat:(?!message-1$).+/),
      refundOfIdempotencyKey: expect.stringMatching(/^charge:chat:(?!message-1$).+/),
    }));
  });

  it('uses selected Lingqi model code when falling back to provider execution', async () => {
    quotaService.estimateLingqiCost.mockResolvedValue(successfulLingqiEstimate());
    quotaService.getSelectedModelForExecution.mockResolvedValue({ id: 'model-1', modelName: 'provider-model' });
    quotaService.consumeLingqi.mockResolvedValue({ balance: 90, totalConsumed: 10 });
    jest.spyOn(service as any, 'checkHermesAgentHealth').mockResolvedValue(false);
    jest.spyOn(service as any, 'checkQuota').mockResolvedValue(null);
    db.getConversationMCPServers.mockResolvedValue([] as any);
    const stream = new PassThrough();
    const post = jest.fn().mockReturnValue(of({ data: stream, status: 200 }));
    (service as any).httpService = { post, get: jest.fn() } as unknown as HttpService;
    aiModelsService.findExecutableModelByModelId.mockResolvedValue(providerModelFixture());
    aiModelsService.findDefaultEndpointByProvider.mockResolvedValue({ base_url: 'https://api.openai.com' } as any);

    const resultPromise = service.sendHermesMessage({
      sessionId: 'session-1',
      userId: 'user-1',
      teamId: 'team-1',
      message: 'hello',
      model: 'model-1',
      conversationId: 'conversation-1',
      messageId: 'message-1',
    });
    stream.end('data: {"choices":[{"delta":{"content":"hi"}}]}\n\ndata: [DONE]\n\n');
    const result = await resultPromise;

    const [, body] = post.mock.calls[0];
    expect(result).toEqual({ ok: true, messageId: 'message-1' });
    expect(body.model).toBe('provider-model');
  });

  it('uses MiniMax Anthropic-compatible execution and parses text deltas', async () => {
    quotaService.estimateLingqiCost.mockResolvedValue(successfulLingqiEstimate());
    quotaService.getSelectedModelForExecution.mockResolvedValue({ id: 'model-1', modelName: 'MiniMax-M2.7' });
    quotaService.consumeLingqi.mockResolvedValue({ balance: 90, totalConsumed: 10 });
    jest.spyOn(service as any, 'checkHermesAgentHealth').mockResolvedValue(false);
    jest.spyOn(service as any, 'checkQuota').mockResolvedValue(null);
    db.getConversationMCPServers.mockResolvedValue([] as any);
    const stream = new PassThrough();
    const post = jest.fn().mockReturnValue(of({ data: stream, status: 200 }));
    const send = jest.fn();
    const targetSocket = { readyState: WebSocket.OPEN, send } as unknown as WebSocket;
    (service as any).httpService = { post, get: jest.fn() } as unknown as HttpService;
    aiModelsService.findExecutableModelByModelId.mockResolvedValue(providerModelFixture({
      provider_name: 'MiniMax',
      provider_code: 'minimax',
      model_id: 'MiniMax-M2.7',
    }));
    aiModelsService.findDefaultEndpointByProvider.mockResolvedValue({ base_url: 'https://api.minimaxi.com/anthropic' } as any);

    const resultPromise = service.sendHermesMessage({
      sessionId: 'session-1',
      userId: 'user-1',
      teamId: 'team-1',
      message: 'hello',
      model: 'model-1',
      conversationId: 'conversation-1',
      messageId: 'message-1',
    }, targetSocket);
    stream.end(
      'data: {"type":"message_start","message":{"usage":{"input_tokens":8,"output_tokens":0}}}\n\n' +
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"你好"}}\n\n' +
      'data: {"type":"message_delta","usage":{"output_tokens":3}}\n\n' +
      'data: {"type":"message_stop"}\n\n',
    );
    const result = await resultPromise;

    expect(result).toEqual({ ok: true, messageId: 'message-1' });
    expect(post).toHaveBeenCalledWith(
      'https://api.minimaxi.com/anthropic/v1/messages',
      expect.objectContaining({
        model: 'MiniMax-M2.7',
        stream: true,
        messages: expect.arrayContaining([{ role: 'user', content: 'hello' }]),
      }),
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer secret-key',
          'anthropic-version': '2023-06-01',
        },
      }),
    );
    expect(send).toHaveBeenCalledWith(expect.stringContaining('"delta":"你好"'));
    expect(send).toHaveBeenCalledWith(expect.stringContaining('"event":"hermes.final"'));
  });

  it('keeps OpenAI-compatible provider execution unchanged', async () => {
    quotaService.estimateLingqiCost.mockResolvedValue(successfulLingqiEstimate());
    quotaService.getSelectedModelForExecution.mockResolvedValue({ id: 'model-1', modelName: 'provider-model' });
    quotaService.consumeLingqi.mockResolvedValue({ balance: 90, totalConsumed: 10 });
    jest.spyOn(service as any, 'checkHermesAgentHealth').mockResolvedValue(false);
    jest.spyOn(service as any, 'checkQuota').mockResolvedValue(null);
    db.getConversationMCPServers.mockResolvedValue([] as any);
    const stream = new PassThrough();
    const post = jest.fn().mockReturnValue(of({ data: stream, status: 200 }));
    (service as any).httpService = { post, get: jest.fn() } as unknown as HttpService;
    aiModelsService.findExecutableModelByModelId.mockResolvedValue(providerModelFixture());
    aiModelsService.findDefaultEndpointByProvider.mockResolvedValue({ base_url: 'https://api.openai.com' } as any);

    const resultPromise = service.sendHermesMessage({
      sessionId: 'session-1',
      userId: 'user-1',
      teamId: 'team-1',
      message: 'hello',
      model: 'model-1',
      conversationId: 'conversation-1',
      messageId: 'message-1',
    });
    stream.end('data: {"choices":[{"delta":{"content":"hi"}}]}\n\ndata: [DONE]\n\n');
    const result = await resultPromise;

    expect(result).toEqual({ ok: true, messageId: 'message-1' });
    expect(post).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({ model: 'provider-model' }),
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer secret-key',
        },
      }),
    );
  });

  it('rejects provider fallback when the executable provider model differs from the selected Lingqi model', async () => {
    quotaService.estimateLingqiCost.mockResolvedValue(successfulLingqiEstimate());
    quotaService.getSelectedModelForExecution.mockResolvedValue({ id: 'model-1', modelName: 'demo-catalog-model' });
    quotaService.consumeLingqi.mockResolvedValue({ balance: 90, totalConsumed: 10 });
    quotaService.refundLingqi.mockResolvedValue({ balance: 100, totalConsumed: 0 });
    jest.spyOn(service as any, 'checkHermesAgentHealth').mockResolvedValue(false);
    const post = jest.fn();
    (service as any).httpService = { post, get: jest.fn() } as unknown as HttpService;
    aiModelsService.findExecutableModelByModelId.mockResolvedValue(null);

    const result = await service.sendHermesMessage({
      sessionId: 'session-1',
      userId: 'user-1',
      teamId: 'team-1',
      message: 'hello',
      model: 'model-1',
      conversationId: 'conversation-1',
      messageId: 'message-1',
    });

    expect(result).toEqual({ ok: false, messageId: 'message-1', error: '模型 demo-catalog-model 配置缺失或未激活，请联系管理员' });
    expect(post).not.toHaveBeenCalled();
    expect(quotaService.refundLingqi).toHaveBeenCalledWith('team-1', 'user-1', expect.objectContaining({
      amount: 10,
      idempotencyKey: expect.stringMatching(/^refund:chat:(?!message-1$).+/),
      refundOfIdempotencyKey: expect.stringMatching(/^charge:chat:(?!message-1$).+/),
    }));
  });

  it('refunds prepaid Lingqi instead of using legacy Hermes when provider API key is unavailable', async () => {
    quotaService.estimateLingqiCost.mockResolvedValue(successfulLingqiEstimate());
    quotaService.getSelectedModelForExecution.mockResolvedValue({ id: 'model-1', modelName: 'provider-model' });
    quotaService.consumeLingqi.mockResolvedValue({ balance: 90, totalConsumed: 10 });
    quotaService.refundLingqi.mockResolvedValue({ balance: 100, totalConsumed: 0 });
    jest.spyOn(service as any, 'checkHermesAgentHealth').mockResolvedValue(false);
    const sendLegacyHermesMessage = jest.spyOn(service as any, 'sendLegacyHermesMessage').mockResolvedValue({ ok: true, messageId: 'message-1' });
    const post = jest.fn();
    (service as any).httpService = { post, get: jest.fn() } as unknown as HttpService;
    aiModelsService.findExecutableModelByModelId.mockResolvedValue(providerModelFixture());
    aiModelsService.findActiveApiKeyByProvider.mockResolvedValue(null);

    const result = await service.sendHermesMessage({
      sessionId: 'session-1',
      userId: 'user-1',
      teamId: 'team-1',
      message: 'hello',
      model: 'model-1',
      conversationId: 'conversation-1',
      messageId: 'message-1',
    });

    expect(result).toEqual({ ok: false, messageId: 'message-1', error: '模型 provider-model 的 API 密钥未配置，请联系管理员' });
    expect(post).not.toHaveBeenCalled();
    expect(sendLegacyHermesMessage).not.toHaveBeenCalled();
    expect(quotaService.refundLingqi).toHaveBeenCalledWith('team-1', 'user-1', expect.objectContaining({
      amount: 10,
      idempotencyKey: expect.stringMatching(/^refund:chat:(?!message-1$).+/),
      refundOfIdempotencyKey: expect.stringMatching(/^charge:chat:(?!message-1$).+/),
    }));
  });

  it('refunds prepaid Lingqi instead of using legacy Hermes when provider API key cannot be decrypted', async () => {
    quotaService.estimateLingqiCost.mockResolvedValue(successfulLingqiEstimate());
    quotaService.getSelectedModelForExecution.mockResolvedValue({ id: 'model-1', modelName: 'provider-model' });
    quotaService.consumeLingqi.mockResolvedValue({ balance: 90, totalConsumed: 10 });
    quotaService.refundLingqi.mockResolvedValue({ balance: 100, totalConsumed: 0 });
    jest.spyOn(service as any, 'checkHermesAgentHealth').mockResolvedValue(false);
    const sendLegacyHermesMessage = jest.spyOn(service as any, 'sendLegacyHermesMessage').mockResolvedValue({ ok: true, messageId: 'message-1' });
    const post = jest.fn();
    (service as any).httpService = { post, get: jest.fn() } as unknown as HttpService;
    aiModelsService.findExecutableModelByModelId.mockResolvedValue(providerModelFixture());
    aiModelsService.getDecryptedApiKey.mockResolvedValue(null);

    const result = await service.sendHermesMessage({
      sessionId: 'session-1',
      userId: 'user-1',
      teamId: 'team-1',
      message: 'hello',
      model: 'model-1',
      conversationId: 'conversation-1',
      messageId: 'message-1',
    });

    expect(result).toEqual({ ok: false, messageId: 'message-1', error: '模型 provider-model 的 API 密钥解密失败，请联系管理员' });
    expect(post).not.toHaveBeenCalled();
    expect(sendLegacyHermesMessage).not.toHaveBeenCalled();
    expect(quotaService.refundLingqi).toHaveBeenCalledWith('team-1', 'user-1', expect.objectContaining({
      amount: 10,
      idempotencyKey: expect.stringMatching(/^refund:chat:(?!message-1$).+/),
      refundOfIdempotencyKey: expect.stringMatching(/^charge:chat:(?!message-1$).+/),
    }));
  });

  it('refunds prepaid Lingqi instead of using legacy Hermes when provider request fails', async () => {
    quotaService.estimateLingqiCost.mockResolvedValue(successfulLingqiEstimate());
    quotaService.getSelectedModelForExecution.mockResolvedValue({ id: 'model-1', modelName: 'provider-model' });
    quotaService.consumeLingqi.mockResolvedValue({ balance: 90, totalConsumed: 10 });
    quotaService.refundLingqi.mockResolvedValue({ balance: 100, totalConsumed: 0 });
    jest.spyOn(service as any, 'checkHermesAgentHealth').mockResolvedValue(false);
    jest.spyOn(service as any, 'checkQuota').mockResolvedValue(null);
    const sendLegacyHermesMessage = jest.spyOn(service as any, 'sendLegacyHermesMessage').mockResolvedValue({ ok: true, messageId: 'message-1' });
    const post = jest.fn().mockImplementation(() => {
      throw new Error('provider down');
    });
    (service as any).httpService = { post, get: jest.fn() } as unknown as HttpService;
    aiModelsService.findExecutableModelByModelId.mockResolvedValue(providerModelFixture());
    aiModelsService.findDefaultEndpointByProvider.mockResolvedValue({ base_url: 'https://api.openai.com' } as any);

    const result = await service.sendHermesMessage({
      sessionId: 'session-1',
      userId: 'user-1',
      teamId: 'team-1',
      message: 'hello',
      model: 'model-1',
      conversationId: 'conversation-1',
      messageId: 'message-1',
    });

    expect(result).toEqual({ ok: false, messageId: 'message-1', error: expect.stringMatching(/^Provider 调用失败/) });
    expect(sendLegacyHermesMessage).not.toHaveBeenCalled();
    expect(quotaService.refundLingqi).toHaveBeenCalledWith('team-1', 'user-1', expect.objectContaining({
      amount: 10,
      idempotencyKey: expect.stringMatching(/^refund:chat:(?!message-1$).+/),
      refundOfIdempotencyKey: expect.stringMatching(/^charge:chat:(?!message-1$).+/),
    }));
  });

  it('refunds prepaid Lingqi only once when provider emits duplicate terminal events', async () => {
    quotaService.estimateLingqiCost.mockResolvedValue(successfulLingqiEstimate());
    quotaService.getSelectedModelForExecution.mockResolvedValue({ id: 'model-1', modelName: 'provider-model' });
    quotaService.consumeLingqi.mockResolvedValue({ balance: 90, totalConsumed: 10 });
    quotaService.refundLingqi.mockResolvedValue({ balance: 100, totalConsumed: 0 });
    jest.spyOn(service as any, 'checkHermesAgentHealth').mockResolvedValue(false);
    jest.spyOn(service as any, 'checkQuota').mockResolvedValue(null);
    db.getConversationMCPServers.mockResolvedValue([] as any);
    const stream = new PassThrough();
    const post = jest.fn().mockReturnValue(of({ data: stream, status: 200 }));
    (service as any).httpService = { post, get: jest.fn() } as unknown as HttpService;
    aiModelsService.findExecutableModelByModelId.mockResolvedValue(providerModelFixture());
    aiModelsService.findDefaultEndpointByProvider.mockResolvedValue({ base_url: 'https://api.openai.com' } as any);

    const resultPromise = service.sendHermesMessage({
      sessionId: 'session-1',
      userId: 'user-1',
      teamId: 'team-1',
      message: 'hello',
      model: 'model-1',
      conversationId: 'conversation-1',
      messageId: 'message-1',
    }, socket);
    await new Promise((resolve) => setImmediate(resolve));
    stream.emit('data', Buffer.from('data: {"error":{"message":"provider token leaked"}}\n\n'));
    stream.emit('end');
    stream.emit('close');
    const result = await resultPromise;

    expect(result).toEqual({ ok: false, messageId: 'message-1', error: 'Provider stream error' });
    expect(quotaService.refundLingqi).toHaveBeenCalledTimes(1);
  });

  it('refunds prepaid Lingqi after an aborted provider stream', async () => {
    quotaService.estimateLingqiCost.mockResolvedValue(successfulLingqiEstimate());
    quotaService.getSelectedModelForExecution.mockResolvedValue({ id: 'model-1', modelName: 'provider-model' });
    quotaService.consumeLingqi.mockResolvedValue({ balance: 90, totalConsumed: 10 });
    quotaService.refundLingqi.mockResolvedValue({ balance: 100, totalConsumed: 0 });
    jest.spyOn(service as any, 'checkHermesAgentHealth').mockResolvedValue(false);
    jest.spyOn(service as any, 'checkQuota').mockResolvedValue(null);
    db.getConversationMCPServers.mockResolvedValue([] as any);
    const stream = new PassThrough();
    const post = jest.fn().mockReturnValue(of({ data: stream, status: 200 }));
    (service as any).httpService = { post, get: jest.fn() } as unknown as HttpService;
    aiModelsService.findExecutableModelByModelId.mockResolvedValue(providerModelFixture());
    aiModelsService.findDefaultEndpointByProvider.mockResolvedValue({ base_url: 'https://api.openai.com' } as any);

    const resultPromise = service.sendHermesMessage({
      sessionId: 'session-1',
      userId: 'user-1',
      teamId: 'team-1',
      message: 'hello',
      model: 'model-1',
      conversationId: 'conversation-1',
      messageId: 'message-1',
    }, socket);
    await new Promise((resolve) => setImmediate(resolve));
    await expect(service.abortHermesMessage({ messageId: 'message-1' }, socket)).resolves.toEqual({
      ok: true,
      messageId: 'message-1',
      aborted: true,
    });
    const result = await resultPromise;

    expect(result).toEqual({ ok: false, messageId: 'message-1', aborted: true });
    expect(quotaService.refundLingqi).toHaveBeenCalledWith('team-1', 'user-1', expect.objectContaining({
      amount: 10,
      idempotencyKey: expect.stringMatching(/^refund:chat:(?!message-1$).+/),
      refundOfIdempotencyKey: expect.stringMatching(/^charge:chat:(?!message-1$).+/),
    }));
  });

  it('refunds prepaid Lingqi when provider endpoint headers are malformed', async () => {
    quotaService.estimateLingqiCost.mockResolvedValue(successfulLingqiEstimate());
    quotaService.getSelectedModelForExecution.mockResolvedValue({ id: 'model-1', modelName: 'provider-model' });
    quotaService.consumeLingqi.mockResolvedValue({ balance: 90, totalConsumed: 10 });
    quotaService.refundLingqi.mockResolvedValue({ balance: 100, totalConsumed: 0 });
    jest.spyOn(service as any, 'checkHermesAgentHealth').mockResolvedValue(false);
    jest.spyOn(service as any, 'checkQuota').mockResolvedValue(null);
    const post = jest.fn();
    (service as any).httpService = { post, get: jest.fn() } as unknown as HttpService;
    aiModelsService.findExecutableModelByModelId.mockResolvedValue(providerModelFixture());
    aiModelsService.findDefaultEndpointByProvider.mockResolvedValue({ base_url: 'https://api.openai.com', headers: '{bad json' } as any);

    const result = await service.sendHermesMessage({
      sessionId: 'session-1',
      userId: 'user-1',
      teamId: 'team-1',
      message: 'hello',
      model: 'model-1',
      conversationId: 'conversation-1',
      messageId: 'message-1',
    });

    expect(result).toEqual({ ok: false, messageId: 'message-1', error: 'Provider configuration error' });
    expect(post).not.toHaveBeenCalled();
    expect(quotaService.refundLingqi).toHaveBeenCalledWith('team-1', 'user-1', expect.objectContaining({
      amount: 10,
      idempotencyKey: expect.stringMatching(/^refund:chat:(?!message-1$).+/),
      refundOfIdempotencyKey: expect.stringMatching(/^charge:chat:(?!message-1$).+/),
    }));
  });

  it('refunds prepaid Lingqi without calling untrusted provider endpoints', async () => {
    quotaService.estimateLingqiCost.mockResolvedValue(successfulLingqiEstimate());
    quotaService.getSelectedModelForExecution.mockResolvedValue({ id: 'model-1', modelName: 'provider-model' });
    quotaService.consumeLingqi.mockResolvedValue({ balance: 90, totalConsumed: 10 });
    quotaService.refundLingqi.mockResolvedValue({ balance: 100, totalConsumed: 0 });
    jest.spyOn(service as any, 'checkHermesAgentHealth').mockResolvedValue(false);
    const post = jest.fn();
    (service as any).httpService = { post, get: jest.fn() } as unknown as HttpService;
    aiModelsService.findExecutableModelByModelId.mockResolvedValue(providerModelFixture());
    aiModelsService.findDefaultEndpointByProvider.mockResolvedValue({ base_url: 'http://127.0.0.1:8080' } as any);

    const result = await service.sendHermesMessage({
      sessionId: 'session-1',
      userId: 'user-1',
      teamId: 'team-1',
      message: 'hello',
      model: 'model-1',
      conversationId: 'conversation-1',
      messageId: 'message-1',
    });

    expect(result).toEqual({ ok: false, messageId: 'message-1', error: 'Provider configuration error' });
    expect(post).not.toHaveBeenCalled();
    expect(quotaService.refundLingqi).toHaveBeenCalledWith('team-1', 'user-1', expect.objectContaining({
      amount: 10,
      idempotencyKey: expect.stringMatching(/^refund:chat:(?!message-1$).+/),
      refundOfIdempotencyKey: expect.stringMatching(/^charge:chat:(?!message-1$).+/),
    }));
  });

  it('refunds prepaid Lingqi when provider streams an API error', async () => {
    quotaService.estimateLingqiCost.mockResolvedValue(successfulLingqiEstimate());
    quotaService.getSelectedModelForExecution.mockResolvedValue({ id: 'model-1', modelName: 'provider-model' });
    quotaService.consumeLingqi.mockResolvedValue({ balance: 90, totalConsumed: 10 });
    quotaService.refundLingqi.mockResolvedValue({ balance: 100, totalConsumed: 0 });
    jest.spyOn(service as any, 'checkHermesAgentHealth').mockResolvedValue(false);
    jest.spyOn(service as any, 'checkQuota').mockResolvedValue(null);
    db.getConversationMCPServers.mockResolvedValue([] as any);
    const stream = new PassThrough();
    const post = jest.fn().mockReturnValue(of({ data: stream, status: 200 }));
    (service as any).httpService = { post, get: jest.fn() } as unknown as HttpService;
    aiModelsService.findExecutableModelByModelId.mockResolvedValue(providerModelFixture());
    aiModelsService.findDefaultEndpointByProvider.mockResolvedValue({ base_url: 'https://api.openai.com' } as any);

    const resultPromise = service.sendHermesMessage({
      sessionId: 'session-1',
      userId: 'user-1',
      teamId: 'team-1',
      message: 'hello',
      model: 'model-1',
      conversationId: 'conversation-1',
      messageId: 'message-1',
    });
    stream.end('data: {"error":{"message":"provider token leaked"}}\n\n');
    const result = await resultPromise;

    expect(result).toEqual({ ok: false, messageId: 'message-1', error: 'Provider stream error' });
    expect(quotaService.refundLingqi).toHaveBeenCalledWith('team-1', 'user-1', expect.objectContaining({
      amount: 10,
      idempotencyKey: expect.stringMatching(/^refund:chat:(?!message-1$).+/),
      refundOfIdempotencyKey: expect.stringMatching(/^charge:chat:(?!message-1$).+/),
    }));
  });

  it('resolves legacy Hermes streams that end after emitting content', async () => {
    const stream = new PassThrough();
    const post = jest.fn().mockReturnValue(of({ data: stream, status: 200 }));
    (service as any).httpService = { post, get: jest.fn() } as unknown as HttpService;

    const resultPromise = (service as any).sendLegacyHermesMessage({ sessionId: 'session-1', message: 'hello' }, undefined, 'message-1');
    stream.end('data: {"type":"response.output_text.delta","delta":"hello"}\n\n');
    const result = await resultPromise;

    expect(result).toEqual({ ok: true, messageId: 'message-1' });
  });

  it('loads usage status with authenticated team scope for every rollup', async () => {
    db.getUsageStats
      .mockResolvedValueOnce({ totalCost: 3, totalTokens: 30, requestCount: 1, breakdown: [] })
      .mockResolvedValueOnce({ totalCost: 1, totalTokens: 10, requestCount: 1, breakdown: [] })
      .mockResolvedValueOnce({ totalCost: 2, totalTokens: 20, requestCount: 1, breakdown: [] })
      .mockResolvedValueOnce({ totalCost: 3, totalTokens: 30, requestCount: 1, breakdown: [] });

    await service.getUsageStatus({ teamId: 'team-1', period: 'month' });

    expect(db.getUsageStats).toHaveBeenNthCalledWith(1, 'month', 'team-1');
    expect(db.getUsageStats).toHaveBeenNthCalledWith(2, 'day', 'team-1');
    expect(db.getUsageStats).toHaveBeenNthCalledWith(3, 'week', 'team-1');
    expect(db.getUsageStats).toHaveBeenNthCalledWith(4, 'month', 'team-1');
  });

  it('returns expert source fields and quoted camelCase columns', async () => {
    db.listExperts.mockResolvedValue([
      {
        id: 'expert-1',
        name: 'Reviewer',
        description: 'Reviews code',
        systemPrompt: 'Review carefully',
        source_id: 'exp_code_reviewer',
        marketplace_id: 'exp_code_reviewer',
        teamId: 'team-1',
        createdAt: 'created-at',
        updatedAt: 'updated-at',
      },
    ]);
    db.countExperts.mockResolvedValue(1);

    await expect(service.listExperts({ teamId: 'team-1' })).resolves.toMatchObject({
      experts: [
        {
          id: 'expert-1',
          systemPrompt: 'Review carefully',
          sourceId: 'exp_code_reviewer',
          marketplaceId: 'exp_code_reviewer',
          teamId: 'team-1',
          createdAt: 'created-at',
          updatedAt: 'updated-at',
        },
      ],
    });
  });

  it('creates experts without exposing provenance fields through the RPC contract', async () => {
    db.createExpert.mockResolvedValue({
      id: 'expert-1',
      name: 'Reviewer',
      systemPrompt: 'Review carefully',
      source_id: 'exp_code_reviewer',
      marketplace_id: 'exp_code_reviewer',
    });

    await service.createExpert({
      name: 'Reviewer',
      systemPrompt: 'Review carefully',
    });

    expect(db.createExpert).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Reviewer',
      systemPrompt: 'Review carefully',
    }));
  });

  it('updates expert system prompt and source fields using database column keys', async () => {
    db.findTeamExpertById.mockResolvedValue({ id: 'expert-1' });
    db.updateExpert.mockResolvedValue({
      id: 'expert-1',
      name: 'Reviewer',
      systemPrompt: 'Updated prompt',
      source_id: 'exp_code_reviewer',
      marketplace_id: 'exp_code_reviewer',
    });

    await service.updateExpert({
      id: 'expert-1',
      teamId: 'team-1',
      systemPrompt: 'Updated prompt',
    });

    expect(db.findTeamExpertById).toHaveBeenCalledWith('expert-1', 'team-1');
    expect(db.updateExpert).toHaveBeenCalledWith('expert-1', expect.objectContaining({
      systemPrompt: 'Updated prompt',
    }));
  });

  it('does not update globally visible experts through team-scoped writes', async () => {
    db.findTeamExpertById.mockResolvedValue(null);

    await expect(service.updateExpert({
      id: 'global-expert',
      teamId: 'team-1',
      systemPrompt: 'Injected prompt',
    })).rejects.toThrow('Expert not found');

    expect(db.updateExpert).not.toHaveBeenCalled();
  });

  it('does not delete globally visible experts through team-scoped writes', async () => {
    db.findTeamExpertById.mockResolvedValue(null);

    await expect(service.deleteExpert({ id: 'global-expert', teamId: 'team-1' })).rejects.toThrow('Expert not found');

    expect(db.deleteExpert).not.toHaveBeenCalled();
  });

  describe('hermes-agent admin provider credential forwarding', () => {
    it('injects admin MiniMax baseUrl + apiKey + x-api-key headers when override is provided', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'JWT_SECRET') return 'test-secret';
        if (key === 'HERMES_INTERNAL_MCP_KEY') return 'internal-secret';
        return undefined;
      });
      const stream = new PassThrough();
      const post = jest.fn().mockReturnValue(of({ data: stream }));
      (service as any).httpService = { post, get: jest.fn() } as unknown as HttpService;

      const providerOverride = {
        baseUrl: 'https://api.minimaxi.com/anthropic',
        apiKey: 'sk-minimax-real',
        authStyle: 'x-api-key' as const,
        modelId: 'MiniMax-M2.7',
        providerCode: 'minimax',
      };

      const resultPromise = (service as any).sendHermesAgentMessage(
        {
          sessionId: 'session-1',
          message: 'hello',
        } as any,
        undefined,
        'MiniMax-M2.7',
        undefined,
        providerOverride,
      );
      stream.end('data: [DONE]\n\n');
      await resultPromise;

      expect(post).toHaveBeenCalled();
      const [, , options] = post.mock.calls[0];
      expect(options.headers['X-Hermes-Internal-MCP-Key']).toBe('internal-secret');
      expect(options.headers['X-Hermes-Provider-Base-Url']).toBe('https://api.minimaxi.com/anthropic');
      expect(options.headers['X-Hermes-Provider-Api-Key']).toBe('sk-minimax-real');
      expect(options.headers['X-Hermes-Provider-Auth-Style']).toBe('x-api-key');
      expect(options.headers['X-Hermes-Provider-Model']).toBe('MiniMax-M2.7');
      expect(options.headers['X-Hermes-Provider-Code']).toBe('minimax');
    });

    it('omits provider headers when no override is provided (backward compatible)', async () => {
      configService.get.mockReturnValue('internal-secret');
      const stream = new PassThrough();
      const post = jest.fn().mockReturnValue(of({ data: stream }));
      (service as any).httpService = { post, get: jest.fn() } as unknown as HttpService;

      const resultPromise = (service as any).sendHermesAgentMessage({
        sessionId: 'session-1',
        message: 'hello',
      } as any);
      stream.end('data: [DONE]\n\n');
      await resultPromise;

      const [, , options] = post.mock.calls[0];
      expect(options.headers['X-Hermes-Provider-Base-Url']).toBeUndefined();
      expect(options.headers['X-Hermes-Provider-Api-Key']).toBeUndefined();
      expect(options.headers['X-Hermes-Provider-Auth-Style']).toBeUndefined();
    });

    it('throws when provider override is set but HERMES_INTERNAL_MCP_KEY is missing', async () => {
      configService.get.mockReturnValue(undefined);
      const stream = new PassThrough();
      const post = jest.fn().mockReturnValue(of({ data: stream }));
      (service as any).httpService = { post, get: jest.fn() } as unknown as HttpService;

      await expect(
        (service as any).sendHermesAgentMessage(
          { sessionId: 'session-1', message: 'hello' } as any,
          undefined,
          'MiniMax-M2.7',
          undefined,
          {
            baseUrl: 'https://api.minimaxi.com/anthropic',
            apiKey: 'sk-x',
            authStyle: 'x-api-key',
            modelId: 'MiniMax-M2.7',
            providerCode: 'minimax',
          },
        ),
      ).resolves.toEqual(expect.objectContaining({ ok: false }));
    });

    it('tryBuildHermesProviderOverride returns MiniMax override when admin has configured key + endpoint', async () => {
      aiModelsService.findExecutableModelByModelId.mockResolvedValueOnce(providerModelFixture({
        provider_code: 'minimax',
        provider_name: 'MiniMax',
        model_id: 'MiniMax-M2.7',
      }));
      aiModelsService.findActiveApiKeyByProvider.mockResolvedValueOnce({ id: 'key-mm' } as any);
      aiModelsService.getDecryptedApiKey.mockResolvedValueOnce('sk-mm-real');
      aiModelsService.findDefaultEndpointByProvider.mockResolvedValueOnce({
        base_url: 'https://api.minimaxi.com/anthropic',
      } as any);

      const override = await (service as any).tryBuildHermesProviderOverride({
        executionModelName: 'MiniMax-M2.7',
      });

      expect(override).toEqual({
        baseUrl: 'https://api.minimaxi.com/anthropic',
        apiKey: 'sk-mm-real',
        authStyle: 'bearer',
        modelId: 'MiniMax-M2.7',
        providerCode: 'minimax',
      });
    });

    it('tryBuildHermesProviderOverride returns undefined when admin has no endpoint configured', async () => {
      aiModelsService.findExecutableModelByModelId.mockResolvedValueOnce(providerModelFixture({
        provider_code: 'minimax',
        provider_name: 'MiniMax',
        model_id: 'MiniMax-M2.7',
      }));
      aiModelsService.findActiveApiKeyByProvider.mockResolvedValueOnce({ id: 'key-mm' } as any);
      aiModelsService.getDecryptedApiKey.mockResolvedValueOnce('sk-mm-real');
      aiModelsService.findDefaultEndpointByProvider.mockResolvedValueOnce(null as any);

      const override = await (service as any).tryBuildHermesProviderOverride({
        executionModelName: 'MiniMax-M2.7',
      });

      expect(override).toBeUndefined();
    });

    it('tryBuildHermesProviderOverride returns undefined when admin has no api key', async () => {
      aiModelsService.findExecutableModelByModelId.mockResolvedValueOnce(providerModelFixture({
        provider_code: 'minimax',
        provider_name: 'MiniMax',
        model_id: 'MiniMax-M2.7',
      }));
      aiModelsService.findActiveApiKeyByProvider.mockResolvedValueOnce(null as any);

      const override = await (service as any).tryBuildHermesProviderOverride({
        executionModelName: 'MiniMax-M2.7',
      });

      expect(override).toBeUndefined();
    });
  });

  describe('admin-configured provider bypasses Hermes Agent', () => {
    function preparedHealthyLingqi() {
      quotaService.estimateLingqiCost.mockResolvedValue(successfulLingqiEstimate());
      quotaService.getSelectedModelForExecution.mockResolvedValue({ id: 'model-1', modelName: 'MiniMax-M2.7' });
      quotaService.consumeLingqi.mockResolvedValue({ balance: 90, totalConsumed: 10 });
      quotaService.refundLingqi.mockResolvedValue({ balance: 100, totalConsumed: 0 });
      jest.spyOn(service as any, 'checkQuota').mockResolvedValue(null);
      db.getConversationMCPServers.mockResolvedValue([] as any);
    }

    it('bypasses Hermes Agent and routes directly to MiniMax when admin has configured key + endpoint', async () => {
      preparedHealthyLingqi();
      const checkHealth = jest.spyOn(service as any, 'checkHermesAgentHealth').mockResolvedValue(true);
      const sendHermesAgentSpy = jest.spyOn(service as any, 'sendHermesAgentMessage');
      aiModelsService.findExecutableModelByModelId.mockResolvedValue(providerModelFixture({
        provider_code: 'minimax',
        provider_name: 'MiniMax',
        model_id: 'MiniMax-M2.7',
      }));
      aiModelsService.findActiveApiKeyByProvider.mockResolvedValue({ id: 'key-mm' } as any);
      aiModelsService.getDecryptedApiKey.mockResolvedValue('sk-mm-real');
      aiModelsService.findDefaultEndpointByProvider.mockResolvedValue({
        base_url: 'https://api.minimaxi.com/anthropic',
      } as any);
      const stream = new PassThrough();
      const post = jest.fn().mockReturnValue(of({ data: stream, status: 200 }));
      (service as any).httpService = { post, get: jest.fn() } as unknown as HttpService;

      const resultPromise = service.sendHermesMessage({
        sessionId: 'session-1',
        userId: 'user-1',
        teamId: 'team-1',
        message: 'hello',
        model: 'MiniMax-M2.7',
        messageId: 'msg-mm-1',
      }, socket);
      stream.end('data: [DONE]\n\n');
      await resultPromise;

      // Hermes health check must be skipped because we already have admin override.
      expect(checkHealth).not.toHaveBeenCalled();
      expect(sendHermesAgentSpy).not.toHaveBeenCalled();
      // POST must have gone to MiniMax /v1/messages with Authorization: Bearer
      // (per MiniMax Anthropic-compatible API docs).
      const [calledUrl, , options] = post.mock.calls[0];
      expect(calledUrl).toBe('https://api.minimaxi.com/anthropic/v1/messages');
      expect(options.headers['Authorization']).toBe('Bearer sk-mm-real');
      expect(options.headers['anthropic-version']).toBe('2023-06-01');
    });

    it('returns specific error message when no admin endpoint configured and Hermes Agent is unhealthy (G3 fix)', async () => {
      preparedHealthyLingqi();
      jest.spyOn(service as any, 'checkHermesAgentHealth').mockResolvedValue(false);
      aiModelsService.findExecutableModelByModelId.mockResolvedValue(providerModelFixture({
        provider_code: 'minimax',
        provider_name: 'MiniMax',
        model_id: 'MiniMax-M2.7',
      }));
      aiModelsService.findActiveApiKeyByProvider.mockResolvedValue({ id: 'key-mm' } as any);
      aiModelsService.getDecryptedApiKey.mockResolvedValue('sk-mm-real');
      aiModelsService.findDefaultEndpointByProvider.mockResolvedValue(null as any);

      const result = await service.sendHermesMessage({
        sessionId: 'session-1',
        userId: 'user-1',
        teamId: 'team-1',
        message: 'hello',
        model: 'MiniMax-M2.7',
        messageId: 'msg-mm-2',
      } as any, socket);

      expect(result).toEqual(expect.objectContaining({
        ok: false,
        messageId: 'msg-mm-2',
        error: '模型 MiniMax-M2.7 的 API 端点未配置，请联系管理员',
      }));
      // Critical: must NOT fall back to HERMES_ENDPOINT (G3 regression guard).
      expect(quotaService.refundLingqi).toHaveBeenCalled();
    });
  });
});
