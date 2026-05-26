import { useCallback, useEffect, useRef } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { conversationService } from '@/services/conversation-service';
import { useChatStore, type Attachment, type ChatMessage, type PendingMessage } from '@/stores/chat';
import type { Conversation } from '@/services/conversation-service';
import type { HermesStreamRefs } from './useHermesStreamEvents';
import {
  appendLocalErrorMessage,
  formatLingqiAmount,
  generateTitle,
  lingqiNotChargedMessage,
} from './chatPageUtils';

const MAX_RETRIES = 3;
const STREAM_TIMEOUT_MS = 30000;

type PendingSnapshot = Pick<PendingMessage, 'conversationId' | 'teamId' | 'expertId' | 'mcpServerIds' | 'skillIds' | 'extensionIds' | 'modelId' | 'attachments'>;

interface LingqiStatus {
  balance: number;
}

interface LingqiEstimate {
  canAfford: boolean;
  estimatedCost: number;
  balanceAfterEstimate?: number;
}

interface SendOptions {
  skipLocalMessage?: boolean;
  messageId?: string;
}

interface UseHermesChatActionsParams {
  currentConversationId: string | null;
  selectedMCPServerIds: string[];
  selectedSkillIds: string[];
  selectedExtensionIds: string[];
  selectedExpertId?: string;
  selectedModelId?: string;
  attachments: Attachment[];
  isSending: boolean;
  teamId?: string | null;
  lingqiStatus?: LingqiStatus | null;
  sessionKey: string;
  gatewayConnected: boolean;
  activeStreamId: string | null;
  message: string;
  messages: ChatMessage[];
  conversations: Conversation[];
  streamRefs: HermesStreamRefs;
  navigate: NavigateFunction;
  createConversation: (teamId: string, title: string, id?: string) => Promise<Conversation>;
  setCurrentConversationId: (id: string | null) => void;
  setConversationExpert: (expertId: string | null, targetConversationId?: string) => Promise<void>;
  setConversationMcpServers: (serverIds: string[], targetConversationId?: string) => Promise<void>;
  setConversationSkills: (skillIds: string[], targetConversationId?: string) => Promise<void>;
  setConversationExtensions: (extensionIds: string[], targetConversationId?: string) => Promise<void>;
  renameConversation: (teamId: string, id: string, title: string) => Promise<void>;
  estimateCost: (teamId: string, input: { transactionType: 'chat_message'; modelId: string; context: { conversationId?: string } }) => Promise<LingqiEstimate>;
  refreshStatus: (teamId: string) => Promise<unknown>;
  send: (method: string, params?: unknown) => Promise<{ ok?: boolean; error?: string } | undefined>;
  setMessage: (value: string) => void;
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;
  errorDisconnected: string;
  errorTimeout: string;
  errorAuth: string;
  errorRateLimit: string;
  errorReconnecting: string;
  errorSendFailed: string;
  timeoutRetry: string;
  attachmentOnlyMessage: string;
  teamRequiredMessage: string;
  insufficientLingqiMessage: (estimatedCost: string, currentBalance: string) => string;
  estimateFailedMessage: string;
  newConversationFailedMessage: string;
  historyUserSyncFailedMessage: string;
  timeoutAbortSyncFailedMessage: string;
  timeoutHistorySyncFailedMessage: string;
  notChargedSuffix: string;
  chargeUnknownSuffix: string;
  stopGenerationFailedMessage: (reason: string) => string;
  stopGenerationRetryMessage: string;
  timeoutKeyword: string;
  authKeyword: string;
  disconnectKeyword: string;
}

export interface HermesChatActions {
  handleSendWithContent: (
    content: string,
    retryCount?: number,
    pendingSnapshot?: PendingSnapshot,
    options?: SendOptions,
  ) => Promise<boolean>;
  handleSend: () => Promise<boolean>;
  handleRegenerate: () => void;
  handleStopGeneration: () => Promise<void>;
}

