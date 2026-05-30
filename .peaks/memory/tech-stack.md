---
name: tech-stack
description: Core technologies - NestJS backend, React+Tauri client, React admin, Python AI agent, PostgreSQL, Prisma ORM.
metadata:
  type: project
---

Ice Cola 技术栈：

**Backend (packages/server):**
- NestJS — 企业级 Node.js 框架
- Prisma ORM — 类型安全的数据库访问
- PostgreSQL 16+ — 主数据库
- JWT — 认证机制

**Frontend (packages/client):**
- React — UI 框架
- Tauri — 跨平台桌面应用框架
- TypeScript — 类型安全

**Admin (packages/admin):**
- React — UI 框架
- TypeScript — 类型安全

**AI Agent (packages/hermes-agent):**
- Python — 运行时
- NousResearch Hermes — AI 模型
- OpenRouter — AI 提供商集成
- FastAPI/Flask — HTTP 服务（端口 9119）

**Infrastructure:**
- Docker & Docker Compose — 容器化部署
- pnpm — 包管理器
- Git — 版本控制

**Why:** 选择成熟、类型安全、生态丰富的技术栈，便于开发、测试、部署。

**How to apply:**
- 遵循各技术栈的最佳实践和约定
- 保持依赖版本的一致性
- 新增技术选型时考虑与现有栈的兼容性
- 参考 [[monorepo-structure]] 了解包结构
