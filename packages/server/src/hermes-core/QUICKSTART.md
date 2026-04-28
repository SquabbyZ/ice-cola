# Hermes Core 快速启动指南

## 前置条件

- Node.js 18+
- PostgreSQL 16+
- pnpm 8+
- Docker & Docker Compose（可选，用于 hermes-agent）

## 快速开始

### 1. 安装依赖

```bash
cd /c/Users/smallMark/Desktop/peaksclaw/openclaw-server
pnpm install
```

### 2. 配置环境变量

复制 `.env.example` 到 `.env` 并配置：

```bash
cd packages/server
cp .env.example .env
```

编辑 `.env`：

```env
# 数据库配置
DATABASE_URL=postgresql://postgres:password@localhost:5432/ice_cola

# JWT 配置
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=15m

# Hermes Agent 端点
HERMES_ENDPOINT=http://localhost:9119

# 工作目录（文件操作工具的根目录）
WORKSPACE_DIR=./workspace
```

### 3. 初始化数据库

#### 方式 A：使用 Docker Compose（推荐）

```bash
cd /c/Users/smallMark/Desktop/peaksclaw/openclaw-server
docker-compose up -d postgres
```

这会自动运行 `init.sql` 创建所有表（包括 `task_plans`）。

#### 方式 B：手动运行 SQL

```bash
psql -U postgres -d ice_cola -f init.sql
```

### 4. 启动开发服务器

```bash
cd packages/server
pnpm run start:dev
```

服务器将在 `http://localhost:3000` 启动。

### 5. （可选）启动 Hermes Agent

如果需要真正的 AI 功能，启动 hermes-agent：

```bash
cd ../hermes-agent
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

---

## 测试 Hermes Core

### 方法 1：通过 API 测试

```bash
# 1. 注册用户
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'

# 2. 登录获取 token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# 保存返回的 accessToken

# 3. 发送消息（自动触发 Hermes Core）
curl -X POST http://localhost:3000/hermes/chat \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "帮我分析销售数据",
    "teamId": "YOUR_TEAM_ID"
  }'
```

### 方法 2：通过代码测试

创建测试文件 `test-hermes-core.ts`：

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PlannerServiceImpl } from './src/hermes-core/services/planner.service';
import { OrchestratorServiceImpl } from './src/hermes-core/services/orchestrator.service';
import { MemoryServiceImpl } from './src/hermes-core/services/memory.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const planner = app.get(PlannerServiceImpl);
  const orchestrator = app.get(OrchestratorServiceImpl);
  const memory = app.get(MemoryServiceImpl);

  console.log('✅ Hermes Core modules loaded successfully!');

  // 测试 Planner
  console.log('\n📋 Testing Planner...');
  const plan = await planner.plan('Hello, world!', 'test-conversation-id');
  console.log('Plan created:', plan.id);
  console.log('Steps:', plan.steps.length);

  // 测试 Memory
  console.log('\n🧠 Testing Memory...');
  const context = await memory.getRecentContext('test-conversation-id', 5);
  console.log('Context retrieved:', context.length, 'messages');

  // 测试 Orchestrator
  console.log('\n⚙️  Testing Orchestrator...');
  const tools = orchestrator.getToolRegistry().list();
  console.log('Registered tools:', tools.map(t => t.name).join(', '));

  await app.close();
  console.log('\n✅ All tests passed!');
}

bootstrap().catch(console.error);
```

运行测试：

```bash
cd packages/server
npx ts-node test-hermes-core.ts
```

---

## 验证数据库表

连接到 PostgreSQL 并检查表是否创建成功：

```sql
-- 连接到数据库
psql -U postgres -d ice_cola

-- 检查 task_plans 表
\dt task_plans

-- 查看表结构
\d task_plans

-- 应该看到：
--  Column       | Type
-- --------------+------------------
--  id            | character varying
--  conversation_id | character varying
--  user_input    | text
--  plan_data     | jsonb
--  status        | character varying
--  created_at    | timestamp
--  updated_at    | timestamp
```

---

## 常见问题

### Q1: 编译时出现 TypeScript 错误？

A: Hermes Core 模块本身没有编译错误。其他文件的错误是项目已有的问题，不影响 Hermes Core 的使用。

### Q2: hermes-agent 连接失败怎么办？

A: Planner 有 fallback 机制，会自动降级为单步直接对话模式。你仍然可以测试任务编排功能。

### Q3: 如何添加新工具？

A: 参考 `packages/server/src/hermes-core/README.md` 中的"扩展工具"章节。

### Q4: 文件工具无法访问文件？

A: 确保文件在 `WORKSPACE_DIR` 指定的目录内。默认是当前工作目录。

---

## 下一步

1. **阅读文档**
   - [Hermes Core README](./README.md)
   - [设计文档](../../docs/superpowers/specs/2026-04-27-hermes-core-design.md)

2. **编写测试**
   - 单元测试
   - 集成测试

3. **扩展功能**
   - 添加更多工具
   - 实现 hermes-agent `/api/plan` 端点
   - 支持并行执行

4. **部署**
   - 配置生产环境
   - 设置监控和日志

---

## 需要帮助？

- 查看 [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) 了解实现细节
- 查看 [设计文档](../../docs/superpowers/specs/2026-04-27-hermes-core-design.md) 了解架构设计
- 提交 Issue 或联系开发团队
