/**
 * Expert Service - 专家系统服务
 *
 * 通过 REST API 管理专家（admin 市场维护）
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

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
  async getAllExperts(teamId?: string): Promise<ExpertPrompt[]> {
    const params = new URLSearchParams();
    if (teamId) params.set('teamId', teamId);
    const res = await fetch(`${API_BASE}/experts?${params}`, {
      headers: getAuthHeaders(),
    });
    const json = await res.json();
    return (json.data || []).map((e: any) => this.toExpertPrompt(e));
  }

  async getCategories(): Promise<string[]> {
    const res = await fetch(`${API_BASE}/experts/categories`, {
      headers: getAuthHeaders(),
    });
    const json = await res.json();
    return json.data || [];
  }

  async createExpert(expert: Omit<ExpertPrompt, 'id' | 'sourceId' | 'marketplaceId'>): Promise<ExpertPrompt> {
    const res = await fetch(`${API_BASE}/experts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(expert),
    });
    const json = await res.json();
    return this.toExpertPrompt(json.data);
  }

  async updateExpert(id: string, updates: Partial<ExpertPrompt>): Promise<void> {
    await fetch(`${API_BASE}/experts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(updates),
    });
  }

  async deleteExpert(id: string): Promise<void> {
    await fetch(`${API_BASE}/experts/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
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
