/**
 * Extension Store - 扩展商店状态管理
 *
 * 管理扩展插件的浏览、安装、卸载等功能
 */

import { create } from 'zustand';
import { ExtensionService } from '@/services/extension-service';

const extensionService = new ExtensionService();

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

export const useExtensionStore = create<ExtensionState>((set, get) => ({
  extensions: [],
  installedExtensions: [],
  searchQuery: '',
  selectedCategory: 'all',
  isLoading: false,
  error: null,
  
  loadExtensions: async () => {
    set({ isLoading: true, error: null });
    try {
      const extensions = await extensionService.getAllExtensions();
      set({ extensions, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load extensions',
        isLoading: false,
      });
    }
  },

  loadInstalledExtensions: async () => {
    try {
      const extensions = await extensionService.getInstalledExtensions();
      set({ installedExtensions: extensions });
    } catch (err) {
      console.error('Failed to load installed extensions:', err);
    }
  },

  installExtension: async (id) => {
    try {
      await extensionService.installExtension(id);
      set((state) => ({
        extensions: state.extensions.map((ext) =>
          ext.id === id ? { ...ext, installed: true, enabled: true } : ext
        ),
      }));
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
      await extensionService.uninstallExtension(id);
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
      await extensionService.enableExtension(id);
      set((state) => {
        const updatedExtensions = state.extensions.map((ext) =>
          ext.id === id ? { ...ext, enabled: true } : ext
        );
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
      await extensionService.disableExtension(id);
      set((state) => {
        const updatedExtensions = state.extensions.map((ext) =>
          ext.id === id ? { ...ext, enabled: false } : ext
        );
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
      if (selectedCategory !== 'all' && ext.category !== selectedCategory) {
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
    selectedCategory: 'all',
    isLoading: false,
    error: null,
  }),
}));