function normalizePendingAttachments(attachments?: PendingMessage['attachments']): Attachment[] | undefined {
  return attachments?.map((attachment) => ({
    id: crypto.randomUUID(),
    type: attachment.type,
    name: attachment.name,
    url: '',
    mimeType: attachment.mimeType,
    data: attachment.data,
    sizeBytes: attachment.sizeBytes,
  }));
}

function createAttachmentPreviewUrl(attachment: Attachment): string {
  if (attachment.type !== 'image' || !attachment.data) return attachment.url;

  return `data:${attachment.mimeType};base64,${attachment.data}`;
}

function cloneAttachmentsForMessageDisplay(attachments: Attachment[]): Attachment[] {
  return attachments.map((attachment) => ({
    ...attachment,
    id: crypto.randomUUID(),
    url: createAttachmentPreviewUrl(attachment),
  }));
}

export function useHermesChatActions(params: UseHermesChatActionsParams): HermesChatActions {
  const retriedPendingMessageIdsRef = useRef<Set<string>>(new Set());
  const lastCreatedConversationIdRef = useRef<string | null>(null);
  const {
    currentConversationId,
    selectedMCPServerIds,
    selectedSkillIds,
    selectedExtensionIds,
    selectedExpertId,
    selectedModelId,
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
    errorDisconnected,
    errorTimeout,
    errorAuth,
    errorRateLimit,
    errorReconnecting,
    errorSendFailed,
    timeoutRetry,
    attachmentOnlyMessage,
    teamRequiredMessage,
    insufficientLingqiMessage,
    estimateFailedMessage,
    newConversationFailedMessage,
    historyUserSyncFailedMessage,
    timeoutAbortSyncFailedMessage,
    timeoutHistorySyncFailedMessage,
    notChargedSuffix,
    chargeUnknownSuffix,
    stopGenerationFailedMessage,
    stopGenerationRetryMessage,
    timeoutKeyword,
    authKeyword,
    disconnectKeyword,
  } = params;

  const getErrorMessage = useCallback((error: unknown, isConnected: boolean): string => {
    if (!isConnected) return errorDisconnected;
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (errorMsg.includes('timeout') || errorMsg.includes(timeoutKeyword)) return errorTimeout;
    if (errorMsg.includes('401') || errorMsg.includes('auth') || errorMsg.includes(authKeyword)) return errorAuth;
    if (errorMsg.includes('429')) return errorRateLimit;
    if (errorMsg.includes('disconnect') || errorMsg.includes(disconnectKeyword)) return errorReconnecting;
    return errorSendFailed;
  }, [authKeyword, disconnectKeyword, errorAuth, errorDisconnected, errorRateLimit, errorReconnecting, errorSendFailed, errorTimeout, timeoutKeyword]);

  const handleSendWithContent = useCallback(async (
    content: string,
    retryCount = 0,
    pendingSnapshot?: PendingSnapshot,
    options?: SendOptions,
  ): Promise<boolean> => {
    const chatStore = useChatStore.getState();
    let conversationId = pendingSnapshot?.conversationId ?? currentConversationId ?? undefined;
    const targetTeamId = pendingSnapshot?.teamId ?? teamId;
    const currentExpertId = pendingSnapshot?.expertId ?? selectedExpertId;
    if (!targetTeamId) {
      chatStore.setError(teamRequiredMessage);
      return false;
    }

    const targetMcpServerIds = pendingSnapshot?.mcpServerIds ?? [...selectedMCPServerIds];
    const targetSkillIds = pendingSnapshot?.skillIds ?? [...selectedSkillIds];
    const targetExtensionIds = pendingSnapshot?.extensionIds ?? [...selectedExtensionIds];
    const targetModelId = pendingSnapshot?.modelId ?? selectedModelId;
    const targetAttachments = normalizePendingAttachments(pendingSnapshot?.attachments) ?? (attachments.length > 0 ? [...attachments] : []);
    const messageAttachments = cloneAttachmentsForMessageDisplay(targetAttachments);
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
          chatStore.addMessage({
            id: crypto.randomUUID(),
            role: 'assistant',
            content: insufficientLingqiMessage(formatLingqiAmount(estimate.estimatedCost), formatLingqiAmount(currentBalance)),
            timestamp: Date.now(),
            status: 'error',
          });
          return false;
        }
      } catch {
        chatStore.addMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: lingqiNotChargedMessage(estimateFailedMessage, notChargedSuffix),
          timestamp: Date.now(),
          status: 'error',
        });
        return false;
      }
    }

    let pendingNewConversationId: string | null = null;
    let pendingNewConversationExpertId: string | null = null;
    let pendingNewConversationMcpServerIds: string[] | null = null;
    let pendingNewConversationSkillIds: string[] | null = null;
    let pendingNewConversationExtensionIds: string[] | null = null;
    if (!conversationId && !pendingSnapshot) {
      try {
        pendingNewConversationId = crypto.randomUUID();
        const conversation = await createConversation(targetTeamId, '', pendingNewConversationId);
        conversationId = conversation.id;
        pendingNewConversationId = conversation.id;
        pendingNewConversationExpertId = currentExpertId ?? null;
        pendingNewConversationMcpServerIds = targetMcpServerIds.length > 0 ? targetMcpServerIds : null;
        pendingNewConversationSkillIds = targetSkillIds.length > 0 ? targetSkillIds : null;
        pendingNewConversationExtensionIds = targetExtensionIds.length > 0 ? targetExtensionIds : null;
        if (content) {
          renameConversation(targetTeamId, conversation.id, generateTitle(content)).catch(() => undefined);
        }
        lastCreatedConversationIdRef.current = conversation.id;
      } catch {
        chatStore.addMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: lingqiNotChargedMessage(newConversationFailedMessage, notChargedSuffix),
          timestamp: Date.now(),
          status: 'error',
        });
        return false;
      }
    }

    const userMessage: ChatMessage = {
      id: options?.messageId || crypto.randomUUID(),
      role: 'user',
      content: content || attachmentOnlyMessage,
      timestamp: Date.now(),
      status: 'complete',
      attachments: messageAttachments.length > 0 ? messageAttachments : undefined,
    };

    if (!options?.skipLocalMessage) {
      chatStore.addMessage(userMessage);
      setMessage('');
    }

    const runId = crypto.randomUUID();
    streamRefs.streamContextsRef.current[runId] = {
      conversationId,
      teamId: targetTeamId,
      expertId: currentExpertId,
      mcpServerIds: [...targetMcpServerIds],
      skillIds: [...targetSkillIds],
      extensionIds: [...targetExtensionIds],
      modelId: targetModelId,
      content: userMessage.content,
      attachments: targetAttachments,
    };
    chatStore.addMessage({ id: runId, role: 'assistant', content: '', timestamp: Date.now(), status: 'streaming', runId });
    chatStore.setActiveStreamId(runId);
    chatStore.setSending(true);

    // Navigate AFTER the streaming placeholder has been added to the chat
    // store so Chat.tsx's route-change effect sees status === 'streaming'
    // and skips the empty-history wipe + refetch.
    if (pendingNewConversationId) {
      setCurrentConversationId(pendingNewConversationId);
      navigate(`/chat/${pendingNewConversationId}`, { replace: true });
      if (pendingNewConversationExpertId) {
        setConversationExpert(pendingNewConversationExpertId, pendingNewConversationId).catch(() => undefined);
      }
      if (pendingNewConversationMcpServerIds) {
        setConversationMcpServers(pendingNewConversationMcpServerIds, pendingNewConversationId).catch(() => undefined);
      }
      if (pendingNewConversationSkillIds) {
        setConversationSkills(pendingNewConversationSkillIds, pendingNewConversationId).catch(() => undefined);
      }
      if (pendingNewConversationExtensionIds) {
        setConversationExtensions(pendingNewConversationExtensionIds, pendingNewConversationId).catch(() => undefined);
      }
    }

    streamRefs.timeoutManager.current.set(runId, () => {
      const currentMessages = streamRefs.messagesRef.current;
      const messageIndex = currentMessages.findIndex((msg) => msg.runId === runId);
      const streamContext = streamRefs.streamContextsRef.current[runId];
      streamRefs.timedOutStreamIdsRef.current.add(runId);
      send('hermes.abort', { messageId: runId }).catch(() => appendLocalErrorMessage(timeoutAbortSyncFailedMessage));
      if (messageIndex >= 0) {
        useChatStore.getState().updateMessage(currentMessages[messageIndex].id, {
          content: currentMessages[messageIndex].content || timeoutRetry,
          status: 'error',
        });
      }
      delete streamRefs.streamContextsRef.current[runId];
      if (streamContext?.conversationId) {
        conversationService.addMessage(streamContext.teamId, streamContext.conversationId, {
          role: 'assistant',
          content: currentMessages[messageIndex]?.content || timeoutRetry,
        }).catch(() => appendLocalErrorMessage(timeoutHistorySyncFailedMessage));
      }
      useChatStore.getState().setActiveStreamId(null);
      useChatStore.getState().setSending(false);
    }, STREAM_TIMEOUT_MS);

    try {
      const response = await send('hermes.send', {
        sessionId: sessionKey || 'default',
        message: userMessage.content,
        conversationId,
        expertId: currentExpertId,
        model: targetModelId,
        messageId: runId,
        mcpServerIds: targetMcpServerIds.length > 0 ? targetMcpServerIds : undefined,
        skillIds: targetSkillIds.length > 0 ? targetSkillIds : undefined,
        extensionIds: targetExtensionIds.length > 0 ? targetExtensionIds : undefined,
        attachments: targetAttachments.length > 0 ? targetAttachments.map(({ type, name, mimeType, data }) => ({ type, name, mimeType, data })) : undefined,
      });

      if (!response?.ok) {
        streamRefs.timeoutManager.current.clear(runId);
        delete streamRefs.streamContextsRef.current[runId];
        useChatStore.getState().updateMessage(runId, {
          content: `❌ ${lingqiNotChargedMessage(response?.error || errorSendFailed, notChargedSuffix)}`,
          status: 'error',
        });
        useChatStore.getState().setSending(false);
        useChatStore.getState().setActiveStreamId(null);
        return false;
      }

      refreshStatus(targetTeamId).catch(() => undefined);
      if (options?.skipLocalMessage && options.messageId) {
        useChatStore.getState().updateMessage(options.messageId, { status: 'complete' });
      }
      if (!pendingSnapshot) setAttachments([]);
      if (conversationId) {
        conversationService.addMessage(targetTeamId, conversationId, { role: 'user', content: userMessage.content })
          .catch(() => appendLocalErrorMessage(historyUserSyncFailedMessage));
      }
      return true;
    } catch (error) {
      streamRefs.timeoutManager.current.clear(runId);
      delete streamRefs.streamContextsRef.current[runId];
      useChatStore.getState().setActiveStreamId(null);

      if (!gatewayConnected && retryCount < MAX_RETRIES) {
        useChatStore.getState().deleteMessage(runId);
        if (!options?.skipLocalMessage) {
          const pendingConversationId = conversationId ?? lastCreatedConversationIdRef.current ?? undefined;
          useChatStore.getState().addToPendingQueue({
            id: userMessage.id,
            content: userMessage.content,
            retryCount: retryCount + 1,
            timestamp: Date.now(),
            conversationId: pendingConversationId,
            teamId: targetTeamId,
            expertId: currentExpertId,
            mcpServerIds: [...targetMcpServerIds],
            skillIds: [...targetSkillIds],
            extensionIds: [...targetExtensionIds],
            modelId: targetModelId,
            attachments: targetAttachments.map(({ type, name, mimeType, data, sizeBytes }) => ({ type, name, mimeType, data, sizeBytes })),
          });
        }
        useChatStore.getState().updateMessage(userMessage.id, { status: 'pending' });
      } else {
        const errorMessage = getErrorMessage(error, gatewayConnected);
        const canConfirmNotCharged = !errorMessage.toLowerCase().includes(timeoutKeyword.toLowerCase());
        useChatStore.getState().updateMessage(runId, {
          content: `❌ ${canConfirmNotCharged ? lingqiNotChargedMessage(errorMessage, notChargedSuffix) : `${errorMessage}${chargeUnknownSuffix}`}`,
          status: 'error',
        });
      }
      useChatStore.getState().setSending(false);
      return false;
    }
  }, [attachmentOnlyMessage, attachments, chargeUnknownSuffix, conversations, createConversation, currentConversationId, errorSendFailed, estimateCost, estimateFailedMessage, gatewayConnected, getErrorMessage, historyUserSyncFailedMessage, insufficientLingqiMessage, isSending, lingqiStatus, navigate, newConversationFailedMessage, notChargedSuffix, refreshStatus, renameConversation, selectedMCPServerIds, selectedSkillIds, selectedExtensionIds, selectedExpertId, selectedModelId, send, sessionKey, setAttachments, setConversationExpert, setConversationExtensions, setConversationMcpServers, setConversationSkills, setCurrentConversationId, setMessage, streamRefs, teamId, teamRequiredMessage, timeoutAbortSyncFailedMessage, timeoutHistorySyncFailedMessage, timeoutKeyword, timeoutRetry]);

  useEffect(() => {
    if (!gatewayConnected || isSending) return;
    const pendingMsg = useChatStore.getState().getPendingMessages().find((msg) => !retriedPendingMessageIdsRef.current.has(msg.id));
    if (!pendingMsg) return;
    retriedPendingMessageIdsRef.current.add(pendingMsg.id);
    handleSendWithContent(pendingMsg.content, pendingMsg.retryCount, pendingMsg, { skipLocalMessage: true, messageId: pendingMsg.id })
      .then((succeeded) => {
        retriedPendingMessageIdsRef.current.delete(pendingMsg.id);
        if (succeeded) useChatStore.getState().removeFromPendingQueue(pendingMsg.id);
        else useChatStore.getState().updateMessage(pendingMsg.id, { status: 'pending' });
      })
      .catch(() => {
        retriedPendingMessageIdsRef.current.delete(pendingMsg.id);
        useChatStore.getState().updateMessage(pendingMsg.id, { status: 'pending' });
      });
  }, [gatewayConnected, handleSendWithContent, isSending]);

  const handleSend = useCallback(() => handleSendWithContent(message.trim()), [handleSendWithContent, message]);

  const handleRegenerate = useCallback(() => {
    if (isSending) return;
    const lastAssistantIdx = [...messages].reverse().findIndex((message) => message.role === 'assistant' && message.status === 'complete');
    if (lastAssistantIdx === -1) return;
    const realIdx = messages.length - 1 - lastAssistantIdx;
    const lastAssistant = messages[realIdx];
    const lastUserMsg = [...messages.slice(0, realIdx)].reverse().find((message) => message.role === 'user');
    if (!lastUserMsg) return;
    useChatStore.getState().deleteMessage(lastAssistant.id);
    handleSendWithContent(lastUserMsg.content);
  }, [handleSendWithContent, isSending, messages]);

  const handleStopGeneration = useCallback(async (): Promise<void> => {
    if (!activeStreamId) return;
    const messageId = activeStreamId;
    const currentStreamMessage = useChatStore.getState().messages.find((message) => message.id === messageId);
    try {
      const response = await send('hermes.abort', { messageId });
      if (!response?.ok) {
        appendLocalErrorMessage(stopGenerationFailedMessage(response?.error || stopGenerationRetryMessage));
        return;
      }
      streamRefs.timeoutManager.current.clear(messageId);
      if (currentStreamMessage) {
        useChatStore.getState().updateMessage(messageId, {
          content: currentStreamMessage.content || timeoutRetry,
          status: 'complete',
        });
      }
      delete streamRefs.streamContextsRef.current[messageId];
      useChatStore.getState().setActiveStreamId(null);
      useChatStore.getState().setSending(false);
    } catch {
      appendLocalErrorMessage(stopGenerationFailedMessage(stopGenerationRetryMessage));
    }
  }, [activeStreamId, send, stopGenerationFailedMessage, stopGenerationRetryMessage, streamRefs, timeoutRetry]);

  return {
    handleSendWithContent,
    handleSend,
    handleRegenerate,
    handleStopGeneration,
  };
}
