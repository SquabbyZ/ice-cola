/**
 * SqliteConversationRepository 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SqliteConversationRepository } from './sqlite-conversation-repo';

describe('SqliteConversationRepository', () => {
  let repo: SqliteConversationRepository;

  beforeEach(async () => {
    repo = new SqliteConversationRepository(':memory:');
    await repo.initialize();
  });

  describe('create()', () => {
    it('应该成功创建对话', async () => {
      const conversation = await repo.create({
        sessionId: 'session-123',
        title: 'Test Conversation',
      });

      expect(conversation).toBeDefined();
      expect(conversation.id).toBeDefined();
      expect(conversation.sessionId).toBe('session-123');
      expect(conversation.title).toBe('Test Conversation');
      expect(conversation.createdAt).toBeInstanceOf(Date);
      expect(conversation.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('findById()', () => {
    it('应该根据ID找到对话', async () => {
      const created = await repo.create({
        sessionId: 'session-1',
        title: 'Find Me',
      });

      const found = await repo.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.title).toBe('Find Me');
    });

    it('应该返回null当对话不存在时', async () => {
      const found = await repo.findById('non-existent');
      expect(found).toBeNull();
    });
  });

  describe('findBySessionId()', () => {
    it('应该返回会话的所有对话', async () => {
      await repo.create({ sessionId: 'session-1', title: 'Conv 1' });
      await repo.create({ sessionId: 'session-1', title: 'Conv 2' });
      await repo.create({ sessionId: 'session-2', title: 'Conv 3' });

      const conversations = await repo.findBySessionId('session-1');

      expect(conversations.length).toBe(2);
      expect(conversations.map(c => c.title)).toEqual(['Conv 2', 'Conv 1']);
    });

    it('应该按更新时间降序排列', async () => {
      const conv1 = await repo.create({ sessionId: 's1', title: 'First' });
      await new Promise(resolve => setTimeout(resolve, 10));
      const conv2 = await repo.create({ sessionId: 's1', title: 'Second' });

      const conversations = await repo.findBySessionId('s1');

      expect(conversations[0].id).toBe(conv2.id);
      expect(conversations[1].id).toBe(conv1.id);
    });

    it('应该在空结果时返回空数组', async () => {
      const conversations = await repo.findBySessionId('non-existent');
      expect(conversations).toEqual([]);
    });
  });

  describe('update()', () => {
    it('应该更新对话标题', async () => {
      const conv = await repo.create({
        sessionId: 'session-1',
        title: 'Old Title',
      });

      const updated = await repo.update(conv.id, {
        title: 'New Title',
      });

      expect(updated.title).toBe('New Title');
      expect(updated.updatedAt.getTime()).toBeGreaterThan(conv.updatedAt.getTime());
    });

    it('应该抛出错误当对话不存在时', async () => {
      await expect(
        repo.update('non-existent', { title: 'Test' })
      ).rejects.toThrow('Conversation non-existent not found');
    });
  });

  describe('delete()', () => {
    it('应该删除对话', async () => {
      const conv = await repo.create({
        sessionId: 'session-1',
        title: 'To Delete',
      });

      await repo.delete(conv.id);

      const found = await repo.findById(conv.id);
      expect(found).toBeNull();
    });
  });
});
