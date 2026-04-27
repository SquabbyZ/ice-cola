/**
 * SqliteExpertPromptRepository 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SqliteExpertPromptRepository } from './sqlite-expert-repo';

describe('SqliteExpertPromptRepository', () => {
  let repo: SqliteExpertPromptRepository;

  beforeEach(async () => {
    repo = new SqliteExpertPromptRepository(':memory:');
    await repo.initialize();
  });

  describe('create()', () => {
    it('应该成功创建Expert Prompt', async () => {
      const prompt = await repo.create({
        userId: 'user-123',
        name: 'Python Expert',
        description: 'Python编程专家',
        systemPrompt: 'You are a Python expert...',
        tags: ['python', 'coding'],
        isActive: true,
      });

      expect(prompt).toBeDefined();
      expect(prompt.id).toBeDefined();
      expect(prompt.userId).toBe('user-123');
      expect(prompt.name).toBe('Python Expert');
      expect(prompt.description).toBe('Python编程专家');
      expect(prompt.systemPrompt).toBe('You are a Python expert...');
      expect(prompt.tags).toEqual(['python', 'coding']);
      expect(prompt.isActive).toBe(true);
      expect(prompt.createdAt).toBeInstanceOf(Date);
      expect(prompt.updatedAt).toBeInstanceOf(Date);
    });

    it('应该支持空标签数组', async () => {
      const prompt = await repo.create({
        userId: 'user-1',
        name: 'No Tags',
        description: 'No tags prompt',
        systemPrompt: 'System prompt',
        tags: [],
        isActive: true,
      });

      expect(prompt.tags).toEqual([]);
    });
  });

  describe('findById()', () => {
    it('应该根据ID找到Expert Prompt', async () => {
      const created = await repo.create({
        userId: 'user-1',
        name: 'Find Me',
        description: 'Description',
        systemPrompt: 'System',
        tags: ['test'],
        isActive: true,
      });

      const found = await repo.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.name).toBe('Find Me');
      expect(found?.tags).toEqual(['test']);
    });

    it('应该返回null当Expert Prompt不存在时', async () => {
      const found = await repo.findById('non-existent');
      expect(found).toBeNull();
    });
  });

  describe('findByUserId()', () => {
    it('应该返回用户的所有Expert Prompts', async () => {
      await repo.create({ userId: 'user-1', name: 'Prompt 1', description: 'D1', systemPrompt: 'S1', tags: ['t1'], isActive: true });
      await repo.create({ userId: 'user-1', name: 'Prompt 2', description: 'D2', systemPrompt: 'S2', tags: ['t2'], isActive: false });
      await repo.create({ userId: 'user-2', name: 'Prompt 3', description: 'D3', systemPrompt: 'S3', tags: ['t3'], isActive: true });

      const prompts = await repo.findByUserId('user-1');

      expect(prompts.length).toBe(2);
      expect(prompts.map(p => p.name)).toEqual(['Prompt 2', 'Prompt 1']);
    });

    it('应该按更新时间降序排列', async () => {
      const prompt1 = await repo.create({ userId: 'u1', name: 'First', description: 'D', systemPrompt: 'S', tags: [], isActive: true });
      await new Promise(resolve => setTimeout(resolve, 10));
      const prompt2 = await repo.create({ userId: 'u1', name: 'Second', description: 'D', systemPrompt: 'S', tags: [], isActive: true });

      const prompts = await repo.findByUserId('u1');

      expect(prompts[0].id).toBe(prompt2.id);
      expect(prompts[1].id).toBe(prompt1.id);
    });
  });

  describe('findActiveByUserId()', () => {
    it('应该只返回活跃的Expert Prompts', async () => {
      await repo.create({ userId: 'user-1', name: 'Active 1', description: 'D', systemPrompt: 'S', tags: ['t1'], isActive: true });
      await repo.create({ userId: 'user-1', name: 'Inactive', description: 'D', systemPrompt: 'S', tags: ['t2'], isActive: false });
      await repo.create({ userId: 'user-1', name: 'Active 2', description: 'D', systemPrompt: 'S', tags: ['t3'], isActive: true });

      const activePrompts = await repo.findActiveByUserId('user-1');

      expect(activePrompts.length).toBe(2);
      expect(activePrompts.every(p => p.isActive)).toBe(true);
      expect(activePrompts.map(p => p.name)).toEqual(['Active 2', 'Active 1']);
    });
  });

  describe('searchByTags()', () => {
    it('应该根据标签搜索Expert Prompts', async () => {
      await repo.create({ userId: 'user-1', name: 'Python', description: 'D', systemPrompt: 'S', tags: ['python', 'coding'], isActive: true });
      await repo.create({ userId: 'user-1', name: 'JavaScript', description: 'D', systemPrompt: 'S', tags: ['javascript', 'web'], isActive: true });
      await repo.create({ userId: 'user-1', name: 'Data Science', description: 'D', systemPrompt: 'S', tags: ['python', 'data'], isActive: true });

      const results = await repo.searchByTags('user-1', ['python']);

      expect(results.length).toBe(2);
      expect(results.map(p => p.name)).toEqual(['Data Science', 'Python']);
    });

    it('应该匹配任一标签', async () => {
      await repo.create({ userId: 'user-1', name: 'Python', description: 'D', systemPrompt: 'S', tags: ['python'], isActive: true });
      await repo.create({ userId: 'user-1', name: 'Web Dev', description: 'D', systemPrompt: 'S', tags: ['javascript'], isActive: true });
      await repo.create({ userId: 'user-1', name: 'Other', description: 'D', systemPrompt: 'S', tags: ['other'], isActive: true });

      const results = await repo.searchByTags('user-1', ['python', 'javascript']);

      expect(results.length).toBe(2);
    });

    it('应该在无匹配时返回空数组', async () => {
      await repo.create({ userId: 'user-1', name: 'Python', description: 'D', systemPrompt: 'S', tags: ['python'], isActive: true });

      const results = await repo.searchByTags('user-1', ['nonexistent']);

      expect(results).toEqual([]);
    });
  });

  describe('update()', () => {
    it('应该更新Expert Prompt名称', async () => {
      const prompt = await repo.create({
        userId: 'user-1',
        name: 'Old Name',
        description: 'Description',
        systemPrompt: 'System',
        tags: ['tag1'],
        isActive: true,
      });

      const updated = await repo.update(prompt.id, {
        name: 'New Name',
      });

      expect(updated.name).toBe('New Name');
      expect(updated.updatedAt.getTime()).toBeGreaterThan(prompt.updatedAt.getTime());
    });

    it('应该更新systemPrompt', async () => {
      const prompt = await repo.create({
        userId: 'user-1',
        name: 'Test',
        description: 'D',
        systemPrompt: 'Old System Prompt',
        tags: [],
        isActive: true,
      });

      const updated = await repo.update(prompt.id, {
        systemPrompt: 'New System Prompt',
      });

      expect(updated.systemPrompt).toBe('New System Prompt');
    });

    it('应该更新tags', async () => {
      const prompt = await repo.create({
        userId: 'user-1',
        name: 'Test',
        description: 'D',
        systemPrompt: 'S',
        tags: ['old'],
        isActive: true,
      });

      const updated = await repo.update(prompt.id, {
        tags: ['new', 'tags'],
      });

      expect(updated.tags).toEqual(['new', 'tags']);
    });

    it('应该更新isActive状态', async () => {
      const prompt = await repo.create({
        userId: 'user-1',
        name: 'Test',
        description: 'D',
        systemPrompt: 'S',
        tags: [],
        isActive: true,
      });

      const updated = await repo.update(prompt.id, {
        isActive: false,
      });

      expect(updated.isActive).toBe(false);
    });

    it('应该抛出错误当Expert Prompt不存在时', async () => {
      await expect(
        repo.update('non-existent', { name: 'Test' })
      ).rejects.toThrow('ExpertPrompt non-existent not found');
    });
  });

  describe('delete()', () => {
    it('应该删除Expert Prompt', async () => {
      const prompt = await repo.create({
        userId: 'user-1',
        name: 'To Delete',
        description: 'D',
        systemPrompt: 'S',
        tags: [],
        isActive: true,
      });

      await repo.delete(prompt.id);

      const found = await repo.findById(prompt.id);
      expect(found).toBeNull();
    });
  });

  describe('数据完整性', () => {
    it('应该正确存储和检索JSON标签', async () => {
      const tags = ['python', 'machine-learning', 'data-science', 'advanced'];
      
      const prompt = await repo.create({
        userId: 'user-1',
        name: 'Complex Tags',
        description: 'D',
        systemPrompt: 'S',
        tags,
        isActive: true,
      });

      const found = await repo.findById(prompt.id);
      
      expect(found?.tags).toEqual(tags);
    });

    it('应该支持特殊字符的systemPrompt', async () => {
      const systemPrompt = 'You are an expert.\n\nRules:\n1. Always be helpful\n2. Use markdown\n3. Include examples\n\nExample:\n```python\nprint("Hello")\n```';
      
      const prompt = await repo.create({
        userId: 'user-1',
        name: 'Special Chars',
        description: 'D',
        systemPrompt,
        tags: [],
        isActive: true,
      });

      const found = await repo.findById(prompt.id);
      
      expect(found?.systemPrompt).toBe(systemPrompt);
    });
  });
});
