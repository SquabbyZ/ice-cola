import { AppError } from '../common/interfaces/errors';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { HermesService } from './hermes.service';
import { QuotaService } from '../quota/quota.service';
import { ConversationService } from '../conversation/conversation.service';

describe('HermesService chat', () => {
  let service: HermesService;
  let httpService: jest.Mocked<Pick<HttpService, 'post' | 'get'>>;
  let quotaService: jest.Mocked<Pick<QuotaService, 'checkQuota' | 'consumeQuota' | 'estimateLingqiCost' | 'consumeLingqi' | 'refundLingqi' | 'getSelectedModelForExecution'>>;
  let conversationService: jest.Mocked<Pick<ConversationService, 'create' | 'addMessage' | 'getList' | 'getById' | 'getBySessionId'>>;

  beforeEach(() => {
    httpService = {
      post: jest.fn(),
      get: jest.fn(),
    };
    quotaService = {
      checkQuota: jest.fn().mockResolvedValue({ hasQuota: true, unlimited: false, remaining: 10 }),
      consumeQuota: jest.fn().mockResolvedValue(undefined),
      estimateLingqiCost: jest.fn().mockResolvedValue({
        estimatedCost: 18,
        balanceAfterEstimate: 982,
        canAfford: true,
        reason: null,
      }),
      consumeLingqi: jest.fn().mockResolvedValue({ balance: 982, totalConsumed: 18 }),
      refundLingqi: jest.fn().mockResolvedValue({ balance: 1000, totalConsumed: 0 }),
      getSelectedModelForExecution: jest.fn().mockResolvedValue({ id: 'model-1', modelName: 'demo-advanced' }),
    };
    conversationService = {
      create: jest.fn().mockResolvedValue({ id: 'conversation-1' }),
      addMessage: jest.fn().mockResolvedValue({ id: 'message-1' }),
      getList: jest.fn(),
      getById: jest.fn(),
      getBySessionId: jest.fn().mockResolvedValue({ id: 'conversation-1' }),
    };
    service = new HermesService(
      { get: jest.fn().mockReturnValue('http://hermes-agent:9119') } as unknown as ConfigService,
      httpService as unknown as HttpService,
      quotaService as unknown as QuotaService,
      conversationService as unknown as ConversationService,
    );
  });

  it('routes REST chat through ordinary Hermes chat without planner execution', async () => {
    httpService.post.mockReturnValue({
      toPromise: jest.fn().mockResolvedValue({
        data: {
          response: 'ordinary chat response',
          model: 'demo-advanced',
          usage: { promptTokens: 1, completionTokens: 2, totalTokens: 3 },
        },
      }),
    } as any);

    const result = await service.chat('user-1', 'team-1', {
      message: '整理这个需求',
      context: { file: 'README.md' },
      model: 'model-1',
    });

    expect(httpService.post).toHaveBeenCalledWith(
      'http://hermes-agent:9119/api/chat',
      {
        message: '整理这个需求',
        session_id: 'conversation-1',
        context: { file: 'README.md' },
        model: 'demo-advanced',
      },
      expect.objectContaining({ timeout: 120000, maxRedirects: 0 }),
    );
    expect(result).toEqual({
      success: true,
      response: 'ordinary chat response',
      sessionId: 'conversation-1',
      model: 'demo-advanced',
      usage: { promptTokens: 1, completionTokens: 2, totalTokens: 3 },
    });
  });

  it('continues an existing Hermes session when sessionId is provided', async () => {
    conversationService.getBySessionId.mockResolvedValue({ id: 'existing-conversation' } as any);
    httpService.post.mockReturnValue({
      toPromise: jest.fn().mockResolvedValue({
        data: {
          response: 'continued chat response',
          model: 'demo-advanced',
        },
      }),
    } as any);

    const result = await service.chat('user-1', 'team-1', {
      message: '继续上次对话',
      sessionId: 'client-session-1',
      model: 'model-1',
    });

    expect(conversationService.create).not.toHaveBeenCalled();
    expect(conversationService.getBySessionId).toHaveBeenCalledWith('team-1', 'client-session-1');
    expect(httpService.post).toHaveBeenCalledWith(
      'http://hermes-agent:9119/api/chat',
      expect.objectContaining({ session_id: 'existing-conversation' }),
      expect.objectContaining({ timeout: 120000, maxRedirects: 0 }),
    );
    expect(result.sessionId).toBe('existing-conversation');
  });

  it('prepays Lingqi before Hermes agent chat execution succeeds', async () => {
    httpService.post.mockReturnValue(of({ data: { response: 'hi', model: 'demo-advanced' } }) as any);

    await service.chat('user-1', 'team-1', { message: 'hello', model: 'model-1' });

    expect(quotaService.estimateLingqiCost).toHaveBeenCalledWith('team-1', {
      transactionType: 'chat_message',
      modelId: 'model-1',
      context: { conversationId: 'conversation-1' },
    });
    expect(quotaService.consumeLingqi).toHaveBeenCalledWith('team-1', 'user-1', expect.objectContaining({
      amount: 18,
      transactionType: 'chat_message',
      sourceType: 'chat',
      sourceId: 'conversation-1',
    }));
    expect(quotaService.estimateLingqiCost.mock.invocationCallOrder[0]).toBeLessThan(
      quotaService.consumeLingqi.mock.invocationCallOrder[0],
    );
    expect(quotaService.consumeLingqi.mock.invocationCallOrder[0]).toBeLessThan(
      httpService.post.mock.invocationCallOrder[0],
    );
  });

  it('does not consume Lingqi when session validation fails', async () => {
    conversationService.getBySessionId.mockRejectedValue(new AppError('CONVERSATION_NOT_FOUND', '会话不存在', 404));

    await expect(service.chat('user-1', 'team-1', {
      message: 'hello',
      sessionId: 'missing-session',
    })).rejects.toBeInstanceOf(AppError);

    expect(quotaService.consumeLingqi).not.toHaveBeenCalled();
    expect(conversationService.create).not.toHaveBeenCalled();
    expect(conversationService.addMessage).not.toHaveBeenCalled();
    expect(httpService.post).not.toHaveBeenCalled();
  });

  it('rejects chat with 403 when Lingqi estimate is unaffordable', async () => {
    quotaService.estimateLingqiCost.mockResolvedValue({
      estimatedCost: 18,
      balanceAfterEstimate: -8,
      canAfford: false,
      reason: 'LINGQI_INSUFFICIENT_BALANCE',
    } as Awaited<ReturnType<QuotaService['estimateLingqiCost']>>);

    await expect(service.chat('user-1', 'team-1', { message: 'hello', model: 'model-1' })).rejects.toMatchObject({
      response: {
        success: false,
        error: 'LINGQI_INSUFFICIENT_BALANCE',
      },
      status: 403,
    });

    expect(quotaService.consumeLingqi).not.toHaveBeenCalled();
    expect(quotaService.getSelectedModelForExecution).not.toHaveBeenCalled();
    expect(conversationService.addMessage).not.toHaveBeenCalled();
    expect(httpService.post).not.toHaveBeenCalled();
  });

  it('refunds prepaid Lingqi when Hermes agent execution fails', async () => {
    httpService.post.mockImplementation(() => {
      throw new Error('upstream failed');
    });

    await expect(service.chat('user-1', 'team-1', { message: 'hello', model: 'model-1' })).rejects.toMatchObject({
      response: {
        success: false,
        error: 'Hermes 服务暂时不可用，请稍后重试',
      },
      status: 502,
    });

    expect(quotaService.refundLingqi).toHaveBeenCalledWith('team-1', 'user-1', expect.objectContaining({
      amount: 18,
      transactionType: 'chat_message',
      sourceType: 'chat_refund',
      sourceId: 'conversation-1',
      idempotencyKey: 'refund:chat:conversation-1',
      refundOfIdempotencyKey: 'charge:chat:conversation-1',
    }));
  });

  it('lists Hermes sessions through conversation list', async () => {
    const sessions = { conversations: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } };
    conversationService.getList.mockResolvedValue(sessions as any);

    await expect(service.getSessions('team-1')).resolves.toBe(sessions);

    expect(conversationService.getList).toHaveBeenCalledWith('team-1');
  });

  it('checks Hermes status without following redirects', async () => {
    httpService.get.mockReturnValue(of({ data: { version: '1.0.0' } }) as any);

    await expect(service.getStatus()).resolves.toMatchObject({ status: 'online', version: '1.0.0' });
    expect(httpService.get).toHaveBeenCalledWith('http://hermes-agent:9119/health', expect.objectContaining({ maxRedirects: 0 }));
  });

  it('rejects untrusted Hermes endpoints during initialization', () => {
    expect(() => new HermesService(
      { get: jest.fn().mockReturnValue('https://attacker.example') } as unknown as ConfigService,
      httpService as unknown as HttpService,
      quotaService as unknown as QuotaService,
      conversationService as unknown as ConversationService,
    )).toThrow('HERMES_ENDPOINT must point to a trusted internal service');
  });
});
