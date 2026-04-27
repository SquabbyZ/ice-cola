/**
 * 用量统计状态管理
 *
 * 跟踪今日、本周、本月的 Token 使用量、成本和请求数
 */

import { create } from 'zustand';
import { GatewayRpcService } from '@/services/gateway-rpc';
import { UsageService } from '@/services/usage-service';
import { gatewayClient } from '@/lib/gateway-client';

export interface UsageStats {
  period: 'today' | 'week' | 'month';
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  requestCount: number;
}

export interface UsageState {
  stats: Record<'today' | 'week' | 'month', UsageStats>;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchStats: (period: 'today' | 'week' | 'month') => Promise<void>;
  refreshAllStats: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const gatewayRpc = new GatewayRpcService(gatewayClient);
const usageService = new UsageService(gatewayRpc);

export const useUsageStore = create<UsageState>((set, get) => ({
  stats: {
    today: { period: 'today', totalInputTokens: 0, totalOutputTokens: 0, totalCost: 0, requestCount: 0 },
    week: { period: 'week', totalInputTokens: 0, totalOutputTokens: 0, totalCost: 0, requestCount: 0 },
    month: { period: 'month', totalInputTokens: 0, totalOutputTokens: 0, totalCost: 0, requestCount: 0 },
  },
  isLoading: false,
  error: null,
  
  fetchStats: async (period) => {
    set({ isLoading: true, error: null });
    try {
      const stats = await usageService.getStats(period);
      set((state) => ({
        stats: { ...state.stats, [period]: stats },
        isLoading: false,
      }));
    } catch (err) {
      // Gateway 不可用时显示零数据
      set((state) => ({
        stats: {
          ...state.stats,
          [period]: {
            period,
            totalInputTokens: 0,
            totalOutputTokens: 0,
            totalCost: 0,
            requestCount: 0,
          },
        },
        isLoading: false,
      }));
    }
  },
  
  refreshAllStats: async () => {
    await Promise.all([
      get().fetchStats('today'),
      get().fetchStats('week'),
      get().fetchStats('month'),
    ]);
  },
  
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  
  reset: () => set({
    stats: {
      today: { period: 'today', totalInputTokens: 0, totalOutputTokens: 0, totalCost: 0, requestCount: 0 },
      week: { period: 'week', totalInputTokens: 0, totalOutputTokens: 0, totalCost: 0, requestCount: 0 },
      month: { period: 'month', totalInputTokens: 0, totalOutputTokens: 0, totalCost: 0, requestCount: 0 },
    },
    isLoading: false,
    error: null,
  }),
}));
