/**
 * 配额管理状态
 *
 * 管理用户的月度预算、预警阈值和硬限制配置
 */

import { create } from 'zustand';
import { GatewayRpcService } from '@/services/gateway-rpc';
import { QuotaService } from '@/services/quota-service';
import { gatewayClient } from '@/lib/gateway-client';

export interface QuotaConfig {
  monthlyBudget: number; // USD
  warningThreshold: number; // 0.8 = 80%
  hardLimit: boolean;
}

export interface QuotaStatus {
  currentCost: number;
  budget: number;
  utilization: number; // 0-1
  isExceeded: boolean;
  isWarning: boolean;
}

export interface QuotaState {
  config: QuotaConfig | null;
  status: QuotaStatus | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadConfig: () => Promise<void>;
  updateConfig: (config: Partial<QuotaConfig>) => Promise<void>;
  refreshStatus: () => Promise<void>;
  setError: (error: string | null) => void;
  reset: () => void;
}

const gatewayRpc = new GatewayRpcService(gatewayClient);
const quotaService = new QuotaService(gatewayRpc);

export const useQuotaStore = create<QuotaState>((set, get) => ({
  config: null,
  status: null,
  isLoading: false,
  error: null,

  loadConfig: async () => {
    set({ isLoading: true, error: null });
    try {
      const config = await quotaService.getConfig();
      set({ config, isLoading: false });
    } catch (err) {
      // Gateway 不可用时使用默认配置
      set({
        config: {
          monthlyBudget: 50,
          warningThreshold: 0.8,
          hardLimit: true,
        },
        error: null,
        isLoading: false,
      });
    }
  },

  updateConfig: async (updates) => {
    set({ isLoading: true, error: null });
    try {
      // 调用真实的服务
      await quotaService.updateConfig(updates);

      set((state) => ({
        config: state.config ? { ...state.config, ...updates } : null,
        isLoading: false,
      }));

      // 更新配置后刷新状态
      await get().refreshStatus();
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to update quota config',
        isLoading: false,
      });
    }
  },

  refreshStatus: async () => {
    const { config } = get();
    if (!config) {
      return;
    }

    try {
      const status = await quotaService.getStatus();
      set({ status });
    } catch (err) {
      // Gateway 不可用时使用默认状态
      set({
        status: {
          currentCost: 0,
          budget: config.monthlyBudget,
          utilization: 0,
          isExceeded: false,
          isWarning: false,
        },
      });
    }
  },

  setError: (error) => set({ error }),

  reset: () => set({
    config: null,
    status: null,
    isLoading: false,
    error: null,
  }),
}));
