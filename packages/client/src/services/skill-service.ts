/**
 * Skill Service - 技能系统服务
 *
 * 通过 Gateway RPC 管理技能
 */

import { getServiceContainer } from './service-container';

export interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;
  icon: string;
  category: string;
  tags: string[];
  content: string;
  configSchema?: Record<string, any>;
  config?: Record<string, any>;
  status: 'personal' | 'team_pending' | 'team' | 'marketplace_pending' | 'marketplace';
  teamId?: string;
  authorId: string;
  marketplaceId?: string;
  ratings: number;
  installs: number;
  createdAt: string;
  updatedAt: string;
}

export class SkillService {
  private getClient() {
    return getServiceContainer().gatewayClient;
  }

  /**
   * 获取所有技能
   */
  async getAllSkills(teamId: string): Promise<Skill[]> {
    try {
      const result = await this.getClient().send('skills.list', { teamId });
      if (result && Array.isArray(result)) {
        return result;
      }
      return [];
    } catch (error) {
      console.error('Failed to get skills:', error);
      return [];
    }
  }

  /**
   * 获取单个技能
   */
  async getSkill(id: string): Promise<Skill | null> {
    try {
      const result = await this.getClient().send('skills.get', { id });
      return result || null;
    } catch (error) {
      console.error('Failed to get skill:', error);
      return null;
    }
  }

  /**
   * 创建技能
   */
  async createSkill(teamId: string, authorId: string, data: Partial<Skill>): Promise<Skill> {
    return await this.getClient().send('skills.create', {
      teamId,
      authorId,
      name: data.name,
      description: data.description,
      content: data.content,
      icon: data.icon,
      category: data.category,
      tags: data.tags,
    });
  }

  /**
   * 更新技能
   */
  async updateSkill(id: string, data: Partial<Skill>): Promise<Skill> {
    return await this.getClient().send('skills.update', { id, ...data });
  }

  /**
   * 删除技能
   */
  async deleteSkill(id: string): Promise<void> {
    await this.getClient().send('skills.delete', { id });
  }

  /**
   * 获取市场技能 (从 marketplace_items 表)
   */
  async getMarketplaceSkills(): Promise<Skill[]> {
    try {
      const result = await this.getClient().send('marketplace_skills.list', {});
      if (result && Array.isArray(result)) {
        return result;
      }
      return [];
    } catch (error) {
      console.error('Failed to get marketplace skills:', error);
      return [];
    }
  }
}
