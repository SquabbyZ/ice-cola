import { authService } from './auth-service';

const API_BASE = '/api/skills';

function getAuthHeader(): Record<string, string> {
  const token = authService.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface ConversationSkillRow {
  id: string;
  name: string;
  description?: string | null;
  version: string;
  icon?: string | null;
  category?: string | null;
  tags?: string[] | null;
  content: string;
  status: string;
}

export const conversationSkillService = {
  async getConversationSkills(conversationId: string): Promise<ConversationSkillRow[]> {
    const response = await fetch(`${API_BASE}/conversation/${conversationId}`, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    });
    if (!response.ok) throw new Error('Failed to load conversation skills');
    const result = await response.json();
    return result.data || [];
  },

  async setConversationSkills(conversationId: string, skillIds: string[]): Promise<string[]> {
    const response = await fetch(`${API_BASE}/conversation/${conversationId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ skillIds }),
    });
    if (!response.ok) throw new Error('Failed to set conversation skills');
    const result = await response.json();
    return result.data || [];
  },

  async clearConversationSkills(conversationId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/conversation/${conversationId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    });
    if (!response.ok) throw new Error('Failed to clear conversation skills');
  },
};
