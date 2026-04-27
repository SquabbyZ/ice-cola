/**
 * Quota Service - 配额管理服务
 * 
 * 通过 Gateway RPC 获取和更新配额配置
 */

import { GatewayRpcService } from '../services/gateway-rpc';

export interface QuotaConfig {
  monthlyBudget: number;
  warningThreshold: number;
  hardLimit: boolean;
}

export class QuotaService {
  private rpc: GatewayRpcService;

  constructor(rpc: GatewayRpcService) {
    this.rpc = rpc;
  }

  /**
   * 获取配额配置
   */
  async getConfig(): Promise<QuotaConfig> {
    try {
      const config = await this.rpc.send('quota.getConfig');
      return {
        monthlyBudget: config.monthlyBudget || 50,
        warningThreshold: config.warningThreshold || 0.8,
        hardLimit: config.hardLimit ?? true,
      };
    } catch (error) {
      console.error('Failed to get quota config:', error);
      // 返回默认配置
      return {
        monthlyBudget: 50,
        warningThreshold: 0.8,
        hardLimit: true,
      };
    }
  }

  /**
   * 更新配额配置
   */
  async updateConfig(updates: Partial<QuotaConfig>, teamId?: string): Promise<void> {
    try {
      await this.rpc.send('quota.updateConfig', { ...updates, teamId });
    } catch (error) {
      console.error('Failed to update quota config:', error);
      throw error;
    }
  }

  /**
   * 获取配额状态
   */
  async getStatus(): Promise<{
    currentCost: number;
    budget: number;
    utilization: number;
    isExceeded: boolean;
    isWarning: boolean;
  }> {
    try {
      const result = await this.rpc.send('quota.get', {});
      if (result && result.quota) {
        const totalAmt = Number(result.quota.totalAmt || 0);
        const usedAmt = Number(result.quota.usedAmt || 0);
        return {
          currentCost: usedAmt,
          budget: totalAmt,
          utilization: totalAmt > 0 ? usedAmt / totalAmt : 0,
          isExceeded: usedAmt >= totalAmt,
          isWarning: totalAmt > 0 && usedAmt / totalAmt >= 0.8,
        };
      }
      return {
        currentCost: 0,
        budget: 200,
        utilization: 0,
        isExceeded: false,
        isWarning: false,
      };
    } catch (error) {
      console.error('Failed to get quota status:', error);
      return {
        currentCost: 0,
        budget: 200,
        utilization: 0,
        isExceeded: false,
        isWarning: false,
      };
    }
  }
}
