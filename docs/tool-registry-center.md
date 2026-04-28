# 工具注册中心 (Tool Registry Center)

## 概述

工具注册中心是 OpenClaw Server 的核心组件之一，用于管理和注册各种工具，包括：

- MCP (Model Context Protocol) 服务器工具
- OpenClaw 内置工具
- 自定义工具

## 功能特性

- **动态工具注册**：支持运行时动态注册新工具
- **工具分类管理**：按类型、状态、类别对工具进行分类
- **RESTful API**：提供完整的 CRUD 操作接口
- **状态管理**：支持工具的启用/禁用状态切换
- **查询过滤**：支持按多种条件查询工具列表

## 工具类型

- `mcp_server`: MCP 服务器工具，用于扩展 AI 模型的能力
- `openclaw_tool`: OpenClaw 内置工具，如搜索、代码执行等
- `custom`: 用户自定义工具

## API 接口

### 注册工具
```
POST /api/tools
Content-Type: application/json

{
  "name": "web_search",
  "description": "网络搜索工具",
  "type": "openclaw_tool",
  "openclawConfig": {
    "module": "@openclaw/tools/search",
    "function": "search",
    "permissions": ["network"]
  },
  "metadata": {
    "version": "1.0.0",
    "author": "OpenClaw Team",
    "tags": ["search", "web"],
    "category": "search"
  }
}
```

### 获取工具列表
```
GET /api/tools?type=openclaw_tool&status=active&category=search&search=web&limit=10&offset=0
```

### 获取工具详情
```
GET /api/tools/{id}
```

### 更新工具
```
PUT /api/tools/{id}
Content-Type: application/json

{
  "status": "inactive",
  "description": "更新后的描述"
}
```

### 切换工具状态
```
PUT /api/tools/{id}/toggle
```

### 删除工具
```
DELETE /api/tools/{id}
```

### 获取统计信息
```
GET /api/tools/stats
```

### 获取分类列表
```
GET /api/tools/categories
```

## 使用示例

### 注册 MCP 服务器工具

```typescript
const mcpTool = {
  name: "my-mcp-server",
  description: "我的 MCP 服务器",
  type: "mcp_server",
  mcpConfig: {
    command: "my-mcp-server",
    args: ["--port", "8080"],
    transport: "stdio",
    env: {
      "API_KEY": "my-api-key"
    }
  },
  metadata: {
    version: "1.0.0",
    category: "integration"
  }
};

// 调用 API 注册工具
fetch('/api/tools', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(mcpTool)
});
```

### 查询工具

```typescript
// 查询所有活跃的搜索工具
const response = await fetch('/api/tools?type=openclaw_tool&category=search&status=active');
const { data } = await response.json();
console.log(data); // 工具列表
```

## 架构设计

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   ToolsModule   │────│ ToolRegistryService│────│   ToolsController │
│                 │    │                  │    │                 │
│  ┌───────────┐  │    │  ┌─────────────┐ │    │  ┌─────────────┐ │
│  │           │  │    │  │             │ │    │  │             │ │
│  │ Module    │  │    │  │  Tool       │ │    │  │  REST       │ │
│  │ Decorator │  │    │  │  Management │ │    │  │  Endpoints  │ │
│  │           │  │    │  │             │ │    │  │             │ │
│  └───────────┘  │    │  └─────────────┘ │    │  └─────────────┘ │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 数据模型

### ToolDefinition
- `id`: 工具唯一标识符
- `name`: 工具名称
- `description`: 工具描述
- `type`: 工具类型 (mcp_server, openclaw_tool, custom)
- `status`: 工具状态 (active, inactive, error)
- `mcpConfig`: MCP 配置对象
- `openclawConfig`: OpenClaw 工具配置对象
- `metadata`: 工具元数据
- `createdAt`: 创建时间
- `updatedAt`: 更新时间

## 安全考虑

- 所有工具操作都需要适当的认证和授权
- 工具权限管理确保安全执行
- 工具注册和使用都有审计日志记录
