---
name: development-workflow
description: dev.mjs orchestrator for multi-service development, Docker Compose for backend services.
metadata:
  type: project
---

Ice Cola 开发工作流使用 dev.mjs 编排器和 Docker Compose：

**本地开发命令：**

```bash
# 启动所有服务（推荐）
pnpm dev

# 停止所有服务
pnpm dev:stop

# 查看服务状态
pnpm dev:status

# 构建所有包
pnpm build

# 运行所有测试
pnpm test

# 类型检查
pnpm typecheck
```

**dev.mjs 编排器：**
- 自动启动 Docker Compose 后端服务（postgres, hermes-agent, server）
- 并行启动前端开发服务器（client, admin）
- 统一管理进程生命周期
- 提供状态查询和优雅关闭

**Docker Compose 服务：**
1. **postgres** — PostgreSQL 数据库（端口 5432/5433）
2. **hermes-agent** — Python AI 服务（端口 9119）
3. **ice-cola-server** — NestJS API 服务（端口 3000）

**环境配置：**
- `packages/server/.env` — 后端环境变量（DATABASE_URL, JWT_SECRET, HERMES_ENDPOINT）
- `packages/hermes-agent/.env` — AI 代理配置（OPENROUTER_API_KEY）
- `packages/client/.env` — 客户端配置（API_URL）
- `packages/admin/.env` — 管理后台配置（API_URL）

**数据库管理：**
```bash
# 运行迁移
cd packages/server
npx prisma migrate dev

# 重置数据库
pnpm db:reset

# 种子数据
pnpm db:seed:models
pnpm db:seed:providers
```

**部署命令：**
```bash
# 部署后端到生产环境
pnpm deploy

# 停止生产服务
pnpm deploy:down

# 查看生产日志
pnpm deploy:logs
```

**Why:** 统一的开发编排器简化多服务启动流程；Docker Compose 确保环境一致性。

**How to apply:**
- 日常开发使用 `pnpm dev` 一键启动所有服务
- 修改后端代码后 NestJS 自动热重载
- 修改前端代码后 Vite/React 自动热重载
- 数据库 schema 变更后运行 `npx prisma migrate dev`
- 新增环境变量时更新对应的 .env 文件和 .env.example
- 参考 [[monorepo-structure]] 了解包结构
- 参考 [[tech-stack]] 了解技术栈
