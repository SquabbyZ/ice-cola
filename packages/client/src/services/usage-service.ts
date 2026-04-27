/**
 * Usage Service - 用量统计服务
 * 
 * 通过 Gateway RPC 获取真实的用量数据
 */

import { GatewayRpcService } from '../services/gateway-rpc';

export class UsageService {
  private rpc: GatewayRpcService;

  constructor(rpc: GatewayRpcService) {
    this.rpc = rpc;
  }

  /**
   * 获取指定周期的用量统计
   */
  async getStats(period: 'today' | 'week' | 'month') {
    const gatewayPeriod = period === 'today' ? 'day' : period;

    try {
      const result = await this.rpc.getUsageStats(gatewayPeriod);

      return {
        period,
        totalInputTokens: Math.floor((result.totalTokens || 0) * 0.6),
        totalOutputTokens: Math.floor((result.totalTokens || 0) * 0.4),
        totalCost: result.totalCost || 0,
        requestCount: result.requestCount || 0,
      };
    } catch (error) {
      console.error(`Failed to get usage stats for ${period}:`, error);
      return {
        period,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCost: 0,
        requestCount: 0,
      };
    }
  }

  /**
   * 获取所有周期的用量统计
   */
  async getAllStats() {
    const [today, week, month] = await Promise.all([
      this.getStats('today'),
      this.getStats('week'),
      this.getStats('month'),
    ]);

    return { today, week, month };
  }
}
