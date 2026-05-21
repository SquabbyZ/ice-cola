import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Code,
  MessageSquare,
  FileText,
  BarChart3,
  Search,
  Presentation,
  AtSign,
  Paperclip,
  Send,
  Menu,
  X,
  Check,
  Square,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChatStore, type Attachment, type PendingMessage } from '@/stores/chat';
import { useExpertStore } from '@/stores/experts';
import { useConversationStore } from '@/stores/conversations';
import { useAuthStore } from '@/stores/authStore';
import { useGateway } from '@/hooks/useGateway';
import ChatMessageItem from '@/components/ChatMessageItem';
import { ExpertSelector } from '@/components/ExpertSelector';
import { MCPSelector } from '@/components/MCPSelector';
import { ConversationSidebar } from '@/components/ConversationSidebar';
import { TimeoutManager } from '@/lib/timeout-manager';
import { conversationService } from '@/services/conversation-service';
import { useConversationCapabilities } from '@/hooks/useConversationCapabilities';
import { LingqiModelSelector } from '@/components/LingqiModelSelector';
import { LingqiCostPreview } from '@/components/LingqiCostPreview';
import { useLingqiStore } from '@/stores/lingqi';
import { getTeamId } from '@/lib/team';

type StreamContext = {
  conversationId?: string;
  teamId: string;
  expertId?: string;
  mcpServerIds: string[];
  modelId?: string;
  content: string;
  attachments: Attachment[];
};

type HermesMessageEvent = {
  messageId?: string;
  runId?: string;
};

type HermesDeltaEvent = HermesMessageEvent & {
  delta?: string;
};

type HermesFinalEvent = HermesMessageEvent & {
  content?: string;
};

type HermesErrorEvent = HermesMessageEvent & {
  error?: string;
};

type HermesToolEvent = HermesMessageEvent & {
  toolCallId: string;
  toolName: string;
  input?: string;
  output?: string;
  imageUrl?: string;
  status?: 'running' | 'complete' | 'error';
};

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const LINGQI_ESTIMATE_DEBOUNCE_MS = 250;

function formatLingqiAmount(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value);
}

function appendLocalErrorMessage(content: string): void {
  useChatStore.getState().addMessage({
    id: crypto.randomUUID(),
    role: 'assistant',
    content,
    timestamp: Date.now(),
    status: 'error',
  });
}

