import { authService } from './auth-service';

const API_BASE = '/api/conversation-capabilities';

function getAuthHeader(): Record<string, string> {
  const token = authService.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseDataResponse<T>(response: Response, errorMessage: string): Promise<T> {
  if (!response.ok) {
    throw new Error(errorMessage);
  }
  const result = await response.json();
  return result.data;
}

export const conversationCapabilitiesService = {
  async getConversationExpert(conversationId: string): Promise<string | null> {
    const response = await fetch(`${API_BASE}/${conversationId}/expert`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    return parseDataResponse<string | null>(response, 'Failed to load conversation expert');
  },

  async setConversationExpert(conversationId: string, expertId: string | null): Promise<string | null> {
    const response = await fetch(`${API_BASE}/${conversationId}/expert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ expertId }),
    });
    return parseDataResponse<string | null>(response, 'Failed to set conversation expert');
  },

  async getConversationExtensions(conversationId: string): Promise<string[]> {
    const response = await fetch(`${API_BASE}/${conversationId}/extensions`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    return parseDataResponse<string[]>(response, 'Failed to load conversation extensions');
  },

  async setConversationExtensions(conversationId: string, extensionIds: string[]): Promise<string[]> {
    const response = await fetch(`${API_BASE}/${conversationId}/extensions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ extensionIds }),
    });
    return parseDataResponse<string[]>(response, 'Failed to set conversation extensions');
  },
};
