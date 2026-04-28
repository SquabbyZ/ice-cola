# Hermes Core 协作协议实现指南

## 概述

Hermes Core 是 OpenClaw Server 的智能协调层，实现了"大脑-手脚"架构中的大脑功能。它负责任务规划、记忆管理和工具编排，使系统能够自动分解复杂任务并按顺序执行。

## 架构组件

### 1. Planner（任务规划器）

**位置**: `packages/server/src/hermes-core/services/planner.service.ts`

**职责**: 
- 将用户自然语言输入分解为可执行的步骤序列
- 调用 hermes-agent 生成任务计划
- 提供降级策略（单步直接对话）

**工作流程**:
```
用户输入 → Planner.plan() → 调用 hermes-agent /api/plan → 返回 TaskPlan
```

### 2. Memory（记忆管理）

**位置**: `packages/server/src/hermes-core/services/memory.service.ts`

**职责**:
- 管理会话上下文
- 获取最近 N 条消息作为上下文
- 基于关键词检索相关历史消息
- 压缩长上下文以适应 token 限制

**核心方法**:
- `getRecentContext(conversationId, limit)`: 获取最近的上下文
- `searchRelevantMessages(conversationId, query, limit)`: 搜索相关消息
- `compressContext(messages, maxTokens)`: 压缩上下文

### 3. Orchestrator（工具编排器）

**位置**: `packages/server/src/hermes-core/services/orchestrator.service.ts`

**职责**:
- 根据任务计划选择和执行工具
- 按顺序执行每个步骤
- 处理执行错误和状态更新

**工作流程**:
```
TaskPlan → Orchestrator.executePlan() → 遍历步骤 → 执行工具 → 返回结果
```

### 4. Tool Registry（工具注册表）

**位置**: `packages/server/src/hermes-core/tools/tool-registry.ts`

**已注册工具**:
1. **ai_chat**: 调用 hermes-agent 进行对话
2. **file_read**: 读取文件内容（需要客户端 Tauri RPC 支持）
3. **file_write**: 写入文件内容（需要客户端 Tauri RPC 支持）

## API 端点

### 1. 创建任务计划

```http
POST /teams/:teamId/plans
Authorization: Bearer <token>
Content-Type: application/json

{
  "input": "帮我分析 sales.csv 文件并生成报告",
  "conversationId": "optional_conversation_id"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "planId": "plan_abc123",
    "steps": [
      {
        "id": "step_1",
        "order": 1,
        "description": "读取 sales.csv 文件",
        "toolName": "file_read",
        "status": "pending"
      },
      {
        "id": "step_2",
        "order": 2,
        "description": "分析销售数据",
        "toolName": "ai_chat",
        "status": "pending"
      }
    ]
  }
}
```

### 2. 执行任务计划

```http
POST /teams/:teamId/plans/:planId/execute
Authorization: Bearer <token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "planId": "plan_abc123",
    "status": "completed",
    "results": [
      {
        "id": "step_1",
        "order": 1,
        "description": "读取 sales.csv 文件",
        "status": "completed",
        "output": { ... },
        "error": null
      }
    ]
  }
}
```

### 3. 查询计划状态

```http
GET /teams/:teamId/plans/:planId
Authorization: Bearer <token>
```

**响应**:
```json
{
  "success": true,
  "data": {
    "planId": "plan_abc123",
    "userInput": "帮我分析 sales.csv 文件并生成报告",
    "status": "completed",
    "steps": [...],
    "createdAt": "2026-04-27T10:00:00.000Z"
  }
}
```

## 数据库设计

### task_plans 表

```sql
CREATE TABLE task_plans (
  id VARCHAR(36) PRIMARY KEY,
  conversation_id VARCHAR(36) NOT NULL,
  user_input TEXT NOT NULL,
  plan_data JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'planning',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_plan_conversation FOREIGN KEY (conversation_id) 
    REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX idx_plans_conversation ON task_plans(conversation_id);
CREATE INDEX idx_plans_status ON task_plans(status);
CREATE INDEX idx_plans_created_at ON task_plans(created_at DESC);
```

## 集成流程

### 在 HermesService 中使用 Hermes Core

```typescript
// 1. 生成任务计划
const plan = await this.plannerService.plan(dto.message, conversation.id);

// 2. 执行计划
const executedPlan = await this.orchestratorService.executePlan(plan);

// 3. 提取最终响应
const lastStep = executedPlan.steps.filter(s => s.status === 'completed').pop();
const response = lastStep?.output?.response || '任务执行完成';
```

### 降级策略

如果 hermes-agent 不可用或 `/api/plan` 端点未实现，PlannerService 会自动降级为单步计划：

```typescript
// Fallback plan
{
  steps: [{
    description: '直接响应用户',
    toolName: 'ai_chat',
    input: { message: userInput },
    status: 'pending'
  }]
}
```

## 扩展工具

要添加新工具，需要：

1. 创建工具类实现 `Tool` 接口
2. 在 `HermesCoreModule` 中注册工具
3. 在 Planner 的 prompt 中添加新工具的描述

示例：

```typescript
@Injectable()
export class CustomTool implements Tool {
  name = 'custom_tool';
  description = '自定义工具描述';

  async execute(input: any): Promise<any> {
    // 实现工具逻辑
    return { success: true, data: ... };
  }
}
```

## 注意事项

1. **文件操作**: `file_read` 和 `file_write` 工具在 Server 端只是占位符，实际的文件操作需要通过 OpenClaw Client 的 Tauri RPC 执行。

2. **依赖安装**: 确保安装了所有必要的依赖：
   ```bash
   cd packages/server
   pnpm install
   ```

3. **数据库迁移**: 运行迁移脚本创建 `task_plans` 表：
   ```bash
   psql -U postgres -d openclaw -f packages/server/src/database/migrations/001_create_task_plans.sql
   ```

4. **hermes-agent 配置**: 确保 `.env` 文件中配置了正确的 `HERMES_ENDPOINT`：
   ```
   HERMES_ENDPOINT=http://hermes-agent:9119
   ```

## 成功标准

- ✅ 用户可以发送复杂请求（如"读取文件并分析"）
- ✅ 系统能自动分解为多步任务
- ✅ 每步任务能正确执行并返回结果
- ✅ 所有步骤完成后整合结果返回给用户
- ✅ 任务计划和执行记录保存到数据库

## 后续迭代方向

### Phase 2: 增强功能
- [ ] 支持并行工具执行
- [ ] 添加 code_runner 工具（沙箱环境）
- [ ] 实现流式响应（WebSocket）
- [ ] 支持任务计划的编辑和重试

### Phase 3: 智能化
- [ ] 引入向量数据库，实现语义搜索
- [ ] 学习用户偏好，优化任务规划
- [ ] 支持自定义工具注册
- [ ] 任务执行的可视化监控
