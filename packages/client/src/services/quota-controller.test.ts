/**
 * Quota Controller 单元测试
 *
 * 覆盖:
 * - checkAndEnforce: 无配置 / 预算内 / 警告阈值 / 超额+硬限制 / 超额+软限制
 * - getStatus: 无配置返回 null / 利用率 / isWarning / isExceeded / 零预算
 * - updateConfig: 合法配置 / 预算 ≤ 0 / 阈值越界 / saveConfig 调用形态
 * - 构造函数: null 依赖透传 (源码契约: 不做 null 校验)
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import {
  QuotaController,
  QuotaExceededError,
  type QuotaConfig,
  type IQuotaConfigStore,
} from './quota-controller';
import type { IUsageRepository } from '../repositories/interfaces';

// ---------------- Mock 工厂 ----------------

function makeUsageRepo(overrides: Partial<{
  totalCost: number;
}> = {}): IUsageRepository {
  const totalCost = overrides.totalCost ?? 0;
  return {
    record: vi.fn(),
    findByUserId: vi.fn(),
    getStats: vi.fn().mockResolvedValue({
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCost,
      requestCount: 0,
    }),
    deleteOlderThan: vi.fn(),
  } as unknown as IUsageRepository;
}

function makeConfigStore(config: QuotaConfig | null): {
  store: IQuotaConfigStore;
  saveConfig: Mock;
} {
  const saveConfig = vi.fn().mockResolvedValue(undefined);
  return {
    saveConfig,
    store: {
      getConfig: vi.fn().mockResolvedValue(config),
      saveConfig,
    } as unknown as IQuotaConfigStore,
  };
}

const newUsage = {
  userId: 'user-1',
  model: 'gpt-4',
  inputTokens: 100,
  outputTokens: 200,
  cost: 5,
  timestamp: new Date('2026-06-15T10:00:00Z'),
};

// ---------------- 测试 ----------------

describe('QuotaController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkAndEnforce', () => {
    it('当用户无配额配置时直接返回 (不做任何检查)', async () => {
      const repo = makeUsageRepo({ totalCost: 999 });
      const { store } = makeConfigStore(null);
      const ctrl = new QuotaController(repo, store);
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await expect(ctrl.checkAndEnforce('user-1', newUsage)).resolves.toBeUndefined();

      // 无配置时不应调用 getStats / 不应触发警告
      expect(repo.getStats).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it('预算内使用不抛出异常、不触发警告', async () => {
      const repo = makeUsageRepo({ totalCost: 10 });
      const { store } = makeConfigStore({
        userId: 'user-1',
        monthlyBudget: 100,
        warningThreshold: 0.8,
        hardLimit: true,
      });
      const ctrl = new QuotaController(repo, store);
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await expect(ctrl.checkAndEnforce('user-1', newUsage)).resolves.toBeUndefined();

      // projected = 10 + 5 = 15 / 100 = 0.15, 远低于 0.8
      expect(warnSpy).not.toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it('达到警告阈值时触发警告且不抛出', async () => {
      const repo = makeUsageRepo({ totalCost: 76 });
      const { store } = makeConfigStore({
        userId: 'user-1',
        monthlyBudget: 100,
        warningThreshold: 0.8,
        hardLimit: true,
      });
      const ctrl = new QuotaController(repo, store);
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // projected = 76 + 5 = 81 / 100 = 0.81 → 介于 warning 与 1.0 之间
      await expect(ctrl.checkAndEnforce('user-1', newUsage)).resolves.toBeUndefined();

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toMatch(/用量警告/);
      expect(warnSpy.mock.calls[0][0]).toMatch(/81%/);

      warnSpy.mockRestore();
    });

    it('超额且启用硬限制时抛出 QuotaExceededError', async () => {
      const repo = makeUsageRepo({ totalCost: 96 });
      const { store } = makeConfigStore({
        userId: 'user-1',
        monthlyBudget: 100,
        warningThreshold: 0.8,
        hardLimit: true,
      });
      const ctrl = new QuotaController(repo, store);

      // projected = 96 + 5 = 101 / 100 = 1.01 ≥ 1.0
      await expect(ctrl.checkAndEnforce('user-1', newUsage)).rejects.toBeInstanceOf(
        QuotaExceededError
      );
    });

    it('超额但未启用硬限制时不抛出 (仅警告或静默)', async () => {
      const repo = makeUsageRepo({ totalCost: 96 });
      const { store } = makeConfigStore({
        userId: 'user-1',
        monthlyBudget: 100,
        warningThreshold: 0.8,
        hardLimit: false,
      });
      const ctrl = new QuotaController(repo, store);
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // hardLimit=false: 即使 utilization >= 1.0 也不抛
      await expect(ctrl.checkAndEnforce('user-1', newUsage)).resolves.toBeUndefined();

      warnSpy.mockRestore();
    });

    it('恰好 100% 利用率且启用硬限制时仍抛出 (utilization >= 1.0 边界)', async () => {
      const repo = makeUsageRepo({ totalCost: 95 });
      const { store } = makeConfigStore({
        userId: 'user-1',
        monthlyBudget: 100,
        warningThreshold: 0.8,
        hardLimit: true,
      });
      const ctrl = new QuotaController(repo, store);

      // projected = 95 + 5 = 100 / 100 = 1.0, 源码用 >= 判断
      await expect(ctrl.checkAndEnforce('user-1', newUsage)).rejects.toBeInstanceOf(
        QuotaExceededError
      );
    });
  });

  describe('getStatus', () => {
    it('无配置时返回 null', async () => {
      const repo = makeUsageRepo({ totalCost: 50 });
      const { store } = makeConfigStore(null);
      const ctrl = new QuotaController(repo, store);

      const status = await ctrl.getStatus('user-1');

      expect(status).toBeNull();
      expect(repo.getStats).not.toHaveBeenCalled();
    });

    it('正常使用率正确计算 (currentCost / budget)', async () => {
      const repo = makeUsageRepo({ totalCost: 40 });
      const { store } = makeConfigStore({
        userId: 'user-1',
        monthlyBudget: 100,
        warningThreshold: 0.8,
        hardLimit: true,
      });
      const ctrl = new QuotaController(repo, store);

      const status = await ctrl.getStatus('user-1');

      expect(status).not.toBeNull();
      expect(status!.currentCost).toBe(40);
      expect(status!.budget).toBe(100);
      expect(status!.utilization).toBe(0.4);
      expect(status!.isWarning).toBe(false);
      expect(status!.isExceeded).toBe(false);
    });

    it('利用率 ≥ 警告阈值且 < 1.0 时 isWarning 为 true', async () => {
      const repo = makeUsageRepo({ totalCost: 85 });
      const { store } = makeConfigStore({
        userId: 'user-1',
        monthlyBudget: 100,
        warningThreshold: 0.8,
        hardLimit: true,
      });
      const ctrl = new QuotaController(repo, store);

      const status = await ctrl.getStatus('user-1');

      expect(status!.utilization).toBe(0.85);
      expect(status!.isWarning).toBe(true);
      expect(status!.isExceeded).toBe(false);
    });

    it('利用率 ≥ 1.0 时 isExceeded 为 true 且 utilization 被 clamp 到 1.0', async () => {
      const repo = makeUsageRepo({ totalCost: 150 });
      const { store } = makeConfigStore({
        userId: 'user-1',
        monthlyBudget: 100,
        warningThreshold: 0.8,
        hardLimit: true,
      });
      const ctrl = new QuotaController(repo, store);

      const status = await ctrl.getStatus('user-1');

      expect(status!.utilization).toBe(1.0); // 被 Math.min 钳制
      expect(status!.isExceeded).toBe(true);
      expect(status!.isWarning).toBe(false); // 警告区间是 < 1.0
    });

    it('零成本时 utilization=0, isWarning / isExceeded 均为 false', async () => {
      const repo = makeUsageRepo({ totalCost: 0 });
      const { store } = makeConfigStore({
        userId: 'user-1',
        monthlyBudget: 100,
        warningThreshold: 0.8,
        hardLimit: true,
      });
      const ctrl = new QuotaController(repo, store);

      const status = await ctrl.getStatus('user-1');

      expect(status!.utilization).toBe(0);
      expect(status!.isWarning).toBe(false);
      expect(status!.isExceeded).toBe(false);
    });
  });

  describe('updateConfig', () => {
    it('合法配置调用 saveConfig 并完整传递字段', async () => {
      const repo = makeUsageRepo();
      const { store, saveConfig } = makeConfigStore(null);
      const ctrl = new QuotaController(repo, store);

      const cfg: QuotaConfig = {
        userId: 'user-1',
        monthlyBudget: 200,
        warningThreshold: 0.75,
        hardLimit: false,
      };

      await ctrl.updateConfig(cfg);

      expect(saveConfig).toHaveBeenCalledTimes(1);
      expect(saveConfig).toHaveBeenCalledWith(cfg);
    });

    it('monthlyBudget <= 0 时抛出 (不调用 saveConfig)', async () => {
      const repo = makeUsageRepo();
      const { store, saveConfig } = makeConfigStore(null);
      const ctrl = new QuotaController(repo, store);

      await expect(
        ctrl.updateConfig({
          userId: 'user-1',
          monthlyBudget: 0,
          warningThreshold: 0.8,
          hardLimit: true,
        })
      ).rejects.toThrow(/月度预算必须大于 0/);

      expect(saveConfig).not.toHaveBeenCalled();
    });

    it('warningThreshold < 0 或 > 1 时抛出 (不调用 saveConfig)', async () => {
      const repo = makeUsageRepo();
      const { store, saveConfig } = makeConfigStore(null);
      const ctrl = new QuotaController(repo, store);

      await expect(
        ctrl.updateConfig({
          userId: 'user-1',
          monthlyBudget: 100,
          warningThreshold: -0.1,
          hardLimit: true,
        })
      ).rejects.toThrow(/警告阈值必须在 0-1 之间/);

      await expect(
        ctrl.updateConfig({
          userId: 'user-1',
          monthlyBudget: 100,
          warningThreshold: 1.5,
          hardLimit: true,
        })
      ).rejects.toThrow(/警告阈值必须在 0-1 之间/);

      expect(saveConfig).not.toHaveBeenCalled();
    });

    it('saveConfig 抛错时 updateConfig 直接 reject', async () => {
      const repo = makeUsageRepo();
      const saveConfig = vi.fn().mockRejectedValue(new Error('store offline'));
      const store: IQuotaConfigStore = {
        getConfig: vi.fn(),
        saveConfig,
      };
      const ctrl = new QuotaController(repo, store);

      await expect(
        ctrl.updateConfig({
          userId: 'user-1',
          monthlyBudget: 100,
          warningThreshold: 0.8,
          hardLimit: true,
        })
      ).rejects.toThrow('store offline');
    });
  });

  describe('构造函数', () => {
    it('源码不做 null 校验, null 依赖透传后调用时才报错 (匹配实际契约)', async () => {
      // 文档化当前契约: 构造器不校验, 后续调用才崩.
      // 这是当前行为, 后续如需 fail-fast 应改源码, 不应改测试.
      const ctrl = new QuotaController(
        null as unknown as IUsageRepository,
        null as unknown as IQuotaConfigStore
      );

      await expect(
        ctrl.checkAndEnforce('user-1', newUsage)
      ).rejects.toBeDefined();
    });
  });
});