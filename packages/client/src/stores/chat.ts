import { create } from 'zustand';

export interface ToolCallResult {
  toolCallId: string;
  toolName: string;
  input?: string;
  output?: string;
  imageUrl?: string;
  status: 'running' | 'complete' | 'error';
}

export interface Attachment {
  id: string;
  type: 'image' | 'file';
  name: string;
  url: string;
  mimeType: string;
  data?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'toolresult';
  content: string;
  timestamp: number;
  runId?: string;
  status?: 'sending' | 'streaming' | 'complete' | 'error' | 'pending';
  toolCalls?: ToolCallResult[];
  attachments?: Attachment[];
}

export interface PendingMessage {
  id: string;
  content: string;
  retryCount: number;
  timestamp: number;
}

export interface MCPServerSelection {
  serverId: string;
  serverName: string;
  serverType: string;
  config?: Record<string, string>;
}

export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  isSending: boolean;
  sessionKey: string;
  connected: boolean;
  error: string | null;
  pendingMessages: PendingMessage[];
  editingMessageId: string | null;
  activeStreamId: string | null;

  // MCP server selections per conversation
  selectedMCPServers: Record<string, string[]>; // conversationId -> serverIds

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
  deleteMessage: (id: string) => void;
  setEditingMessageId: (id: string | null) => void;
  addToPendingQueue: (msg: PendingMessage) => void;
  removeFromPendingQueue: (id: string) => void;
  getPendingMessages: () => PendingMessage[];
  clearPendingQueue: () => void;
  setActiveStreamId: (id: string | null) => void;
  addToolCall: (messageId: string, toolCall: ToolCallResult) => void;
  updateToolCall: (messageId: string, toolCallId: string, updates: Partial<ToolCallResult>) => void;
  setSelectedMCPServers: (conversationId: string, serverIds: string[]) => void;
  getSelectedMCPServers: (conversationId: string) => string[];
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  isSending: false,
  sessionKey: 'default',
  connected: false,
  error: null,
  pendingMessages: [],
  editingMessageId: null,
  activeStreamId: null,
  selectedMCPServers: {},

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
  deleteMessage: (id) =>
    set((state) => ({
      messages: state.messages.filter((msg) => msg.id !== id),
    })),
  setEditingMessageId: (id) => set({ editingMessageId: id }),
  addToPendingQueue: (msg) =>
    set((state) => ({ pendingMessages: [...state.pendingMessages, msg] })),
  removeFromPendingQueue: (id) =>
    set((state) => ({
      pendingMessages: state.pendingMessages.filter((m) => m.id !== id),
    })),
  getPendingMessages: () => get().pendingMessages,
  clearPendingQueue: () => set({ pendingMessages: [] }),
  setActiveStreamId: (id) => set({ activeStreamId: id }),
  addToolCall: (messageId, toolCall) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === messageId
          ? { ...msg, toolCalls: [...(msg.toolCalls || []), toolCall] }
          : msg
      ),
    })),
  updateToolCall: (messageId, toolCallId, updates) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              toolCalls: (msg.toolCalls || []).map((tc) =>
                tc.toolCallId === toolCallId ? { ...tc, ...updates } : tc
              ),
            }
          : msg
      ),
    })),
  setSelectedMCPServers: (conversationId, serverIds) =>
    set((state) => ({
      selectedMCPServers: {
        ...state.selectedMCPServers,
        [conversationId]: serverIds,
      },
    })),
  getSelectedMCPServers: (conversationId) => {
    return get().selectedMCPServers[conversationId] || [];
  },
}));
