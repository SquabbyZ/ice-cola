import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { ConversationService } from '../conversation/conversation.service';
import { MemoryServiceImpl } from '../hermes-core/services/memory.service';
import { OrchestratorServiceImpl } from '../hermes-core/services/orchestrator.service';
import { PlannerServiceImpl } from '../hermes-core/services/planner.service';
import { QuotaService } from '../quota/quota.service';
import { HermesService } from './hermes.service';

describe('HermesService', () => {
  let service: HermesService;
  let quotaService: jest.Mocked<QuotaService>;
  let conversationService: jest.Mocked<ConversationService>;
  let plannerService: jest.Mocked<PlannerServiceImpl>;
  let httpService: jest.Mocked<HttpService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HermesService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('http://localhost:9119'),
          },
        },
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
            get: jest.fn(),
          },
        },
        {
          provide: QuotaService,
          useValue: {
            checkQuota: jest.fn().mockResolvedValue({ hasQuota: true, remaining: 100, unlimited: false }),
            consumeQuota: jest.fn().mockResolvedValue(undefined),
            estimateLingqiCost: jest.fn(),
            consumeLingqi: jest.fn(),
            refundLingqi: jest.fn(),
            getSelectedModelForExecution: jest.fn(),
          },
        },
        {
          provide: ConversationService,
          useValue: {
            create: jest.fn(),
            addMessage: jest.fn().mockResolvedValue(undefined),
            getList: jest.fn(),
            getById: jest.fn(),
          },
        },
        {
          provide: PlannerServiceImpl,
          useValue: {
            plan: jest.fn(),
          },
        },
        {
          provide: OrchestratorServiceImpl,
          useValue: {
            executePlan: jest.fn(),
          },
        },
        {
          provide: MemoryServiceImpl,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get(HermesService);
    quotaService = module.get(QuotaService);
    conversationService = module.get(ConversationService);
    plannerService = module.get(PlannerServiceImpl);
    httpService = module.get(HttpService);
  });

  it('prepays Lingqi before Hermes agent chat execution succeeds', async () => {
    quotaService.estimateLingqiCost.mockResolvedValue({
      estimatedCost: 18,
      balanceAfterEstimate: 982,
      canAfford: true,
      reason: null,
    } as Awaited<ReturnType<QuotaService['estimateLingqiCost']>>);
    quotaService.consumeLingqi.mockResolvedValue({ balance: 982, totalConsumed: 18 });
    quotaService.getSelectedModelForExecution.mockResolvedValue({ id: 'model-1', modelName: 'demo-advanced' });
    conversationService.create.mockResolvedValue({ id: 'conv-1' });
    plannerService.plan.mockRejectedValue(new Error('use hermes agent'));
    httpService.post.mockReturnValue(of({ data: { response: 'hi', model: 'demo-advanced' } }) as ReturnType<HttpService['post']>);

    await service.chat('user-1', 'team-1', { message: 'hello', model: 'model-1' });

    expect(plannerService.plan).not.toHaveBeenCalled();
    expect(quotaService.estimateLingqiCost).toHaveBeenCalledWith('team-1', {
      transactionType: 'chat_message',
      modelId: 'model-1',
      context: { conversationId: 'conv-1' },
    });
    expect(quotaService.consumeLingqi).toHaveBeenCalledWith('team-1', 'user-1', expect.objectContaining({
      amount: 18,
      transactionType: 'chat_message',
      sourceType: 'chat',
      sourceId: 'conv-1',
    }));
    expect(quotaService.estimateLingqiCost.mock.invocationCallOrder[0]).toBeLessThan(
      quotaService.consumeLingqi.mock.invocationCallOrder[0],
    );
    expect(quotaService.consumeLingqi.mock.invocationCallOrder[0]).toBeLessThan(
      httpService.post.mock.invocationCallOrder[0],
    );
    expect(httpService.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ model: 'demo-advanced' }),
      expect.objectContaining({ maxRedirects: 0 }),
    );
  });

  it('refunds prepaid Lingqi when Hermes Core and fallback both fail', async () => {
    quotaService.estimateLingqiCost.mockResolvedValue({
      estimatedCost: 18,
      balanceAfterEstimate: 982,
      canAfford: true,
      reason: null,
    } as Awaited<ReturnType<QuotaService['estimateLingqiCost']>>);
    quotaService.consumeLingqi.mockResolvedValue({ balance: 982, totalConsumed: 18 });
    quotaService.refundLingqi.mockResolvedValue({ balance: 1000, totalConsumed: 0 });
    quotaService.getSelectedModelForExecution.mockResolvedValue({ id: 'model-1', modelName: 'demo-advanced' });
    conversationService.create.mockResolvedValue({ id: 'conv-1' });
    plannerService.plan.mockRejectedValue(new Error('use hermes agent'));
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

    expect(quotaService.consumeLingqi).toHaveBeenCalledWith('team-1', 'user-1', expect.objectContaining({
      amount: 18,
      transactionType: 'chat_message',
      sourceType: 'chat',
      sourceId: 'conv-1',
    }));
    expect(quotaService.refundLingqi).toHaveBeenCalledWith('team-1', 'user-1', expect.objectContaining({
      amount: 18,
      transactionType: 'chat_message',
      sourceType: 'chat_refund',
      sourceId: 'conv-1',
      idempotencyKey: 'refund:chat:conv-1',
      refundOfIdempotencyKey: 'charge:chat:conv-1',
    }));
  });

  it('refunds prepaid Lingqi instead of charging for a demo response after connection failure', async () => {
    quotaService.estimateLingqiCost.mockResolvedValue({
      estimatedCost: 18,
      balanceAfterEstimate: 982,
      canAfford: true,
      reason: null,
    } as Awaited<ReturnType<QuotaService['estimateLingqiCost']>>);
    quotaService.consumeLingqi.mockResolvedValue({ balance: 982, totalConsumed: 18 });
    quotaService.refundLingqi.mockResolvedValue({ balance: 1000, totalConsumed: 0 });
    quotaService.getSelectedModelForExecution.mockResolvedValue({ id: 'model-1', modelName: 'demo-advanced' });
    conversationService.create.mockResolvedValue({ id: 'conv-1' });
    plannerService.plan.mockRejectedValue(new Error('use hermes agent'));
    httpService.post.mockImplementation(() => {
      const error = new Error('connection refused') as Error & { code: string };
      error.code = 'ECONNREFUSED';
      throw error;
    });

    await expect(service.chat('user-1', 'team-1', { message: 'hello', model: 'model-1' })).rejects.toMatchObject({
      response: {
        success: false,
        error: 'Hermes 服务暂时不可用，请稍后重试',
      },
      status: 502,
    });

    expect(quotaService.consumeLingqi).toHaveBeenCalledWith('team-1', 'user-1', expect.objectContaining({
      amount: 18,
      transactionType: 'chat_message',
      sourceType: 'chat',
      sourceId: 'conv-1',
    }));
    expect(quotaService.refundLingqi).toHaveBeenCalledWith('team-1', 'user-1', expect.objectContaining({
      amount: 18,
      transactionType: 'chat_message',
      sourceType: 'chat_refund',
      sourceId: 'conv-1',
      idempotencyKey: 'refund:chat:conv-1',
      refundOfIdempotencyKey: 'charge:chat:conv-1',
    }));
  });

  it('checks Hermes status without following redirects', async () => {
    httpService.get.mockReturnValue(of({ data: { version: '1.0.0' } }) as ReturnType<HttpService['get']>);

    await expect(service.getStatus()).resolves.toMatchObject({ status: 'online', version: '1.0.0' });
    expect(httpService.get).toHaveBeenCalledWith('http://localhost:9119/health', expect.objectContaining({ maxRedirects: 0 }));
  });

  it('rejects untrusted Hermes endpoints during initialization', async () => {
    await expect(Test.createTestingModule({
      providers: [
        HermesService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('https://attacker.example'),
          },
        },
        { provide: HttpService, useValue: { post: jest.fn(), get: jest.fn() } },
        { provide: QuotaService, useValue: quotaService },
        { provide: ConversationService, useValue: conversationService },
        { provide: PlannerServiceImpl, useValue: plannerService },
        { provide: OrchestratorServiceImpl, useValue: {} },
        { provide: MemoryServiceImpl, useValue: {} },
      ],
    }).compile()).rejects.toThrow('HERMES_ENDPOINT must point to a trusted internal service');
  });

  it('rejects chat with 403 when Lingqi estimate is unaffordable', async () => {
    quotaService.estimateLingqiCost.mockResolvedValue({
      estimatedCost: 18,
      balanceAfterEstimate: -8,
      canAfford: false,
      reason: 'LINGQI_INSUFFICIENT_BALANCE',
    } as Awaited<ReturnType<QuotaService['estimateLingqiCost']>>);
    conversationService.create.mockResolvedValue({ id: 'conv-1' });

    await expect(service.chat('user-1', 'team-1', { message: 'hello', model: 'model-1' })).rejects.toMatchObject({
      response: {
        success: false,
        error: 'LINGQI_INSUFFICIENT_BALANCE',
      },
      status: 403,
    });

    expect(quotaService.estimateLingqiCost).toHaveBeenCalledWith('team-1', {
      transactionType: 'chat_message',
      modelId: 'model-1',
      context: { conversationId: 'conv-1' },
    });
    expect(quotaService.consumeLingqi).not.toHaveBeenCalled();
    expect(quotaService.getSelectedModelForExecution).not.toHaveBeenCalled();
    expect(conversationService.addMessage).not.toHaveBeenCalled();
    expect(plannerService.plan).not.toHaveBeenCalled();
    expect(httpService.post).not.toHaveBeenCalled();
  });
});
