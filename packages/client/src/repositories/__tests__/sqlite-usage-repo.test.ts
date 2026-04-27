/**
 * SqliteUsageRepository 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SqliteUsageRepository } from '../sqlite-usage-repo';

describe('SqliteUsageRepository', () => {
  let repo: SqliteUsageRepository;
  let mockDb: any;

  beforeEach(() => {
    repo = new SqliteUsageRepository(':memory:');
    mockDb = (repo as any).db;
    vi.clearAllMocks();
    vi.spyOn(repo as any, 'createTables').mockResolvedValue(undefined);
    (repo as any).initialized = true;
  });

  describe('record', () => {
    it('should record usage with generated ID', async () => {
      const usageData = {
        userId: 'user-123',
        sessionId: 'session-1',
        conversationId: 'conv-1',
        messageId: 'msg-1',
        model: 'gpt-4',
        inputTokens: 100,
        outputTokens: 50,
        cost: 0.005,
        timestamp: new Date('2024-01-01T00:00:00.000Z'),
      };

      mockDb.execute.mockResolvedValue({ rowsAffected: 1 });

      const result = await repo.record(usageData);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO usage_records'),
        expect.arrayContaining([
          expect.any(String), // id
          'user-123',
          'session-1',
          'conv-1',
          'msg-1',
          'gpt-4',
          100,
          50,
          0.005,
          '2024-01-01T00:00:00.000Z',
        ])
      );

      expect(result).toMatchObject({
        ...usageData,
        id: expect.any(String),
      });
    });
  });

  describe('findByUserId', () => {
    it('should return usage records within time period', async () => {
      const mockRows = [
        {
          id: 'usage-1',
          user_id: 'user-123',
          session_id: 'session-1',
          conversation_id: 'conv-1',
          message_id: 'msg-1',
          model: 'gpt-4',
          input_tokens: 100,
          output_tokens: 50,
          cost: 0.005,
          timestamp: '2024-01-15T10:00:00.000Z',
        },
      ];

      mockDb.select.mockResolvedValue(mockRows);

      const period = {
        start: new Date('2024-01-01T00:00:00.000Z'),
        end: new Date('2024-01-31T23:59:59.999Z'),
      };

      const result = await repo.findByUserId('user-123', period);

      expect(mockDb.select).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = ? AND timestamp >= ? AND timestamp <= ?'),
        ['user-123', '2024-01-01T00:00:00.000Z', '2024-01-31T23:59:59.999Z']
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'usage-1',
        userId: 'user-123',
        sessionId: 'session-1',
        conversationId: 'conv-1',
        messageId: 'msg-1',
        model: 'gpt-4',
        inputTokens: 100,
        outputTokens: 50,
        cost: 0.005,
        timestamp: new Date('2024-01-15T10:00:00.000Z'),
      });
    });

    it('should return empty array when no records found', async () => {
      mockDb.select.mockResolvedValue([]);

      const period = {
        start: new Date('2024-01-01T00:00:00.000Z'),
        end: new Date('2024-01-31T23:59:59.999Z'),
      };

      const result = await repo.findByUserId('user-123', period);

      expect(result).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('should return aggregated statistics', async () => {
      const mockRow = {
        total_input: 5000,
        total_output: 2500,
        total_cost: 0.25,
        request_count: 10,
      };

      mockDb.select.mockResolvedValue([mockRow]);

      const period = {
        start: new Date('2024-01-01T00:00:00.000Z'),
        end: new Date('2024-01-31T23:59:59.999Z'),
      };

      const result = await repo.getStats('user-123', period);

      expect(mockDb.select).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        expect.arrayContaining(['user-123', expect.any(String), expect.any(String)])
      );

      expect(result).toEqual({
        totalInputTokens: 5000,
        totalOutputTokens: 2500,
        totalCost: 0.25,
        requestCount: 10,
      });
    });

    it('should return zeros when no records found', async () => {
      mockDb.select.mockResolvedValue([]);

      const period = {
        start: new Date('2024-01-01T00:00:00.000Z'),
        end: new Date('2024-01-31T23:59:59.999Z'),
      };

      const result = await repo.getStats('user-123', period);

      expect(result).toEqual({
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCost: 0,
        requestCount: 0,
      });
    });
  });

  describe('deleteOlderThan', () => {
    it('should delete records older than specified date', async () => {
      mockDb.execute.mockResolvedValue({ rowsAffected: 5 });

      const cutoffDate = new Date('2024-01-01T00:00:00.000Z');
      const result = await repo.deleteOlderThan(cutoffDate);

      expect(mockDb.execute).toHaveBeenCalledWith(
        'DELETE FROM usage_records WHERE timestamp < ?',
        ['2024-01-01T00:00:00.000Z']
      );

      expect(result).toBe(5);
    });

    it('should return 0 when no records deleted', async () => {
      mockDb.execute.mockResolvedValue({ rowsAffected: 0 });

      const cutoffDate = new Date('2024-01-01T00:00:00.000Z');
      const result = await repo.deleteOlderThan(cutoffDate);

      expect(result).toBe(0);
    });
  });
});
