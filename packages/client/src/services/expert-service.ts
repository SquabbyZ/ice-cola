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
  category?: string;
  sourceId?: string | null;
  marketplaceId?: string | null;
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
        return result.experts.map((e: any) => this.toExpertPrompt(e));
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
  async createExpert(expert: Omit<ExpertPrompt, 'id' | 'sourceId' | 'marketplaceId'>): Promise<ExpertPrompt> {
    const result = await this.rpc.send('experts.create', expert);
    const payload = result?.expert ?? result;
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid expert response');
    }
    return this.toExpertPrompt(payload);
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

  private toExpertPrompt(expert: any): ExpertPrompt {
    return {
      id: expert.id,
      name: expert.name,
      description: expert.description || '',
      systemPrompt: expert.systemPrompt || '',
      icon: expert.icon,
      color: expert.color,
      category: expert.category || undefined,
      sourceId: expert.sourceId || null,
      marketplaceId: expert.marketplaceId || null,
      isDefault: expert.isDefault || false,
    };
  }
}
