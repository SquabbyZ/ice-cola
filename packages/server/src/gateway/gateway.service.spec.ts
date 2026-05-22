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

type ExtensionFixture = {
  id: string;
  name: string;
  enabled: boolean;
};

describe('GatewayService extensions', () => {
  let service: GatewayService;
  let db: jest.Mocked<Pick<DatabaseService, 'findAllExtensions' | 'findUserById' | 'listExperts' | 'countExperts' | 'createExpert' | 'findExpertById' | 'findExpertByIdForTeam' | 'findTeamExpertById' | 'updateExpert' | 'deleteExpert' | 'findConversationById' | 'updateConversation' | 'deleteMessagesByConversationId' | 'deleteConversation' | 'findMessagesByConversationId' | 'getConversationMCPServers' | 'getUsageStats'>>;
  let jwtService: jest.Mocked<Pick<JwtService, 'verify' | 'signAsync'>>;
  let configService: { get: jest.Mock };
  let quotaService: jest.Mocked<Pick<QuotaService, 'estimateLingqiCost' | 'consumeLingqi' | 'refundLingqi' | 'getSelectedModelForExecution'>>;
  let aiModelsService: jest.Mocked<Pick<AiModelsService, 'findExecutableModelByModelId' | 'findActiveApiKeyByProvider' | 'getDecryptedApiKey' | 'findDefaultEndpointByProvider' | 'updateApiKeyLastUsed' | 'createUsageLog' | 'incrementTeamQuotaUsage'>>;
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

    service = new GatewayService(
      db as unknown as DatabaseService,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
      { post: jest.fn(), get: jest.fn() } as unknown as HttpService,
      aiModelsService as unknown as AiModelsService,
      quotaService as unknown as QuotaService,
    );
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
          'X-Api-Key': 'secret-key',
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

    expect(result).toEqual({ ok: false, messageId: 'message-1', error: 'LINGQI_MODEL_UNAVAILABLE' });
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

    expect(result).toEqual({ ok: false, messageId: 'message-1', error: 'LINGQI_MODEL_UNAVAILABLE' });
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

    expect(result).toEqual({ ok: false, messageId: 'message-1', error: 'LINGQI_MODEL_UNAVAILABLE' });
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

    expect(result).toEqual({ ok: false, messageId: 'message-1', error: 'Provider request failed' });
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
});
