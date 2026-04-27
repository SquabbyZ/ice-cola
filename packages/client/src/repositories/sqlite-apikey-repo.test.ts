/**
 * SqliteApiKeyRepository 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SqliteApiKeyRepository } from './sqlite-apikey-repo';

describe('SqliteApiKeyRepository', () => {
  let repo: SqliteApiKeyRepository;

  beforeEach(async () => {
    repo = new SqliteApiKeyRepository(':memory:');
    await repo.initialize();
  });

  describe('create()', () => {
    it('应该成功创建API Key', async () => {
      const apiKey = await repo.create({
        userId: 'user-123',
        provider: 'openai',
        keyHash: 'hashed_key_abc123',
        name: 'My OpenAI Key',
        isActive: true,
      });

      expect(apiKey).toBeDefined();
      expect(apiKey.id).toBeDefined();
      expect(apiKey.userId).toBe('user-123');
      expect(apiKey.provider).toBe('openai');
      expect(apiKey.keyHash).toBe('hashed_key_abc123');
      expect(apiKey.name).toBe('My OpenAI Key');
      expect(apiKey.isActive).toBe(true);
      expect(apiKey.lastUsedAt).toBeNull();
      expect(apiKey.createdAt).toBeInstanceOf(Date);
      expect(apiKey.updatedAt).toBeInstanceOf(Date);
    });

    it('应该默认isActive为true', async () => {
      const apiKey = await repo.create({
        userId: 'user-1',
        provider: 'anthropic',
        keyHash: 'hash_1',
        name: 'Test Key',
        isActive: true,
      });

      expect(apiKey.isActive).toBe(true);
    });
  });

  describe('findById()', () => {
    it('应该根据ID找到API Key', async () => {
      const created = await repo.create({
        userId: 'user-1',
        provider: 'openai',
        keyHash: 'hash_1',
        name: 'Find Me',
        isActive: true,
      });

      const found = await repo.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.name).toBe('Find Me');
    });

    it('应该返回null当API Key不存在时', async () => {
      const found = await repo.findById('non-existent');
      expect(found).toBeNull();
    });
  });

  describe('findByUserId()', () => {
    it('应该返回用户的所有API Keys', async () => {
      await repo.create({ userId: 'user-1', provider: 'openai', keyHash: 'h1', name: 'Key 1', isActive: true });
      await repo.create({ userId: 'user-1', provider: 'anthropic', keyHash: 'h2', name: 'Key 2', isActive: false });
      await repo.create({ userId: 'user-2', provider: 'openai', keyHash: 'h3', name: 'Key 3', isActive: true });

      const keys = await repo.findByUserId('user-1');

      expect(keys.length).toBe(2);
      expect(keys.map(k => k.name)).toEqual(['Key 2', 'Key 1']);
    });

    it('应该按创建时间降序排列', async () => {
      const key1 = await repo.create({ userId: 'u1', provider: 'openai', keyHash: 'h1', name: 'First', isActive: true });
      await new Promise(resolve => setTimeout(resolve, 10));
      const key2 = await repo.create({ userId: 'u1', provider: 'openai', keyHash: 'h2', name: 'Second', isActive: true });

      const keys = await repo.findByUserId('u1');

      expect(keys[0].id).toBe(key2.id);
      expect(keys[1].id).toBe(key1.id);
    });
  });

  describe('findActiveByUserId()', () => {
    it('应该只返回活跃的API Keys', async () => {
      await repo.create({ userId: 'user-1', provider: 'openai', keyHash: 'h1', name: 'Active', isActive: true });
      await repo.create({ userId: 'user-1', provider: 'anthropic', keyHash: 'h2', name: 'Inactive', isActive: false });
      await repo.create({ userId: 'user-1', provider: 'google', keyHash: 'h3', name: 'Active 2', isActive: true });

      const activeKeys = await repo.findActiveByUserId('user-1');

      expect(activeKeys.length).toBe(2);
      expect(activeKeys.every(k => k.isActive)).toBe(true);
      expect(activeKeys.map(k => k.name)).toEqual(['Active 2', 'Active']);
    });

    it('应该在无活跃Keys时返回空数组', async () => {
      await repo.create({ userId: 'user-1', provider: 'openai', keyHash: 'h1', name: 'Inactive', isActive: false });

      const activeKeys = await repo.findActiveByUserId('user-1');

      expect(activeKeys).toEqual([]);
    });
  });

  describe('update()', () => {
    it('应该更新API Key名称', async () => {
      const key = await repo.create({
        userId: 'user-1',
        provider: 'openai',
        keyHash: 'hash_1',
        name: 'Old Name',
        isActive: true,
      });

      const updated = await repo.update(key.id, {
        name: 'New Name',
      });

      expect(updated.name).toBe('New Name');
      expect(updated.updatedAt.getTime()).toBeGreaterThan(key.updatedAt.getTime());
    });

    it('应该更新isActive状态', async () => {
      const key = await repo.create({
        userId: 'user-1',
        provider: 'openai',
        keyHash: 'hash_1',
        name: 'Test Key',
        isActive: true,
      });

      const updated = await repo.update(key.id, {
        isActive: false,
      });

      expect(updated.isActive).toBe(false);
    });

    it('应该抛出错误当API Key不存在时', async () => {
      await expect(
        repo.update('non-existent', { name: 'Test' })
      ).rejects.toThrow('ApiKey non-existent not found');
    });
  });

  describe('markAsUsed()', () => {
    it('应该标记API Key为已使用并更新时间戳', async () => {
      const key = await repo.create({
        userId: 'user-1',
        provider: 'openai',
        keyHash: 'hash_1',
        name: 'Test Key',
        isActive: true,
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const updated = await repo.markAsUsed(key.id);

      expect(updated.lastUsedAt).toBeInstanceOf(Date);
      expect(updated.lastUsedAt!.getTime()).toBeGreaterThan(key.createdAt.getTime());
      expect(updated.updatedAt.getTime()).toBeGreaterThan(key.updatedAt.getTime());
    });
  });

  describe('delete()', () => {
    it('应该删除API Key', async () => {
      const key = await repo.create({
        userId: 'user-1',
        provider: 'openai',
        keyHash: 'hash_1',
        name: 'To Delete',
        isActive: true,
      });

      await repo.delete(key.id);

      const found = await repo.findById(key.id);
      expect(found).toBeNull();
    });
  });

  describe('数据完整性', () => {
    it('应该正确存储多个provider', async () => {
      const providers = ['openai', 'anthropic', 'google', 'azure'];

      for (const provider of providers) {
        const key = await repo.create({
          userId: 'user-1',
          provider,
          keyHash: `hash_${provider}`,
          name: `${provider} Key`,
          isActive: true,
        });
        expect(key.provider).toBe(provider);
      }

      const allKeys = await repo.findByUserId('user-1');
      expect(allKeys.length).toBe(4);
    });
  });
});
