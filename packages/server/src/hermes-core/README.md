# Hermes Core Module

Hermes Core 是 OpenClaw Server 的智能协调层，负责任务规划、记忆管理和工具编排。

## 架构概述

```
用户输入 → Planner (任务分解) → Orchestrator (工具执行) → 结果整合
                ↓
          Memory (上下文管理)
```

## 核心组件

### 1. Planner（任务规划器）

将用户的自然语言输入分解为可执行的步骤序列。

**使用示例**:
```typescript
import { PlannerServiceImpl } from './hermes-core/services/planner.service';

const planner = new PlannerServiceImpl(configService, httpService, db);
const plan = await planner.plan(
  "帮我分析 sales.csv 文件并生成报告",
  conversationId
);

// 返回:
{
  id: "plan_abc123",
  steps: [
    {
      order: 1,
      description: "读取 sales.csv 文件",
      toolName: "file_read",
      input: { path: "sales.csv" }
    },
    {
      order: 2,
      description: "分析销售数据",
      toolName: "ai_chat",
      input: { message: "请分析以下销售数据..." }
    }
  ]
}
```

### 2. Memory（记忆管理）

管理会话上下文，提供智能的上下文窗口。

**使用示例**:
```typescript
import { MemoryServiceImpl } from './hermes-core/services/memory.service';

const memory = new MemoryServiceImpl(db);

// 获取最近的上下文
const recentMessages = await memory.getRecentContext(conversationId, 10);

// 基于关键词搜索相关消息
const relevantMessages = await memory.searchRelevantMessages(
  conversationId,
  "sales data",
  5
);

// 压缩上下文以适应 token 限制
const compressed = memory.compressContext(recentMessages, 4000);
```

### 3. Orchestrator（工具编排器）

根据任务计划选择和执行工具。

**使用示例**:
```typescript
import { OrchestratorServiceImpl } from './hermes-core/services/orchestrator.service';

const orchestrator = new OrchestratorServiceImpl();

// 执行任务计划
const result = await orchestrator.executePlan(plan);

// 检查结果
if (result.status === 'completed') {
  console.log('所有步骤执行成功');
  result.steps.forEach(step => {
    console.log(`Step ${step.order}: ${step.description}`);
    console.log('Output:', step.output);
  });
}
```

## 可用工具

### 1. AI Chat Tool (`ai_chat`)

调用 Hermes Agent 进行 AI 对话。

**输入**:
```typescript
{
  message: string;      // 用户消息
  sessionId?: string;   // 会话 ID
  context?: any;        // 上下文信息
  model?: string;       // 模型名称
}
```

**输出**:
```typescript
{
  success: boolean;
  response: string;
  model?: string;
  usage?: any;
}
```

### 2. File Read Tool (`file_read`)

读取指定路径的文件内容。

**输入**:
```typescript
{
  path: string;  // 文件路径（相对于工作目录）
}
```

**输出**:
```typescript
{
  success: boolean;
  path: string;
  content: string;
  size: number;
}
```

### 3. File Write Tool (`file_write`)

写入内容到指定路径的文件。

**输入**:
```typescript
{
  path: string;    // 文件路径
  content: string; // 文件内容
}
```

**输出**:
```typescript
{
  success: boolean;
  path: string;
  size: number;
}
```

## 集成到现有服务

Hermes Core 已经作为全局模块集成到 NestJS 应用中。在 `HermesService` 中使用：

```typescript
import { Injectable } from '@nestjs/common';
import { PlannerServiceImpl } from '../hermes-core/services/planner.service';
import { OrchestratorServiceImpl } from '../hermes-core/services/orchestrator.service';
import { MemoryServiceImpl } from '../hermes-core/services/memory.service';

@Injectable()
export class HermesService {
  constructor(
    private planner: PlannerServiceImpl,
    private orchestrator: OrchestratorServiceImpl,
    private memory: MemoryServiceImpl,
    // ... 其他依赖
  ) {}

  async chat(userId: string, teamId: string, dto: ChatRequestDto) {
    // 1. 检查配额
    await this.quotaService.checkQuota(teamId);

    // 2. 创建会话
    const conversation = await this.conversationService.create(...);

    // 3. 生成任务计划
    const plan = await this.planner.plan(dto.message, conversation.id);

    // 4. 执行计划
    const result = await this.orchestrator.executePlan(plan);

    // 5. 保存结果
    await this.conversationService.addMessage(...);

    return result;
  }
}
```

## 数据库 Schema

### task_plans 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(36) | 计划唯一标识 |
| conversation_id | VARCHAR(36) | 关联的会话ID |
| user_input | TEXT | 用户原始输入 |
| plan_data | JSONB | 完整的任务计划JSON数据 |
| status | VARCHAR(20) | 计划状态: planning/executing/completed/failed |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

## 配置

在 `.env` 文件中配置：

```env
# Hermes Agent 端点
HERMES_ENDPOINT=http://hermes-agent:9119

# 工作目录（文件操作工具的根目录）
WORKSPACE_DIR=/app/workspace
```

## 扩展工具

要添加新工具，实现 `Tool` 接口并注册：

```typescript
import { Tool } from './hermes-core/interfaces/orchestrator.interface';

export class MyCustomTool implements Tool {
  name = 'my_tool';
  description = '我的自定义工具';

  async execute(input: any): Promise<any> {
    // 实现工具逻辑
    return { success: true, data: ... };
  }
}

// 在 HermesCoreModule 中注册
@Module({
  providers: [MyCustomTool],
})
export class HermesCoreModule {
  constructor(private orchestrator: OrchestratorServiceImpl) {
    this.orchestrator.registerDefaultTools([new MyCustomTool()]);
  }
}
```

## 降级策略

如果 hermes-agent 不可用或 `/api/plan` 端点未实现，Planner 会自动降级为单步计划（直接对话模式），确保服务始终可用。

## 下一步

- [ ] 支持并行工具执行
- [ ] 添加 code_runner 工具（沙箱环境）
- [ ] 实现流式响应（WebSocket）
- [ ] 引入向量数据库，实现语义搜索
- [ ] 支持任务计划的编辑和重试

## 相关文档

- [Hermes Core 设计文档](../../docs/superpowers/specs/2026-04-27-hermes-core-design.md)
- [系统架构](../../docs/architecture.md)
- [API 设计](../../docs/api-design.md)
