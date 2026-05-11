import { Test, TestingModule } from '@nestjs/testing';
import { ConversationService } from './conversation.service';
import { DatabaseService } from '../database/database.service';
import { AppError } from '../common/interfaces/errors';

describe('ConversationService', () => {
  let service: ConversationService;
  let db: jest.Mocked<DatabaseService>;

  const mockConversation = {
    id: 'conv-1',
    teamId: 'team-1',
    userId: 'user-1',
    platform: 'hermes',
    sessionId: null,
    title: 'Test Conversation',
    createdAt: new Date(),
    updatedAt: new Date(),
    message_count: '5',
  };

  const mockMessage = {
    id: 'msg-1',
    conversationId: 'conv-1',
    userId: null,
    role: 'user',
    content: 'Hello',
    model: 'gpt-4',
    usage: { tokens: 100 },
    metadata: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationService,
        {
          provide: DatabaseService,
          useValue: {
            createConversation: jest.fn(),
            findConversationsByTeamId: jest.fn(),
            countConversationsByTeamId: jest.fn(),
            findConversationById: jest.fn(),
            findMessagesByConversationId: jest.fn(),
            createMessage: jest.fn(),
            updateConversation: jest.fn(),
            deleteMessagesByConversationId: jest.fn(),
            deleteConversation: jest.fn(),
            updateMessage: jest.fn(),
            deleteMessage: jest.fn(),
            findLastMessageByConversationId: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ConversationService>(ConversationService);
    db = module.get(DatabaseService);
  });

  describe('create', () => {
    it('creates a new conversation', async () => {
      db.createConversation.mockResolvedValue(mockConversation);

      const result = await service.create('team-1', 'Test Conversation');

      expect(result).toEqual(mockConversation);
      expect(db.createConversation).toHaveBeenCalledWith({
        teamId: 'team-1',
        userId: '',
        title: 'Test Conversation',
        platform: 'hermes',
      });
    });

    it('creates conversation with userId', async () => {
      db.createConversation.mockResolvedValue(mockConversation);

      await service.create('team-1', 'Test Conversation', 'user-1');

      expect(db.createConversation).toHaveBeenCalledWith({
        teamId: 'team-1',
        userId: 'user-1',
        title: 'Test Conversation',
        platform: 'hermes',
      });
    });
  });

  describe('getList', () => {
    it('returns paginated conversations', async () => {
      db.findConversationsByTeamId.mockResolvedValue([mockConversation]);
      db.countConversationsByTeamId.mockResolvedValue(1);
      db.findLastMessageByConversationId.mockResolvedValue(mockMessage);

      const result = await service.getList('team-1');

      expect(result.conversations).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
    });

    it('uses custom pagination options', async () => {
      db.findConversationsByTeamId.mockResolvedValue([]);
      db.countConversationsByTeamId.mockResolvedValue(50);
      db.findLastMessageByConversationId.mockResolvedValue(null);

      const result = await service.getList('team-1', { page: 2, pageSize: 10 });

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.pageSize).toBe(10);
    });

    it('returns empty list when no conversations', async () => {
      db.findConversationsByTeamId.mockResolvedValue([]);
      db.countConversationsByTeamId.mockResolvedValue(0);
      db.findLastMessageByConversationId.mockResolvedValue(null);

      const result = await service.getList('team-1');

      expect(result.conversations).toHaveLength(0);
    });
  });

  describe('getById', () => {
    it('returns conversation with messages', async () => {
      db.findConversationById.mockResolvedValue(mockConversation);
      db.findMessagesByConversationId.mockResolvedValue([mockMessage]);

      const result = await service.getById('team-1', 'conv-1');

      expect(result.id).toBe('conv-1');
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toBe('Hello');
    });

    it('throws AppError when conversation not found', async () => {
      db.findConversationById.mockResolvedValue(null);

      await expect(service.getById('team-1', 'nonexistent'))
        .rejects.toThrow(AppError);
    });
  });

  describe('addMessage', () => {
    it('adds message to conversation', async () => {
      db.findConversationById.mockResolvedValue(mockConversation);
      db.createMessage.mockResolvedValue(mockMessage);
      db.updateConversation.mockResolvedValue(null);

      const result = await service.addMessage('team-1', 'conv-1', {
        role: 'user',
        content: 'Hello',
      });

      expect(result.id).toBe('msg-1');
      expect(result.content).toBe('Hello');
    });

    it('throws AppError when conversation not found', async () => {
      db.findConversationById.mockResolvedValue(null);

      await expect(service.addMessage('team-1', 'nonexistent', {
        role: 'user',
        content: 'Hello',
      })).rejects.toThrow(AppError);
    });
  });

  describe('updateTitle', () => {
    it('updates conversation title', async () => {
      db.findConversationById.mockResolvedValue(mockConversation);
      db.updateConversation.mockResolvedValue(null);

      const result = await service.updateTitle('team-1', 'conv-1', 'New Title');

      expect(result.success).toBe(true);
      expect(db.updateConversation).toHaveBeenCalledWith('conv-1', { title: 'New Title' });
    });

    it('throws AppError when conversation not found', async () => {
      db.findConversationById.mockResolvedValue(null);

      await expect(service.updateTitle('team-1', 'nonexistent', 'New Title'))
        .rejects.toThrow(AppError);
    });
  });

  describe('delete', () => {
    it('deletes conversation and messages', async () => {
      db.findConversationById.mockResolvedValue(mockConversation);
      db.deleteMessagesByConversationId.mockResolvedValue(null);
      db.deleteConversation.mockResolvedValue(null);

      const result = await service.delete('team-1', 'conv-1');

      expect(result.success).toBe(true);
      expect(db.deleteMessagesByConversationId).toHaveBeenCalledWith('conv-1');
      expect(db.deleteConversation).toHaveBeenCalledWith('conv-1');
    });

    it('throws AppError when conversation not found', async () => {
      db.findConversationById.mockResolvedValue(null);

      await expect(service.delete('team-1', 'nonexistent'))
        .rejects.toThrow(AppError);
    });
  });

  describe('updateMessage', () => {
    it('updates message content', async () => {
      db.findConversationById.mockResolvedValue(mockConversation);
      db.updateMessage.mockResolvedValue({ ...mockMessage, content: 'Updated' });

      const result = await service.updateMessage('team-1', 'conv-1', 'msg-1', {
        content: 'Updated',
      });

      expect(result.content).toBe('Updated');
    });

    it('throws AppError when conversation not found', async () => {
      db.findConversationById.mockResolvedValue(null);

      await expect(service.updateMessage('team-1', 'nonexistent', 'msg-1', {
        content: 'Updated',
      })).rejects.toThrow(AppError);
    });
  });

  describe('deleteMessage', () => {
    it('deletes message', async () => {
      db.findConversationById.mockResolvedValue(mockConversation);
      db.deleteMessage.mockResolvedValue(null);

      const result = await service.deleteMessage('team-1', 'conv-1', 'msg-1');

      expect(result.success).toBe(true);
      expect(db.deleteMessage).toHaveBeenCalledWith('msg-1', 'conv-1');
    });

    it('throws AppError when conversation not found', async () => {
      db.findConversationById.mockResolvedValue(null);

      await expect(service.deleteMessage('team-1', 'nonexistent', 'msg-1'))
        .rejects.toThrow(AppError);
    });
  });
});