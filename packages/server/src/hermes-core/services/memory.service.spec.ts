import { Test, TestingModule } from '@nestjs/testing';
import { MemoryServiceImpl } from './memory.service';
import { DatabaseService } from '../../database/database.service';

describe('MemoryServiceImpl', () => {
  let service: MemoryServiceImpl;
  let db: jest.Mocked<DatabaseService>;

  const mockMessage: any = {
    id: 'msg-1',
    conversationId: 'conv-1',
    userId: 'user-1',
    role: 'user',
    content: 'Hello world',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemoryServiceImpl,
        {
          provide: DatabaseService,
          useValue: {
            query: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MemoryServiceImpl>(MemoryServiceImpl);
    db = module.get(DatabaseService);
  });

  describe('getRecentContext', () => {
    it('returns recent messages in chronological order', async () => {
      const messages = [
        { ...mockMessage, id: 'msg-1', content: 'First' },
        { ...mockMessage, id: 'msg-2', content: 'Second' },
        { ...mockMessage, id: 'msg-3', content: 'Third' },
      ];
      // DB returns in DESC order
      db.query.mockResolvedValue([messages[2], messages[1], messages[0]]);

      const result = await service.getRecentContext('conv-1', 10);

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('msg-1');
      expect(result[2].id).toBe('msg-3');
    });

    it('returns empty array on error', async () => {
      db.query.mockRejectedValue(new Error('DB error'));

      const result = await service.getRecentContext('conv-1');

      expect(result).toEqual([]);
    });

    it('uses default limit when not specified', async () => {
      db.query.mockResolvedValue([]);

      await service.getRecentContext('conv-1');

      expect(db.query).toHaveBeenCalledWith(
        expect.any(String),
        ['conv-1', 10]
      );
    });

    it('respects custom limit', async () => {
      db.query.mockResolvedValue([]);

      await service.getRecentContext('conv-1', 5);

      expect(db.query).toHaveBeenCalledWith(
        expect.any(String),
        ['conv-1', 5]
      );
    });
  });

  describe('searchRelevantMessages', () => {
    it('searches by keywords', async () => {
      const messages = [{ ...mockMessage, content: 'Hello world test' }];
      db.query.mockResolvedValue(messages);

      const result = await service.searchRelevantMessages('conv-1', 'hello world');

      expect(result).toEqual(messages);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.any(Array)
      );
    });

    it('falls back to recent context when no keywords', async () => {
      const messages = [mockMessage];
      db.query.mockResolvedValue([messages[0]]);

      const result = await service.searchRelevantMessages('conv-1', 'ab'); // too short

      // When keywords are too short (<3 chars), it falls back to getRecentContext
      expect(result).toHaveLength(1);
    });

    it('falls back to recent context on search error', async () => {
      db.query
        .mockRejectedValueOnce(new Error('Search failed'))
        .mockResolvedValue([mockMessage]);

      const result = await service.searchRelevantMessages('conv-1', 'hello world');

      expect(result).toHaveLength(1);
    });
  });

  describe('compressContext', () => {
    it('returns empty array for empty input', () => {
      const result = service.compressContext([]);
      expect(result).toEqual([]);
    });

    it('returns empty array for null input', () => {
      const result = service.compressContext(null as any);
      expect(result).toEqual([]);
    });

    it('keeps all messages when under token limit', () => {
      const messages: any[] = [
        { ...mockMessage, content: 'Short' },
        { ...mockMessage, content: 'Medium length' },
      ];

      const result = service.compressContext(messages, 1000);

      expect(result).toHaveLength(2);
    });

    it('truncates messages when over token limit', () => {
      // Create long messages that will exceed the limit
      const longContent = 'a'.repeat(1000); // ~333 tokens
      const messages: any[] = [
        { ...mockMessage, id: 'msg-1', content: longContent },
        { ...mockMessage, id: 'msg-2', content: longContent },
        { ...mockMessage, id: 'msg-3', content: longContent },
      ];

      const result = service.compressContext(messages, 500); // limit to ~500 tokens

      // Should keep only recent messages that fit
      expect(result.length).toBeLessThanOrEqual(messages.length);
      // Most recent message should be included
      expect(result[result.length - 1]?.id).toBe('msg-3');
    });

    it('preserves message order', () => {
      const messages: any[] = [
        { ...mockMessage, id: 'msg-1', content: 'First' },
        { ...mockMessage, id: 'msg-2', content: 'Second' },
        { ...mockMessage, id: 'msg-3', content: 'Third' },
      ];

      const result = service.compressContext(messages, 10000);

      expect(result[0].id).toBe('msg-1');
      expect(result[1].id).toBe('msg-2');
      expect(result[2].id).toBe('msg-3');
    });
  });
});