const Chat: React.FC = () => {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [editContent, setEditContent] = useState('');
  const [, setIsLoadingHistory] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const timeoutManager = useRef(new TimeoutManager());

  const { messages, addMessage, setMessages, setSending, isSending, sessionKey,
          editingMessageId, setEditingMessageId, deleteMessage,
          addToPendingQueue, removeFromPendingQueue, getPendingMessages,
          activeStreamId, setActiveStreamId } = useChatStore();
  const { loadPrompts } = useExpertStore();
  const {
    currentConversationId,
    setCurrentConversationId,
    loadConversations,
    createConversation,
    conversations,
    renameConversation,
  } = useConversationStore();
  const { expertId, mcpServerIds: selectedMCPServerIds, setConversationMcpServers } = useConversationCapabilities(currentConversationId);

  const { isConnected: gatewayConnected, send, on } = useGateway({ autoConnect: true });

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const chatListenerRegisteredRef = useRef(false);
  const deltaAccumulatorRef = useRef<Record<string, string>>({});
  const streamContextsRef = useRef<Record<string, StreamContext>>({});
  const timedOutStreamIdsRef = useRef<Set<string>>(new Set());
  const retriedPendingMessageIdsRef = useRef<Set<string>>(new Set());

  const user = useAuthStore(state => state.user);
  const realTeamId = getTeamId(user);
  const {
    status: lingqiStatus,
    models: lingqiModels,
    selectedModel,
    estimate: lingqiEstimate,
    error: lingqiError,
    loadLingqi,
    selectModel,
    estimateCost,
    refreshStatus,
    clearEstimate,
    clearError,
    clearSelectedModel,
  } = useLingqiStore();

  useEffect(() => {
    const manager = timeoutManager.current;
    return () => {
      manager.clearAll();
    };
  }, []);

  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  useEffect(() => {
    if (gatewayConnected && realTeamId) {
      loadConversations(realTeamId);
    }
  }, [gatewayConnected, realTeamId, loadConversations]);

  useEffect(() => {
    if (!realTeamId) {
      clearEstimate();
      return;
    }

    loadLingqi(realTeamId).catch(() => {
      // loadLingqi records the error in the Lingqi store for user-facing display
    });
  }, [realTeamId, loadLingqi, clearEstimate]);

  useEffect(() => {
    if (lingqiError) {
      const timeoutId = window.setTimeout(() => clearError(), 5000);
      return () => window.clearTimeout(timeoutId);
    }
  }, [lingqiError, clearError]);

  useEffect(() => {
    const trimmedMessage = message.trim();
    if (!realTeamId || !trimmedMessage || !selectedModel) {
      clearEstimate();
      return;
    }

    const timeoutId = window.setTimeout(() => {
      estimateCost(realTeamId, {
        transactionType: 'chat_message',
        modelId: selectedModel.id,
        context: { conversationId: currentConversationId || undefined },
      }).catch(() => {
        // estimateCost records the error in the Lingqi store for user-facing display
      });
    }, LINGQI_ESTIMATE_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [realTeamId, message, selectedModel, currentConversationId, estimateCost, clearEstimate]);

  const handleMCPSelectionChange = async (serverIds: string[]) => {
    try {
      await setConversationMcpServers(serverIds);
    } catch {
      // save failed; hook restored last confirmed MCP selection
    }
  };

  useEffect(() => {
    if (chatListenerRegisteredRef.current) return;

    const handleHermesDelta = (data: HermesDeltaEvent) => {
      const msgId = data.messageId || data.runId;
      if (!msgId) return;

      deltaAccumulatorRef.current[msgId] = (deltaAccumulatorRef.current[msgId] || '') + (data.delta || '');
      const accumulated = deltaAccumulatorRef.current[msgId];

      const currentMessages = messagesRef.current;
      const messageIndex = currentMessages.findIndex(msg => msg.runId === msgId);

      if (messageIndex >= 0) {
        useChatStore.getState().updateMessage(currentMessages[messageIndex].id, {
          content: accumulated,
          status: 'streaming',
        });
      } else if (accumulated) {
        useChatStore.getState().addMessage({
          id: msgId,
          role: 'assistant',
          content: accumulated,
          timestamp: Date.now(),
          status: 'streaming',
          runId: msgId,
        });
      }

      timeoutManager.current.clear(msgId);
    };

    const handleHermesFinal = (data: HermesFinalEvent) => {
      const msgId = data.messageId || data.runId;
      if (!msgId || timedOutStreamIdsRef.current.has(msgId)) return;

      timeoutManager.current.clear(msgId);
      const finalContent = data.content || deltaAccumulatorRef.current[msgId] || '';
      const streamContext = streamContextsRef.current[msgId];

      const currentMessages = messagesRef.current;
      const messageIndex = currentMessages.findIndex(msg => msg.runId === msgId);

      if (messageIndex >= 0) {
        useChatStore.getState().updateMessage(currentMessages[messageIndex].id, {
          content: finalContent,
          status: 'complete',
        });

        if (streamContext?.conversationId && finalContent) {
          conversationService.addMessage(streamContext.teamId, streamContext.conversationId, {
            role: 'assistant',
            content: finalContent,
          }).catch(() => {
            appendLocalErrorMessage('回复已生成，但同步到会话历史失败，请稍后刷新确认。');
          });
        }
      } else if (finalContent) {
        const existingById = currentMessages.find(msg => msg.id === msgId);
        if (!existingById) {
          useChatStore.getState().addMessage({
            id: msgId,
            role: 'assistant',
            content: finalContent,
            timestamp: Date.now(),
            status: 'complete',
            runId: msgId,
          });
        }

        if (streamContext?.conversationId) {
          conversationService.addMessage(streamContext.teamId, streamContext.conversationId, {
            role: 'assistant',
            content: finalContent,
          }).catch(() => {
            appendLocalErrorMessage('回复已生成，但同步到会话历史失败，请稍后刷新确认。');
          });
        }
      }

      if (streamContext?.teamId) {
        refreshStatus(streamContext.teamId).catch(() => {
          // refreshStatus records the error in the Lingqi store for user-facing display
        });
      }

      delete deltaAccumulatorRef.current[msgId];
      delete streamContextsRef.current[msgId];
      useChatStore.getState().setSending(false);
      useChatStore.getState().setActiveStreamId(null);
    };

    const handleHermesError = (data: HermesErrorEvent) => {
      const msgId = data.messageId || data.runId;
      if (!msgId) return;

      timeoutManager.current.clear(msgId);
      delete streamContextsRef.current[msgId];
      const currentMessages = messagesRef.current;
      const messageIndex = currentMessages.findIndex(msg => msg.runId === msgId);
      const errorMessage = data.error || t('chat.errorSendFailed');

      if (messageIndex >= 0) {
        useChatStore.getState().updateMessage(currentMessages[messageIndex].id, {
          content: `❌ ${errorMessage}`,
          status: 'error',
        });
      } else {
        useChatStore.getState().addMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `❌ ${errorMessage}`,
          timestamp: Date.now(),
          status: 'error',
        });
      }

      delete deltaAccumulatorRef.current[msgId];
      useChatStore.getState().setSending(false);
      useChatStore.getState().setActiveStreamId(null);
    };

    const handleHermesTool = (data: HermesToolEvent) => {
      const msgId = data.messageId || data.runId;
      if (!msgId) return;

      const currentMessages = messagesRef.current;
      const messageIndex = currentMessages.findIndex(msg => msg.runId === msgId);
      if (messageIndex < 0) return;

      const msg = currentMessages[messageIndex];
      const existingToolCall = msg.toolCalls?.find(tc => tc.toolCallId === data.toolCallId);

      if (existingToolCall) {
        useChatStore.getState().updateToolCall(msg.id, data.toolCallId, {
          output: data.output || existingToolCall.output,
          imageUrl: data.imageUrl || existingToolCall.imageUrl,
          status: data.status || 'running',
        });
      } else {
        useChatStore.getState().addToolCall(msg.id, {
          toolCallId: data.toolCallId,
          toolName: data.toolName,
          input: data.input,
          status: data.status || 'running',
        });
      }
    };

    chatListenerRegisteredRef.current = true;
    const unsubscribeHermesDelta = on('hermes.delta', handleHermesDelta);
    const unsubscribeHermesFinal = on('hermes.final', handleHermesFinal);
    const unsubscribeHermesError = on('hermes.error', handleHermesError);
    const unsubscribeHermesTool = on('hermes.tool', handleHermesTool);

    return () => {
      unsubscribeHermesDelta();
      unsubscribeHermesFinal();
      unsubscribeHermesError();
      unsubscribeHermesTool();
      chatListenerRegisteredRef.current = false;
    };
  }, [on, currentConversationId, t, refreshStatus]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const MAX_RETRIES = 3;

  const getErrorMessage = useCallback((error: unknown, isConnected: boolean): string => {
    if (!isConnected) return t('chat.errorDisconnected');

    const errorMsg = error instanceof Error ? error.message : String(error);

    if (errorMsg.includes('timeout') || errorMsg.includes('超时')) {
      return t('chat.errorTimeout');
    }
    if (errorMsg.includes('401') || errorMsg.includes('auth') || errorMsg.includes('认证')) {
      return t('chat.errorAuth');
    }
    if (errorMsg.includes('429')) return t('chat.errorRateLimit');
    if (errorMsg.includes('disconnect') || errorMsg.includes('断开')) {
      return t('chat.errorReconnecting');
    }
    return t('chat.errorSendFailed');
  }, [t]);

  const handleSendWithContent = useCallback(async (
    content: string,
    retryCount = 0,
    pendingSnapshot?: Pick<PendingMessage, 'conversationId' | 'teamId' | 'expertId' | 'mcpServerIds' | 'modelId' | 'attachments'>,
    options?: { skipLocalMessage?: boolean; messageId?: string },
  ): Promise<boolean> => {
    const conversationId = pendingSnapshot?.conversationId ?? currentConversationId ?? undefined;
    const targetTeamId = pendingSnapshot?.teamId ?? realTeamId;

    if (!targetTeamId) {
      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant' as const,
        content: '请先加入或创建宗门后再开始灵气对话。',
        timestamp: Date.now(),
        status: 'error' as const,
      });
      return false;
    }
    const currentExpertId = pendingSnapshot?.expertId ?? (useExpertStore.getState().activeExpertId || undefined);
    const targetMcpServerIds = pendingSnapshot?.mcpServerIds ?? [...selectedMCPServerIds];
    const targetModelId = pendingSnapshot?.modelId ?? selectedModel?.id;
    const targetAttachments = pendingSnapshot?.attachments
      ? pendingSnapshot.attachments.map((attachment) => ({
          id: crypto.randomUUID(),
          type: attachment.type,
          name: attachment.name,
          url: '',
          mimeType: attachment.mimeType,
          data: attachment.data,
        }))
      : attachments.length > 0
        ? [...attachments]
        : [];

    if ((!content && targetAttachments.length === 0) || isSending) return false;

    if (targetModelId) {
      try {
        const estimate = await estimateCost(targetTeamId, {
          transactionType: 'chat_message',
          modelId: targetModelId,
          context: { conversationId },
        });

        if (!estimate.canAfford) {
          const currentBalance = lingqiStatus?.balance ?? Math.max(0, (estimate.balanceAfterEstimate ?? 0) + estimate.estimatedCost);
          addMessage({
            id: crypto.randomUUID(),
            role: 'assistant' as const,
            content: `灵气不足，预计消耗 ${formatLingqiAmount(estimate.estimatedCost)} 灵气，当前余额 ${formatLingqiAmount(currentBalance)} 灵气。请先兑换灵气或切换为消耗更低的模型。`,
            timestamp: Date.now(),
            status: 'error' as const,
          });
          return false;
        }
      } catch {
        addMessage({
          id: crypto.randomUUID(),
          role: 'assistant' as const,
          content: '灵气费用预估失败，请稍后重试。',
          timestamp: Date.now(),
          status: 'error' as const,
        });
        return false;
      }
    }

    const userMessage = {
      id: options?.messageId || crypto.randomUUID(),
      role: 'user' as const,
      content: content || '[附件]',
      timestamp: Date.now(),
      status: 'complete' as const,
      attachments: targetAttachments.length > 0 ? targetAttachments : undefined,
    };

    if (!options?.skipLocalMessage) {
      addMessage(userMessage);
      setMessage('');
    }

    const runId = crypto.randomUUID();
    streamContextsRef.current[runId] = {
      conversationId,
      teamId: targetTeamId,
      expertId: currentExpertId,
      mcpServerIds: [...targetMcpServerIds],
      modelId: targetModelId,
      content: userMessage.content,
      attachments: targetAttachments,
    };

    const placeholderMessage = {
      id: runId,
      role: 'assistant' as const,
      content: '',
      timestamp: Date.now(),
      status: 'streaming' as const,
      runId,
    };
    addMessage(placeholderMessage);
    setActiveStreamId(runId);
    setSending(true);

    timeoutManager.current.set(runId, () => {
      const currentMessages = messagesRef.current;
      const messageIndex = currentMessages.findIndex(msg => msg.runId === runId);
      const streamContext = streamContextsRef.current[runId];

      timedOutStreamIdsRef.current.add(runId);
      send('hermes.abort', { messageId: runId }).catch(() => {
        appendLocalErrorMessage('请求已超时，但服务端中止失败，请稍后刷新灵气余额确认。');
      });
      if (messageIndex >= 0) {
        useChatStore.getState().updateMessage(currentMessages[messageIndex].id, {
          content: currentMessages[messageIndex].content || t('chat.timeoutRetry'),
          status: 'error',
        });
      }
      delete streamContextsRef.current[runId];
      if (streamContext?.conversationId) {
        conversationService.addMessage(streamContext.teamId, streamContext.conversationId, {
          role: 'assistant',
          content: currentMessages[messageIndex]?.content || t('chat.timeoutRetry'),
        }).catch(() => {
          appendLocalErrorMessage('请求已超时，但超时状态同步到会话历史失败，请稍后刷新确认。');
        });
      }
      useChatStore.getState().setSending(false);
    }, 30000);

    try {
      const sessionId = sessionKey || 'default';
      const response = await send('hermes.send', {
        sessionId,
        message: userMessage.content,
        conversationId,
        expertId: currentExpertId,
        model: targetModelId,
        messageId: runId,
        attachments: targetAttachments.length > 0 ? targetAttachments.map((a) => ({
          type: a.type,
          name: a.name,
          mimeType: a.mimeType,
          data: a.data,
        })) : undefined,
      });
      if (!response?.ok) {
        timeoutManager.current.clear(runId);
        delete streamContextsRef.current[runId];
        useChatStore.getState().updateMessage(runId, {
          content: `❌ ${response?.error || t('chat.errorSendFailed')}`,
          status: 'error',
        });
        setSending(false);
        setActiveStreamId(null);
        return false;
      }

      if (realTeamId) {
        refreshStatus(realTeamId).catch(() => {
          // refreshStatus records the error in the Lingqi store for user-facing display
        });
      }

      if (!pendingSnapshot) {
        setAttachments([]);
      }

      if (conversationId) {
        conversationService.addMessage(targetTeamId, conversationId, {
          role: 'user',
          content: userMessage.content,
        }).catch(() => {
          appendLocalErrorMessage('消息已发送，但同步到会话历史失败，请稍后刷新确认。');
        });

        const currentConv = conversations.find(c => c.id === conversationId);
        if (currentConv && !currentConv.title) {
          const newTitle = generateTitle(userMessage.content);
          renameConversation(targetTeamId, conversationId, newTitle);
        }
      }

      return true;
    } catch (error) {
      timeoutManager.current.clear(runId);
      delete streamContextsRef.current[runId];
      setActiveStreamId(null);

      if (!gatewayConnected && retryCount < MAX_RETRIES) {
        useChatStore.getState().deleteMessage(runId);
        if (!options?.skipLocalMessage) {
          addToPendingQueue({
            id: userMessage.id,
            content: userMessage.content,
            retryCount: retryCount + 1,
            timestamp: Date.now(),
            conversationId,
            teamId: targetTeamId,
            expertId: currentExpertId,
            mcpServerIds: [...targetMcpServerIds],
            modelId: targetModelId,
            attachments: targetAttachments.map((attachment) => ({
              type: attachment.type,
              name: attachment.name,
              mimeType: attachment.mimeType,
              data: attachment.data,
            })),
          });
        }

        useChatStore.getState().updateMessage(userMessage.id, {
          status: 'pending',
        });
        setSending(false);
      } else {
        const errorMessage = getErrorMessage(error, gatewayConnected);
        useChatStore.getState().updateMessage(runId, {
          content: `❌ ${errorMessage}`,
          status: 'error',
        });
        setSending(false);
      }

      return false;
    }
  }, [
    currentConversationId,
    selectedMCPServerIds,
    selectedModel,
    attachments,
    isSending,
    realTeamId,
    estimateCost,
    lingqiStatus,
    addMessage,
    setMessage,
    setActiveStreamId,
    setSending,
    sessionKey,
    send,
    refreshStatus,
    conversations,
    renameConversation,
    gatewayConnected,
    addToPendingQueue,
    getErrorMessage,
    t,
  ]);

  useEffect(() => {
    if (!gatewayConnected || isSending) return;

    const pendingMsg = getPendingMessages().find((msg) => !retriedPendingMessageIdsRef.current.has(msg.id));
    if (!pendingMsg) return;
    retriedPendingMessageIdsRef.current.add(pendingMsg.id);

    handleSendWithContent(
      pendingMsg.content,
      pendingMsg.retryCount,
      {
        conversationId: pendingMsg.conversationId,
        teamId: pendingMsg.teamId,
        expertId: pendingMsg.expertId,
        mcpServerIds: pendingMsg.mcpServerIds,
        modelId: pendingMsg.modelId,
        attachments: pendingMsg.attachments,
      },
      {
        skipLocalMessage: true,
        messageId: pendingMsg.id,
      }
    ).then((succeeded) => {
      if (succeeded) {
        retriedPendingMessageIdsRef.current.delete(pendingMsg.id);
        removeFromPendingQueue(pendingMsg.id);
      } else {
        retriedPendingMessageIdsRef.current.delete(pendingMsg.id);
        useChatStore.getState().updateMessage(pendingMsg.id, {
          status: 'pending',
        });
      }
    }).catch(() => {
      retriedPendingMessageIdsRef.current.delete(pendingMsg.id);
      useChatStore.getState().updateMessage(pendingMsg.id, {
        status: 'pending',
      });
    });
  }, [gatewayConnected, isSending, getPendingMessages, handleSendWithContent, removeFromPendingQueue]);

  const handleSend = () => handleSendWithContent(message.trim());

  const handleModelSelect = async (modelId: string) => {
    if (!realTeamId) {
      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant' as const,
        content: '请先加入或创建宗门后再选择灵气模型。',
        timestamp: Date.now(),
        status: 'error' as const,
      });
      return;
    }

    try {
      clearEstimate();
      await selectModel(realTeamId, modelId, currentConversationId || undefined);
      const trimmedMessage = message.trim();
      if (!trimmedMessage) {
        clearEstimate();
        return;
      }

      await estimateCost(realTeamId, {
        transactionType: 'chat_message',
        modelId,
        context: { conversationId: currentConversationId || undefined },
      });
    } catch {
      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant' as const,
        content: '灵气模型切换失败，请稍后重试。',
        timestamp: Date.now(),
        status: 'error' as const,
      });
    }
  };

  const handleRegenerate = () => {
    if (isSending) return;

    const lastAssistantIdx = [...messages].reverse().findIndex(m => m.role === 'assistant' && m.status === 'complete');
    if (lastAssistantIdx === -1) return;

    const realIdx = messages.length - 1 - lastAssistantIdx;
    const lastAssistant = messages[realIdx];

    const lastUserMsg = [...messages.slice(0, realIdx)].reverse().find(m => m.role === 'user');
    if (!lastUserMsg) return;

    deleteMessage(lastAssistant.id);
    handleSendWithContent(lastUserMsg.content);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStopGeneration = async () => {
    if (!activeStreamId) return;

    const messageId = activeStreamId;
    try {
      const response = await send('hermes.abort', { messageId });
      if (!response?.ok) {
        appendLocalErrorMessage(`停止生成失败：${response?.error || '请稍后重试。'}`);
        return;
      }

      setActiveStreamId(null);
      setSending(false);
    } catch {
      appendLocalErrorMessage('停止生成失败，请稍后重试。');
    }
  };

  const generateTitle = (content: string): string => {
    const trimmed = content.trim();
    if (trimmed.length <= 20) return trimmed;
    return trimmed.slice(0, 20) + '...';
  };

  const handleNewConversation = async () => {
    if (!realTeamId) {
      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant' as const,
        content: '请先加入或创建宗门后再开启新的灵气对话。',
        timestamp: Date.now(),
        status: 'error' as const,
      });
      return;
    }

    try {
      await createConversation(realTeamId, '');
      setMessages([]);
      clearSelectedModel();
    } catch {
      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant' as const,
        content: '新建对话失败，请稍后重试。',
        timestamp: Date.now(),
        status: 'error' as const,
      });
    }
  };

  const handleSelectConversation = async (conversationId: string) => {
    if (!realTeamId) {
      return;
    }

    setCurrentConversationId(conversationId);
    clearSelectedModel();
    setIsLoadingHistory(true);

    try {
      const detail = await conversationService.getById(realTeamId, conversationId);
      const formattedMessages = detail.messages.map((msg) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.createdAt).getTime(),
        status: 'complete' as const,
      }));
      setMessages(formattedMessages);
    } catch {
      // load conversation messages failed
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const hasMessages = messages.length > 0;

  const handleEditMessage = (id: string, content: string) => {
    setEditingMessageId(id);
    setEditContent(content);
    setMessage(content);
  };

  const handleDeleteMessage = (id: string) => {
    if (deleteConfirmId === id) {
      deleteMessage(id);
      setDeleteConfirmId(null);
      if (currentConversationId && realTeamId) {
        conversationService.deleteMessage(realTeamId, currentConversationId, id).catch(() => {
          appendLocalErrorMessage('消息已从本地删除，但服务端同步失败，请稍后刷新确认。');
        });
      }
    } else {
      setDeleteConfirmId(id);
      setTimeout(() => {
        setDeleteConfirmId((prev) => (prev === id ? null : prev));
      }, 3000);
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent('');
    setMessage('');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) continue;
      const data = await readFileAsBase64(file);
      newAttachments.push({
        id: crypto.randomUUID(),
        type: file.type.startsWith('image/') ? 'image' : 'file',
        name: file.name,
        url: URL.createObjectURL(file),
        mimeType: file.type,
        data,
      });
    }
    setAttachments(prev => [...prev, ...newAttachments]);
    e.target.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => {
      const att = prev.find(a => a.id === id);
      if (att) URL.revokeObjectURL(att.url);
      return prev.filter(a => a.id !== id);
    });
  };

  const handleSubmitEdit = async () => {
    if (!editingMessageId || !editContent.trim()) return;

    const msgIndex = messages.findIndex((m) => m.id === editingMessageId);
    if (msgIndex >= 0) {
      const updatedMessages = [...messages];
      updatedMessages[msgIndex] = { ...updatedMessages[msgIndex], content: editContent.trim() };
      setMessages(updatedMessages);
    }

    setEditingMessageId(null);
    setEditContent('');
    setMessage('');

    if (currentConversationId && realTeamId) {
      conversationService.updateMessage(realTeamId, currentConversationId, editingMessageId, {
        content: editContent.trim(),
      }).catch(() => {
        appendLocalErrorMessage('消息已在本地更新，但服务端同步失败，请稍后刷新确认。');
      });
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  const quickActions = [
    {
      icon: Code,
      label: t('chat.quickActions.codeDevelopment'),
      desc: t('chat.quickActions.codeDevelopmentDesc'),
      prompt: t('chat.quickActions.codeDevelopmentPrompt'),
      gradient: 'from-zinc-600 to-zinc-800',
    },
    {
      icon: MessageSquare,
      label: t('chat.quickActions.officeWork'),
      desc: t('chat.quickActions.officeWorkDesc'),
      prompt: t('chat.quickActions.officeWorkPrompt'),
      gradient: 'from-zinc-500 to-zinc-700',
    },
    {
      icon: FileText,
      label: t('chat.quickActions.documentProcessing'),
      desc: t('chat.quickActions.documentProcessingDesc'),
      prompt: t('chat.quickActions.documentProcessingPrompt'),
      gradient: 'from-zinc-700 to-zinc-900',
    },
    {
      icon: BarChart3,
      label: t('chat.quickActions.dataAnalysis'),
      desc: t('chat.quickActions.dataAnalysisDesc'),
      prompt: t('chat.quickActions.dataAnalysisPrompt'),
      gradient: 'from-zinc-600 to-zinc-800',
    },
    {
      icon: Search,
      label: t('chat.quickActions.deepResearch'),
      desc: t('chat.quickActions.deepResearchDesc'),
      prompt: t('chat.quickActions.deepResearchPrompt'),
      gradient: 'from-zinc-500 to-zinc-700',
    },
    {
      icon: Presentation,
      label: t('chat.quickActions.slides'),
      desc: t('chat.quickActions.slidesDesc'),
      prompt: t('chat.quickActions.slidesPrompt'),
      gradient: 'from-zinc-700 to-zinc-900',
    },
    {
      icon: AtSign,
      label: t('chat.quickActions.emailEditing'),
      desc: t('chat.quickActions.emailEditingDesc'),
      prompt: t('chat.quickActions.emailEditingPrompt'),
      gradient: 'from-zinc-600 to-zinc-800',
    },
    {
      icon: BarChart3,
      label: t('chat.quickActions.productPlanning'),
      desc: t('chat.quickActions.productPlanningDesc'),
      prompt: t('chat.quickActions.productPlanningPrompt'),
      gradient: 'from-zinc-500 to-zinc-700',
    },
  ];

  return (
    <div className="flex h-full overflow-hidden bg-transparent">
      {/* Conversation Sidebar */}
      {isSidebarOpen && (
        <ConversationSidebar
          teamId={realTeamId ?? ''}
          currentConversationId={currentConversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toggle Sidebar Button */}
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="absolute left-4 top-4 z-10 p-2.5 glass-panel rounded-xl shadow-md hover:bg-white/90 transition-all duration-200 active:scale-[0.98]"
            title={t('chat.showSidebar')}
          >
            <Menu className="w-4 h-4 text-zinc-600" />
          </button>
        )}

        {hasMessages ? (
          /* Conversation View */
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
              {messages.map((msg, index) => {
              const isLastAssistant = msg.role === 'assistant' && msg.status === 'complete'
                && (index === messages.length - 1 || messages.slice(index + 1).every(m => m.role !== 'assistant' || m.status !== 'complete'));
              return (
                <ChatMessageItem
                  key={msg.id}
                  message={msg}
                  onEdit={msg.role === 'user' ? handleEditMessage : undefined}
                  onDelete={msg.role === 'user' ? handleDeleteMessage : undefined}
                  onRegenerate={isLastAssistant ? handleRegenerate : undefined}
                />
              );
            })}
              <div ref={messagesEndRef} />
            </div>
          </div>
        ) : (
          /* Welcome View */
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-[1200px] mx-auto px-6 py-16">
              {/* Hero Section */}
              <div className="text-center mb-14 animate-fade-in-up">
                <div className="mb-8">
                  <div className="w-20 h-20 mx-auto rounded-3xl pavilion-orb flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-amber-50" />
                  </div>
                </div>
                <h1 className="text-4xl font-bold mb-4 tracking-tight pavilion-text-gradient">
                  {t('chat.heroTitle')}
                </h1>
                <p className="text-lg text-zinc-400 font-medium">
                  {t('chat.heroSubtitle')}
                </p>
              </div>

              {/* Suggestion Cards - Bento Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
                {quickActions.map((action, index) => (
                  <button
                    key={action.label}
                    onClick={() => handleSendWithContent(action.prompt)}
                    className={`group relative bento-tile p-5 flex flex-col items-start animate-fade-in-up hover-lift`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center mb-4 shadow-md transition-transform duration-300 group-hover:scale-110`}>
                      <action.icon className="w-5 h-5 text-white/90" />
                    </div>
                    <span className="text-sm font-semibold text-zinc-800 mb-1 group-hover:text-zinc-900 transition-colors">
                      {action.label}
                    </span>
                    <span className="text-xs text-zinc-400 leading-relaxed">
                      {action.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-zinc-200/50 bg-white/80 backdrop-blur-xl p-4">
          <div className="max-w-3xl mx-auto">
            {/* Edit Mode Banner */}
            {editingMessageId && (
              <div className="mb-3 px-4 py-3 glass-panel rounded-xl flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-700">{t('chat.editingMessage')}</span>
                <button
                  onClick={handleCancelEdit}
                  className="p-1.5 hover:bg-zinc-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-zinc-500" />
                </button>
              </div>
            )}

            <section
              aria-labelledby="lingqi-model-heading"
              className="mb-3 rounded-2xl border border-emerald-100/70 bg-gradient-to-br from-white via-emerald-50/60 to-amber-50/50 p-4 shadow-sm shadow-emerald-100/50"
            >
              <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 id="lingqi-model-heading" className="text-sm font-semibold text-zinc-800">
                    灵气模型
                  </h2>
                  <p className="text-xs text-zinc-500">
                    按当前会话选择模型，并在发送前预估灵气消耗。
                  </p>
                </div>
                {lingqiStatus && (
                  <p
                    role="status"
                    aria-live="polite"
                    aria-atomic="true"
                    className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700"
                  >
                    余额 {formatLingqiAmount(lingqiStatus.balance)} 灵气
                  </p>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                <LingqiModelSelector
                  models={lingqiModels}
                  selectedModelId={selectedModel?.id}
                  onSelect={handleModelSelect}
                />
                <div className="sm:min-w-[220px]">
                  <LingqiCostPreview estimate={lingqiEstimate} />
                  {lingqiError && (
                    <p role="alert" className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
                      {lingqiError}
                    </p>
                  )}
                </div>
              </div>
            </section>

            <div className="glass-panel rounded-2xl p-4">
              {/* Tools Bar */}
              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-zinc-100/50">
                <ExpertSelector
                  experts={useExpertStore.getState().prompts}
                  activeExpertId={expertId ?? null}
                  onSelectExpert={(id) => useExpertStore.getState().setActiveExpert(id)}
                />
                <MCPSelector
                  conversationId={currentConversationId}
                  selectedServerIds={selectedMCPServerIds}
                  onSelectionChange={handleMCPSelectionChange}
                />
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.txt,.csv,.json,.md"
                className="hidden"
                onChange={handleFileSelect}
              />

              {/* Attachment previews */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-zinc-100/50">
                  {attachments.map(att => (
                    <div key={att.id} className="relative group flex items-center gap-2 bg-zinc-50/80 border border-zinc-200/50 rounded-xl px-3 py-2">
                      {att.type === 'image' ? (
                        <img src={att.url} alt={att.name} className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <FileText className="w-5 h-5 text-zinc-400" />
                      )}
                      <span className="text-sm text-zinc-600 max-w-[120px] truncate">{att.name}</span>
                      <button
                        onClick={() => removeAttachment(att.id)}
                        className="p-1 hover:bg-zinc-200 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-3.5 h-3.5 text-zinc-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Textarea */}
              <textarea
                ref={editingMessageId ? editInputRef : undefined}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (editingMessageId) setEditContent(e.target.value);
                }}
                onKeyDown={editingMessageId ? handleEditKeyDown : handleKeyDown}
                placeholder={gatewayConnected ? (editingMessageId ? t('chat.editPlaceholder') : t('chat.inputPlaceholder')) : t('chat.connecting')}
                disabled={isSending || !gatewayConnected}
                className="w-full min-h-[80px] px-2 py-2 bg-transparent text-sm focus:outline-none resize-none disabled:opacity-50 placeholder:text-zinc-400 text-zinc-700"
              />

              {/* Bottom Toolbar */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100/50">
                <div className="flex items-center gap-1">
                  {!editingMessageId && (
                    <>
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-zinc-100 rounded-xl">
                        <AtSign className="w-4 h-4 text-zinc-400" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0 hover:bg-zinc-100 rounded-xl"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Paperclip className="w-4 h-4 text-zinc-400" />
                      </Button>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {editingMessageId ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-4 hover:bg-zinc-100 rounded-xl"
                        onClick={handleCancelEdit}
                      >
                        {t('common.cancel')}
                      </Button>
                      <Button
                        size="sm"
                        className="h-9 w-9 btn-ice rounded-xl flex items-center justify-center"
                        onClick={handleSubmitEdit}
                        disabled={!editContent.trim()}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    </>
                  ) : isSending && activeStreamId ? (
                    <Button
                      size="sm"
                      className="h-9 w-9 bg-red-500 hover:bg-red-600 rounded-xl flex items-center justify-center"
                      onClick={handleStopGeneration}
                    >
                      <Square className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="h-9 w-9 btn-ice rounded-xl flex items-center justify-center"
                      onClick={() => handleSend()}
                      disabled={(!message.trim() && attachments.length === 0) || isSending || !gatewayConnected}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <p className="text-center text-[11px] text-zinc-400 mt-3">
              {t('chat.disclaimer')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
