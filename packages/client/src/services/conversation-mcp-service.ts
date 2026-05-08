/**
 * Conversation MCP Service
 *
 * Handles saving/loading MCP server selections per conversation
 */

import { authService } from './auth-service';

const API_BASE = '/api/mcp';

function getAuthHeader(): Record<string, string> {
  const token = authService.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface ConversationMCPServer {
  id: string;
  server_id: string;
  server_name: string;
  server_type: string;
  config?: Record<string, string>;
  name: string;
  description: string;
  category: string;
  icon: string;
}

export interface MCPConfigResponse {
  servers: ConversationMCPServer[];
  mcpServers: Array<{
    name: string;
    type: string;
    config: Record<string, string>;
  }>;
}

export const conversationMCPService = {
  async getConversationMCPServers(conversationId: string): Promise<ConversationMCPServer[]> {
    const response = await fetch(
      `${API_BASE}/conversation/${conversationId}/servers`,
      {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
      }
    );
    if (!response.ok) throw new Error('Failed to load conversation MCP servers');
    const result = await response.json();
    return result.data || [];
  },

  async getConversationMCPConfig(conversationId: string): Promise<MCPConfigResponse> {
    const response = await fetch(
      `${API_BASE}/conversation/${conversationId}/mcp-config`,
      {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
      }
    );
    if (!response.ok) throw new Error('Failed to load MCP config');
    const result = await response.json();
    return result.data || { servers: [], mcpServers: [] };
  },

  async setConversationMCPServers(
    conversationId: string,
    serverIds: string[]
  ): Promise<ConversationMCPServer[]> {
    const response = await fetch(
      `${API_BASE}/conversation/${conversationId}/servers`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ serverIds }),
      }
    );
    if (!response.ok) throw new Error('Failed to set conversation MCP servers');
    const result = await response.json();
    return result.data || [];
  },

  async addConversationMCPServer(
    conversationId: string,
    serverId: string,
    serverName: string,
    serverType: string = 'stdio',
    config?: Record<string, string>
  ): Promise<void> {
    const response = await fetch(
      `${API_BASE}/conversation/${conversationId}/servers/${serverId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ serverName, serverType, config }),
      }
    );
    if (!response.ok) throw new Error('Failed to add MCP server to conversation');
  },

  async removeConversationMCPServer(
    conversationId: string,
    serverId: string
  ): Promise<void> {
    const response = await fetch(
      `${API_BASE}/conversation/${conversationId}/servers/${serverId}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
      }
    );
    if (!response.ok) throw new Error('Failed to remove MCP server from conversation');
  },

  async clearConversationMCPServers(conversationId: string): Promise<void> {
    const response = await fetch(
      `${API_BASE}/conversation/${conversationId}/servers`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
      }
    );
    if (!response.ok) throw new Error('Failed to clear conversation MCP servers');
  },
};
