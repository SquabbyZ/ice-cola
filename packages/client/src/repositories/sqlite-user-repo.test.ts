/**
 * SqliteUserRepository 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SqliteUserRepository } from './sqlite-user-repo';

describe('SqliteUserRepository', () => {
  let repo: SqliteUserRepository;

  beforeEach(async () => {
    // 使用内存数据库进行测试
    repo = new SqliteUserRepository(':memory:');
    await repo.initialize();
  });

  describe('create()', () => {
    it('应该成功创建本地用户', async () => {
      const user = await repo.create({
        authType: 'local',
        externalId: null,
      });

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.authType).toBe('local');
      expect(user.externalId).toBeNull();
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('应该成功创建微信用户', async () => {
      const user = await repo.create({
        authType: 'wechat',
        externalId: 'wx_123456',
      });

      expect(user.authType).toBe('wechat');
      expect(user.externalId).toBe('wx_123456');
    });

    it('应该为每个用户生成唯一ID', async () => {
      const user1 = await repo.create({ authType: 'local', externalId: null });
      const user2 = await repo.create({ authType: 'local', externalId: null });

      expect(user1.id).not.toBe(user2.id);
    });
  });

  describe('findById()', () => {
    it('应该根据ID找到用户', async () => {
      const created = await repo.create({
        authType: 'local',
        externalId: null,
      });

      const found = await repo.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.authType).toBe('local');
    });

    it('应该返回null当用户不存在时', async () => {
      const found = await repo.findById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('findAll()', () => {
    it('应该返回所有用户', async () => {
      await repo.create({ authType: 'local', externalId: null });
      await repo.create({ authType: 'wechat', externalId: 'wx_1' });
      await repo.create({ authType: 'wecom', externalId: 'wc_1' });

      const users = await repo.findAll();

      expect(users.length).toBe(3);
    });

    it('应该按创建时间降序排列', async () => {
      const user1 = await repo.create({ authType: 'local', externalId: null });
      await new Promise(resolve => setTimeout(resolve, 10));
      const user2 = await repo.create({ authType: 'local', externalId: null });

      const users = await repo.findAll();

      expect(users[0].id).toBe(user2.id);
      expect(users[1].id).toBe(user1.id);
    });

    it('应该在空表时返回空数组', async () => {
      const users = await repo.findAll();
      expect(users).toEqual([]);
    });
  });

  describe('update()', () => {
    it('应该更新用户的externalId', async () => {
      const user = await repo.create({
        authType: 'local',
        externalId: null,
      });

      const updated = await repo.update(user.id, {
        externalId: 'wx_updated',
      });

      expect(updated.externalId).toBe('wx_updated');
      expect(updated.updatedAt.getTime()).toBeGreaterThan(user.updatedAt.getTime());
    });

    it('应该抛出错误当用户不存在时', async () => {
      await expect(
        repo.update('non-existent-id', { externalId: 'test' })
      ).rejects.toThrow('User non-existent-id not found');
    });

    it('应该保持未更新的字段不变', async () => {
      const user = await repo.create({
        authType: 'wechat',
        externalId: 'wx_original',
      });

      const updated = await repo.update(user.id, {
        externalId: 'wx_new',
      });

      expect(updated.authType).toBe('wechat');
      expect(updated.externalId).toBe('wx_new');
    });
  });

  describe('delete()', () => {
    it('应该删除用户', async () => {
      const user = await repo.create({
        authType: 'local',
        externalId: null,
      });

      await repo.delete(user.id);

      const found = await repo.findById(user.id);
      expect(found).toBeNull();
    });

    it('删除不存在的用户应该静默成功', async () => {
      await expect(repo.delete('non-existent-id')).resolves.not.toThrow();
    });
  });

  describe('数据完整性', () => {
    it('应该正确存储和检索日期', async () => {
      const user = await repo.create({
        authType: 'local',
        externalId: null,
      });

      const found = await repo.findById(user.id);
      
      expect(found?.createdAt).toBeInstanceOf(Date);
      expect(found?.updatedAt).toBeInstanceOf(Date);
      expect(found?.createdAt.getTime()).toBe(user.createdAt.getTime());
    });

    it('应该支持多种认证类型', async () => {
      const types: Array<'local' | 'wechat' | 'wecom' | 'dingtalk'> = [
        'local',
        'wechat',
        'wecom',
        'dingtalk',
      ];

      for (const type of types) {
        const user = await repo.create({
          authType: type,
          externalId: `ext_${type}`,
        });
        expect(user.authType).toBe(type);
      }

      const allUsers = await repo.findAll();
      expect(allUsers.length).toBe(4);
    });
  });
});
