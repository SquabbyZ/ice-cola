# Ice Cola 项目开发规范

## 项目概述

Ice Cola 是一个管理平台 monorepo：

- `packages/admin`：管理后台前端，React + Vite
- `packages/server`：后端服务，NestJS + PostgreSQL
- `packages/client`：客户端应用，Tauri + React
- `packages/hermes-agent`：Hermes Agent / Dashboard Docker 服务

## 必须遵守的核心规则

1. **功能完成后必须 E2E 验证**：使用 Playwright MCP，并在 `reports/` 生成测试报告。
2. **测试先行**：遵循 TDD 原则，先写测试再实现功能。
3. **文件大小限制**：单个源代码文件最多 500 行；超过时必须拆分。
4. **确认弹窗规范**：禁止使用 `window.confirm()`，必须使用项目 Dialog / ConfirmDialog 组件。
5. **安全边界**：不要硬编码密钥；生产或共享环境必须使用未提交的 `.env` 或密钥管理系统。

## 详细规则索引

- `.claude/rules/common/coding-style.md`：通用编码规范、500 行文件上限
- `.claude/rules/common/testing.md`：E2E 测试流程、报告格式、覆盖场景
- `.claude/rules/common/runtime.md`：本地命令、端口、PM2 服务
- `.claude/rules/common/database.md`：PostgreSQL / Docker / DATABASE_URL 约定
- `.claude/rules/common/security.md`：安全审查和敏感操作规则
- `.claude/rules/common/code-review.md`：代码审查要求
- `.claude/rules/typescript/coding-style.md`：TypeScript 项目规则
- `.claude/rules/typescript/ui.md`：前端确认弹窗规则

## 常用命令

```bash
pnpm dev
pnpm build
pnpm test
pm2 start ecosystem.config.cjs --update-env
docker compose up -d
```

## 开发服务端口

- Admin 前端：http://localhost:1992
- Client 前端：http://localhost:1420
- Server 后端：http://localhost:3000
- WebSocket Gateway：3001
- PostgreSQL：5433
- Hermes Dashboard：9119

## 目录结构

```text
ice-cola/
├── packages/
│   ├── admin/
│   ├── server/
│   ├── client/
│   └── hermes-agent/
├── reports/
├── .claude/rules/
├── .playwright-mcp/
├── CONFIG.md
└── CLAUDE.md
```
