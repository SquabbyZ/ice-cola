/**
 * 专家系统状态管理
 * 
 * 管理用户自定义的专家角色（System Prompt 模板）
 */

import { create } from 'zustand';
import { GatewayRpcService } from '@/services/gateway-rpc';
import { ExpertService } from '@/services/expert-service';

export interface ExpertPrompt {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  icon?: string;
  color?: string;
  isDefault: boolean;
}

export interface ExpertState {
  prompts: ExpertPrompt[];
  activeExpertId: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadPrompts: () => Promise<void>;
  setActiveExpert: (id: string | null) => void;
  createPrompt: (prompt: Omit<ExpertPrompt, 'id'>) => Promise<void>;
  updatePrompt: (id: string, updates: Partial<ExpertPrompt>) => Promise<void>;
  deletePrompt: (id: string) => Promise<void>;
  setError: (error: string | null) => void;
  reset: () => void;
}

// 使用共享的 gatewayClient，确保全局只有一个连接实例
import { gatewayClient } from '@/lib/gateway-client';

const gatewayRpc = new GatewayRpcService(gatewayClient);
const expertService = new ExpertService(gatewayRpc);

export const useExpertStore = create<ExpertState>((set, get) => ({
  prompts: [],
  activeExpertId: null,
  isLoading: false,
  error: null,
  
  loadPrompts: async () => {
    set({ isLoading: true, error: null });
    try {
      const prompts = await expertService.getAllExperts();
      set({
        prompts,
        isLoading: false,
      });
      if (!get().activeExpertId && prompts.length > 0) {
        set({ activeExpertId: prompts[0].id });
      }
    } catch (err) {
      // expertService.getAllExperts 已有 fallback，不会抛出异常
      set({
        error: err instanceof Error ? err.message : null,
        isLoading: false,
      });
    }
  },
  
  setActiveExpert: (id) => {
    // 验证专家是否存在
    const { prompts } = get();
    const exists = id === null || prompts.some(p => p.id === id);
    
    if (exists) {
      set({ activeExpertId: id });
    } else {
      console.warn(`Expert with id "${id}" not found`);
    }
  },
  
  createPrompt: async (prompt) => {
    set({ isLoading: true, error: null });
    try {
      // 调用真实的服务
      const newPrompt = await expertService.createExpert(prompt);
      
      set((state) => ({ 
        prompts: [...state.prompts, newPrompt],
        isLoading: false,
      }));
    } catch (err) {
      set({ 
        error: err instanceof Error ? err.message : 'Failed to create expert prompt',
        isLoading: false,
      });
    }
  },
  
  updatePrompt: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      // 调用真实的服务
      await expertService.updateExpert(id, updates);
      
      set((state) => ({
        prompts: state.prompts.map((p) =>
          p.id === id ? { ...p, ...updates } : p
        ),
        isLoading: false,
      }));
    } catch (err) {
      set({ 
        error: err instanceof Error ? err.message : 'Failed to update expert prompt',
        isLoading: false,
      });
    }
  },
  
  deletePrompt: async (id) => {
    set({ isLoading: true, error: null });
    try {
      // 不允许删除默认专家
      const prompt = get().prompts.find(p => p.id === id);
      if (prompt?.isDefault) {
        throw new Error('Cannot delete default expert');
      }
      
      // 调用真实的服务
      await expertService.deleteExpert(id);
      
      // 从本地状态移除
      set((state) => ({
        prompts: state.prompts.filter((p) => p.id !== id),
        // 如果删除的是当前激活的专家，切换到默认专家
        activeExpertId: state.activeExpertId === id 
          ? state.prompts.find(p => p.isDefault)?.id || null
          : state.activeExpertId,
        isLoading: false,
      }));
    } catch (err) {
      set({ 
        error: err instanceof Error ? err.message : 'Failed to delete expert prompt',
        isLoading: false,
      });
    }
  },
  
  setError: (error) => set({ error }),
  
  reset: () => set({
    prompts: [],
    activeExpertId: null,
    isLoading: false,
    error: null,
  }),
}));
