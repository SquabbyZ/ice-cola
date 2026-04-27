/**
 * SqliteSessionRepository 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SqliteSessionRepository } from '../sqlite-session-repo';

describe('SqliteSessionRepository', () => {
  let repo: SqliteSessionRepository;
  let mockDb: any;

  beforeEach(() => {
    // 创建仓库实例
    repo = new SqliteSessionRepository(':memory:');
    
    // 获取 mock 数据库实例
    mockDb = (repo as any).db;

    // 重置所有 mock
    vi.clearAllMocks();

    // Mock initialize 方法以避免实际创建表
    vi.spyOn(repo as any, 'createTables').mockResolvedValue(undefined);
    (repo as any).initialized = true;
  });

  describe('create', () => {
    it('should create a new session with generated ID and timestamps', async () => {
      const sessionData = {
        userId: 'user-123',
        name: 'Test Session',
      };

      mockDb.execute.mockResolvedValue({ rowsAffected: 1 });

      const result = await repo.create(sessionData);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sessions'),
        expect.arrayContaining([
          expect.any(String), // id
          'user-123',
          'Test Session',
          expect.any(String), // created_at
          expect.any(String), // updated_at
        ])
      );

      expect(result).toMatchObject({
        userId: 'user-123',
        name: 'Test Session',
        id: expect.any(String),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });
  });

  describe('findById', () => {
    it('should return session when found', async () => {
      const mockRow = {
        id: 'session-1',
        user_id: 'user-123',
        name: 'Test Session',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      mockDb.select.mockResolvedValue([mockRow]);

      const result = await repo.findById('session-1');

      expect(mockDb.select).toHaveBeenCalledWith(
        'SELECT * FROM sessions WHERE id = ?',
        ['session-1']
      );

      expect(result).toEqual({
        id: 'session-1',
        userId: 'user-123',
        name: 'Test Session',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      });
    });

    it('should return null when session not found', async () => {
      mockDb.select.mockResolvedValue([]);

      const result = await repo.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should return all sessions for a user ordered by updated_at DESC', async () => {
      const mockRows = [
        {
          id: 'session-1',
          user_id: 'user-123',
          name: 'Session 1',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-02T00:00:00.000Z',
        },
        {
          id: 'session-2',
          user_id: 'user-123',
          name: 'Session 2',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ];

      mockDb.select.mockResolvedValue(mockRows);

      const result = await repo.findByUserId('user-123');

      expect(mockDb.select).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY updated_at DESC'),
        ['user-123']
      );

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('session-1');
      expect(result[1].id).toBe('session-2');
    });

    it('should return empty array when no sessions found', async () => {
      mockDb.select.mockResolvedValue([]);

      const result = await repo.findByUserId('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update session name and updated_at timestamp', async () => {
      const existingSession = {
        id: 'session-1',
        userId: 'user-123',
        name: 'Old Name',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      };

      // Mock findById to return existing session
      vi.spyOn(repo, 'findById').mockResolvedValue(existingSession);
      mockDb.execute.mockResolvedValue({ rowsAffected: 1 });

      const result = await repo.update('session-1', { name: 'New Name' });

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE sessions SET'),
        expect.arrayContaining(['New Name', expect.any(String), 'session-1'])
      );

      expect(result.name).toBe('New Name');
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw error when updating non-existent session', async () => {
      vi.spyOn(repo, 'findById').mockResolvedValue(null);

      await expect(repo.update('non-existent', { name: 'New Name' }))
        .rejects.toThrow('Session non-existent not found');
    });
  });

  describe('delete', () => {
    it('should delete session by id', async () => {
      mockDb.execute.mockResolvedValue({ rowsAffected: 1 });

      await repo.delete('session-1');

      expect(mockDb.execute).toHaveBeenCalledWith(
        'DELETE FROM sessions WHERE id = ?',
        ['session-1']
      );
    });
  });
});
