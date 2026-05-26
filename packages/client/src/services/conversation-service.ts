import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface Conversation {
  id: string;
  title: string | null;
  platform: string;
  sessionId: string | null;
  messageCount: number;
  lastMessageAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  usage?: Record<string, any>;
  createdAt: Date;
}

export interface ConversationListResponse {
  conversations: Conversation[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ConversationDetailResponse {
  id: string;
  title: string | null;
  platform: string;
  sessionId: string | null;
  teamId: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

class ConversationService {
  private getAuthHeaders() {
    const token = localStorage.getItem('accessToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * 获取对话列表
   */
  async getList(teamId: string, page = 1, pageSize = 20): Promise<ConversationListResponse> {
    const response = await axios.get(`${API_BASE}/teams/${teamId}/conversations`, {
      params: { page, pageSize },
      headers: this.getAuthHeaders(),
    });
    return response.data.data;
  }

  /**
   * 获取对话详情（包含消息）
   */
  async getById(teamId: string, conversationId: string): Promise<ConversationDetailResponse> {
    const response = await axios.get(
      `${API_BASE}/teams/${teamId}/conversations/${conversationId}`,
      {
        headers: this.getAuthHeaders(),
      }
    );
    return response.data.data;
  }

  /**
   * 创建新对话
   */
  async create(teamId: string, title: string, id?: string): Promise<Conversation> {
    const response = await axios.post(
      `${API_BASE}/teams/${teamId}/conversations`,
      { title, id },
      {
        headers: this.getAuthHeaders(),
      }
    );
    return response.data.data;
  }

  /**
   * 更新对话标题
   */
  async updateTitle(teamId: string, conversationId: string, title: string): Promise<void> {
    await axios.put(
      `${API_BASE}/teams/${teamId}/conversations/${conversationId}`,
      { title },
      {
        headers: this.getAuthHeaders(),
      }
    );
  }

  /**
   * 删除对话
   */
  async delete(teamId: string, conversationId: string): Promise<void> {
    await axios.delete(
      `${API_BASE}/teams/${teamId}/conversations/${conversationId}`,
      {
        headers: this.getAuthHeaders(),
      }
    );
  }

  /**
   * 添加消息到对话
   */
  async addMessage(
    teamId: string,
    conversationId: string,
    data: {
      role: 'user' | 'assistant' | 'system';
      content: string;
      model?: string;
      usage?: Record<string, any>;
    }
  ): Promise<Message> {
    const response = await axios.post(
      `${API_BASE}/teams/${teamId}/conversations/${conversationId}/messages`,
      data,
      {
        headers: this.getAuthHeaders(),
      }
    );
    return response.data.data;
  }

  /**
   * 更新消息内容
   */
  async updateMessage(
    teamId: string,
    conversationId: string,
    messageId: string,
    data: { content: string }
  ): Promise<void> {
    await axios.put(
      `${API_BASE}/teams/${teamId}/conversations/${conversationId}/messages/${messageId}`,
      data,
      {
        headers: this.getAuthHeaders(),
      }
    );
  }

  /**
   * 删除消息
   */
  async deleteMessage(
    teamId: string,
    conversationId: string,
    messageId: string
  ): Promise<void> {
    await axios.delete(
      `${API_BASE}/teams/${teamId}/conversations/${conversationId}/messages/${messageId}`,
      {
        headers: this.getAuthHeaders(),
      }
    );
  }
}

export const conversationService = new ConversationService();
