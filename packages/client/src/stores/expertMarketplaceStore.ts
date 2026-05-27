/**
 * Expert Marketplace Store - 专家市场状态管理
 *
 * 管理专家市场的浏览、搜索、筛选等功能
 */

import { create } from 'zustand';
import { ExpertService, type ExpertPrompt as MarketplaceExpertPrompt } from '@/services/expert-service';
import { useExpertStore } from './experts';

const API_BASE = import.meta.env.VITE_API_URL || '';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const expertService = new ExpertService();

export interface Expert {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  icon?: string;
  color?: string;
  category?: string;
  isInstalled: boolean;
}

export interface ExpertMarketplaceState {
  experts: Expert[];
  installedExperts: string[];
  installedExpertIds: Record<string, string>; // marketplaceId -> createdExpertId
  searchQuery: string;
  selectedCategory: string;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadExperts: () => Promise<void>;
  loadInstalledExperts: () => Promise<void>;
  installExpert: (id: string) => Promise<void>;
  uninstallExpert: (id: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;
  getFilteredExperts: () => Expert[];
  setError: (error: string | null) => void;
  reset: () => void;
}

export const EXPERT_CATEGORIES = [
  { value: 'all', label: '全部' },
  { value: 'coding', label: '编程' },
  { value: 'writing', label: '写作' },
  { value: 'analysis', label: '分析' },
  { value: 'creative', label: '创意' },
  { value: 'business', label: '商业' },
  { value: 'education', label: '教育' },
];

interface MarketplaceItem {
  id: string | number;
  name?: string;
  description?: string;
  config_schema?: Record<string, unknown>;
  icon?: string;
  color?: string;
  category?: string;
  rating?: number;
  install_count?: number;
  tags?: string | string[];
}

function transformExpert(item: MarketplaceItem): Expert {
  const cfg = item.config_schema ?? {};
  const rawTags = item.tags;
  let tags: string[] = [];
  if (Array.isArray(rawTags)) {
    tags = rawTags;
  } else if (typeof rawTags === 'string') {
    try {
      tags = JSON.parse(rawTags);
    } catch {
      tags = [];
    }
  }

  return {
    id: String(item.id),
    name: item.name ?? '',
    description: item.description ?? '',
    systemPrompt: String(cfg.systemPrompt ?? cfg.system_prompt ?? ''),
    icon: item.icon,
    color: item.color,
    category: item.category,
    isInstalled: false,
  };
}

const INSTALLED_EXPERT_IDS_KEY = 'expert-marketplace-installed-expert-ids';

function readInstalledExpertIds(): Record<string, string> {
  try {
    const raw = localStorage.getItem(INSTALLED_EXPERT_IDS_KEY);
    return raw ? JSON.parse(raw) as Record<string, string> : {};
  } catch {
    return {};
  }
}

function writeInstalledExpertIds(installedExpertIds: Record<string, string>): void {
  localStorage.setItem(INSTALLED_EXPERT_IDS_KEY, JSON.stringify(installedExpertIds));
}

function matchInstalledExpert(marketplace: Expert, userExperts: MarketplaceExpertPrompt[], installedExpertIds: Record<string, string>): string | null {
  const persistedExpertId = installedExpertIds[marketplace.id];
  if (persistedExpertId) {
    const persistedMatch = userExperts.find((expert) => expert.id === persistedExpertId);
    if (persistedMatch) {
      return persistedMatch.id;
    }
  }

  const sourceMatch = userExperts.find(
    (expert) => expert.marketplaceId === marketplace.id || expert.sourceId === marketplace.id
  );
  if (sourceMatch) {
    return sourceMatch.id;
  }

  const legacyMatch = userExperts.find(
    (expert) => expert.name === marketplace.name && expert.description === marketplace.description
  );
  return legacyMatch?.id ?? null;
}

export const useExpertMarketplaceStore = create<ExpertMarketplaceState>((set, get) => ({
  experts: [],
  installedExperts: [],
  installedExpertIds: readInstalledExpertIds(),
  searchQuery: '',
  selectedCategory: 'all',
  isLoading: false,
  error: null,

  loadExperts: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/marketplace/items?type=expert`, {
        headers: getAuthHeader(),
      });
      const json = await res.json();
      const items: MarketplaceItem[] = json.data?.items || json.data || [];
      const marketplaceExperts: Expert[] = items.map(transformExpert);

      // 获取用户已创建的专家（可能从市场克隆）
      let userExperts: MarketplaceExpertPrompt[] = [];
      try {
        userExperts = await expertService.getAllExperts();
      } catch {
        // ignore
      }

      const persistedInstalledExpertIds = readInstalledExpertIds();
      const installedMap: Record<string, string> = {};
      const installedIds: string[] = [];

      marketplaceExperts.forEach((marketplace) => {
        const matchedId = matchInstalledExpert(marketplace, userExperts, persistedInstalledExpertIds);
        if (matchedId) {
          installedMap[marketplace.id] = matchedId;
          installedIds.push(marketplace.id);
        }
      });

      const expertsWithInstallState = marketplaceExperts.map((exp) => ({
        ...exp,
        isInstalled: installedIds.includes(exp.id),
      }));

      set({
        experts: expertsWithInstallState,
        installedExperts: installedIds,
        installedExpertIds: installedMap,
        isLoading: false,
      });
    } catch (err) {
      set({ experts: [], isLoading: false });
    }
  },

  loadInstalledExperts: async () => {
    // 从用户的专家列表中重新计算哪些市场专家已被安装
    try {
      const userExperts = await expertService.getAllExperts();
      const { experts } = get();
      const persistedInstalledExpertIds = readInstalledExpertIds();

      const installedMap: Record<string, string> = {};
      const installedIds: string[] = [];

      experts.forEach((marketplace) => {
        const matchedId = matchInstalledExpert(marketplace, userExperts, persistedInstalledExpertIds);
        if (matchedId) {
          installedMap[marketplace.id] = matchedId;
          if (!installedIds.includes(marketplace.id)) {
            installedIds.push(marketplace.id);
          }
        }
      });

      writeInstalledExpertIds(installedMap);

      set((state) => ({
        experts: state.experts.map((exp) => ({
          ...exp,
          isInstalled: installedIds.includes(exp.id),
        })),
        installedExperts: installedIds,
        installedExpertIds: installedMap,
      }));
    } catch (err) {
      console.error('Failed to load installed experts:', err);
    }
  },

  installExpert: async (id: string) => {
    const marketplaceExpert = get().experts.find((exp) => exp.id === id);
    if (!marketplaceExpert) return;

    // 先乐观更新 UI
    set((state) => ({
      experts: state.experts.map((exp) =>
        exp.id === id ? { ...exp, isInstalled: true } : exp
      ),
      installedExperts: [...state.installedExperts, id],
    }));

    try {
      // 调用 expertService.createExpert 克隆专家到用户账户
      const createdExpert = await expertService.createExpert({
        name: marketplaceExpert.name,
        description: marketplaceExpert.description,
        systemPrompt: marketplaceExpert.systemPrompt,
        icon: marketplaceExpert.icon,
        color: marketplaceExpert.color,
        category: marketplaceExpert.category,
        isDefault: false,
      });

      // 保存 marketplaceId -> createdExpertId 的映射
      set((state) => ({
        installedExpertIds: {
          ...state.installedExpertIds,
          [id]: createdExpert.id,
        },
      }));
      writeInstalledExpertIds({
        ...get().installedExpertIds,
        [id]: createdExpert.id,
      });

      // 刷新"我的专家"列表，让新添加的专家立即显示
      useExpertStore.getState().loadPrompts();
    } catch (err) {
      // 失败时回滚 UI
      set((state) => ({
        experts: state.experts.map((exp) =>
          exp.id === id ? { ...exp, isInstalled: false } : exp
        ),
        installedExperts: state.installedExperts.filter((eid) => eid !== id),
      }));
      console.error('Failed to install expert:', err);
    }
  },

  uninstallExpert: async (id: string) => {
    const createdExpertId = get().installedExpertIds[id];

    // 先乐观更新 UI
    set((state) => ({
      experts: state.experts.map((exp) =>
        exp.id === id ? { ...exp, isInstalled: false } : exp
      ),
      installedExperts: state.installedExperts.filter((eid) => eid !== id),
    }));

    try {
      // 如果有对应的创建专家 ID，则删除它
      if (createdExpertId) {
        await expertService.deleteExpert(createdExpertId);
      }

      // 清除映射
      set((state) => {
        const newMapping = { ...state.installedExpertIds };
        delete newMapping[id];
        return { installedExpertIds: newMapping };
      });
      {
        const nextMapping = { ...get().installedExpertIds };
        delete nextMapping[id];
        writeInstalledExpertIds(nextMapping);
      }

      // 刷新"我的专家"列表
      useExpertStore.getState().loadPrompts();
    } catch (err) {
      // 失败时回滚 UI
      set((state) => ({
        experts: state.experts.map((exp) =>
          exp.id === id ? { ...exp, isInstalled: true } : exp
        ),
        installedExperts: state.installedExperts.includes(id)
          ? state.installedExperts
          : [...state.installedExperts, id],
      }));
      console.error('Failed to uninstall expert:', err);
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  setSelectedCategory: (category) => set({ selectedCategory: category }),

  getFilteredExperts: () => {
    const { experts, searchQuery, selectedCategory } = get();

    return experts.filter((expert) => {
      if (selectedCategory !== 'all' && expert.category !== selectedCategory) {
        return false;
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          expert.name.toLowerCase().includes(query) ||
          (expert.description && expert.description.toLowerCase().includes(query))
        );
      }

      return true;
    });
  },

  setError: (error) => set({ error }),

  reset: () =>
    set({
      experts: [],
      installedExperts: [],
      installedExpertIds: {},
      searchQuery: '',
      selectedCategory: 'all',
      isLoading: false,
      error: null,
    }),
}));
