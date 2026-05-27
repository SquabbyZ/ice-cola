import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chat';
import { useConversationStore } from '@/stores/conversations';
import { useExpertStore } from '@/stores/experts';
import { useGateway } from '@/hooks/useGateway';
import { useConversationCapabilities } from '@/hooks/useConversationCapabilities';
import { getTeamId } from '@/lib/team';
import { conversationService } from '@/services/conversation-service';
import { useLingqiStore } from '@/stores/lingqi';
import { ChatWorkspace } from './chat/ChatWorkspace';
import { useChatAttachments } from './chat/useChatAttachments';
import { useHermesChatActions } from './chat/useHermesChatActions';
import { useHermesStreamEvents } from './chat/useHermesStreamEvents';
import {
  appendLocalErrorMessage,
  COMPACT_CHAT_MEDIA_QUERY,
  formatLingqiAmount,
  getCapabilitySelectorTrigger,
  LINGQI_ESTIMATE_DEBOUNCE_MS,
  type LocationState,
} from './chat/chatPageUtils';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastFetchedConversationIdRef = useRef<string | null>(null);

  const {
    attachments,
    setAttachments,
    handleFileSelect,
    removeAttachment,
  } = useChatAttachments();
  const handleFileSelectError = () => {
    toast.error(t('chat.errors.attachmentFailed'));
  };
  const {
    messages,
    addMessage,
    setMessages,
    isSending,
    sessionKey,
    editingMessageId,
    setEditingMessageId,
    deleteMessage,
    activeStreamId,
  } = useChatStore();
  const { loadPrompts } = useExpertStore();
  const {
    currentConversationId,
    setCurrentConversationId,
    loadConversations,
    createConversation,
    conversations,
    renameConversation,
  } = useConversationStore();
  const {
    expertId,
    setConversationExpert,
    mcpServerIds: selectedMCPServerIds,
    setConversationMcpServers,
    skillIds: selectedSkillIds,
    setConversationSkills,
    extensionIds: selectedExtensionIds,
    setConversationExtensions,
  } = useConversationCapabilities(currentConversationId);
  const { isConnected: gatewayConnected, send, on } = useGateway({ autoConnect: true });
  const user = useAuthStore((state) => state.user);
  const teamId = getTeamId(user);
  const hasTeamAccess = !!teamId;
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

  const streamRefs = useHermesStreamEvents({
    messages,
    on,
    refreshStatus,
    sendFailedMessage: t('chat.errorSendFailed'),
    historyAssistantSyncFailedMessage: t('chat.errors.historyAssistantSyncFailed'),
    chargeUnknownSuffix: t('chat.errors.chargeUnknownSuffix'),
  });

  const chatActions = useHermesChatActions({
    currentConversationId,
    selectedMCPServerIds,
    selectedSkillIds,
    selectedExtensionIds,
    selectedExpertId: expertId,
    selectedModelId: selectedModel?.id,
    attachments,
    isSending,
    teamId,
    lingqiStatus,
    sessionKey,
    gatewayConnected,
    activeStreamId,
    message,
    messages,
    conversations,
    streamRefs,
    navigate,
    createConversation,
    setCurrentConversationId,
    setConversationExpert,
    setConversationMcpServers,
    setConversationSkills,
    setConversationExtensions,
    renameConversation,
    estimateCost,
    refreshStatus,
    send,
    setMessage,
    setAttachments,
    errorDisconnected: t('chat.errorDisconnected'),
    errorTimeout: t('chat.errorTimeout'),
    errorAuth: t('chat.errorAuth'),
    errorRateLimit: t('chat.errorRateLimit'),
    errorReconnecting: t('chat.errorReconnecting'),
    errorSendFailed: t('chat.errorSendFailed'),
    timeoutRetry: t('chat.timeoutRetry'),
    attachmentOnlyMessage: t('chat.message.attachmentOnly'),
    teamRequiredMessage: t('chat.errors.teamRequired'),
    insufficientLingqiMessage: (estimatedCost, currentBalance) => t('chat.errors.insufficientLingqi', { estimatedCost, currentBalance }),
    estimateFailedMessage: t('chat.errors.estimateFailed'),
    newConversationFailedMessage: t('chat.errors.newConversationFailed'),
    historyUserSyncFailedMessage: t('chat.errors.historyUserSyncFailed'),
    timeoutAbortSyncFailedMessage: t('chat.errors.timeoutAbortSyncFailed'),
    timeoutHistorySyncFailedMessage: t('chat.errors.timeoutHistorySyncFailed'),
    notChargedSuffix: t('chat.errors.notChargedSuffix'),
    chargeUnknownSuffix: t('chat.errors.chargeUnknownSuffix'),
    stopGenerationFailedMessage: (reason) => t('chat.errors.stopGenerationFailed', { reason }),
    stopGenerationRetryMessage: t('chat.errors.stopGenerationRetry'),
    timeoutKeyword: t('chat.errors.timeoutKeyword'),
    authKeyword: t('chat.errors.authKeyword'),
    disconnectKeyword: t('chat.errors.disconnectKeyword'),
  });

  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  useEffect(() => {
    if (gatewayConnected && teamId) loadConversations(teamId);
  }, [gatewayConnected, teamId, loadConversations]);

  useEffect(() => {
    if (!teamId) {
      clearEstimate();
      return;
    }
    loadLingqi(teamId).catch(() => undefined);
  }, [teamId, loadLingqi, clearEstimate]);

  useEffect(() => {
    if (!lingqiError) return;
    const timeoutId = window.setTimeout(() => clearError(), 5000);
    return () => window.clearTimeout(timeoutId);
  }, [lingqiError, clearError]);

  useEffect(() => {
    const trimmedMessage = message.trim();
    if (!teamId || !trimmedMessage || !selectedModel) {
      clearEstimate();
      return;
    }
    const timeoutId = window.setTimeout(() => {
      estimateCost(teamId, {
        transactionType: 'chat_message',
        modelId: selectedModel.id,
        context: { conversationId: currentConversationId || undefined },
      }).catch(() => undefined);
    }, LINGQI_ESTIMATE_DEBOUNCE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [teamId, message, selectedModel, currentConversationId, estimateCost, clearEstimate]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(COMPACT_CHAT_MEDIA_QUERY);
    const syncCompactLayout = () => setIsCompactLayout(mediaQuery.matches);
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
    const locationState = location.state as LocationState | undefined;
    const presetMessage = locationState?.presetMessage;
    const selectedSkillIds = locationState?.selectedSkillIds;

    if (presetMessage) {
      setMessage((current) => (current ? current : presetMessage));
    }

    if (selectedSkillIds && selectedSkillIds.length > 0) {
      // Set the selected skill IDs when navigating from Skills page
      setConversationSkills(selectedSkillIds);
    }

    if (presetMessage || selectedSkillIds) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate, setConversationSkills]);

  useEffect(() => {
    // When useHermesChatActions creates a new conversation it sets
    // currentConversationId + navigates here in the same tick (post-await).
    // React 18 batching usually folds these into one render, but the await
    // boundary plus zustand subscription can produce an intermediate render
    // where currentConversationId updated but routeConversationId hasn't.
    // Detect in-flight streams via the latest store snapshot (NOT the React
    // state, to avoid feedback loops) and skip BOTH the wipe-on-empty-route
    // branch AND the history refetch — history will load naturally next
    // time the user revisits the conversation.
    const liveMessages = useChatStore.getState().messages;
    const hasInflightStream = liveMessages.some((msg) => msg.status === 'streaming' || msg.status === 'sending');
    if (hasInflightStream) {
      if (routeConversationId) setCurrentConversationId(routeConversationId);
      setIsLoadingHistory(false);
      return;
    }
    if (!routeConversationId) {
      lastFetchedConversationIdRef.current = null;
      setCurrentConversationId(null);
      setMessages([]);
      setIsLoadingHistory(false);
      return;
    }
    // Use a ref to guard against duplicate fetches instead of depending on
    // currentConversationId, which triggers re-renders via setCurrentConversationId
    // mid-effect and can cancel in-flight API calls via cleanup.
    if (lastFetchedConversationIdRef.current === routeConversationId) return;
    if (!teamId) {
      setMessages([]);
      setIsLoadingHistory(false);
      return;
    }

    lastFetchedConversationIdRef.current = routeConversationId;
    setIsLoadingHistory(true);
    setCurrentConversationId(routeConversationId);
    conversationService.getById(teamId, routeConversationId)
      .then((detail) => {
        setMessages(detail.messages.map((msg) => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.createdAt).getTime(),
          status: 'complete' as const,
        })));
      })
      .catch(() => {
        setMessages([]);
      })
      .finally(() => {
        setIsLoadingHistory(false);
      });
  }, [routeConversationId, setCurrentConversationId, setMessages, teamId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoadingHistory]);

  const handleMCPSelectionChange = async (serverIds: string[]) => {
    try {
      await setConversationMcpServers(serverIds);
    } catch {
      // save failed; hook restored last confirmed MCP selection
    }
  };

  const handleSkillSelectionChange = async (skillIds: string[]) => {
    try {
      await setConversationSkills(skillIds);
    } catch {
      // save failed; hook restored last confirmed skill selection
    }
  };

  const handleExtensionSelectionChange = async (extensionIds: string[]) => {
    try {
      await setConversationExtensions(extensionIds);
    } catch {
      // save failed; hook restored last confirmed extension selection
    }
  };

  const handleExpertSelectionChange = async (id: string | null) => {
    try {
      await setConversationExpert(id);
    } catch {
      // save failed; hook restored last confirmed expert selection
    }
  };

  const handleModelSelect = async (modelId: string) => {
    if (!teamId) {
      addMessage({ id: crypto.randomUUID(), role: 'assistant', content: t('chat.errors.modelTeamRequired'), timestamp: Date.now(), status: 'error' });
      return;
    }
    try {
      clearEstimate();
      await selectModel(teamId, modelId, currentConversationId || undefined);
      if (!message.trim()) {
        clearEstimate();
        return;
      }
      await estimateCost(teamId, { transactionType: 'chat_message', modelId, context: { conversationId: currentConversationId || undefined } });
    } catch {
      addMessage({ id: crypto.randomUUID(), role: 'assistant', content: t('chat.errors.modelSwitchFailed'), timestamp: Date.now(), status: 'error' });
    }
  };

  const handleNewConversation = () => {
    setMessages([]);
    setCurrentConversationId(null);
    clearSelectedModel();
    if (isCompactLayout) setIsSidebarOpen(false);
    navigate('/chat');
  };

  const handleSelectConversation = async (conversationId: string) => {
    if (!teamId) {
      useChatStore.getState().setError(t('chat.errors.teamRequired'));
      return;
    }
    if (isCompactLayout) setIsSidebarOpen(false);
    navigate(`/chat/${conversationId}`);
    if (conversationId === currentConversationId) return;
    setCurrentConversationId(conversationId);
    clearSelectedModel();
    setIsLoadingHistory(true);
    try {
      const detail = await conversationService.getById(teamId, conversationId);
      setMessages(detail.messages.map((msg) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.createdAt).getTime(),
        status: 'complete' as const,
      })));
    } catch {
      setMessages([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleEditMessage = (id: string, content: string) => {
    setEditingMessageId(id);
    setEditContent(content);
    setMessage(content);
  };

  const handleDeleteMessage = (id: string) => {
    if (deleteConfirmId !== id) {
      setDeleteConfirmId(id);
      setTimeout(() => setDeleteConfirmId((prev) => (prev === id ? null : prev)), 3000);
      return;
    }
    deleteMessage(id);
    setDeleteConfirmId(null);
    if (currentConversationId && teamId) {
      conversationService.deleteMessage(teamId, currentConversationId, id)
        .catch(() => appendLocalErrorMessage(t('chat.errors.deleteMessageSyncFailed')));
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent('');
    setMessage('');
  };

  const handleSubmitEdit = async () => {
    if (!editingMessageId || !editContent.trim()) return;
    const msgIndex = messages.findIndex((msg) => msg.id === editingMessageId);
    if (msgIndex >= 0) {
      const updatedMessages = [...messages];
      updatedMessages[msgIndex] = { ...updatedMessages[msgIndex], content: editContent.trim() };
      setMessages(updatedMessages);
    }
    setEditingMessageId(null);
    setEditContent('');
    setMessage('');
    if (currentConversationId && teamId) {
      conversationService.updateMessage(teamId, currentConversationId, editingMessageId, { content: editContent.trim() })
        .catch(() => appendLocalErrorMessage(t('chat.errors.updateMessageSyncFailed')));
    }
  };

  const expertPrompts = useExpertStore.getState().prompts;
  const currentConversation = conversations.find((conversation) => conversation.id === currentConversationId);
  const selectedExpertName = expertPrompts.find((prompt) => prompt.id === expertId)?.name;
  const selectedModelName = selectedModel?.displayName || selectedModel?.modelName;
  const lingqiBalance = lingqiStatus ? t('chat.capabilities.balance', { amount: formatLingqiAmount(lingqiStatus.balance) }) : undefined;
  const lingqiEstimateText = lingqiEstimate ? t('chat.capabilities.estimate', { amount: formatLingqiAmount(lingqiEstimate.estimatedCost) }) : undefined;
  const canSendMessage = (message.trim().length > 0 || attachments.length > 0) && gatewayConnected && !isSending;

  return (
    <ChatWorkspace
      teamId={teamId}
      hasTeamAccess={hasTeamAccess}
      currentConversationId={currentConversationId}
      currentConversation={currentConversation}
      messages={messages}
      messagesEndRef={messagesEndRef}
      fileInputRef={fileInputRef}
      isCompactLayout={isCompactLayout}
      isSidebarOpen={isSidebarOpen}
      isSidebarCollapsed={isSidebarCollapsed}
      isLoadingHistory={isLoadingHistory}
      gatewayConnected={gatewayConnected}
      message={message}
      editingMessageId={editingMessageId}
      isSending={isSending}
      attachments={attachments}
      canSendMessage={canSendMessage}
      lingqiModels={lingqiModels}
      selectedModelId={selectedModel?.id}
      lingqiError={lingqiError}
      expertPrompts={expertPrompts}
      expertId={expertId}
      selectedMCPServerIds={selectedMCPServerIds}
      selectedSkillIds={selectedSkillIds}
      selectedExtensionIds={selectedExtensionIds}
      selectedModelName={selectedModelName}
      lingqiBalance={lingqiBalance}
      lingqiEstimateText={lingqiEstimateText}
      selectedExpertName={selectedExpertName}
      onToggleSidebar={() => setIsSidebarOpen((open) => !open)}
      onCloseSidebar={() => setIsSidebarOpen(false)}
      onToggleSidebarCollapse={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
      onSelectConversation={handleSelectConversation}
      onNewConversation={handleNewConversation}
      onEditMessage={handleEditMessage}
      onDeleteMessage={handleDeleteMessage}
      onRegenerate={chatActions.handleRegenerate}
      onPromptSelect={(prompt) => chatActions.handleSendWithContent(prompt)}
      onCancelEdit={handleCancelEdit}
      onModelSelect={handleModelSelect}
      onSelectExpert={handleExpertSelectionChange}
      onMCPSelectionChange={handleMCPSelectionChange}
      onSkillSelectionChange={handleSkillSelectionChange}
      onExtensionSelectionChange={handleExtensionSelectionChange}
      onCapabilityClick={(target) => {
        const selector = getCapabilitySelectorTrigger(target);
        if (selector) {
          const el = document.querySelector<HTMLButtonElement>(selector);
          if (import.meta.env.DEV && !el) {
            console.warn(`[Chat] No element found for capability "${target}" selector: ${selector}`);
          }
          el?.click();
        }
        if (target === 'attach') fileInputRef.current?.click();
      }}
      onFileSelect={(event) => handleFileSelect(event).catch(handleFileSelectError)}
      onRemoveAttachment={removeAttachment}
      onMessageChange={(value) => {
        setMessage(value);
        if (editingMessageId) setEditContent(value);
      }}
      onSend={editingMessageId ? handleSubmitEdit : chatActions.handleSend}
      onStopGeneration={chatActions.handleStopGeneration}
    />
  );
};

export default Chat;
