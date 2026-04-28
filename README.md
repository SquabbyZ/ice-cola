# Ice Cola Server

Ice Cola Server 是一个基于 NestJS 的后端服务，为 OpenClaw Desktop 提供 API 网关、配额管理和 AI 集成能力。

## 架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        OpenClaw Desktop                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ plugin-sdk   │  │memory-host-sdk│  │   Desktop Client     │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└────────────────────────────┬──────────────────────────────────┘
                             │ REST API
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Ice Cola Server (NestJS)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │ Auth     │  │ Quota    │  │Hermes    │  │  Conversation    │ │
│  │ Module   │  │ Module   │  │ Module   │  │  Module          │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │
│                            │                                     │
│                    ┌───────┴───────┐                            │
│                    │  Prisma ORM   │                            │
│                    └───────┬───────┘                            │
└────────────────────────────┼────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐  ┌───────────────┐  ┌─────────────────┐
│ hermes-agent   │  │  PostgreSQL   │  │  External AI    │
│ (Python AI)     │  │  Database     │  │  Providers      │
│ NousResearch    │  │               │  │  OpenRouter     │
└─────────────────┘  └───────────────┘  └─────────────────┘
```

## 核心模块

### Hermes Module
作为 AI 集成层，调用 hermes-agent 提供 AI 对话能力：

- **Quota Check**: 每次调用前检查团队配额
- **Quota Consume**: 消耗配额
- **Chat API**: 提供统一的聊天接口
- **Session Management**: 会话管理

### Tools Module (工具注册中心)
管理和注册各种工具，包括 MCP 服务器、OpenClaw 内置工具和自定义工具：

- **Tool Registration**: 动态注册新工具
- **Tool Management**: 工具的 CRUD 操作
- **Tool Categories**: 按类型和类别分类
- **Status Management**: 启用/禁用工具

### Quota Module
配额管理系统：

- 团队配额配置
- 配额消耗与检查
- 配额充值（管理员）

### Auth Module
认证授权系统：

- JWT Bearer Token 认证
- 用户注册/登录
- Token 刷新

## 快速开始

### 1. 环境要求

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16+

### 2. 配置环境变量

```bash
# packages/server/.env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/icecola"
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"
HERMES_ENDPOINT="http://localhost:9119"

# packages/hermes-agent/.env
OPENROUTER_API_KEY="your-openrouter-api-key"
```

### 3. 启动服务

```bash
# 启动所有服务（推荐）
docker-compose up -d

# 或者本地开发
cd packages/server
npm install
npx prisma migrate dev
npm run dev
```

### 4. 验证服务

```bash
# 检查 hermes-agent 状态
curl http://localhost:9119/health

# 检查 OpenClaw Server 状态
curl http://localhost:3000/hermes/status

# 用户注册
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# 发送聊天消息（需要 JWT token）
curl -X POST http://localhost:3000/hermes/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"message":"Hello, Hermes!"}'
```

## API 端点

### Auth
- `POST /auth/register` - 用户注册
- `POST /auth/login` - 用户登录
- `POST /auth/refresh` - 刷新 Token
- `POST /auth/logout` - 登出

### Hermes
- `POST /hermes/chat` - 发送聊天消息
- `GET /hermes/status` - 获取 Hermes 服务状态
- `GET /hermes/sessions` - 获取会话列表
- `GET /hermes/sessions/:sessionId` - 获取特定会话

### Teams & Quota
- `GET /teams/:teamId/quota` - 获取团队配额
- `POST /teams/:teamId/quota/recharge` - 充值配额（管理员）

### Tools (工具注册中心)
- `POST /api/tools` - 注册新工具
- `GET /api/tools` - 获取工具列表
- `GET /api/tools/:id` - 获取工具详情
- `PUT /api/tools/:id` - 更新工具
- `PUT /api/tools/:id/toggle` - 切换工具状态
- `DELETE /api/tools/:id` - 删除工具
- `GET /api/tools/stats` - 获取统计信息
- `GET /api/tools/categories` - 获取分类列表

## Docker 部署

完整的 Docker Compose 配置包含：

- **hermes-agent**: AI Brain 服务（端口 9119）
- **ice-cola-server**: NestJS API 服务（端口 3000）
- **postgres**: PostgreSQL 数据库（端口 5432）

```bash
# 构建并启动
docker-compose up -d --build

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

## 项目结构

```
ice-cola-server/
├── docker-compose.yml          # Docker 编排配置
├── init.sql                    # 数据库初始化脚本
├── packages/
│   ├── hermes-agent/           # NousResearch Hermes Agent (Python)
│   │   ├── .env               # 环境配置
│   │   └── Dockerfile
│   └── server/                # NestJS 后端
│       ├── Dockerfile
│       ├── prisma/
│       │   └── schema.prisma   # 数据模型
│       └── src/
│           ├── main.ts
│           ├── app.module.ts
│           ├── auth/           # 认证模块
│           ├── quota/          # 配额模块
│           ├── hermes/         # Hermes 集成模块
│           └── conversation/   # 会话模块
```

## 与 OpenClaw Main 的集成

OpenClaw Desktop 客户端通过以下方式集成：

1. **plugin-sdk**: 提供插件运行时能力
2. **memory-host-sdk**: 提供内存/存储能力
3. **REST API**: 通过 OpenClaw Server 访问 Hermes AI 能力

```typescript
// 客户端示例
import { runtime } from '@openclaw/plugin-sdk';

const response = await fetch('http://localhost:3000/hermes/chat', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ message: 'Hello!' }),
});
```

## 故障排除

### Hermes Agent 连接失败
```bash
# 检查 hermes-agent 是否运行
docker-compose logs hermes-agent

# 验证 hermes-agent 健康状态
curl http://localhost:9119/health
```

### 数据库连接问题
```bash
# 检查 postgres 是否运行
docker-compose logs postgres

# 运行数据库迁移
docker-compose exec ice-cola-server npx prisma migrate deploy
```

### 配额不足
```bash
# 检查团队配额
curl http://localhost:3000/teams/{teamId}/quota \
  -H "Authorization: Bearer {token}"

# 管理员充值配额
curl -X POST http://localhost:3000/teams/{teamId}/quota/recharge \
  -H "Authorization: Bearer {adminToken}" \
  -d '{"amount":"1000","note":"Bonus credits"}'
```

## 许可证

MIT
