import { useEffect, useRef } from 'react';
import { TimeoutManager } from '@/lib/timeout-manager';
import { conversationService } from '@/services/conversation-service';
import { useChatStore, type ChatMessage } from '@/stores/chat';
import {
  appendLocalErrorMessage,
  type HermesDeltaEvent,
  type HermesErrorEvent,
  type HermesFinalEvent,
  type HermesToolEvent,
  type StreamContext,
} from './chatPageUtils';

interface UseHermesStreamEventsParams {
  messages: ChatMessage[];
  on: (event: string, handler: (data: unknown) => void) => () => void;
  refreshStatus: (teamId: string) => Promise<unknown>;
  sendFailedMessage: string;
  historyAssistantSyncFailedMessage: string;
  chargeUnknownSuffix: string;
}

export interface HermesStreamRefs {
  timeoutManager: React.MutableRefObject<TimeoutManager>;
  messagesRef: React.MutableRefObject<ChatMessage[]>;
  deltaAccumulatorRef: React.MutableRefObject<Record<string, string>>;
  streamContextsRef: React.MutableRefObject<Record<string, StreamContext>>;
  timedOutStreamIdsRef: React.MutableRefObject<Set<string>>;
}

export function useHermesStreamEvents({
  messages,
  on,
  refreshStatus,
  sendFailedMessage,
  historyAssistantSyncFailedMessage,
  chargeUnknownSuffix,
}: UseHermesStreamEventsParams): HermesStreamRefs {
  const timeoutManager = useRef(new TimeoutManager());
  const messagesRef = useRef(messages);
  const chatListenerRegisteredRef = useRef(false);
  const deltaAccumulatorRef = useRef<Record<string, string>>({});
  const streamContextsRef = useRef<Record<string, StreamContext>>({});
  const timedOutStreamIdsRef = useRef<Set<string>>(new Set());
  const pendingFlushRef = useRef<Set<string>>(new Set());
  const rafIdRef = useRef<number>(0);
  const displayedLengthRef = useRef<Record<string, number>>({});
  const animatingRef = useRef<boolean>(false);
  const CHARS_PER_FRAME = 3;

  messagesRef.current = messages;

  useEffect(() => {
    const manager = timeoutManager.current;
    return () => {
      manager.clearAll();
    };
  }, []);

  useEffect(() => {
    if (chatListenerRegisteredRef.current) return;

    const animateTypewriter = (): void => {
      rafIdRef.current = 0;
      const store = useChatStore.getState();
      let hasMore = false;

      for (const msgId of pendingFlushRef.current) {
        const full = deltaAccumulatorRef.current[msgId];
        if (!full) continue;
        const current = displayedLengthRef.current[msgId] || 0;
        if (current < full.length) {
          const next = Math.min(current + CHARS_PER_FRAME, full.length);
          displayedLengthRef.current[msgId] = next;
          hasMore = true;
        }

        const displayText = full.slice(0, displayedLengthRef.current[msgId]);
        const currentMessages = messagesRef.current;
        const messageIndex = currentMessages.findIndex((msg) => msg.runId === msgId);
        if (messageIndex >= 0) {
          store.updateMessage(currentMessages[messageIndex].id, {
            content: displayText,
            status: 'streaming',
            displayLength: displayedLengthRef.current[msgId],
          });
        } else {
          store.addMessage({
            id: msgId,
            role: 'assistant',
            content: displayText,
            timestamp: Date.now(),
            status: 'streaming',
            runId: msgId,
            displayLength: displayedLengthRef.current[msgId],
          });
        }
      }

      if (hasMore) {
        rafIdRef.current = requestAnimationFrame(animateTypewriter);
      } else {
        animatingRef.current = false;
        pendingFlushRef.current.clear();
      }
    };

    const scheduleFlush = (): void => {
      if (!animatingRef.current) {
        animatingRef.current = true;
        rafIdRef.current = requestAnimationFrame(animateTypewriter);
      }
    };

    const handleHermesDelta = (data: HermesDeltaEvent): void => {
      const msgId = data.messageId || data.runId;
      if (!msgId || timedOutStreamIdsRef.current.has(msgId)) return;

      deltaAccumulatorRef.current[msgId] = (deltaAccumulatorRef.current[msgId] || '') + (data.delta || '');
      pendingFlushRef.current.add(msgId);
      scheduleFlush();
      timeoutManager.current.clear(msgId);
    };

    const handleHermesFinal = (data: HermesFinalEvent): void => {
      const msgId = data.messageId || data.runId;
      if (!msgId || timedOutStreamIdsRef.current.has(msgId)) return;

      timeoutManager.current.clear(msgId);
      const finalContent = data.content || deltaAccumulatorRef.current[msgId] || '';
      const streamContext = streamContextsRef.current[msgId];
      const currentMessages = messagesRef.current;
      const messageIndex = currentMessages.findIndex((msg) => msg.runId === msgId);

      // Set accumulator and displayLength to final values but DO NOT remove from pendingFlushRef.
      // This lets the rAF animation finish naturally and display the complete content.
      deltaAccumulatorRef.current[msgId] = finalContent;
      displayedLengthRef.current[msgId] = finalContent.length;
      // pendingFlushRef.current.delete(msgId) is intentionally omitted — the animation frame
      // that follows will detect hasMore=false and clean up itself.

      if (messageIndex >= 0) {
        useChatStore.getState().updateMessage(currentMessages[messageIndex].id, {
          content: finalContent,
          status: 'complete',
          displayLength: finalContent.length,
        });
      } else if (finalContent && !currentMessages.find((msg) => msg.id === msgId)) {
        useChatStore.getState().addMessage({
          id: msgId,
          role: 'assistant',
          content: finalContent,
          timestamp: Date.now(),
          status: 'complete',
          runId: msgId,
          displayLength: finalContent.length,
        });
      }

      if (streamContext?.conversationId && finalContent) {
        conversationService.addMessage(streamContext.teamId, streamContext.conversationId, {
          role: 'assistant',
          content: finalContent,
        }).catch(() => appendLocalErrorMessage(historyAssistantSyncFailedMessage));
      }

      if (streamContext?.teamId) {
        refreshStatus(streamContext.teamId).catch(() => {
          // refreshStatus records the error in the Lingqi store for user-facing display
        });
      }

      // Clean up only after animation has had a chance to run
      setTimeout(() => {
        delete deltaAccumulatorRef.current[msgId];
        delete displayedLengthRef.current[msgId];
        pendingFlushRef.current.delete(msgId);
        delete streamContextsRef.current[msgId];
      }, 500);

      useChatStore.getState().setSending(false);
      useChatStore.getState().setActiveStreamId(null);
    };

    const handleHermesError = (data: HermesErrorEvent): void => {
      const msgId = data.messageId || data.runId;
      if (!msgId) return;

      timeoutManager.current.clear(msgId);
      delete displayedLengthRef.current[msgId];
      pendingFlushRef.current.delete(msgId);
      delete streamContextsRef.current[msgId];
      const currentMessages = messagesRef.current;
      const messageIndex = currentMessages.findIndex((msg) => msg.runId === msgId);
      const errorMessage = data.error || sendFailedMessage;

      if (timedOutStreamIdsRef.current.has(msgId)) return;

      if (messageIndex >= 0) {
        useChatStore.getState().updateMessage(currentMessages[messageIndex].id, {
          content: `❌ ${errorMessage}${chargeUnknownSuffix}`,
          status: 'error',
        });
      } else {
        useChatStore.getState().addMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `❌ ${errorMessage}${chargeUnknownSuffix}`,
          timestamp: Date.now(),
          status: 'error',
        });
      }

      delete deltaAccumulatorRef.current[msgId];
      delete displayedLengthRef.current[msgId];
      useChatStore.getState().setSending(false);
      useChatStore.getState().setActiveStreamId(null);
    };

    const handleHermesTool = (data: HermesToolEvent): void => {
      const msgId = data.messageId || data.runId;
      if (!msgId) return;

      const currentMessages = messagesRef.current;
      const messageIndex = currentMessages.findIndex((msg) => msg.runId === msgId);
      if (messageIndex < 0) return;

      const msg = currentMessages[messageIndex];
      const existingToolCall = msg.toolCalls?.find((toolCall) => toolCall.toolCallId === data.toolCallId);

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
    const unsubscribeHermesDelta = on('hermes.delta', (data) => handleHermesDelta(data as HermesDeltaEvent));
    const unsubscribeHermesFinal = on('hermes.final', (data) => handleHermesFinal(data as HermesFinalEvent));
    const unsubscribeHermesError = on('hermes.error', (data) => handleHermesError(data as HermesErrorEvent));
    const unsubscribeHermesTool = on('hermes.tool', (data) => handleHermesTool(data as HermesToolEvent));

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = 0;
      animatingRef.current = false;
      pendingFlushRef.current.clear();
      displayedLengthRef.current = {};
      unsubscribeHermesDelta();
      unsubscribeHermesFinal();
      unsubscribeHermesError();
      unsubscribeHermesTool();
      chatListenerRegisteredRef.current = false;
    };
  }, [chargeUnknownSuffix, historyAssistantSyncFailedMessage, on, refreshStatus, sendFailedMessage]);

  return {
    timeoutManager,
    messagesRef,
    deltaAccumulatorRef,
    streamContextsRef,
    timedOutStreamIdsRef,
  };
}
