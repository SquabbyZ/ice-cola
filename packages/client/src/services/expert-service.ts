/**
 * Expert Service - 专家系统服务
 * 
 * 通过 Gateway RPC 管理专家角色
 */

import { GatewayRpcService } from '../services/gateway-rpc';

export interface ExpertPrompt {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  icon?: string;
  color?: string;
  isDefault: boolean;
}

export class ExpertService {
  private rpc: GatewayRpcService;

  constructor(rpc: GatewayRpcService) {
    this.rpc = rpc;
  }

  /**
   * 获取所有专家
   */
  async getAllExperts(): Promise<ExpertPrompt[]> {
    try {
      const result = await this.rpc.send('experts.list');
      if (result && result.experts) {
        return result.experts.map((e: any) => ({
          id: e.id,
          name: e.name,
          description: e.description || '',
          systemPrompt: '',
          icon: e.icon,
          color: e.color,
          isDefault: false,
        }));
      }
      return [];
    } catch (error) {
      console.error('Failed to get experts:', error);
      return [];
    }
  }

  /**
   * 创建专家
   */
  async createExpert(expert: Omit<ExpertPrompt, 'id'>): Promise<ExpertPrompt> {
    const newExpert = await this.rpc.send('experts.create', expert);
    return newExpert;
  }

  /**
   * 更新专家
   */
  async updateExpert(id: string, updates: Partial<ExpertPrompt>): Promise<void> {
    await this.rpc.send('experts.update', { id, ...updates });
  }

  /**
   * 删除专家
   */
  async deleteExpert(id: string): Promise<void> {
    await this.rpc.send('experts.delete', { id });
  }
}
