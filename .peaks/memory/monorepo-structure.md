---
name: monorepo-structure
description: Ice Cola is a pnpm workspace monorepo with 4 packages - admin, client, server, hermes-agent.
metadata:
  type: project
---

Ice Cola 是一个 pnpm workspace 单仓多包项目，包含 4 个包：

1. **packages/admin** — React 管理后台，用于用户管理、邀请、管理仪表板
2. **packages/client** — React + Tauri 桌面客户端，OpenClaw Desktop 的前端
3. **packages/server** — NestJS 后端服务，提供 API 网关、配额管理、AI 集成
4. **packages/hermes-agent** — Python AI 代理服务，基于 NousResearch Hermes，提供 AI 对话能力

**Why:** 单仓多包架构便于代码共享、统一依赖管理、协调版本发布。

**How to apply:** 
- 跨包改动时使用 `pnpm -r` 命令（如 `pnpm -r build`, `pnpm -r test`）
- 单包改动时使用 `pnpm --filter @ice-cola/<package>` 
- 新增共享代码时考虑创建 `packages/shared` 或在现有包中导出
- 保持包之间的依赖关系清晰，避免循环依赖
