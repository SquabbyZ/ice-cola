import { AppError } from '../common/interfaces/errors';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { HermesService } from './hermes.service';
import { QuotaService } from '../quota/quota.service';
import { ConversationService } from '../conversation/conversation.service';

describe('HermesService chat', () => {
  let service: HermesService;
  let httpService: jest.Mocked<Pick<HttpService, 'post'>>;
  let quotaService: jest.Mocked<Pick<QuotaService, 'checkQuota' | 'consumeQuota'>>;
  let conversationService: jest.Mocked<Pick<ConversationService, 'create' | 'addMessage' | 'getList' | 'getById' | 'getBySessionId'>>;

  beforeEach(() => {
    httpService = {
      post: jest.fn(),
    };
    quotaService = {
      checkQuota: jest.fn().mockResolvedValue({ hasQuota: true, unlimited: false, remaining: 10 }),
      consumeQuota: jest.fn().mockResolvedValue(undefined),
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
          model: 'hermes-agent',
          usage: { promptTokens: 1, completionTokens: 2, totalTokens: 3 },
        },
      }),
    } as any);

    const result = await service.chat('user-1', 'team-1', {
      message: '整理这个需求',
      context: { file: 'README.md' },
      model: 'general-model',
    });

    expect(httpService.post).toHaveBeenCalledWith(
      'http://hermes-agent:9119/api/chat',
      {
        message: '整理这个需求',
        session_id: 'conversation-1',
        context: { file: 'README.md' },
        model: 'general-model',
      },
      expect.objectContaining({ timeout: 120000 }),
    );
    expect(result).toEqual({
      success: true,
      response: 'ordinary chat response',
      sessionId: 'conversation-1',
      model: 'hermes-agent',
      usage: { promptTokens: 1, completionTokens: 2, totalTokens: 3 },
    });
  });

  it('continues an existing Hermes session when sessionId is provided', async () => {
    conversationService.getBySessionId.mockResolvedValue({ id: 'existing-conversation' } as any);
    httpService.post.mockReturnValue({
      toPromise: jest.fn().mockResolvedValue({
        data: {
          response: 'continued chat response',
          model: 'hermes-agent',
        },
      }),
    } as any);

    const result = await service.chat('user-1', 'team-1', {
      message: '继续上次对话',
      sessionId: 'client-session-1',
    });

    expect(conversationService.create).not.toHaveBeenCalled();
    expect(conversationService.getBySessionId).toHaveBeenCalledWith('team-1', 'client-session-1');
    expect(httpService.post).toHaveBeenCalledWith(
      'http://hermes-agent:9119/api/chat',
      expect.objectContaining({ session_id: 'existing-conversation' }),
      expect.objectContaining({ timeout: 120000 }),
    );
    expect(result.sessionId).toBe('existing-conversation');
  });

  it('keeps quota consumption and conversation persistence for ordinary chat', async () => {
    httpService.post.mockReturnValue({
      toPromise: jest.fn().mockResolvedValue({ data: { message: 'assistant reply', model: 'hermes-agent' } }),
    } as any);

    await service.chat('user-1', 'team-1', { message: 'hello' });

    expect(quotaService.checkQuota).not.toHaveBeenCalled();
    expect(quotaService.consumeQuota).toHaveBeenCalledWith('team-1', 1);
    expect(conversationService.create).toHaveBeenCalledWith('team-1', 'New conversation', 'user-1');
    expect(conversationService.addMessage).toHaveBeenNthCalledWith(1, 'team-1', 'conversation-1', {
      role: 'user',
      content: 'hello',
    });
    expect(conversationService.addMessage).toHaveBeenNthCalledWith(2, 'team-1', 'conversation-1', {
      role: 'assistant',
      content: 'assistant reply',
      model: 'hermes-agent',
      usage: undefined,
    });
  });

  it('does not consume quota when session validation fails', async () => {
    conversationService.getBySessionId.mockRejectedValue(new AppError('CONVERSATION_NOT_FOUND', '会话不存在', 404));

    await expect(service.chat('user-1', 'team-1', {
      message: 'hello',
      sessionId: 'missing-session',
    })).rejects.toBeInstanceOf(AppError);

    expect(quotaService.consumeQuota).not.toHaveBeenCalled();
    expect(conversationService.create).not.toHaveBeenCalled();
    expect(conversationService.addMessage).not.toHaveBeenCalled();
    expect(httpService.post).not.toHaveBeenCalled();
  });

  it('blocks Hermes side effects when quota is exhausted after user message persistence', async () => {
    quotaService.consumeQuota.mockRejectedValue(new AppError('QUOTA_INSUFFICIENT', '配额不足，还剩 0 次', 403));

    await expect(service.chat('user-1', 'team-1', { message: 'hello' })).rejects.toBeInstanceOf(AppError);

    expect(conversationService.create).toHaveBeenCalledWith('team-1', 'New conversation', 'user-1');
    expect(conversationService.addMessage).toHaveBeenCalledWith('team-1', 'conversation-1', {
      role: 'user',
      content: 'hello',
    });
    expect(quotaService.consumeQuota).toHaveBeenCalledWith('team-1', 1);
    expect(httpService.post).not.toHaveBeenCalled();
  });

  it('lists Hermes sessions through conversation list', async () => {
    const sessions = { conversations: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } };
    conversationService.getList.mockResolvedValue(sessions as any);

    await expect(service.getSessions('team-1')).resolves.toBe(sessions);

    expect(conversationService.getList).toHaveBeenCalledWith('team-1');
  });

  it('falls back to demo response without planner execution when Hermes is unavailable', async () => {
    const networkError = new Error('connect ECONNREFUSED') as NodeJS.ErrnoException;
    networkError.code = 'ECONNREFUSED';
    httpService.post.mockReturnValue({
      toPromise: jest.fn().mockRejectedValue(networkError),
    } as any);

    const result = await service.chat('user-1', 'team-1', { message: 'hello' });

    expect(result.success).toBe(true);
    expect(result.model).toBe('demo');
    expect(result.response).toContain('Hermes Agent 服务当前不可用');
    expect(conversationService.addMessage).toHaveBeenNthCalledWith(2, 'team-1', 'conversation-1', {
      role: 'assistant',
      content: result.response,
    });
  });
});
