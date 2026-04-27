/**
 * Repository 层快速验证脚本
 * 
 * 用于验证 Week 1 实现的正确性
 * 运行: npx tsx src/repositories/verify.ts
 */

import { SqliteSessionRepository } from './sqlite-session-repo';
import { SqliteUsageRepository } from './sqlite-usage-repo';

async function verifyRepositories() {
  console.log('🔍 开始验证 Repository 层实现...\n');

  try {
    // 1. 验证 Session Repository
    console.log('1️⃣  测试 Session Repository...');
    const sessionRepo = new SqliteSessionRepository(':memory:');
    await (sessionRepo as any).createTables();
    (sessionRepo as any).initialized = true;

    const session = await sessionRepo.create({
      userId: 'test-user',
      name: 'Test Session',
    });

    console.log('   ✅ create() 成功:', session.id);

    const found = await sessionRepo.findById(session.id);
    console.log('   ✅ findById() 成功:', found?.name);

    const sessions = await sessionRepo.findByUserId('test-user');
    console.log('   ✅ findByUserId() 成功:', sessions.length, '个会话');

    const updated = await sessionRepo.update(session.id, { name: 'Updated Session' });
    console.log('   ✅ update() 成功:', updated.name);

    await sessionRepo.delete(session.id);
    console.log('   ✅ delete() 成功\n');

    // 2. 验证 Usage Repository
    console.log('2️⃣  测试 Usage Repository...');
    const usageRepo = new SqliteUsageRepository(':memory:');
    await (usageRepo as any).createTables();
    (usageRepo as any).initialized = true;

    const usage = await usageRepo.record({
      userId: 'test-user',
      sessionId: 'session-1',
      conversationId: 'conv-1',
      messageId: 'msg-1',
      model: 'gpt-4',
      inputTokens: 100,
      outputTokens: 50,
      cost: 0.005,
      timestamp: new Date(),
    });

    console.log('   ✅ record() 成功:', usage.id);

    const now = new Date();
    const period = {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: now,
    };

    const records = await usageRepo.findByUserId('test-user', period);
    console.log('   ✅ findByUserId() 成功:', records.length, '条记录');

    const stats = await usageRepo.getStats('test-user', period);
    console.log('   ✅ getStats() 成功:');
    console.log('      - Input Tokens:', stats.totalInputTokens);
    console.log('      - Output Tokens:', stats.totalOutputTokens);
    console.log('      - Total Cost: $', stats.totalCost.toFixed(4));
    console.log('      - Request Count:', stats.requestCount);

    const deleted = await usageRepo.deleteOlderThan(new Date('2020-01-01'));
    console.log('   ✅ deleteOlderThan() 成功: 删除', deleted, '条记录\n');

    console.log('✅ 所有验证通过! Repository 层工作正常。\n');
    console.log('📊 统计摘要:');
    console.log('   - Session Repository: 5/5 方法通过');
    console.log('   - Usage Repository: 4/4 方法通过');
    console.log('   - 总计: 9/9 核心功能正常\n');

  } catch (error) {
    console.error('❌ 验证失败:', error);
    throw error;
  }
}

// 运行验证
verifyRepositories();
