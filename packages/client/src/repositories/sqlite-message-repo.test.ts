/**
 * SqliteMessageRepository 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SqliteMessageRepository } from './sqlite-message-repo';

describe('SqliteMessageRepository', () => {
  let repo: SqliteMessageRepository;

  beforeEach(async () => {
    repo = new SqliteMessageRepository(':memory:');
    await repo.initialize();
  });

  describe('create()', () => {
    it('应该成功创建用户消息', async () => {
      const message = await repo.create({
        conversationId: 'conv-123',
        role: 'user',
        content: 'Hello!',
      });

      expect(message).toBeDefined();
      expect(message.id).toBeDefined();
      expect(message.role).toBe('user');
      expect(message.content).toBe('Hello!');
      expect(message.model).toBeUndefined();
      expect(message.createdAt).toBeInstanceOf(Date);
    });

    it('应该成功创建助手消息并记录模型', async () => {
      const message = await repo.create({
        conversationId: 'conv-123',
        role: 'assistant',
        content: 'Hi there!',
        model: 'gpt-4',
      });

      expect(message.role).toBe('assistant');
      expect(message.model).toBe('gpt-4');
    });

    it('应该支持system角色', async () => {
      const message = await repo.create({
        conversationId: 'conv-123',
        role: 'system',
        content: 'You are a helpful assistant.',
      });

      expect(message.role).toBe('system');
    });
  });

  describe('findById()', () => {
    it('应该根据ID找到消息', async () => {
      const created = await repo.create({
        conversationId: 'conv-1',
        role: 'user',
        content: 'Find me',
      });

      const found = await repo.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.content).toBe('Find me');
    });

    it('应该返回null当消息不存在时', async () => {
      const found = await repo.findById('non-existent');
      expect(found).toBeNull();
    });
  });

  describe('findByConversationId()', () => {
    it('应该返回对话的所有消息', async () => {
      await repo.create({ conversationId: 'conv-1', role: 'user', content: 'Msg 1' });
      await repo.create({ conversationId: 'conv-1', role: 'assistant', content: 'Msg 2', model: 'gpt-4' });
      await repo.create({ conversationId: 'conv-2', role: 'user', content: 'Msg 3' });

      const messages = await repo.findByConversationId('conv-1');

      expect(messages.length).toBe(2);
      expect(messages.map(m => m.content)).toEqual(['Msg 1', 'Msg 2']);
    });

    it('应该按创建时间升序排列', async () => {
      await repo.create({ conversationId: 'conv-1', role: 'user', content: 'First' });
      await repo.create({ conversationId: 'conv-1', role: 'assistant', content: 'Second', model: 'gpt-4' });

      const messages = await repo.findByConversationId('conv-1');

      expect(messages[0].content).toBe('First');
      expect(messages[1].content).toBe('Second');
    });

    it('应该支持limit参数', async () => {
      for (let i = 1; i <= 5; i++) {
        await repo.create({
          conversationId: 'conv-1',
          role: 'user',
          content: `Msg ${i}`,
        });
      }

      const messages = await repo.findByConversationId('conv-1', 3);

      expect(messages.length).toBe(3);
    });

    it('应该在空结果时返回空数组', async () => {
      const messages = await repo.findByConversationId('non-existent');
      expect(messages).toEqual([]);
    });
  });

  describe('update()', () => {
    it('应该更新消息内容', async () => {
      const msg = await repo.create({
        conversationId: 'conv-1',
        role: 'assistant',
        content: 'Old content',
        model: 'gpt-4',
      });

      const updated = await repo.update(msg.id, {
        content: 'New content',
      });

      expect(updated.content).toBe('New content');
    });

    it('应该更新模型名称', async () => {
      const msg = await repo.create({
        conversationId: 'conv-1',
        role: 'assistant',
        content: 'Test',
        model: 'gpt-3.5',
      });

      const updated = await repo.update(msg.id, {
        model: 'gpt-4',
      });

      expect(updated.model).toBe('gpt-4');
    });

    it('应该抛出错误当消息不存在时', async () => {
      await expect(
        repo.update('non-existent', { content: 'Test' })
      ).rejects.toThrow('Message non-existent not found');
    });
  });

  describe('delete()', () => {
    it('应该删除单条消息', async () => {
      const msg = await repo.create({
        conversationId: 'conv-1',
        role: 'user',
        content: 'Delete me',
      });

      await repo.delete(msg.id);

      const found = await repo.findById(msg.id);
      expect(found).toBeNull();
    });

    it('应该删除对话的所有消息', async () => {
      await repo.create({ conversationId: 'conv-1', role: 'user', content: 'Msg 1' });
      await repo.create({ conversationId: 'conv-1', role: 'assistant', content: 'Msg 2', model: 'gpt-4' });
      await repo.create({ conversationId: 'conv-2', role: 'user', content: 'Msg 3' });

      const deletedCount = await repo.deleteByConversationId('conv-1');

      expect(deletedCount).toBe(2);

      const remaining = await repo.findByConversationId('conv-1');
      expect(remaining.length).toBe(0);
    });
  });
});
