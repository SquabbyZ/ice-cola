# Repository Layer - OpenClaw Desktop Backend

## 📁 目录结构

```
src/repositories/
├── interfaces.ts              # Repository 接口定义
├── sqlite-adapter.ts          # SQLite 基类
├── sqlite-session-repo.ts     # Session Repository 实现
├── sqlite-usage-repo.ts       # Usage Repository 实现
├── verify.ts                  # 快速验证脚本
└── __tests__/                 # 单元测试
    ├── sqlite-session-repo.test.ts
    └── sqlite-usage-repo.test.ts
```

## 🚀 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 运行测试

```bash
# 运行所有测试
pnpm test

# 运行测试 UI
pnpm test:ui

# 生成覆盖率报告
pnpm test:coverage
```

### 3. 验证实现

```bash
npx tsx src/repositories/verify.ts
```

## 📖 使用示例

### Session Repository

```typescript
import { SqliteSessionRepository } from './repositories/sqlite-session-repo';

// 创建仓库实例
const sessionRepo = new SqliteSessionRepository('path/to/database.db');
await sessionRepo.initialize();

// 创建会话
const session = await sessionRepo.create({
  userId: 'user-123',
  name: 'My Chat Session',
});

// 查找会话
const found = await sessionRepo.findById(session.id);

// 查找用户的所有会话
const sessions = await sessionRepo.findByUserId('user-123');

// 更新会话
await sessionRepo.update(session.id, { name: 'Updated Name' });

// 删除会话
await sessionRepo.delete(session.id);
```

### Usage Repository

```typescript
import { SqliteUsageRepository } from './repositories/sqlite-usage-repo';

const usageRepo = new SqliteUsageRepository('path/to/database.db');
await usageRepo.initialize();

// 记录用量
await usageRepo.record({
  userId: 'user-123',
  sessionId: 'session-1',
  conversationId: 'conv-1',
  messageId: 'msg-1',
  model: 'gpt-4',
  inputTokens: 100,
  outputTokens: 50,
  cost: 0.005,
  timestamp: new Date(),
});

// 获取用量统计
const now = new Date();
const stats = await usageRepo.getStats('user-123', {
  start: new Date(now.getFullYear(), now.getMonth(), 1),
  end: now,
});

console.log('Total Cost:', stats.totalCost);
console.log('Total Tokens:', stats.totalInputTokens + stats.totalOutputTokens);
```

## 🏗️ 架构设计

### Repository Pattern

```
┌─────────────────────┐
│   Service Layer     │  ← 业务逻辑层
└──────────┬──────────┘
           │ 依赖
┌──────────▼──────────┐
│  Repository Interface│  ← 接口定义 (interfaces.ts)
└──────────┬──────────┘
           │ 实现
┌──────────▼──────────┐
│  SQLite Adapter     │  ← 具体实现 (sqlite-*.ts)
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│   SQLite Database   │  ← 数据存储
└─────────────────────┘
```

### 关键特性

1. **接口与实现分离**: 便于测试和替换数据库
2. **参数化查询**: 防止 SQL 注入
3. **索引优化**: 针对高频查询创建索引
4. **事务支持**: 保证数据一致性
5. **类型安全**: TypeScript 全程类型检查

## 🧪 测试策略

### Mock 策略

测试环境使用 Vitest 的 `vi.mock()` 模拟 Tauri SQL 插件:

```typescript
vi.mock('@tauri-apps/plugin-sql', () => {
  const mockDb = {
    select: vi.fn(),
    execute: vi.fn(),
    close: vi.fn(),
  };

  return {
    default: class MockDatabase {
      constructor() {
        return mockDb;
      }
    },
  };
});
```

### 测试覆盖

- ✅ CRUD 操作正常性
- ✅ 边界情况 (空结果、不存在的数据)
- ✅ 错误处理 (异常抛出)
- ✅ 数据映射 (数据库行 → TypeScript 对象)

## 📊 性能指标

| 操作 | 预期时间 | 说明 |
|------|---------|------|
| 单次查询 | < 10ms | 基于索引 |
| 用量插入 | < 5ms | INSERT 操作 |
| 统计查询 | < 50ms | 月度聚合 |
| 批量删除 | < 100ms | 清理旧数据 |

## 🔒 安全性

1. **SQL 注入防护**: 所有查询使用参数化 (`?` 占位符)
2. **输入验证**: TypeScript 类型系统保证
3. **错误处理**: 敏感信息不泄露到错误消息

## 📝 待实现 (Week 3)

以下 Repository 将在 Week 3 实现:

- [ ] `SqliteUserRepository`
- [ ] `SqliteConversationRepository`
- [ ] `SqliteMessageRepository`
- [ ] `SqliteApiKeyRepository`
- [ ] `SqliteExpertPromptRepository`

## 🔗 相关文档

- [Week 1 完成报告](./WEEK1_COMPLETION_REPORT.md)
- [后端开发计划](../../docs/dev-plan-backend.md)
- [PRD 文档](../../docs/prd-openclaw-desktop.md)

## ⚠️ 注意事项

1. **初始化顺序**: 使用前必须调用 `initialize()` 方法
2. **日期格式**: 数据库存储 ISO 8601 字符串,自动转换
3. **外键约束**: 确保关联数据存在后再操作
4. **内存数据库**: 测试时使用 `:memory:` 路径

---

**版本**: 0.1.0  
**最后更新**: 2024-01-XX  
**维护者**: OpenClaw Team
