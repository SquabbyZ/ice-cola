/**
 * Conversation Service 单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { conversationService } from './conversation-service';

// Mock axios
vi.mock('axios', () => {
  const mAxios = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
  return { default: mAxios };
});

import axios from 'axios';

describe('ConversationService', () => {
  const mockAxios = axios as unknown as {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('getList', () => {
    it('calls API with team id and pagination params', async () => {
      const mockResponse = {
        data: {
          data: {
            conversations: [],
            pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
          },
        },
      };
      mockAxios.get.mockResolvedValue(mockResponse);

      await conversationService.getList('team-1', 1, 20);

      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/teams/team-1/conversations'),
        expect.objectContaining({
          params: { page: 1, pageSize: 20 },
          headers: {},
        })
      );
    });
  });

  describe('getById', () => {
    it('calls API with conversation id', async () => {
      const mockResponse = {
        data: {
          data: {
            id: 'conv-1',
            title: 'Test',
            platform: 'web',
            sessionId: null,
            teamId: 'team-1',
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      };
      mockAxios.get.mockResolvedValue(mockResponse);

      const result = await conversationService.getById('team-1', 'conv-1');

      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/conversations/conv-1'),
        expect.objectContaining({ headers: {} })
      );
      expect(result.id).toBe('conv-1');
    });
  });

  describe('create', () => {
    it('creates conversation with title', async () => {
      const mockResponse = {
        data: {
          data: {
            id: 'new-conv',
            title: 'New Chat',
            platform: 'web',
            sessionId: null,
            messageCount: 0,
            lastMessageAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      };
      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await conversationService.create('team-1', 'New Chat');

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/teams/team-1/conversations'),
        { title: 'New Chat' },
        expect.objectContaining({ headers: {} })
      );
      expect(result.title).toBe('New Chat');
    });
  });

  describe('updateTitle', () => {
    it('updates conversation title', async () => {
      mockAxios.put.mockResolvedValue({ data: {} });

      await conversationService.updateTitle('team-1', 'conv-1', 'Updated Title');

      expect(mockAxios.put).toHaveBeenCalledWith(
        expect.stringContaining('/conversations/conv-1'),
        { title: 'Updated Title' },
        expect.objectContaining({ headers: {} })
      );
    });
  });

  describe('delete', () => {
    it('deletes conversation', async () => {
      mockAxios.delete.mockResolvedValue({ data: {} });

      await conversationService.delete('team-1', 'conv-1');

      expect(mockAxios.delete).toHaveBeenCalledWith(
        expect.stringContaining('/conversations/conv-1'),
        expect.objectContaining({ headers: {} })
      );
    });
  });

  describe('addMessage', () => {
    it('adds message to conversation', async () => {
      const mockMessage = {
        id: 'msg-1',
        role: 'user' as const,
        content: 'Hello',
        createdAt: new Date(),
      };
      mockAxios.post.mockResolvedValue({ data: { data: mockMessage } });

      const result = await conversationService.addMessage('team-1', 'conv-1', {
        role: 'user',
        content: 'Hello',
      });

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/messages'),
        { role: 'user', content: 'Hello' },
        expect.objectContaining({ headers: {} })
      );
      expect(result.content).toBe('Hello');
    });
  });

  describe('updateMessage', () => {
    it('updates message content', async () => {
      mockAxios.put.mockResolvedValue({ data: {} });

      await conversationService.updateMessage('team-1', 'conv-1', 'msg-1', {
        content: 'Updated content',
      });

      expect(mockAxios.put).toHaveBeenCalledWith(
        expect.stringContaining('/messages/msg-1'),
        { content: 'Updated content' },
        expect.objectContaining({ headers: {} })
      );
    });
  });

  describe('deleteMessage', () => {
    it('deletes message', async () => {
      mockAxios.delete.mockResolvedValue({ data: {} });

      await conversationService.deleteMessage('team-1', 'conv-1', 'msg-1');

      expect(mockAxios.delete).toHaveBeenCalledWith(
        expect.stringContaining('/messages/msg-1'),
        expect.objectContaining({ headers: {} })
      );
    });
  });

  describe('authentication', () => {
    it('includes auth token when available', async () => {
      localStorage.setItem('accessToken', 'test-token');
      mockAxios.get.mockResolvedValue({ data: { data: { conversations: [], pagination: {} } } });

      await conversationService.getList('team-1');

      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: { Authorization: 'Bearer test-token' },
        })
      );
    });

    it('works without auth token', async () => {
      localStorage.removeItem('accessToken');
      mockAxios.get.mockResolvedValue({ data: { data: { conversations: [], pagination: {} } } });

      await conversationService.getList('team-1');

      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {},
        })
      );
    });
  });
});