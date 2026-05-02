/**
 * Extension Store - 扩展商店状态管理
 * 
 * 管理扩展插件的浏览、安装、卸载等功能
 */

import { create } from 'zustand';

export interface Extension {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  category: string;
  icon: string;
  color?: string;
  rating: number;
  downloads: number;
  installed: boolean;
  enabled: boolean;
  tags: string[];
  homepage?: string;
  repository?: string;
  updatedAt: string;
}

export interface ExtensionState {
  extensions: Extension[];
  installedExtensions: Extension[];
  searchQuery: string;
  selectedCategory: string;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadExtensions: () => Promise<void>;
  loadInstalledExtensions: () => Promise<void>;
  installExtension: (id: string) => Promise<void>;
  uninstallExtension: (id: string) => Promise<void>;
  enableExtension: (id: string) => Promise<void>;
  disableExtension: (id: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;
  getFilteredExtensions: () => Extension[];
  setError: (error: string | null) => void;
  reset: () => void;
}

// 模拟数据 - 实际应该从 API 获取
const MOCK_EXTENSIONS: Extension[] = [
  {
    id: 'ext-github-001',
    name: 'GitHub 集成',
    description: '无缝连接 GitHub，管理仓库、PR 和 Issues',
    version: '1.2.0',
    author: 'OpenClaw Team',
    category: '开发工具',
    icon: '🐙',
    color: '#24292F',
    rating: 4.8,
    downloads: 15234,
    installed: false,
    enabled: false,
    tags: ['github', 'git', 'repository'],
    homepage: 'https://github.com/openclaw/ext-github',
    updatedAt: '2026-04-20',
  },
  {
    id: 'ext-notion-001',
    name: 'Notion 连接器',
    description: '将 AI 助手与 Notion 工作区集成，自动同步笔记和数据库',
    version: '0.9.5',
    author: 'Community',
    category: '生产力',
    icon: '📝',
    color: '#000000',
    rating: 4.5,
    downloads: 8921,
    installed: false,
    enabled: false,
    tags: ['notion', 'notes', 'database'],
    updatedAt: '2026-04-15',
  },
  {
    id: 'ext-slack-001',
    name: 'Slack 机器人',
    description: '在 Slack 中使用 AI 助手，团队协作更智能',
    version: '2.0.1',
    author: 'OpenClaw Team',
    category: '通讯',
    icon: '💬',
    color: '#4A154B',
    rating: 4.7,
    downloads: 12456,
    installed: true,
    enabled: true,
    tags: ['slack', 'chat', 'team'],
    updatedAt: '2026-04-25',
  },
  {
    id: 'ext-vscode-001',
    name: 'VS Code 插件',
    description: '在 VS Code 中直接使用 AI 助手，代码补全和审查',
    version: '1.5.3',
    author: 'OpenClaw Team',
    category: '开发工具',
    icon: '💻',
    color: '#007ACC',
    rating: 4.9,
    downloads: 23456,
    installed: false,
    enabled: false,
    tags: ['vscode', 'ide', 'code'],
    homepage: 'https://marketplace.visualstudio.com/items?itemName=openclaw.ai',
    updatedAt: '2026-04-26',
  },
  {
    id: 'ext-calendar-001',
    name: '日历助手',
    description: '智能日程管理，自动安排会议和提醒',
    version: '0.8.2',
    author: 'Community',
    category: '生产力',
    icon: '📅',
    color: '#4285F4',
    rating: 4.3,
    downloads: 6789,
    installed: false,
    enabled: false,
    tags: ['calendar', 'schedule', 'meeting'],
    updatedAt: '2026-04-10',
  },
  {
    id: 'ext-translate-001',
    name: '实时翻译',
    description: '支持 50+ 语言的实时翻译，打破语言障碍',
    version: '1.1.0',
    author: 'Community',
    category: '工具',
    icon: '🌐',
    color: '#FF6B6B',
    rating: 4.6,
    downloads: 11234,
    installed: true,
    enabled: false,
    tags: ['translate', 'language', 'i18n'],
    updatedAt: '2026-04-18',
  },
  {
    id: 'ext-weather-001',
    name: '天气插件',
    description: '实时天气信息和预报，支持全球城市',
    version: '0.5.1',
    author: 'Community',
    category: '工具',
    icon: '⛅',
    color: '#FFA500',
    rating: 4.2,
    downloads: 5432,
    installed: false,
    enabled: false,
    tags: ['weather', 'forecast', 'climate'],
    updatedAt: '2026-04-05',
  },
  {
    id: 'ext-pdf-001',
    name: 'PDF 处理器',
    description: '智能 PDF 解析、摘要和问答',
    version: '1.3.2',
    author: 'OpenClaw Team',
    category: '文档',
    icon: '📄',
    color: '#E74C3C',
    rating: 4.7,
    downloads: 9876,
    installed: false,
    enabled: false,
    tags: ['pdf', 'document', 'reader'],
    updatedAt: '2026-04-22',
  },
];

// // const CATEGORIES = ['全部', '开发工具', '生产力', '通讯', '工具', '文档'];

export const useExtensionStore = create<ExtensionState>((set, get) => ({
  extensions: [],
  installedExtensions: [],
  searchQuery: '',
  selectedCategory: '全部',
  isLoading: false,
  error: null,
  
  loadExtensions: async () => {
    set({ isLoading: true, error: null });
    try {
      // TODO: 替换为真实 API 调用
      // const response = await extensionService.getAllExtensions();
      // set({ extensions: response.data, isLoading: false });
      
      // 模拟 API 延迟
      await new Promise(resolve => setTimeout(resolve, 500));
      set({ extensions: MOCK_EXTENSIONS, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load extensions',
        isLoading: false,
      });
    }
  },
  
  loadInstalledExtensions: async () => {
    try {
      // TODO: 替换为真实 API 调用
      const { extensions } = get();
      const installed = extensions.filter(ext => ext.installed);
      set({ installedExtensions: installed });
    } catch (err) {
      console.error('Failed to load installed extensions:', err);
    }
  },
  
  installExtension: async (id) => {
    try {
      // TODO: 替换为真实 API 调用
      // await extensionService.install(id);
      
      set((state) => ({
        extensions: state.extensions.map((ext) =>
          ext.id === id ? { ...ext, installed: true, enabled: true } : ext
        ),
      }));
      
      // 重新加载已安装列表
      await get().loadInstalledExtensions();
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to install extension',
      });
      throw err;
    }
  },
  
  uninstallExtension: async (id) => {
    try {
      // TODO: 替换为真实 API 调用
      // await extensionService.uninstall(id);
      
      set((state) => ({
        extensions: state.extensions.map((ext) =>
          ext.id === id ? { ...ext, installed: false, enabled: false } : ext
        ),
      }));
      
      await get().loadInstalledExtensions();
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to uninstall extension',
      });
      throw err;
    }
  },
  
  enableExtension: async (id) => {
    try {
      // TODO: 替换为真实 API 调用
      set((state) => {
        const updatedExtensions = state.extensions.map((ext) =>
          ext.id === id ? { ...ext, enabled: true } : ext
        );
        
        // 同时更新 installedExtensions
        const updatedInstalled = state.installedExtensions.map((ext) =>
          ext.id === id ? { ...ext, enabled: true } : ext
        );
        
        return {
          extensions: updatedExtensions,
          installedExtensions: updatedInstalled,
        };
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to enable extension',
      });
      throw err;
    }
  },
  
  disableExtension: async (id) => {
    try {
      // TODO: 替换为真实 API 调用
      set((state) => {
        const updatedExtensions = state.extensions.map((ext) =>
          ext.id === id ? { ...ext, enabled: false } : ext
        );
        
        // 同时更新 installedExtensions
        const updatedInstalled = state.installedExtensions.map((ext) =>
          ext.id === id ? { ...ext, enabled: false } : ext
        );
        
        return {
          extensions: updatedExtensions,
          installedExtensions: updatedInstalled,
        };
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to disable extension',
      });
      throw err;
    }
  },
  
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  
  getFilteredExtensions: () => {
    const { extensions, searchQuery, selectedCategory } = get();
    
    return extensions.filter((ext) => {
      // 分类过滤
      if (selectedCategory !== '全部' && ext.category !== selectedCategory) {
        return false;
      }
      
      // 搜索过滤
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          ext.name.toLowerCase().includes(query) ||
          ext.description.toLowerCase().includes(query) ||
          ext.tags.some(tag => tag.toLowerCase().includes(query))
        );
      }
      
      return true;
    });
  },
  
  setError: (error) => set({ error }),
  
  reset: () => set({
    extensions: [],
    installedExtensions: [],
    searchQuery: '',
    selectedCategory: '全部',
    isLoading: false,
    error: null,
  }),
}));
