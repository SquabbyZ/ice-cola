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

### 本地开发

```bash
# 启动所有开发服务（跨平台，推荐）
node dev.mjs
# 或
pnpm dev

# 停止开发服务
node dev.mjs stop

# 查看服务状态
node dev.mjs status

# PM2 管理（需要 ecosystem.config.cjs）
pm2 start ecosystem.config.cjs --update-env
```

### Docker 后端部署

```bash
# 首次部署: 复制配置文件并填入实际值
cp .env.deploy.example .env.deploy
# 编辑 .env.deploy (必填: POSTGRES_PASSWORD, JWT_SECRET, AI_ENCRYPTION_KEY)

# 启动后端服务 (Server + PostgreSQL + Hermes)
./deploy-backend.sh
# 或
pnpm deploy

# 查看日志
./deploy-backend.sh logs

# 停止服务
./deploy-backend.sh down

# 重启服务
./deploy-backend.sh restart
```

### Docker 全量部署 (含 Admin 前端)

```bash
# 复制配置
cp .env.example .env
# 编辑 .env

# 启动所有服务
docker compose up -d
```

## 开发服务端口

| 服务 | 端口 | 说明 |
|------|------|------|
| Admin 前端 | http://localhost:1992 | React + Vite |
| Client 前端 | http://localhost:1420 | Tauri + React |
| Server 后端 | http://localhost:3000 | NestJS API |
| WebSocket | 3001 | Gateway |
| PostgreSQL (本地) | 5432 | 原生安装 (D:\pg18\bin) |
| PostgreSQL (Docker) | 5433 | docker-compose 映射 |
| Hermes Dashboard | 9119 | Hermes Web UI |

> **注意**：本地开发连接端口 5432，Docker 部署使用 5433。server `.env` 中的 `DATABASE_URL` 需匹配实际环境。

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
