/**
 * Quota Service 单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QuotaService } from './quota-service';
import { GatewayRpcService } from './gateway-rpc';

// Mock GatewayRpcService
vi.mock('./gateway-rpc', () => {
  return {
    GatewayRpcService: vi.fn().mockImplementation(() => ({
      send: vi.fn(),
    })),
  };
});

describe('QuotaService', () => {
  let quotaService: QuotaService;
  let mockRpc: GatewayRpcService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc = new GatewayRpcService({ send: vi.fn() } as any);
    quotaService = new QuotaService(mockRpc);
  });

  describe('getConfig', () => {
    it('returns default config when RPC fails', async () => {
      vi.mocked(mockRpc.send).mockRejectedValue(new Error('RPC error'));

      const config = await quotaService.getConfig();

      expect(config).toEqual({
        monthlyBudget: 50,
        warningThreshold: 0.8,
        hardLimit: true,
      });
    });

    it('returns custom config when RPC succeeds', async () => {
      vi.mocked(mockRpc.send).mockResolvedValue({
        monthlyBudget: 100,
        warningThreshold: 0.5,
        hardLimit: false,
      });

      const config = await quotaService.getConfig();

      expect(config.monthlyBudget).toBe(100);
      expect(config.warningThreshold).toBe(0.5);
      expect(config.hardLimit).toBe(false);
    });
  });

  describe('updateConfig', () => {
    it('calls RPC with correct params', async () => {
      vi.mocked(mockRpc.send).mockResolvedValue(undefined);

      await quotaService.updateConfig({ monthlyBudget: 200 }, 'team-1');

      expect(mockRpc.send).toHaveBeenCalledWith('quota.updateConfig', {
        monthlyBudget: 200,
        teamId: 'team-1',
      });
    });

    it('throws error when RPC fails', async () => {
      vi.mocked(mockRpc.send).mockRejectedValue(new Error('Update failed'));

      await expect(
        quotaService.updateConfig({ monthlyBudget: 200 })
      ).rejects.toThrow('Update failed');
    });
  });

  describe('getStatus', () => {
    it('returns default status when RPC returns no quota', async () => {
      vi.mocked(mockRpc.send).mockResolvedValue({});

      const status = await quotaService.getStatus();

      expect(status).toEqual({
        currentCost: 0,
        budget: 200,
        utilization: 0,
        isExceeded: false,
        isWarning: false,
      });
    });

    it('calculates correct utilization', async () => {
      vi.mocked(mockRpc.send).mockResolvedValue({
        quota: { totalAmt: 1000, usedAmt: 800 },
      });

      const status = await quotaService.getStatus();

      expect(status.utilization).toBe(0.8);
      expect(status.isWarning).toBe(true);
      expect(status.isExceeded).toBe(false);
    });

    it('detects exceeded quota', async () => {
      vi.mocked(mockRpc.send).mockResolvedValue({
        quota: { totalAmt: 1000, usedAmt: 1000 },
      });

      const status = await quotaService.getStatus();

      expect(status.isExceeded).toBe(true);
      expect(status.utilization).toBe(1);
    });

    it('handles zero budget', async () => {
      vi.mocked(mockRpc.send).mockResolvedValue({
        quota: { totalAmt: 0, usedAmt: 0 },
      });

      const status = await quotaService.getStatus();

      expect(status.utilization).toBe(0);
      expect(status.isWarning).toBe(false);
    });
  });
});