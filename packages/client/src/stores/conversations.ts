import { create } from 'zustand';
import { conversationService, type Conversation } from '@/services/conversation-service';

interface ConversationState {
  conversations: Conversation[];
  currentConversationId: string | null;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;

  // Actions
  setConversations: (conversations: Conversation[]) => void;
  setCurrentConversationId: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSearchQuery: (query: string) => void;
  filteredConversations: () => Conversation[];

  // Async actions
  loadConversations: (teamId: string) => Promise<void>;
  createConversation: (teamId: string, title: string) => Promise<Conversation>;
  deleteConversation: (teamId: string, conversationId: string) => Promise<void>;
  renameConversation: (teamId: string, conversationId: string, title: string) => Promise<void>;
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  conversations: [],
  currentConversationId: null,
  isLoading: false,
  error: null,
  searchQuery: '',

  setConversations: (conversations) => set({ conversations }),
  setCurrentConversationId: (id) => set({ currentConversationId: id }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  filteredConversations: () => {
    const { conversations, searchQuery } = get();
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(c => (c.title || '未命名对话').toLowerCase().includes(q));
  },
  
  loadConversations: async (teamId: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await conversationService.getList(teamId, 1, 50);
      set({ conversations: result.conversations });
    } catch (error: any) {
      set({ error: error.message || '加载对话列表失败' });
    } finally {
      set({ isLoading: false });
    }
  },
  
  createConversation: async (teamId: string, title: string) => {
    set({ isLoading: true, error: null });
    try {
      const conversation = await conversationService.create(teamId, title);
      // Add to the beginning of the list
      set((state) => ({
        conversations: [conversation, ...state.conversations],
        currentConversationId: conversation.id,
      }));
      return conversation;
    } catch (error: any) {
      set({ error: error.message || '创建对话失败' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  
  deleteConversation: async (teamId: string, conversationId: string) => {
    set({ isLoading: true, error: null });
    try {
      await conversationService.delete(teamId, conversationId);
      // Remove from list
      set((state) => ({
        conversations: state.conversations.filter(c => c.id !== conversationId),
        currentConversationId: state.currentConversationId === conversationId 
          ? null 
          : state.currentConversationId,
      }));
    } catch (error: any) {
      set({ error: error.message || '删除对话失败' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  
  renameConversation: async (teamId: string, conversationId: string, title: string) => {
    set({ isLoading: true, error: null });
    try {
      await conversationService.updateTitle(teamId, conversationId, title);
      // Update in list
      set((state) => ({
        conversations: state.conversations.map(c =>
          c.id === conversationId ? { ...c, title } : c
        ),
      }));
    } catch (error: any) {
      set({ error: error.message || '重命名对话失败' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
}));
