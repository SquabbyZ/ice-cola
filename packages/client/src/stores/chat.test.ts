import { beforeEach, describe, expect, it } from 'vitest';
import { useChatStore, type PendingMessage } from './chat';

const pendingMessage: PendingMessage = {
  id: 'message-1',
  content: 'Analyze this file',
  retryCount: 1,
  timestamp: 1710000000000,
  conversationId: 'conversation-1',
  teamId: 'team-1',
  expertId: 'expert-1',
  mcpServerIds: ['filesystem', 'github'],
  attachments: [
    {
      type: 'file',
      name: 'notes.md',
      mimeType: 'text/markdown',
      data: 'IyBOb3Rlcw==',
    },
  ],
};

describe('useChatStore pending queue', () => {
  beforeEach(() => {
    useChatStore.setState({
      messages: [],
      pendingMessages: [],
      isSending: false,
      activeStreamId: null,
      editingMessageId: null,
      error: null,
    });
  });

  it('preserves conversation capability snapshot for pending retries', () => {
    useChatStore.getState().addToPendingQueue(pendingMessage);

    expect(useChatStore.getState().getPendingMessages()).toEqual([pendingMessage]);
  });

  it('removes a retried pending message without clearing unrelated queued messages', () => {
    const secondPendingMessage = {
      ...pendingMessage,
      id: 'message-2',
      conversationId: 'conversation-2',
    };
    useChatStore.getState().addToPendingQueue(pendingMessage);
    useChatStore.getState().addToPendingQueue(secondPendingMessage);

    useChatStore.getState().removeFromPendingQueue('message-1');

    expect(useChatStore.getState().getPendingMessages()).toEqual([secondPendingMessage]);
  });
});
