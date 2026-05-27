/**
 * Skill Service - 技能系统服务
 *
 * 通过 Gateway RPC 管理技能
 */

import { getServiceContainer } from './service-container';

const API_BASE = import.meta.env.VITE_API_URL || '';

export type TeamSkillAccessPolicy =
  | { mode: 'all' }
  | { mode: 'users'; userIds: string[] }
  | { mode: 'role'; minimumRole: 'MEMBER' | 'ADMIN' | 'OWNER' };

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

export interface SkillVersion {
  id: string;
  skillId: string;
  version: string;
  content: string;
  configSchema?: Record<string, any>;
  createdAt: string;
  createdBy: string;
  createdByName?: string;
}

export class SkillService {
  private getClient() {
    return getServiceContainer().gatewayClient;
  }

  /**
   * 获取所有技能
   */
  async getAllSkills(teamId: string): Promise<Skill[]> {
    const result = await this.getClient().send('skills.list', { teamId });
    if (Array.isArray(result)) {
      return result;
    }
    return [];
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
      configSchema: data.configSchema,
      config: data.config,
    });
  }

  /**
   * 更新技能
   */
  async updateSkill(id: string, data: Partial<Skill>): Promise<Skill> {
    const { name, description, icon, category, tags, content, version, configSchema, config } = data;
    return await this.getClient().send('skills.update', {
      id, name, description, icon, category, tags, content, version, configSchema, config,
    });
  }

  async requestPublishToTeam(id: string, accessPolicy: TeamSkillAccessPolicy = { mode: 'all' }): Promise<Skill> {
    return await this.getClient().send('skills.publishTeam', { id, accessPolicy });
  }

  async approveTeamPublish(id: string): Promise<Skill> {
    return await this.getClient().send('skills.approveTeam', { id });
  }

  async rejectTeamPublish(id: string, comment: string): Promise<Skill> {
    return await this.getClient().send('skills.rejectTeam', { id, comment });
  }

  async requestPublishToMarketplace(id: string, note?: string): Promise<{ skill: Skill; marketplaceItem: unknown; submission: unknown }> {
    return await this.getClient().send('skills.publishMarketplace', { id, note });
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
    const result = await this.getClient().send('marketplace_skills.list', {});
    if (Array.isArray(result)) {
      return result;
    }
    return [];
  }

  /**
   * 从统一管理后台市场 API 获取技能数据
   */
  async getMarketplaceSkillsFromApi(): Promise<unknown[]> {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_BASE}/marketplace/items?type=skill`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const json = await res.json();
      return json.data?.items || json.data || [];
    } catch (err) {
      console.error('[SkillService] Failed to fetch marketplace skills from API:', err);
      return [];
    }
  }

  /**
   * 获取技能版本历史
   */
  async getVersions(skillId: string): Promise<SkillVersion[]> {
    try {
      const result = await this.getClient().send('skills.getVersions', { skillId });
      if (result && Array.isArray(result)) {
        return result;
      }
      return [];
    } catch (error) {
      console.error('Failed to get skill versions:', error);
      return [];
    }
  }

  /**
   * 回退到指定版本
   */
  async revertToVersion(skillId: string, versionId: string): Promise<Skill> {
    return await this.getClient().send('skills.revertToVersion', { skillId, versionId });
  }
}
