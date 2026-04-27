import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'toolresult';
  content: string;
  timestamp: number;
  runId?: string;
  status?: 'sending' | 'streaming' | 'complete' | 'error';
}

export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  isSending: boolean;
  sessionKey: string;
  connected: boolean;
  error: string | null;
  
  // Actions
  setConnected: (connected: boolean) => void;
  setSessionKey: (key: string) => void;
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  setMessages: (messages: ChatMessage[]) => void;
  setLoading: (loading: boolean) => void;
  setSending: (sending: boolean) => void;
  setError: (error: string | null) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isLoading: false,
  isSending: false,
  sessionKey: 'default',
  connected: false,
  error: null,
  
  setConnected: (connected) => set({ connected }),
  setSessionKey: (key) => set({ sessionKey: key }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, ...updates } : msg
      ),
    })),
  setMessages: (messages) => set({ messages }),
  setLoading: (loading) => set({ isLoading: loading }),
  setSending: (sending) => set({ isSending: sending }),
  setError: (error) => set({ error }),
  clearMessages: () => set({ messages: [] }),
}));
