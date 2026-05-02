/**
 * MCP Store - MCP 服务器市场状态管理
 *
 * 管理 MCP 服务器的浏览、连接、断开等功能
 */

import { create } from 'zustand';
import { authService } from '@/services/auth-service';

export interface MCPServer {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  category: 'data' | 'tool' | 'communication' | 'development' | 'productivity';
  icon: string;
  color?: string;
  rating: number;
  installs: number;
  connected: boolean;
  enabled: boolean;
  tags: string[];
  homepage?: string;
  repository?: string;
  updatedAt: string;
  configSchema?: Record<string, {
    type: string;
    description: string;
    required?: boolean;
    default?: string;
  }>;
  instructions?: string;
}

export interface MCPConnection {
  id: string;
  serverId: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  error?: string;
  connectedAt?: string;
}

export interface MCPState {
  servers: MCPServer[];
  connectedServers: MCPServer[];
  searchQuery: string;
  selectedCategory: string;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadServers: () => Promise<void>;
  loadConnectedServers: () => Promise<void>;
  connectServer: (id: string, config?: Record<string, string>) => Promise<void>;
  disconnectServer: (id: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;
  getFilteredServers: () => MCPServer[];
  setError: (error: string | null) => void;
  reset: () => void;
}

const CATEGORIES = [
  { value: 'all', label: '全部' },
  { value: 'data', label: '数据源' },
  { value: 'tool', label: '工具' },
  { value: 'communication', label: '通讯' },
  { value: 'development', label: '开发' },
  { value: 'productivity', label: '生产力' },
];

// Helper to get auth header
function getAuthHeader(): Record<string, string> {
  const token = authService.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Helper to transform API response to MCPServer format
function transformServer(server: any): MCPServer {
  return {
    id: server.id,
    name: server.name,
    description: server.description || '',
    version: server.version,
    author: server.author || 'Unknown',
    category: server.category,
    icon: server.icon || '🌐',
    color: server.color,
    rating: parseFloat(server.ratings) || 0,
    installs: server.installs || 0,
    connected: false,
    enabled: server.enabled ?? true,
    tags: server.tags || [],
    homepage: server.homepage,
    repository: server.repository,
    updatedAt: server.updated_at || server.created_at || new Date().toISOString(),
    configSchema: server.config_schema ? JSON.parse(server.config_schema) : server.configSchema,
    instructions: server.instructions,
  };
}

export const useMCPStore = create<MCPState>((set, get) => ({
  servers: [],
  connectedServers: [],
  searchQuery: '',
  selectedCategory: 'all',
  isLoading: false,
  error: null,

  loadServers: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/mcp/servers', {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load MCP servers');
      }

      const result = await response.json();
      const servers = (result.data || []).map(transformServer);

      set({ servers, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load MCP servers',
        isLoading: false,
      });
    }
  },

  loadConnectedServers: async () => {
    try {
      const response = await fetch('/api/mcp/connections/connected', {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load connected servers');
      }

      const result = await response.json();
      const connectedServers = (result.data || []).map(transformServer);

      // Update servers with connected status
      set((state) => {
        const connectedIds = new Set(connectedServers.map((s: MCPServer) => s.id));
        const updatedServers = state.servers.map((server) => ({
          ...server,
          connected: connectedIds.has(server.id),
          enabled: connectedIds.has(server.id) ? true : server.enabled,
        }));
        return {
          connectedServers,
          servers: updatedServers,
        };
      });
    } catch (err) {
      console.error('Failed to load connected servers:', err);
    }
  },

  connectServer: async (id, config) => {
    try {
      const response = await fetch('/api/mcp/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ serverId: id, config }),
      });

      if (!response.ok) {
        throw new Error('Failed to connect server');
      }

      // Update local state
      set((state) => ({
        servers: state.servers.map((server) =>
          server.id === id ? { ...server, connected: true, enabled: true } : server
        ),
      }));

      // Reload connected servers list
      await get().loadConnectedServers();
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to connect server',
      });
      throw err;
    }
  },

  disconnectServer: async (id) => {
    try {
      const response = await fetch('/api/mcp/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ serverId: id }),
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect server');
      }

      // Update local state
      set((state) => ({
        servers: state.servers.map((server) =>
          server.id === id ? { ...server, connected: false, enabled: false } : server
        ),
      }));

      await get().loadConnectedServers();
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to disconnect server',
      });
      throw err;
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  setSelectedCategory: (category) => set({ selectedCategory: category }),

  getFilteredServers: () => {
    const { servers, searchQuery, selectedCategory } = get();

    return servers.filter((server) => {
      // Category filter
      if (selectedCategory !== 'all' && server.category !== selectedCategory) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          server.name.toLowerCase().includes(query) ||
          server.description.toLowerCase().includes(query) ||
          server.tags.some(tag => tag.toLowerCase().includes(query))
        );
      }

      return true;
    });
  },

  setError: (error) => set({ error }),

  reset: () => set({
    servers: [],
    connectedServers: [],
    searchQuery: '',
    selectedCategory: 'all',
    isLoading: false,
    error: null,
  }),
}));

// Export category constants for components
export { CATEGORIES };