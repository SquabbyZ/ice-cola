import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
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
  X,
  Check,
  Square,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  Compass,
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
import { getTeamId } from '@/lib/team';

type StreamContext = {
  conversationId?: string;
  teamId: string;
  expertId?: string;
  mcpServerIds: string[];
  content: string;
  attachments: Attachment[];
};

type LocationState = {
  presetMessage?: string;
};

const COMPACT_CHAT_MEDIA_QUERY = '(max-width: 1180px), (max-height: 700px)';

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

const Chat: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { conversationId: routeConversationId } = useParams<{ conversationId: string }>();
  const [message, setMessage] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isCompactLayout, setIsCompactLayout] = useState(false);
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
  const teamId = getTeamId(user);
  const hasTeamAccess = !!teamId;

  useEffect(() => {
    return () => {
      timeoutManager.current.clearAll();
    };
  }, []);

  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  useEffect(() => {
    if (gatewayConnected && teamId) {
      loadConversations(teamId);
    }
  }, [gatewayConnected, teamId, loadConversations]);

  const handleMCPSelectionChange = async (serverIds: string[]) => {
    try {
      await setConversationMcpServers(serverIds);
    } catch {
      // save failed; hook restored last confirmed MCP selection
    }
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia(COMPACT_CHAT_MEDIA_QUERY);

    const syncCompactLayout = () => {
      setIsCompactLayout(mediaQuery.matches);
    };

    syncCompactLayout();
    mediaQuery.addEventListener('change', syncCompactLayout);

    return () => mediaQuery.removeEventListener('change', syncCompactLayout);
  }, []);

  useEffect(() => {
    if (isCompactLayout) {
      setIsSidebarOpen(false);
      setIsSidebarCollapsed(false);
      return;
    }

    setIsSidebarOpen(true);
  }, [isCompactLayout]);

  useEffect(() => {
    const presetMessage = (location.state as LocationState | undefined)?.presetMessage;
    if (!presetMessage) return;

    setMessage((current) => (current ? current : presetMessage));
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!routeConversationId) {
      setCurrentConversationId(null);
      setMessages([]);
      setIsLoadingHistory(false);
      return;
    }

    if (routeConversationId === currentConversationId) return;

    if (!teamId) {
      setMessages([]);
      setIsLoadingHistory(false);
      return;
    }

    let isCurrent = true;
    setIsLoadingHistory(true);
    setCurrentConversationId(routeConversationId);

    conversationService.getById(teamId, routeConversationId)
      .then((detail) => {
        if (!isCurrent) return;
        const formattedMessages = detail.messages.map((msg) => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.createdAt).getTime(),
          status: 'complete' as const,
        }));
        setMessages(formattedMessages);
      })
      .catch(() => {
        if (isCurrent) setMessages([]);
      })
      .finally(() => {
        if (isCurrent) setIsLoadingHistory(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [routeConversationId, currentConversationId, setCurrentConversationId, setMessages, teamId]);

  useEffect(() => {
    if (chatListenerRegisteredRef.current) return;

    const handleHermesDelta = (data: any) => {
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

    const handleHermesFinal = (data: any) => {
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
          }).catch(() => {});
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
          }).catch(() => {});
        }
      }

      delete deltaAccumulatorRef.current[msgId];
      delete streamContextsRef.current[msgId];
      useChatStore.getState().setSending(false);
      useChatStore.getState().setActiveStreamId(null);
    };

    const handleHermesError = (data: any) => {
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

    const handleHermesTool = (data: any) => {
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
  }, [on, currentConversationId, teamId, t]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const MAX_RETRIES = 3;

  const getErrorMessage = (error: any, isConnected: boolean): string => {
    if (!isConnected) return t('chat.errorDisconnected');

    const errorMsg = error.message || String(error);

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
  };

  const handleSendWithContent = async (
    content: string,
    retryCount = 0,
    pendingSnapshot?: Pick<PendingMessage, 'conversationId' | 'teamId' | 'expertId' | 'mcpServerIds' | 'attachments'>,
    options?: { skipLocalMessage?: boolean; messageId?: string },
  ): Promise<boolean> => {
    let conversationId = pendingSnapshot?.conversationId ?? currentConversationId ?? undefined;
    const targetTeamId = pendingSnapshot?.teamId ?? teamId;
    const currentExpertId = pendingSnapshot?.expertId ?? (useExpertStore.getState().activeExpertId || undefined);
    if (!targetTeamId) {
      useChatStore.getState().setError('请先加入或创建团队后再开始聊天');
      return false;
    }
    const targetMcpServerIds = pendingSnapshot?.mcpServerIds ?? [...selectedMCPServerIds];
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

    if (!conversationId && !pendingSnapshot) {
      try {
        const conversation = await createConversation(targetTeamId, '');
        conversationId = conversation.id;
        setCurrentConversationId(conversation.id);
        navigate(`/chat/${conversation.id}`, { replace: true });

        if (targetMcpServerIds.length > 0) {
          await setConversationMcpServers(targetMcpServerIds);
        }
      } catch {
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
    setSending(true);

    try {
      const sessionId = sessionKey || 'default';
      const response = await send('hermes.send', {
        sessionId,
        message: userMessage.content,
        conversationId,
        expertId: currentExpertId,
        attachments: targetAttachments.length > 0 ? targetAttachments.map((a) => ({
          type: a.type,
          name: a.name,
          mimeType: a.mimeType,
          data: a.data,
        })) : undefined,
      });
      if (!response?.ok) {
        useChatStore.getState().updateMessage(userMessage.id, {
          status: 'error',
          content: t('chat.errorSendFailed'),
        });
        setSending(false);
        return false;
      }

      if (!pendingSnapshot) {
        setAttachments([]);
      }

      const runId = response.runId || response.messageId;
      streamContextsRef.current[runId] = {
        conversationId,
        teamId: targetTeamId,
        expertId: currentExpertId,
        mcpServerIds: [...targetMcpServerIds],
        content: userMessage.content,
        attachments: targetAttachments,
      };

      const placeholderMessage = {
        id: runId,
        role: 'assistant' as const,
        content: '',
        timestamp: Date.now(),
        status: 'streaming' as const,
        runId: runId,
      };
      addMessage(placeholderMessage);
      setActiveStreamId(runId);

      timeoutManager.current.set(runId, () => {
        const currentMessages = messagesRef.current;
        const messageIndex = currentMessages.findIndex(msg => msg.runId === runId);
        const streamContext = streamContextsRef.current[runId];

        timedOutStreamIdsRef.current.add(runId);
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
          }).catch(() => {});
        }
        useChatStore.getState().setSending(false);
      }, 30000);

      if (conversationId) {
        conversationService.addMessage(targetTeamId, conversationId, {
          role: 'user',
          content: userMessage.content,
        }).catch(() => {});

        const currentConv = conversations.find(c => c.id === conversationId);
        if (currentConv && !currentConv.title) {
          const newTitle = generateTitle(userMessage.content);
          renameConversation(targetTeamId, conversationId, newTitle);
        }
      }

      return true;
    } catch (error) {
      if (!gatewayConnected && retryCount < MAX_RETRIES) {
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
        const errorMessageObj = {
          id: crypto.randomUUID(),
          role: 'assistant' as const,
          content: `❌ ${errorMessage}`,
          timestamp: Date.now(),
          status: 'error' as const,
        };
        addMessage(errorMessageObj);
        setSending(false);
      }

      return false;
    }
  };

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

  const handleStopGeneration = () => {
    if (!activeStreamId) return;

    const currentStreamMessage = useChatStore.getState().messages.find((msg) => msg.id === activeStreamId);
    send('hermes.abort', { messageId: activeStreamId });
    timeoutManager.current.clear(activeStreamId);
    if (currentStreamMessage) {
      useChatStore.getState().updateMessage(activeStreamId, {
        content: currentStreamMessage.content || t('chat.timeoutRetry'),
        status: 'complete',
      });
    }
    delete streamContextsRef.current[activeStreamId];
    setActiveStreamId(null);
    setSending(false);
  };

  const generateTitle = (content: string): string => {
    const trimmed = content.trim();
    if (trimmed.length <= 20) return trimmed;
    return trimmed.slice(0, 20) + '...';
  };

  const handleNewConversation = async () => {
    if (!teamId) {
      useChatStore.getState().setError('请先加入或创建团队后再开始聊天');
      return;
    }

    try {
      const conversation = await createConversation(teamId, '');
      setMessages([]);
      setCurrentConversationId(conversation.id);
      if (isCompactLayout) setIsSidebarOpen(false);
      navigate(`/chat/${conversation.id}`);
    } catch {
      // create conversation failed
    }
  };

  const handleSelectConversation = async (conversationId: string) => {
    if (!teamId) {
      useChatStore.getState().setError('请先加入或创建团队后再开始聊天');
      return;
    }

    if (isCompactLayout) setIsSidebarOpen(false);
    navigate(`/chat/${conversationId}`);

    if (conversationId === currentConversationId) return;
    setCurrentConversationId(conversationId);
    setIsLoadingHistory(true);

    try {
      const detail = await conversationService.getById(teamId, conversationId);
      const formattedMessages = detail.messages.map((msg) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.createdAt).getTime(),
        status: 'complete' as const,
      }));
      setMessages(formattedMessages);
    } catch {
      setMessages([]);
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
      if (currentConversationId && teamId) {
        conversationService.deleteMessage(teamId, currentConversationId, id).catch(() => {});
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

    if (currentConversationId && teamId) {
      conversationService.updateMessage(teamId, currentConversationId, editingMessageId, {
        content: editContent.trim(),
      }).catch(() => {});
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
  ];
  const currentConversation = conversations.find((conversation) => conversation.id === currentConversationId);
  const sidebarToggleLabel = isSidebarOpen ? t('chat.conversations') : t('chat.showSidebar');
  const inputMinHeightClass = isCompactLayout ? 'min-h-[52px] max-h-[96px]' : 'min-h-[76px] max-h-[140px]';

  return (
    <div className="relative flex h-full min-h-0 overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(212,255,236,0.38),transparent_34%),linear-gradient(135deg,rgba(250,250,250,0.96),rgba(244,244,245,0.88))]">
      {isSidebarOpen && (
        <div className={`${isCompactLayout ? 'absolute inset-y-0 left-0 z-30 shadow-2xl shadow-zinc-900/15' : 'relative'} flex-shrink-0`}>
          <ConversationSidebar
            teamId={teamId ?? ''}
            currentConversationId={currentConversationId}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
        </div>
      )}
      {isCompactLayout && isSidebarOpen && (
        <button
          aria-label={t('chat.conversations')}
          className="absolute inset-0 z-20 bg-zinc-900/10 backdrop-blur-[1px]"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-white/70 bg-white/75 px-3 backdrop-blur-xl sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 rounded-xl p-0 text-zinc-600 hover:bg-zinc-100"
              aria-label={sidebarToggleLabel}
              title={sidebarToggleLabel}
              onClick={() => setIsSidebarOpen((open) => !open)}
            >
              {isSidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
            </Button>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-zinc-900">
                {currentConversation?.title || t('chat.newChat')}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                <span className={`h-1.5 w-1.5 rounded-full ${gatewayConnected ? 'bg-emerald-400' : 'bg-zinc-300'}`} />
                <span className="truncate">{gatewayConnected ? 'Hermes ready' : t('chat.connecting')}</span>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 rounded-xl px-3 text-xs text-zinc-600 hover:bg-zinc-100"
            onClick={handleNewConversation}
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            {t('chat.newChat')}
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {!hasTeamAccess ? (
            <div className="flex h-full items-center justify-center px-4 text-center text-sm text-zinc-500">
              请先创建或加入团队后再开始聊天。
            </div>
          ) : isLoadingHistory ? (
            <div className="flex h-full items-center justify-center px-4 text-sm text-zinc-400">
              {t('common.loading')}
            </div>
          ) : hasMessages ? (
            <div className="mx-auto max-w-4xl space-y-4 px-3 py-4 sm:px-5 sm:py-6">
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
          ) : (
            <div className="mx-auto flex min-h-full max-w-4xl flex-col justify-center px-4 py-4 sm:px-6">
              <div className="mb-5 flex items-center gap-4 sm:mb-7">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-watermelon shadow-xl shadow-zinc-300/50 sm:h-16 sm:w-16">
                  <Compass className="h-7 w-7 text-white/90 sm:h-8 sm:w-8" />
                </div>
                <div className="min-w-0 text-left">
                  <h1 className="text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
                    {t('chat.heroTitle')}
                  </h1>
                  <p className="mt-1 text-sm font-medium text-zinc-400 sm:text-base">
                    {t('chat.heroSubtitle')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
                {quickActions.map((action, index) => (
                  <button
                    key={action.label}
                    onClick={() => handleSendWithContent(action.prompt)}
                    className="group relative overflow-hidden rounded-2xl border border-white/70 bg-white/78 p-3 text-left shadow-sm shadow-zinc-200/60 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-md active:scale-[0.99]"
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${action.gradient} shadow-sm transition-transform duration-200 group-hover:scale-105`}>
                        <action.icon className="h-4 w-4 text-white/90" />
                      </div>
                      <div className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-zinc-800">
                          {action.label}
                        </span>
                        <span className="mt-0.5 line-clamp-2 text-xs leading-snug text-zinc-400">
                          {action.desc}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <footer className="flex-shrink-0 border-t border-white/70 bg-white/78 px-3 py-2.5 backdrop-blur-xl sm:px-4 sm:py-3">
          <div className="mx-auto max-w-4xl">
            {editingMessageId && (
              <div className="mb-2 flex items-center justify-between rounded-xl border border-zinc-200/70 bg-zinc-50/80 px-3 py-2">
                <span className="text-xs font-medium text-zinc-600">{t('chat.editingMessage')}</span>
                <button
                  onClick={handleCancelEdit}
                  className="rounded-lg p-1 hover:bg-zinc-100"
                  aria-label={t('common.cancel')}
                >
                  <X className="h-3.5 w-3.5 text-zinc-500" />
                </button>
              </div>
            )}

            <div className="rounded-2xl border border-zinc-200/70 bg-white/90 p-2.5 shadow-lg shadow-zinc-200/50 sm:p-3">
              <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100/80 pb-2">
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

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.txt,.csv,.json,.md"
                className="hidden"
                onChange={handleFileSelect}
              />

              {attachments.length > 0 && (
                <div className="mt-2 flex max-h-16 flex-wrap gap-2 overflow-y-auto border-b border-zinc-100/80 pb-2">
                  {attachments.map(att => (
                    <div key={att.id} className="group flex items-center gap-2 rounded-xl border border-zinc-200/60 bg-zinc-50/80 px-2 py-1.5">
                      {att.type === 'image' ? (
                        <img src={att.url} alt={att.name} className="h-8 w-8 rounded-lg object-cover" />
                      ) : (
                        <FileText className="h-4 w-4 text-zinc-400" />
                      )}
                      <span className="max-w-[120px] truncate text-xs text-zinc-600">{att.name}</span>
                      <button
                        onClick={() => removeAttachment(att.id)}
                        className="rounded-md p-1 opacity-70 hover:bg-zinc-200 group-hover:opacity-100"
                      >
                        <X className="h-3 w-3 text-zinc-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

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
                className={`w-full resize-none bg-transparent px-1 py-2 text-sm text-zinc-700 outline-none placeholder:text-zinc-400 disabled:opacity-50 ${inputMinHeightClass}`}
              />

              <div className="flex items-center justify-between border-t border-zinc-100/80 pt-2">
                <div className="flex items-center gap-1">
                  {!editingMessageId && (
                    <>
                      <Button variant="ghost" size="sm" className="h-8 w-8 rounded-xl p-0 hover:bg-zinc-100" aria-label={t('chat.quickActions.emailEditing')}>
                        <AtSign className="h-4 w-4 text-zinc-400" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 rounded-xl p-0 hover:bg-zinc-100"
                        aria-label={t('common.attach')}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Paperclip className="h-4 w-4 text-zinc-400" />
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
                        className="h-8 rounded-xl px-3 hover:bg-zinc-100"
                        onClick={handleCancelEdit}
                      >
                        {t('common.cancel')}
                      </Button>
                      <Button
                        size="sm"
                        className="btn-ice flex h-8 w-8 items-center justify-center rounded-xl"
                        onClick={handleSubmitEdit}
                        disabled={!editContent.trim()}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </>
                  ) : isSending && activeStreamId ? (
                    <Button
                      size="sm"
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-500 hover:bg-red-600"
                      aria-label={t('chat.stopGeneration')}
                      onClick={handleStopGeneration}
                    >
                      <Square className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="btn-ice flex h-8 w-8 items-center justify-center rounded-xl"
                      aria-label={t('chat.send')}
                      onClick={() => handleSend()}
                      disabled={(!message.trim() && attachments.length === 0) || isSending || !gatewayConnected}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <p className="mt-1.5 text-center text-[10px] text-zinc-400 sm:text-[11px]">
              {t('chat.disclaimer')}
            </p>
          </div>
        </footer>
      </section>
    </div>
  );
};

export default Chat;
