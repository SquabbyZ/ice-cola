/**
 * Lingqi Service 单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { lingqiService } from './lingqi-service';

vi.mock('axios', () => {
  const mAxios = {
    get: vi.fn(),
    post: vi.fn(),
  };
  return { default: mAxios };
});

import axios from 'axios';

interface MockAxios {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
}

describe('LingqiService', () => {
  const mockAxios = axios as unknown as MockAxios;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('getStatus', () => {
    it('calls status API with authorization header and returns response data', async () => {
      localStorage.setItem('accessToken', 'test-token');
      const status = {
        teamId: 'team-1',
        balance: 1000,
        totalGranted: 1200,
        totalConsumed: 200,
        subscription: {
          planName: 'starter',
          displayName: 'Starter',
          level: 1,
          costDiscountRate: 0.9,
          modelRankLimit: 2,
          expiresAt: null,
        },
        cultivationRealm: {
          name: 'qi_refining',
          displayName: '炼气',
          minTotalConsumed: 100,
          sortOrder: 2,
          privileges: {},
        },
        realmProgress: {
          current: 100,
          required: 1000,
          percentage: 10,
        },
      };
      mockAxios.get.mockResolvedValue({ data: { data: status } });

      const result = await lingqiService.getStatus('team-1');

      expect(mockAxios.get).toHaveBeenCalledWith(
        '/teams/team-1/quota/status',
        expect.objectContaining({
          headers: { Authorization: 'Bearer test-token' },
        })
      );
      expect(result).toEqual(status);
    });

    it('encodes team id path segments', async () => {
      mockAxios.get.mockResolvedValue({ data: { data: { balance: 1000 } } });

      await lingqiService.getStatus('team/1?x=1');

      expect(mockAxios.get).toHaveBeenCalledWith(
        '/teams/team%2F1%3Fx%3D1/quota/status',
        expect.any(Object)
      );
    });
  });

  describe('getLedger', () => {
    it('gets recent ledger entries with authorization header', async () => {
      localStorage.setItem('accessToken', 'test-token');
      const ledger = [
        {
          id: 'ledger-1',
          direction: 'grant',
          amount: 100,
          transactionType: 'redemption_code',
          sourceType: 'redemption_code',
          description: '灵气兑换码充值',
          metadata: {},
          createdAt: '2026-05-21T10:00:00.000Z',
        },
      ];
      mockAxios.get.mockResolvedValue({ data: { data: ledger } });

      const result = await lingqiService.getLedger('team-1');

      expect(mockAxios.get).toHaveBeenCalledWith(
        '/teams/team-1/quota/ledger',
        expect.objectContaining({
          headers: { Authorization: 'Bearer test-token' },
        })
      );
      expect(result).toEqual(ledger);
    });
  });

  describe('redeem', () => {
    it('posts code to redeem API and returns granted amount and status', async () => {
      const redeemResult = {
        grantedAmount: 1000,
        status: {
          teamId: 'team-1',
          balance: 1000,
          totalGranted: 1000,
          totalConsumed: 0,
          subscription: {
            planName: 'starter',
            displayName: 'Starter',
            level: 1,
            costDiscountRate: 1,
            modelRankLimit: 1,
            expiresAt: null,
          },
          realmProgress: {
            current: 0,
            required: 1000,
            percentage: 0,
          },
        },
      };
      mockAxios.post.mockResolvedValue({ data: { data: redeemResult } });

      const redemptionCode = crypto.randomUUID();
      const result = await lingqiService.redeem('team-1', redemptionCode);

      expect(mockAxios.post).toHaveBeenCalledWith(
        '/teams/team-1/quota/redeem',
        { code: redemptionCode },
        expect.objectContaining({ headers: {} })
      );
      expect(result.grantedAmount).toBe(1000);
      expect(result.status).toEqual(redeemResult.status);
    });
  });

  describe('getModelCatalog', () => {
    it('gets model catalog API and returns models', async () => {
      const models = [
        {
          id: 'model-1',
          modelName: 'vendor/model-1',
          displayName: 'Model One',
          description: 'Test model',
          rank: 1,
          costMultiplier: 1,
          requiredPlanLevel: 1,
          isAvailable: true,
          unavailableReason: null,
        },
      ];
      mockAxios.get.mockResolvedValue({ data: { data: models } });

      const result = await lingqiService.getModelCatalog('team-1');

      expect(mockAxios.get).toHaveBeenCalledWith(
        '/teams/team-1/models/catalog',
        expect.objectContaining({ headers: {} })
      );
      expect(result).toEqual(models);
    });
  });

  describe('estimate', () => {
    it('posts estimate request and returns estimated cost and affordability', async () => {
      const estimate = {
        estimatedCost: 10,
        canAfford: true,
      };
      const request = {
        transactionType: 'chat_message' as const,
        modelId: 'model-1',
      };
      mockAxios.post.mockResolvedValue({ data: { data: estimate } });

      const result = await lingqiService.estimate('team-1', request);

      expect(mockAxios.post).toHaveBeenCalledWith(
        '/teams/team-1/quota/estimate',
        request,
        expect.objectContaining({ headers: {} })
      );
      expect(result.estimatedCost).toBe(10);
      expect(result.canAfford).toBe(true);
    });
  });

  describe('selectModel', () => {
    it('posts selected model and conversation id and returns model', async () => {
      const model = {
        id: 'model-1',
        modelName: 'vendor/model-1',
        displayName: 'Model One',
        description: 'Test model',
        rank: 1,
        costMultiplier: 1,
        requiredPlanLevel: 1,
        isAvailable: true,
        unavailableReason: null,
      };
      mockAxios.post.mockResolvedValue({ data: { data: model } });

      const result = await lingqiService.selectModel('team-1', 'model-1', 'conv-1');

      expect(mockAxios.post).toHaveBeenCalledWith(
        '/teams/team-1/models/select',
        { modelId: 'model-1', conversationId: 'conv-1' },
        expect.objectContaining({ headers: {} })
      );
      expect(result).toEqual(model);
    });
  });
});
