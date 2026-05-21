import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { QuotaController } from './quota.controller';
import { LingqiEstimateRequest, QuotaService } from './quota.service';
import { DatabaseService } from '../database/database.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';

type QuotaServiceFixture = jest.Mocked<Pick<QuotaService,
  | 'getQuota'
  | 'getLingqiStatus'
  | 'getRecentLingqiLedgerEntries'
  | 'redeemLingqiCode'
  | 'estimateLingqiCost'
  | 'recharge'
>>;

describe('QuotaController', () => {
  let controller: QuotaController;
  let quotaService: QuotaServiceFixture;
  let databaseService: jest.Mocked<Pick<DatabaseService, 'queryOne'>>;

  beforeEach(() => {
    quotaService = {
      getQuota: jest.fn(),
      getLingqiStatus: jest.fn(),
      getRecentLingqiLedgerEntries: jest.fn(),
      redeemLingqiCode: jest.fn(),
      estimateLingqiCost: jest.fn(),
      recharge: jest.fn(),
    };
    databaseService = {
      queryOne: jest.fn().mockResolvedValue({ attempt_count: '1' }),
    };
    controller = new QuotaController(
      quotaService as unknown as QuotaService,
      databaseService as unknown as DatabaseService,
    );
  });

  const user = {
    sub: 'user-1',
    teamId: 'team-1',
    role: 'MEMBER',
    type: 'access',
  } as JwtPayload;

  it('returns Lingqi status in a success envelope', async () => {
    const status = {
      teamId: 'team-1',
      balance: 100,
      totalGranted: 150,
      totalConsumed: 50,
      cultivationRealm: {
        name: 'mortal',
        displayName: '凡人',
        minTotalConsumed: 0,
        sortOrder: 1,
        privileges: {},
      },
      nextCultivationRealm: null,
      realmProgress: {
        current: 50,
        required: 0,
        percentage: 100,
      },
      subscription: {
        planName: 'wanderer',
        displayName: '散修',
        level: 0,
        costDiscountRate: 1,
        modelRankLimit: 1,
        expiresAt: null,
      },
      warningThreshold: 0.2,
    };
    quotaService.getLingqiStatus.mockResolvedValue(status);

    await expect(controller.getLingqiStatus('team-1', user)).resolves.toEqual({
      success: true,
      data: status,
    });
    expect(quotaService.getLingqiStatus).toHaveBeenCalledWith('team-1');
  });

  it('returns recent Lingqi ledger entries with a clamped limit', async () => {
    const entries = [
      {
        id: 'ledger-1',
        direction: 'consume',
        amount: 18,
        transactionType: 'chat_message',
        sourceType: 'chat',
        description: '聊天模型调用',
        metadata: { modelId: 'model-1' },
        createdAt: new Date('2026-05-21T00:00:00.000Z'),
      },
    ];
    quotaService.getRecentLingqiLedgerEntries.mockResolvedValue(entries);

    await expect(controller.getRecentLingqiLedgerEntries('team-1', '500', user)).resolves.toEqual({
      success: true,
      data: entries,
    });
    expect(quotaService.getRecentLingqiLedgerEntries).toHaveBeenCalledWith('team-1', 100);
  });

  it('uses the default Lingqi ledger limit for invalid query values', async () => {
    quotaService.getRecentLingqiLedgerEntries.mockResolvedValue([]);

    await expect(controller.getRecentLingqiLedgerEntries('team-1', 'invalid', user)).resolves.toEqual({
      success: true,
      data: [],
    });
    expect(quotaService.getRecentLingqiLedgerEntries).toHaveBeenCalledWith('team-1', 10);
  });

  it('rejects Lingqi ledger access for another team', async () => {
    await expect(controller.getRecentLingqiLedgerEntries('team-2', '10', user)).rejects.toBeInstanceOf(ForbiddenException);
    expect(quotaService.getRecentLingqiLedgerEntries).not.toHaveBeenCalled();
  });

  it('redeems Lingqi codes for the current user in a success envelope', async () => {
    const result = {
      grantedAmount: 100,
      status: {
        teamId: 'team-1',
        balance: 100,
      },
    };
    quotaService.redeemLingqiCode.mockResolvedValue(result as Awaited<ReturnType<QuotaService['redeemLingqiCode']>>);

    await expect(controller.redeemLingqi('team-1', { code: 'LINGQI_100' }, user)).resolves.toEqual({
      success: true,
      data: result,
    });
    expect(quotaService.redeemLingqiCode).toHaveBeenCalledWith('team-1', 'user-1', 'LINGQI_100');
  });

  it('rate limits repeated Lingqi redemption attempts per user and team', async () => {
    quotaService.redeemLingqiCode.mockResolvedValue({ grantedAmount: 1, status: { teamId: 'team-1', balance: 1 } } as Awaited<ReturnType<QuotaService['redeemLingqiCode']>>);
    databaseService.queryOne
      .mockResolvedValueOnce({ attempt_count: '1' })
      .mockResolvedValueOnce({ attempt_count: '2' })
      .mockResolvedValueOnce({ attempt_count: '3' })
      .mockResolvedValueOnce({ attempt_count: '4' })
      .mockResolvedValueOnce({ attempt_count: '5' })
      .mockResolvedValueOnce({ attempt_count: '6' });

    for (let index = 0; index < 5; index += 1) {
      await controller.redeemLingqi('team-1', { code: `LINGQI_${index}` }, user);
    }

    await expect(controller.redeemLingqi('team-1', { code: 'LINGQI_6' }, user)).rejects.toBeInstanceOf(ForbiddenException);
    expect(databaseService.queryOne).toHaveBeenCalledWith(expect.stringContaining('redemption_attempt_limits'), [
      'team-1',
      'user-1',
      60_000,
    ]);
    expect(quotaService.redeemLingqiCode).toHaveBeenCalledTimes(5);
  });

  it('estimates Lingqi cost in a success envelope', async () => {
    const request: LingqiEstimateRequest = {
      transactionType: 'chat_message',
      modelId: 'model-1',
    };
    const estimate = {
      estimatedCost: 10,
      balanceAfterEstimate: 90,
      canAfford: true,
      reason: null,
      model: {
        id: 'model-1',
        modelName: 'lingqi-model',
        displayName: 'Lingqi Model',
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
    quotaService.estimateLingqiCost.mockResolvedValue(estimate);

    await expect(controller.estimateLingqiCost('team-1', request, user)).resolves.toEqual({
      success: true,
      data: estimate,
    });
    expect(quotaService.estimateLingqiCost).toHaveBeenCalledWith('team-1', request);
  });

  it('rejects Lingqi status access for another team', async () => {
    await expect(controller.getLingqiStatus('team-2', user)).rejects.toBeInstanceOf(ForbiddenException);
    expect(quotaService.getLingqiStatus).not.toHaveBeenCalled();
  });

  it('rejects redemption for another team', async () => {
    await expect(controller.redeemLingqi('team-2', { code: 'LINGQI_100' }, user)).rejects.toBeInstanceOf(ForbiddenException);
    expect(quotaService.redeemLingqiCode).not.toHaveBeenCalled();
  });

  it('rejects cost estimates for another team', async () => {
    const request: LingqiEstimateRequest = {
      transactionType: 'chat_message',
      modelId: 'model-1',
    };

    await expect(controller.estimateLingqiCost('team-2', request, user)).rejects.toBeInstanceOf(ForbiddenException);
    expect(quotaService.estimateLingqiCost).not.toHaveBeenCalled();
  });

  it('rejects quota reads for another team', async () => {
    await expect(controller.getQuota('team-2', user)).rejects.toBeInstanceOf(ForbiddenException);
    expect(quotaService.getQuota).not.toHaveBeenCalled();
  });

  it('rejects public recharge attempts for the current team', async () => {
    await expect(controller.recharge('team-1', { amount: '100' }, user)).rejects.toBeInstanceOf(ForbiddenException);
    expect(quotaService.recharge).not.toHaveBeenCalled();
  });

  it('rejects public recharge attempts for another team', async () => {
    await expect(controller.recharge('team-2', { amount: '100' }, user)).rejects.toBeInstanceOf(ForbiddenException);
    expect(quotaService.recharge).not.toHaveBeenCalled();
  });

  it.each([
    null,
    {},
    { code: '' },
    { code: '   ' },
    { code: 123 },
  ])('rejects invalid redemption body %#', async (body) => {
    await expect(controller.redeemLingqi('team-1', body as { code: string }, user)).rejects.toBeInstanceOf(BadRequestException);
    expect(quotaService.redeemLingqiCode).not.toHaveBeenCalled();
  });

  it.each([
    null,
    {},
    { transactionType: 'invalid' },
    { transactionType: 'tool_call', toolComplexity: 'giant' },
    { transactionType: 'background_task', taskPhase: 'summon' },
    { transactionType: 'chat_message', modelId: 123 },
    { transactionType: 'chat_message', context: 'conv-1' },
  ])('rejects invalid estimate body %#', async (body) => {
    await expect(controller.estimateLingqiCost('team-1', body as LingqiEstimateRequest, user)).rejects.toBeInstanceOf(BadRequestException);
    expect(quotaService.estimateLingqiCost).not.toHaveBeenCalled();
  });
});
