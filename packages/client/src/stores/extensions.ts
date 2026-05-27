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
  description?: string;
  version?: string;
  author?: string;
  category?: string;
  icon?: string;
  color?: string;
  homepage?: string;
  repository?: string;
  downloads?: number;
  enabled?: boolean;
  user_enabled?: boolean;
  config?: Record<string, unknown>;
  installedAt?: string;
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
      await get().loadInstalledExtensions();
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to uninstall extension',
      });
      throw err;
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  setSelectedCategory: (category) => set({ selectedCategory: category }),

  getFilteredExtensions: () => {
    const { extensions, searchQuery, selectedCategory } = get();

    return extensions.filter((ext) => {
      if (selectedCategory !== 'all' && ext.category !== selectedCategory) {
        return false;
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          ext.name.toLowerCase().includes(query) ||
          (ext.description && ext.description.toLowerCase().includes(query))
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
