import { createHash, createHmac, randomUUID } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { PoolClient } from 'pg';
import { QuotaService, TeamRole } from './quota.service';
import { DatabaseService } from '../database/database.service';
import { AppError } from '../common/interfaces/errors';

describe('QuotaService', () => {
  let service: QuotaService;
  let db: jest.Mocked<DatabaseService>;
  let transactionClient: { query: jest.Mock };
  const originalRedemptionPepper = process.env.LINGQI_REDEMPTION_PEPPER;

  const mockQuota = {
    id: 'quota-1',
    teamId: 'team-1',
    totalAmt: '1000',
    usedAmt: '100',
    period: 30,
    resetDay: 1,
    resetAt: new Date(),
  };

  beforeEach(async () => {
    transactionClient = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotaService,
        {
          provide: DatabaseService,
          useValue: {
            findQuotaByTeamId: jest.fn(),
            createQuota: jest.fn(),
            incrementQuotaUsed: jest.fn(),
            updateQuota: jest.fn(),
            query: jest.fn(),
            queryOne: jest.fn(),
            transaction: jest.fn(async (callback: (client: PoolClient) => Promise<unknown>) =>
              callback(transactionClient as unknown as PoolClient)
            ),
          },
        },
      ],
    }).compile();

    service = module.get<QuotaService>(QuotaService);
    db = module.get(DatabaseService);
    delete process.env.LINGQI_REDEMPTION_PEPPER;
    transactionClient.query.mockReset();
    transactionClient.query.mockResolvedValue({ rows: [] });
  });

  afterAll(() => {
    if (originalRedemptionPepper === undefined) {
      delete process.env.LINGQI_REDEMPTION_PEPPER;
      return;
    }

    process.env.LINGQI_REDEMPTION_PEPPER = originalRedemptionPepper;
  });

  describe('getQuota', () => {
    it('creates default quota when none exists', async () => {
      db.findQuotaByTeamId.mockResolvedValue(null);
      db.createQuota.mockResolvedValue({ ...mockQuota, totalAmt: '1000', usedAmt: '0' });

      const result = await service.getQuota('team-1');

      expect(result.teamId).toBe('team-1');
      expect(result.total).toBe(1000);
      expect(result.used).toBe(0);
      expect(result.remaining).toBe(1000);
      expect(result.isUnlimited).toBe(false);
    });

    it('returns existing quota', async () => {
      db.findQuotaByTeamId.mockResolvedValue(mockQuota);

      const result = await service.getQuota('team-1');

      expect(result.teamId).toBe('team-1');
      expect(result.total).toBe(1000);
      expect(result.used).toBe(100);
      expect(result.remaining).toBe(900);
    });

    it('handles unlimited quota', async () => {
      db.findQuotaByTeamId.mockResolvedValue({ ...mockQuota, totalAmt: '-1', usedAmt: '0' });

      const result = await service.getQuota('team-1');

      expect(result.isUnlimited).toBe(true);
      expect(result.remaining).toBe(-1);
    });
  });

  describe('checkQuota', () => {
    it('returns hasQuota true when quota is available', async () => {
      db.findQuotaByTeamId.mockResolvedValue(mockQuota);

      const result = await service.checkQuota('team-1');

      expect(result.hasQuota).toBe(true);
      expect(result.remaining).toBe(900);
      expect(result.unlimited).toBe(false);
    });

    it('returns hasQuota false when quota is exhausted', async () => {
      db.findQuotaByTeamId.mockResolvedValue({ ...mockQuota, usedAmt: '1000' });

      const result = await service.checkQuota('team-1');

      expect(result.hasQuota).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('returns unlimited when total is -1', async () => {
      db.findQuotaByTeamId.mockResolvedValue({ ...mockQuota, totalAmt: '-1', usedAmt: '500' });

      const result = await service.checkQuota('team-1');

      expect(result.hasQuota).toBe(true);
      expect(result.unlimited).toBe(true);
    });
  });

  describe('consumeQuota', () => {
    it('throws error when insufficient quota', async () => {
      db.findQuotaByTeamId.mockResolvedValue({ ...mockQuota, usedAmt: '950' });
      (transactionClient.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ ...mockQuota, usedAmt: '950' }] });

      await expect(service.consumeQuota('team-1', 100)).rejects.toThrow(AppError);
      expect(transactionClient.query).toHaveBeenCalledTimes(2);
    });

    it('consumes quota successfully inside a transaction', async () => {
      db.findQuotaByTeamId.mockResolvedValue(mockQuota);
      (transactionClient.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [mockQuota] })
        .mockResolvedValueOnce({ rows: [{ ...mockQuota, usedAmt: '200' }] });

      await service.consumeQuota('team-1', 100);

      expect(db.transaction).toHaveBeenCalled();
      expect(transactionClient.query).toHaveBeenNthCalledWith(1, 'SELECT pg_advisory_xact_lock(hashtext($1))', ['team-1']);
      expect(transactionClient.query).toHaveBeenNthCalledWith(2, 'SELECT * FROM quotas WHERE "teamId" = $1 FOR UPDATE', ['team-1']);
      expect(transactionClient.query).toHaveBeenNthCalledWith(3, 'UPDATE quotas SET "usedAmt" = "usedAmt" + $1, "updatedAt" = NOW() WHERE "teamId" = $2', ['100', 'team-1']);
    });

    it('allows unlimited quota consumption', async () => {
      db.findQuotaByTeamId.mockResolvedValue({ ...mockQuota, totalAmt: '-1' });
      (transactionClient.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ ...mockQuota, totalAmt: '-1' }] })
        .mockResolvedValueOnce({ rows: [{ ...mockQuota, totalAmt: '-1', usedAmt: '1100' }] });

      await service.consumeQuota('team-1', 1000000);

      expect(transactionClient.query).toHaveBeenNthCalledWith(3, 'UPDATE quotas SET "usedAmt" = "usedAmt" + $1, "updatedAt" = NOW() WHERE "teamId" = $2', ['1000000', 'team-1']);
    });

    it('rejects non-positive amount', async () => {
      await expect(service.consumeQuota('team-1', 0)).rejects.toThrow(AppError);
      await expect(service.consumeQuota('team-1', -1)).rejects.toThrow(AppError);
    });
  });

  describe('recharge', () => {
    it('throws error when non-admin tries to recharge', async () => {
      await expect(
        service.recharge('team-1', 'user-1', 1000, null, TeamRole.MEMBER)
      ).rejects.toThrow(AppError);
    });

    it('rejects non-positive and non-integer recharge amounts', async () => {
      await expect(service.recharge('team-1', 'user-1', 0, null, TeamRole.ADMIN)).rejects.toMatchObject({
        code: 'LINGQI_INVALID_AMOUNT',
      });
      await expect(service.recharge('team-1', 'user-1', -1, null, TeamRole.ADMIN)).rejects.toMatchObject({
        code: 'LINGQI_INVALID_AMOUNT',
      });
      await expect(service.recharge('team-1', 'user-1', 1.5, null, TeamRole.ADMIN)).rejects.toMatchObject({
        code: 'LINGQI_INVALID_AMOUNT',
      });
      expect(db.transaction).not.toHaveBeenCalled();
    });

    it('creates new quota when none exists inside the Lingqi transaction', async () => {
      transactionClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ team_id: 'team-1', balance_amt: '0', total_granted_amt: '0', total_consumed_amt: '0' }] })
        .mockResolvedValueOnce({ rows: [{ team_id: 'team-1', balance_amt: '500', total_granted_amt: '500', total_consumed_amt: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.recharge('team-1', 'user-1', 500, null, TeamRole.ADMIN);

      expect(result.success).toBe(true);
      expect(result.newTotal).toBe(500);
      expect(db.findQuotaByTeamId).not.toHaveBeenCalled();
      expect(db.createQuota).not.toHaveBeenCalled();
      expect(transactionClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO quotas'),
        expect.arrayContaining(['team-1', '500', '0']),
      );
    });

    it('adds to existing quota inside the Lingqi transaction', async () => {
      transactionClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ totalAmt: '1000' }] })
        .mockResolvedValueOnce({ rows: [{ team_id: 'team-1', balance_amt: '100', total_granted_amt: '100', total_consumed_amt: '0' }] })
        .mockResolvedValueOnce({ rows: [{ team_id: 'team-1', balance_amt: '600', total_granted_amt: '600', total_consumed_amt: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.recharge('team-1', 'user-1', 500, null, TeamRole.ADMIN);

      expect(result.success).toBe(true);
      expect(result.newTotal).toBe(1500);
      expect(db.findQuotaByTeamId).not.toHaveBeenCalled();
      expect(db.updateQuota).not.toHaveBeenCalled();
      expect(transactionClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE quotas'),
        ['500', 'team-1'],
      );
    });

    it('grants spendable Lingqi and writes a ledger entry when admin recharges', async () => {
      transactionClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ totalAmt: '1000' }] })
        .mockResolvedValueOnce({ rows: [{ team_id: 'team-1', balance_amt: '100', total_granted_amt: '100', total_consumed_amt: '0' }] })
        .mockResolvedValueOnce({ rows: [{ team_id: 'team-1', balance_amt: '600', total_granted_amt: '600', total_consumed_amt: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.recharge('team-1', 'user-1', 500, 'manual grant', TeamRole.ADMIN);

      expect(result.success).toBe(true);
      expect(result.newTotal).toBe(1500);
      expect(db.transaction).toHaveBeenCalledTimes(1);
      expect(transactionClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE lingqi_accounts'),
        ['500', 'team-1'],
      );
      expect(transactionClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO lingqi_ledger_entries'),
        [
          'team-1',
          'user-1',
          'grant',
          '500',
          'admin_recharge',
          'admin_recharge',
          null,
          'manual grant',
          JSON.stringify({ note: 'manual grant' }),
        ],
      );
    });

  });

  describe('Lingqi behavior', () => {
    it('returns cultivation realm progress from total consumed amount', async () => {
      db.queryOne
        .mockResolvedValueOnce({
          team_id: 'team-1',
          balance_amt: '900',
          total_granted_amt: '1000',
          total_consumed_amt: '600',
        })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      db.query.mockResolvedValue([
        { name: 'mortal', display_name: '凡人', min_total_consumed_amt: '0', sort_order: 1, privileges: {} },
        { name: 'qi_refining', display_name: '练气境', min_total_consumed_amt: '100', sort_order: 2, privileges: {} },
        { name: 'foundation', display_name: '筑基境', min_total_consumed_amt: '500', sort_order: 3, privileges: {} },
        { name: 'golden_core', display_name: '金丹境', min_total_consumed_amt: '2000', sort_order: 4, privileges: {} },
      ]);

      const result = await service.getLingqiStatus('team-1');

      expect(result.teamId).toBe('team-1');
      expect(result.balance).toBe(900);
      expect(result.totalConsumed).toBe(600);
      expect(result.cultivationRealm.displayName).toBe('筑基境');
      expect(result.nextCultivationRealm?.displayName).toBe('金丹境');
      expect(result.realmProgress.current).toBe(100);
      expect(result.realmProgress.required).toBe(1500);
      expect(result.subscription).toMatchObject({
        planName: 'wanderer',
        displayName: '散修',
        level: 0,
        costDiscountRate: 1,
        modelRankLimit: 1,
        expiresAt: null,
      });
    });

    it('redeems a code and grants Lingqi in one transaction', async () => {
      const redemptionCode = `TEST-${randomUUID()}`;
      const codeHash = createHash('sha256').update(redemptionCode.trim().toUpperCase()).digest('hex');
      transactionClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'code-1', lingqi_amount: '1000', plan_id: 'plan-1', max_uses: 1, used_count: 0, expires_at: null }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ team_id: 'team-1', balance_amt: '0', total_granted_amt: '0', total_consumed_amt: '0' }] })
        .mockResolvedValueOnce({ rows: [{ team_id: 'team-1', balance_amt: '1000', total_granted_amt: '1000', total_consumed_amt: '0' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });
      db.query.mockResolvedValue([{ name: 'mortal', display_name: '凡人', min_total_consumed_amt: '0', sort_order: 1, privileges: {} }]);

      const result = await service.redeemLingqiCode('team-1', 'user-1', redemptionCode);

      expect(db.transaction).toHaveBeenCalledTimes(1);
      expect(transactionClient.query).toHaveBeenCalled();
      const transactionParameters = transactionClient.query.mock.calls.flatMap(([, params]) => params ?? []);
      expect(transactionParameters).toContainEqual([codeHash]);
      expect(transactionParameters).not.toContain(redemptionCode);
      expect(result.grantedAmount).toBe(1000);
      expect(result.status.teamId).toBe('team-1');
      expect(result.status.balance).toBe(1000);
    });

    it('rejects an invalid redemption code', async () => {
      transactionClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await expect(service.redeemLingqiCode('team-1', 'user-1', 'bad-code')).rejects.toMatchObject({
        code: 'LINGQI_REDEMPTION_CODE_INVALID',
      });
    });

    it('rejects malformed redemption codes before querying the database', async () => {
      await expect(service.redeemLingqiCode('team-1', 'user-1', 'bad code!')).rejects.toMatchObject({
        code: 'LINGQI_REDEMPTION_CODE_INVALID',
      });

      expect(transactionClient.query).not.toHaveBeenCalled();
    });

    it('rejects an exhausted redemption code', async () => {
      transactionClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'code-1', lingqi_amount: '1000', plan_id: null, max_uses: 1, used_count: 1, expires_at: null }] });

      await expect(service.redeemLingqiCode('team-1', 'user-1', 'TEST_REDEMPTION_CODE')).rejects.toMatchObject({
        code: 'LINGQI_REDEMPTION_CODE_EXHAUSTED',
      });
    });

    it('rejects a code already used by the team', async () => {
      transactionClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'code-1', lingqi_amount: '1000', plan_id: null, max_uses: 5, used_count: 1, expires_at: null }] })
        .mockResolvedValueOnce({ rows: [{ id: 'redemption-1' }] });

      await expect(service.redeemLingqiCode('team-1', 'user-1', 'TEST_REDEMPTION_CODE')).rejects.toMatchObject({
        code: 'LINGQI_REDEMPTION_CODE_ALREADY_USED',
      });
    });

    it('estimates chat message cost from selected model and subscription discount', async () => {
      db.queryOne
        .mockResolvedValueOnce({ level: 1, cost_discount_rate: '0.95', model_rank_limit: 2 })
        .mockResolvedValueOnce({ id: 'model-1', model_name: 'demo-advanced', display_name: '玄阶功法', rank: 2, cost_multiplier: '1.80', required_plan_level: 1, is_active: true })
        .mockResolvedValueOnce({ team_id: 'team-1', balance_amt: '1000', total_granted_amt: '1000', total_consumed_amt: '0' });

      const result = await service.estimateLingqiCost('team-1', {
        transactionType: 'chat_message',
        modelId: 'model-1',
        context: { conversationId: 'conv-1' },
      });

      expect(result.estimatedCost).toBe(18);
      expect(result.balanceAfterEstimate).toBe(982);
      expect(result.canAfford).toBe(true);
      expect(result.reason).toBeNull();
      expect(result.subscription).toMatchObject({
        planName: 'wanderer',
        displayName: '散修',
        level: 1,
        costDiscountRate: 0.95,
        modelRankLimit: 2,
        expiresAt: null,
      });
    });

    it('uses conversation selected model only when the conversation belongs to the team', async () => {
      db.queryOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'team-model',
          model_name: 'demo-basic',
          display_name: '入门心法',
          rank: 1,
          cost_multiplier: '1.00',
          required_plan_level: 0,
          is_active: true,
        })
        .mockResolvedValueOnce({ team_id: 'team-1', balance_amt: '1000', total_granted_amt: '1000', total_consumed_amt: '0' });

      await service.estimateLingqiCost('team-1', {
        transactionType: 'chat_message',
        context: { conversationId: 'conv-other-team' },
      });

      const conversationModelQuery = db.queryOne.mock.calls.find(([, params]) =>
        Array.isArray(params) && params.includes('conv-other-team')
      );
      expect(conversationModelQuery?.[1]).toEqual(['conv-other-team', 'team-1']);
    });

    it('returns subscription required estimate when selected model exceeds rank limit', async () => {
      db.queryOne
        .mockResolvedValueOnce({ level: 1, cost_discount_rate: '1.00', model_rank_limit: 1 })
        .mockResolvedValueOnce({
          id: 'model-high-rank',
          model_name: 'demo-high-rank',
          display_name: '地阶功法',
          rank: 2,
          cost_multiplier: '1.80',
          required_plan_level: 1,
          is_active: true,
        })
        .mockResolvedValueOnce({ team_id: 'team-1', balance_amt: '1000', total_granted_amt: '1000', total_consumed_amt: '0' });

      const result = await service.estimateLingqiCost('team-1', {
        transactionType: 'chat_message',
        modelId: 'model-high-rank',
      });

      expect(result.canAfford).toBe(false);
      expect(result.reason).toBe('SUBSCRIPTION_REQUIRED');
      expect(result.estimatedCost).toBe(0);
      expect(result.balanceAfterEstimate).toBe(1000);
    });

    it('consumes Lingqi and writes an idempotent ledger entry when balance is enough', async () => {
      transactionClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ team_id: 'team-1', balance_amt: '1000', total_granted_amt: '1000', total_consumed_amt: '0' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ team_id: 'team-1', balance_amt: '982', total_granted_amt: '1000', total_consumed_amt: '18' }] })
        .mockResolvedValueOnce({ rows: [] });

      await expect(service.consumeLingqi('team-1', 'user-1', {
        amount: 18,
        transactionType: 'chat_message',
        sourceType: 'chat',
        sourceId: 'conv-1',
        description: '聊天模型调用',
        metadata: { modelId: 'model-1' },
        idempotencyKey: 'charge:message-1',
      })).resolves.toEqual(expect.objectContaining({ balance: 982, totalConsumed: 18 }));
      expect(transactionClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO lingqi_ledger_entries'),
        [
          'team-1',
          'user-1',
          'consume',
          '18',
          'chat_message',
          'chat',
          'conv-1',
          '聊天模型调用',
          JSON.stringify({ modelId: 'model-1' }),
          'charge:message-1',
        ],
      );
    });

    it('returns the current account without updating balance when debit idempotency key was already used', async () => {
      transactionClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ team_id: 'team-1', balance_amt: '982', total_granted_amt: '1000', total_consumed_amt: '18' }] })
        .mockResolvedValueOnce({ rows: [{ team_id: 'team-1', balance_amt: '982', total_granted_amt: '1000', total_consumed_amt: '18' }] });

      await expect(service.consumeLingqi('team-1', 'user-1', {
        amount: 18,
        transactionType: 'chat_message',
        sourceType: 'chat',
        sourceId: 'conv-1',
        idempotencyKey: 'charge:message-1',
      })).resolves.toEqual(expect.objectContaining({ balance: 982, totalConsumed: 18 }));

      expect(transactionClient.query).not.toHaveBeenCalledWith(
        expect.stringContaining('UPDATE lingqi_accounts'),
        expect.any(Array),
      );
    });

    it('refunds prepaid Lingqi and writes an idempotent ledger entry tied to the debit', async () => {
      transactionClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ team_id: 'team-1', balance_amt: '982', total_granted_amt: '1000', total_consumed_amt: '18' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'debit-1', amount: '18' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ team_id: 'team-1', balance_amt: '1000', total_granted_amt: '1000', total_consumed_amt: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      await expect(service.refundLingqi('team-1', 'user-1', {
        amount: 18,
        transactionType: 'chat_message',
        sourceType: 'chat_refund',
        sourceId: 'conv-1',
        description: '聊天模型调用退款',
        metadata: { modelId: 'model-1' },
        idempotencyKey: 'refund:message-1',
        refundOfIdempotencyKey: 'charge:message-1',
      })).resolves.toEqual(expect.objectContaining({ balance: 1000, totalConsumed: 0 }));
      expect(transactionClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE lingqi_accounts'),
        ['18', 'team-1'],
      );
      expect(transactionClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO lingqi_ledger_entries'),
        [
          'team-1',
          'user-1',
          'grant',
          '18',
          'chat_message',
          'chat_refund',
          'conv-1',
          '聊天模型调用退款',
          JSON.stringify({ modelId: 'model-1', refundOfIdempotencyKey: 'charge:message-1' }),
          'refund:message-1',
        ],
      );
    });

    it('returns the current account without updating balance when refund idempotency key was already used', async () => {
      transactionClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ team_id: 'team-1', balance_amt: '1000', total_granted_amt: '1000', total_consumed_amt: '0' }] })
        .mockResolvedValueOnce({ rows: [{ id: 'ledger-1' }] });

      await expect(service.refundLingqi('team-1', 'user-1', {
        amount: 18,
        transactionType: 'chat_message',
        sourceType: 'chat_refund',
        sourceId: 'conv-1',
        idempotencyKey: 'refund:message-1',
        refundOfIdempotencyKey: 'charge:message-1',
      })).resolves.toEqual(expect.objectContaining({ balance: 1000, totalConsumed: 0 }));

      expect(transactionClient.query).not.toHaveBeenCalledWith(
        expect.stringContaining('UPDATE lingqi_accounts'),
        expect.any(Array),
      );
    });

    it('rejects refunds that exceed consumed Lingqi', async () => {
      transactionClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ team_id: 'team-1', balance_amt: '1000', total_granted_amt: '1000', total_consumed_amt: '5' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'debit-1', amount: '18' }] })
        .mockResolvedValueOnce({ rows: [] });

      await expect(service.refundLingqi('team-1', 'user-1', {
        amount: 18,
        transactionType: 'chat_message',
        sourceType: 'chat_refund',
        sourceId: 'conv-1',
        idempotencyKey: 'refund:message-1',
        refundOfIdempotencyKey: 'charge:message-1',
      })).rejects.toMatchObject({ code: 'LINGQI_REFUND_EXCEEDS_CONSUMED' });
    });

    it('rejects refunds without the original debit idempotency key', async () => {
      transactionClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ team_id: 'team-1', balance_amt: '982', total_granted_amt: '1000', total_consumed_amt: '18' }] });

      await expect(service.refundLingqi('team-1', 'user-1', {
        amount: 18,
        transactionType: 'chat_message',
        sourceType: 'chat_refund',
        sourceId: 'conv-1',
        idempotencyKey: 'refund:message-1',
      })).rejects.toMatchObject({ code: 'LINGQI_REFUND_SOURCE_REQUIRED' });
    });

    it('rejects refunds when the original debit amount does not match', async () => {
      transactionClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ team_id: 'team-1', balance_amt: '970', total_granted_amt: '1000', total_consumed_amt: '30' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'debit-1', amount: '30' }] });

      await expect(service.refundLingqi('team-1', 'user-1', {
        amount: 18,
        transactionType: 'chat_message',
        sourceType: 'chat_refund',
        sourceId: 'conv-1',
        idempotencyKey: 'refund:message-1',
        refundOfIdempotencyKey: 'charge:message-1',
      })).rejects.toMatchObject({ code: 'LINGQI_REFUND_SOURCE_INVALID' });
    });

    it('hashes normalized redemption codes with SHA-256 when no pepper is configured', () => {
      const expectedHash = createHash('sha256').update('TEST_REDEMPTION_CODE').digest('hex');

      expect(service.hashRedemptionCode('TEST_REDEMPTION_CODE')).toBe(expectedHash);
      expect(service.hashRedemptionCode('  test_redemption_code  ')).toBe(expectedHash);
    });

    it('hashes normalized redemption codes with HMAC-SHA256 when a pepper is configured', () => {
      process.env.LINGQI_REDEMPTION_PEPPER = 'test-pepper';
      const expectedHash = createHmac('sha256', 'test-pepper').update('TEST_REDEMPTION_CODE').digest('hex');
      const legacyHash = createHash('sha256').update('TEST_REDEMPTION_CODE').digest('hex');

      expect(service.hashRedemptionCode('test_redemption_code')).toBe(expectedHash);
      expect(service.hashRedemptionCode('test_redemption_code')).not.toBe(legacyHash);
      expect(service.hashLegacyRedemptionCode('test_redemption_code')).toBe(legacyHash);
    });

    it('falls back to legacy redemption hashes during lookup when pepper is configured', async () => {
      process.env.LINGQI_REDEMPTION_PEPPER = 'test-pepper';
      const code = 'TEST_REDEMPTION_CODE';
      const currentHash = createHmac('sha256', 'test-pepper').update(code).digest('hex');
      const legacyHash = createHash('sha256').update(code).digest('hex');
      transactionClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await expect(service.redeemLingqiCode('team-1', 'user-1', code)).rejects.toMatchObject({
        code: 'LINGQI_REDEMPTION_CODE_INVALID',
      });
      expect(transactionClient.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('WHERE code_hash = ANY($1::text[])'),
        [[currentHash, legacyHash]],
      );
    });

    it('returns recent Lingqi ledger entries with a safe limit clamp', async () => {
      const createdAt = new Date('2026-05-21T00:00:00.000Z');
      db.query.mockResolvedValueOnce([
        {
          id: 'ledger-1',
          direction: 'consume',
          amount: '18',
          transaction_type: 'chat_message',
          source_type: 'chat',
          description: '聊天模型调用',
          metadata: { modelId: 'model-1' },
          created_at: createdAt,
        },
      ]);

      await expect(service.getRecentLingqiLedgerEntries('team-1', 500)).resolves.toEqual([
        {
          id: 'ledger-1',
          direction: 'consume',
          amount: 18,
          transactionType: 'chat_message',
          sourceType: 'chat',
          description: '聊天模型调用',
          metadata: { modelId: 'model-1' },
          createdAt,
        },
      ]);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM lingqi_ledger_entries'),
        ['team-1', 100],
      );
    });
  });

  describe('model catalog selection', () => {
    it('returns active catalog models ordered with availability for the team subscription', async () => {
      db.queryOne.mockResolvedValueOnce({ level: 1, cost_discount_rate: '0.95', model_rank_limit: 2 });
      db.query.mockResolvedValueOnce([
        {
          id: 'model-basic',
          model_name: 'basic',
          display_name: '入门心法',
          description: '基础功法',
          rank: 1,
          cost_multiplier: '1.00',
          required_plan_level: 0,
          is_active: true,
        },
        {
          id: 'model-advanced',
          model_name: 'advanced',
          display_name: '玄阶功法',
          description: null,
          rank: 2,
          cost_multiplier: '1.80',
          required_plan_level: 2,
          is_active: true,
        },
        {
          id: 'model-high-rank',
          model_name: 'high-rank',
          display_name: '地阶功法',
          description: null,
          rank: 3,
          cost_multiplier: '2.20',
          required_plan_level: 1,
          is_active: true,
        },
      ]);

      const result = await service.getModelCatalogForTeam('team-1');

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY required_plan_level ASC, rank ASC, display_name ASC'),
      );
      expect(result).toEqual([
        {
          id: 'model-basic',
          modelName: 'basic',
          displayName: '入门心法',
          description: '基础功法',
          rank: 1,
          costMultiplier: 1,
          requiredPlanLevel: 0,
          isAvailable: true,
          unavailableReason: null,
        },
        {
          id: 'model-advanced',
          modelName: 'advanced',
          displayName: '玄阶功法',
          description: null,
          rank: 2,
          costMultiplier: 1.8,
          requiredPlanLevel: 2,
          isAvailable: false,
          unavailableReason: 'SUBSCRIPTION_REQUIRED',
        },
        {
          id: 'model-high-rank',
          modelName: 'high-rank',
          displayName: '地阶功法',
          description: null,
          rank: 3,
          costMultiplier: 2.2,
          requiredPlanLevel: 1,
          isAvailable: false,
          unavailableReason: 'SUBSCRIPTION_REQUIRED',
        },
      ]);
    });

    it('selects an available team default model', async () => {
      jest.spyOn(service, 'getModelCatalogForTeam').mockResolvedValueOnce([
        {
          id: 'model-basic',
          modelName: 'basic',
          displayName: '入门心法',
          description: '基础功法',
          rank: 1,
          costMultiplier: 1,
          requiredPlanLevel: 0,
          isAvailable: true,
          unavailableReason: null,
        },
      ]);
      db.query.mockResolvedValueOnce([]);

      const result = await service.selectModel('team-1', 'model-basic');

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO team_selected_models'),
        ['team-1', 'model-basic'],
      );
      expect(result.id).toBe('model-basic');
    });

    it('selects an available conversation model only after verifying team ownership', async () => {
      jest.spyOn(service, 'getModelCatalogForTeam').mockResolvedValueOnce([
        {
          id: 'model-basic',
          modelName: 'basic',
          displayName: '入门心法',
          description: null,
          rank: 1,
          costMultiplier: 1,
          requiredPlanLevel: 0,
          isAvailable: true,
          unavailableReason: null,
        },
      ]);
      db.queryOne.mockResolvedValueOnce({ id: 'conv-1' });
      db.query.mockResolvedValueOnce([]);

      await service.selectModel('team-1', 'model-basic', 'conv-1');

      expect(db.queryOne).toHaveBeenCalledWith(
        'SELECT id FROM conversations WHERE id = $1 AND "teamId" = $2',
        ['conv-1', 'team-1'],
      );
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO conversation_selected_models'),
        ['conv-1', 'model-basic'],
      );
    });

    it('returns explicit model id and name for execution', async () => {
      db.queryOne
        .mockResolvedValueOnce({ level: 1, cost_discount_rate: '0.95', model_rank_limit: 2 })
        .mockResolvedValueOnce({
          id: 'model-1',
          model_name: 'demo-advanced',
          display_name: '玄阶功法',
          rank: 2,
          cost_multiplier: '1.80',
          required_plan_level: 1,
          is_active: true,
        });

      const result = await service.getSelectedModelForExecution('team-1', 'model-1');

      expect(result).toEqual({ id: 'model-1', modelName: 'demo-advanced' });
      expect(db.queryOne).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('WHERE id = $1 AND is_active = true'),
        ['model-1'],
      );
    });

    it('returns conversation selected model for execution after verifying team ownership', async () => {
      db.queryOne
        .mockResolvedValueOnce({ level: 1, cost_discount_rate: '0.95', model_rank_limit: 2 })
        .mockResolvedValueOnce({
          id: 'model-1',
          model_name: 'demo-advanced',
          display_name: '玄阶功法',
          rank: 2,
          cost_multiplier: '1.80',
          required_plan_level: 1,
          is_active: true,
        });

      const result = await service.getSelectedModelForExecution('team-1', undefined, 'conv-1');

      expect(result).toEqual({ id: 'model-1', modelName: 'demo-advanced' });
      expect(db.queryOne).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('WHERE csm.conversation_id = $1 AND c."teamId" = $2 AND mc.is_active = true'),
        ['conv-1', 'team-1'],
      );
    });

    it('returns team selected model for execution when conversation has no selection', async () => {
      db.queryOne
        .mockResolvedValueOnce({ level: 1, cost_discount_rate: '0.95', model_rank_limit: 2 })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'team-model',
          model_name: 'demo-basic',
          display_name: '入门心法',
          rank: 1,
          cost_multiplier: '1.00',
          required_plan_level: 0,
          is_active: true,
        });

      const result = await service.getSelectedModelForExecution('team-1', undefined, 'conv-1');

      expect(result).toEqual({ id: 'team-model', modelName: 'demo-basic' });
      expect(db.queryOne).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('FROM team_selected_models tsm'),
        ['team-1'],
      );
    });

    it('returns catalog fallback model for execution when no model selection exists', async () => {
      db.queryOne
        .mockResolvedValueOnce({ level: 1, cost_discount_rate: '0.95', model_rank_limit: 2 })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'fallback-model',
          model_name: 'demo-free',
          display_name: '黄阶功法',
          rank: 1,
          cost_multiplier: '1.00',
          required_plan_level: 0,
          is_active: true,
        });

      const result = await service.getSelectedModelForExecution('team-1');

      expect(result).toEqual({ id: 'fallback-model', modelName: 'demo-free' });
      expect(db.queryOne).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('ORDER BY rank ASC'),
      );
    });

    it('rejects execution with a model above the active subscription level', async () => {
      db.queryOne
        .mockResolvedValueOnce({ level: 0, cost_discount_rate: '1.00', model_rank_limit: 2 })
        .mockResolvedValueOnce({
          id: 'model-advanced',
          model_name: 'demo-advanced',
          display_name: '玄阶功法',
          rank: 2,
          cost_multiplier: '1.80',
          required_plan_level: 1,
          is_active: true,
        });

      await expect(service.getSelectedModelForExecution('team-1', 'model-advanced')).rejects.toMatchObject({
        code: 'MODEL_NOT_AVAILABLE',
      });
    });

    it('rejects execution with a model above the active subscription rank limit', async () => {
      db.queryOne
        .mockResolvedValueOnce({ level: 1, cost_discount_rate: '1.00', model_rank_limit: 1 })
        .mockResolvedValueOnce({
          id: 'model-high-rank',
          model_name: 'demo-high-rank',
          display_name: '地阶功法',
          rank: 2,
          cost_multiplier: '1.80',
          required_plan_level: 1,
          is_active: true,
        });

      await expect(service.getSelectedModelForExecution('team-1', 'model-high-rank')).rejects.toMatchObject({
        code: 'MODEL_NOT_AVAILABLE',
      });
    });

    it('rejects unavailable selected models before writing selection', async () => {
      jest.spyOn(service, 'getModelCatalogForTeam').mockResolvedValueOnce([
        {
          id: 'model-advanced',
          modelName: 'advanced',
          displayName: '玄阶功法',
          description: null,
          rank: 2,
          costMultiplier: 1.8,
          requiredPlanLevel: 2,
          isAvailable: false,
          unavailableReason: 'SUBSCRIPTION_REQUIRED',
        },
      ]);

      await expect(service.selectModel('team-1', 'model-advanced')).rejects.toMatchObject({
        code: 'MODEL_NOT_AVAILABLE',
      });
      expect(db.query).not.toHaveBeenCalled();
    });

    it('rejects selecting a conversation model for a missing team conversation', async () => {
      jest.spyOn(service, 'getModelCatalogForTeam').mockResolvedValueOnce([
        {
          id: 'model-basic',
          modelName: 'basic',
          displayName: '入门心法',
          description: null,
          rank: 1,
          costMultiplier: 1,
          requiredPlanLevel: 0,
          isAvailable: true,
          unavailableReason: null,
        },
      ]);
      db.queryOne.mockResolvedValueOnce(null);

      await expect(service.selectModel('team-1', 'model-basic', 'conv-other')).rejects.toMatchObject({
        code: 'CONVERSATION_NOT_FOUND',
      });
      expect(db.query).not.toHaveBeenCalled();
    });
  });
});
