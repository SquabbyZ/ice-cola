/**
 * Expert Marketplace Store - 专家市场状态管理
 *
 * 管理专家市场的浏览、搜索、筛选等功能
 */

import { create } from 'zustand';
import { gatewayClient } from '@/lib/gateway-client';
import { GatewayRpcService } from '@/services/gateway-rpc';
import { ExpertService } from '@/services/expert-service';
import { useExpertStore } from './experts';

const gatewayRpc = new GatewayRpcService(gatewayClient);
const expertService = new ExpertService(gatewayRpc);

export interface Expert {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  icon: string;
  color: string;
  category: string;
  author: string;
  rating: number;
  uses: number;
  tags: string[];
  isInstalled: boolean;
  version: string;
  createdAt: string;
  updatedAt: string;
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

// Mock marketplace experts data - in production this would come from an API
const MOCK_MARKETPLACE_EXPERTS: Expert[] = [
  {
    id: 'exp_code_reviewer',
    name: '代码审查专家',
    description: '专注于代码质量审查、安全漏洞检测和性能优化建议的专业助手。',
    systemPrompt: '你是一位资深的代码审查专家...',
    icon: '🔍',
    color: '#3B82F6',
    category: 'coding',
    author: 'Ice Cola Team',
    rating: 4.8,
    uses: 12580,
    tags: ['代码审查', '安全', '性能'],
    isInstalled: false,
    version: '1.0.0',
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-03-01T00:00:00Z',
  },
  {
    id: 'exp_tech_writer',
    name: '技术写作专家',
    description: '帮助撰写技术文档、API文档、README和使用指南的专业写作者。',
    systemPrompt: '你是一位专业的技术文档撰写专家...',
    icon: '📝',
    color: '#10B981',
    category: 'writing',
    author: 'Ice Cola Team',
    rating: 4.6,
    uses: 8920,
    tags: ['文档', 'API', '技术写作'],
    isInstalled: false,
    version: '1.2.0',
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-03-10T00:00:00Z',
  },
  {
    id: 'exp_data_analyst',
    name: '数据分析专家',
    description: '擅长数据清洗、统计分析、趋势预测和数据可视化的AI助手。',
    systemPrompt: '你是一位专业的数据分析师...',
    icon: '📊',
    color: '#8B5CF6',
    category: 'analysis',
    author: 'DataMind Lab',
    rating: 4.9,
    uses: 15600,
    tags: ['数据分析', '统计', '可视化'],
    isInstalled: false,
    version: '2.1.0',
    createdAt: '2024-01-20T00:00:00Z',
    updatedAt: '2024-03-15T00:00:00Z',
  },
  {
    id: 'exp_creative_writer',
    name: '创意写作专家',
    description: '擅长小说创作、剧本编写、营销文案和创意内容生成。',
    systemPrompt: '你是一位充满创意的写作专家...',
    icon: '✨',
    color: '#F59E0B',
    category: 'creative',
    author: 'Creative Studio',
    rating: 4.7,
    uses: 21300,
    tags: ['创意', '小说', '营销'],
    isInstalled: false,
    version: '1.5.0',
    createdAt: '2024-02-10T00:00:00Z',
    updatedAt: '2024-03-08T00:00:00Z',
  },
  {
    id: 'exp_product_manager',
    name: '产品经理专家',
    description: '协助需求分析、PRD撰写、用户研究和产品策略规划。',
    systemPrompt: '你是一位经验丰富的产品经理...',
    icon: '🎯',
    color: '#EF4444',
    category: 'business',
    author: 'ProductLab',
    rating: 4.5,
    uses: 6780,
    tags: ['产品', '需求', '策略'],
    isInstalled: false,
    version: '1.0.0',
    createdAt: '2024-02-15T00:00:00Z',
    updatedAt: '2024-03-05T00:00:00Z',
  },
  {
    id: 'exp_tutor',
    name: 'AI 教学专家',
    description: '个性化的学习辅导专家，支持各学科答疑和知识点讲解。',
    systemPrompt: '你是一位耐心的学科辅导老师...',
    icon: '🎓',
    color: '#06B6D4',
    category: 'education',
    author: 'EduTech Corp',
    rating: 4.8,
    uses: 32100,
    tags: ['教育', '辅导', '学习'],
    isInstalled: false,
    version: '2.0.0',
    createdAt: '2024-01-05T00:00:00Z',
    updatedAt: '2024-03-12T00:00:00Z',
  },
  {
    id: 'exp_devops',
    name: 'DevOps 工程师',
    description: '专注 CI/CD 流程、容器化部署、监控告警和自动化运维。',
    systemPrompt: '你是一位资深的 DevOps 工程师...',
    icon: '🚀',
    color: '#6366F1',
    category: 'coding',
    author: 'CloudNative Team',
    rating: 4.6,
    uses: 9870,
    tags: ['DevOps', 'CI/CD', 'K8s'],
    isInstalled: false,
    version: '1.3.0',
    createdAt: '2024-02-20T00:00:00Z',
    updatedAt: '2024-03-18T00:00:00Z',
  },
  {
    id: 'exp_ui_designer',
    name: 'UI/UX 设计专家',
    description: '提供界面设计建议、用户体验优化和交互方案的专业指导。',
    systemPrompt: '你是一位专业的 UI/UX 设计师...',
    icon: '🎨',
    color: '#EC4899',
    category: 'creative',
    author: 'DesignHub',
    rating: 4.4,
    uses: 5430,
    tags: ['UI', 'UX', '设计'],
    isInstalled: false,
    version: '1.1.0',
    createdAt: '2024-02-25T00:00:00Z',
    updatedAt: '2024-03-14T00:00:00Z',
  },
];

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const useExpertMarketplaceStore = create<ExpertMarketplaceState>((set, get) => ({
  experts: [],
  installedExperts: [],
  installedExpertIds: {},
  searchQuery: '',
  selectedCategory: 'all',
  isLoading: false,
  error: null,

  loadExperts: async () => {
    set({ isLoading: true, error: null });
    try {
      // 获取市场专家列表
      let marketplaceExperts = MOCK_MARKETPLACE_EXPERTS;
      try {
        const response = await fetch('/api/experts/marketplace', {
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader(),
          },
        });
        if (response.ok) {
          const result = await response.json();
          marketplaceExperts = result.data || MOCK_MARKETPLACE_EXPERTS;
        }
      } catch {
        // 使用 mock 数据
      }

      // 获取用户已创建的专家（可能从市场克隆）
      let userExperts: any[] = [];
      try {
        userExperts = await expertService.getAllExperts();
      } catch {
        // ignore
      }

      // 通过名称匹配市场专家和用户专家，确定哪些已安装
      const installedMap: Record<string, string> = {};
      const installedIds: string[] = [];

      marketplaceExperts.forEach((marketplace) => {
        const matched = userExperts.find(
          (ue) => ue.name === marketplace.name && ue.description === marketplace.description
        );
        if (matched) {
          installedMap[marketplace.id] = matched.id;
          installedIds.push(marketplace.id);
        }
      });

      // 合并 isInstalled 状态
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
      console.log('Using mock expert marketplace data');
      set({ experts: MOCK_MARKETPLACE_EXPERTS, isLoading: false });
    }
  },

  loadInstalledExperts: async () => {
    // 从用户的专家列表中重新计算哪些市场专家已被安装
    try {
      const userExperts = await expertService.getAllExperts();
      const { experts, installedExpertIds } = get();

      const installedMap: Record<string, string> = { ...installedExpertIds };
      const installedIds: string[] = [];

      experts.forEach((marketplace) => {
        const matched = userExperts.find(
          (ue) => ue.name === marketplace.name && ue.description === marketplace.description
        );
        if (matched) {
          installedMap[marketplace.id] = matched.id;
          if (!installedIds.includes(marketplace.id)) {
            installedIds.push(marketplace.id);
          }
        }
      });

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
        isDefault: false,
      });

      // 保存 marketplaceId -> createdExpertId 的映射
      set((state) => ({
        installedExpertIds: {
          ...state.installedExpertIds,
          [id]: createdExpert.id,
        },
      }));

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

      // 刷新"我的专家"列表
      useExpertStore.getState().loadPrompts();
    } catch (err) {
      // 失败时回滚 UI
      set((state) => ({
        experts: state.experts.map((exp) =>
          exp.id === id ? { ...exp, isInstalled: true } : exp
        ),
        installedExperts: [...state.installedExperts, id],
      }));
      console.error('Failed to uninstall expert:', err);
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  setSelectedCategory: (category) => set({ selectedCategory: category }),

  getFilteredExperts: () => {
    const { experts, searchQuery, selectedCategory } = get();

    return experts.filter((expert) => {
      // Category filter
      if (selectedCategory !== 'all' && expert.category !== selectedCategory) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          expert.name.toLowerCase().includes(query) ||
          expert.description.toLowerCase().includes(query) ||
          expert.tags.some((tag) => tag.toLowerCase().includes(query)) ||
          expert.author.toLowerCase().includes(query)
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
