# Agent 技能与 MCP 检查清单

## 概览

本文档列出所有 Agent 所需的技能（skills）和 MCP 服务器，以及配置状态。

---

## Agent → Skills/MCPs 映射

### orchestrator-cn

| 类型 | 名称 | 状态 | 备注 |
|------|------|------|------|
| MCP | figma | ✅ 已配置 | FIGMA_API_KEY 已设置 |
| Skill | - | N/A | 不直接使用技能 |

### product-cn

| 类型 | 名称 | 状态 | 备注 |
|------|------|------|------|
| Skill | brainstorming | ✅ 存在 | ~/.claude/skills/brainstorming |

### design-cn

| 类型 | 名称 | 状态 | 备注 |
|------|------|------|------|
| Skill | frontend-design | ✅ 存在 | 设计方向、视觉系统 |
| Skill | design-html | ✅ 存在 | HTML 设计稿生成 |
| Skill | stitch-design | ✅ 存在 | 设计系统工作流 |
| MCP | figma | ✅ 已配置 | 可读取现有设计 |

### frontend-cn

| 类型 | 名称 | 状态 | 备注 |
|------|------|------|------|
| Skill | frontend-design | ✅ 存在 | UI 设计还原 |
| Skill | vercel-react-best-practices | ✅ 存在 | React 最佳实践 |
| Skill | react-components | ✅ 存在 | React 组件开发 |
| Skill | component-scaffold-generator | ✅ 存在 | 前端脚手架 |
| Skill | design-html | ✅ 存在 | 设计稿生成 |
| Skill | agent-browser | ✅ 存在 | E2E 测试 |
| Skill | performance | ⚠️ 需验证 | 前端性能 |
| Skill | web-security-testing | ⚠️ 需验证 | 前端安全测试 |
| Skill | webapp-testing | ⚠️ 需验证 | Web 应用测试 |

### backend-cn

| 类型 | 名称 | 状态 | 备注 |
|------|------|------|------|
| Skill | api-testing-patterns | ❌ 不存在 | 需创建或替换 |
| Skill | performance | ⚠️ 需验证 | 性能测试 |
| Skill | k6 | ⚠️ 需验证 | 负载压测 |
| Skill | api-security-testing | ❌ 不存在 | 需创建或替换 |
| Skill | nestjs-best-practices | ✅ 存在 | |
| Skill | nodejs-backend-patterns | ❌ 需验证 | |
| Skill | api-design | ✅ 存在 | |

### qa-cn

| 类型 | 名称 | 状态 | 备注 |
|------|------|------|------|
| MCP | playwright | ✅ 已配置 | Playwright MCP |
| Skill | e2e-testing | ✅ 存在 | E2E 测试最佳实践 |
| Skill | web-security-testing | ⚠️ 需验证 | 安全测试 |

### postgres-cn

| 类型 | 名称 | 状态 | 备注 |
|------|------|------|------|
| Skill | postgres | ✅ 存在 | PostgreSQL 基础 |
| Skill | postgres-drizzle | ✅ 存在 | Drizzle ORM |
| Skill | postgres-patterns | ✅ 存在 | 查询优化 |
| Skill | postgresql-table-design | ✅ 存在 | 表设计 |

### tauri-cn

| 类型 | 名称 | 状态 | 备注 |
|------|------|------|------|
| Skill | tauri-v2 | ✅ 存在 | Tauri v2 最佳实践 |

### devops-cn

| 类型 | 名称 | 状态 | 备注 |
|------|------|------|------|
| Skill | docker-patterns | ✅ 存在 | Docker 最佳实践 |

### code-reviewer-frontend

| 类型 | 名称 | 状态 | 备注 |
|------|------|------|------|
| Skill | react-components | ✅ 存在 | React 代码审查 |

### code-reviewer-backend

| 类型 | 名称 | 状态 | 备注 |
|------|------|------|------|
| Skill | nestjs-best-practices | ✅ 存在 | NestJS 代码审查 |

### security-reviewer

| 类型 | 名称 | 状态 | 备注 |
|------|------|------|------|
| Skill | security-review | ✅ 存在 | 安全审查 |

---

## 缺失/需更新的 Skills

### 需要创建的 Skill

| Skill | 用途 | 替代方案 |
|-------|------|----------|
| `api-testing-patterns` | API 功能测试 | 可用 `e2e-testing` 或 `playwright` 替代 |
| `api-security-testing` | API 安全测试 | 可用 `web-security-testing` 替代 |
| `nodejs-backend-patterns` | Node.js 后端模式 | 可用 `backend-patterns` 替代 |
| `performance` | 性能测试 | 使用 k6 + Lighthouse |

### Skill 映射替代方案

如果以下 skill 不存在，使用替代 skill：

| 原 Skill | 替代 Skill | 备注 |
|----------|------------|------|
| `api-testing-patterns` | `e2e-testing` + `playwright` | Playwright 可用于 API 测试 |
| `api-security-testing` | `web-security-testing` | Web 安全测试覆盖 API 安全 |
| `nodejs-backend-patterns` | `backend-patterns` | 通用后端模式 |
| `performance` | 手动使用 k6 + Lighthouse | 无现成 skill |

---

## MCP 服务器配置

### 已配置的 MCP

| MCP | 状态 | 用途 |
|-----|------|------|
| figma | ✅ 已配置 | FIGMA_API_KEY 已设置 |
| playwright | ✅ 已配置 | E2E 测试 |

### 可选 MCP（根据需要启用）

| MCP | 状态 | 用途 |
|-----|------|------|
| github | ❌ 未配置 | GitHub 操作（需要 GITHUB_PERSONAL_ACCESS_TOKEN） |
| jira | ❌ 未配置 | Jira 集成（需要 JIRA_URL, JIRA_EMAIL, JIRA_API_TOKEN） |
| context7 | ✅ 可用 | 文档查询 |
| exa-web-search | ❌ 未配置 | Web 搜索（需要 EXA_API_KEY） |
| firecrawl | ❌ 未配置 | 网页抓取（需要 FIRECRAWL_API_KEY） |

---

## 初始化检查脚本

在开始新任务前，运行以下检查：

```bash
# 1. 检查必要的 skills 是否存在
ls ~/.claude/skills/ | grep -E "(brainstorming|frontend-design|design-html|react-components|agent-browser|playwright|e2e-testing|web-security-testing|postgres|tauri-v2|docker-patterns|backend-patterns|nestjs-best-practices)"

# 2. 检查 MCP 配置
cat ~/.claude/settings.json | grep -E "(figma|playwright)"

# 3. 检查 Figma API Key
grep FIGMA_API_KEY ~/.claude/mcp-configs/mcp-servers.json
```

---

## 配置文件位置

- **Agent 配置**: `~/.claude/agents/` 或 `.claude/agents/`
- **MCP 配置**: `~/.claude/mcp-configs/mcp-servers.json`
- **Settings**: `~/.claude/settings.json`
- **Skills**: `~/.claude/skills/`

---

## 更新记录

| 日期 | 更新内容 |
|------|----------|
| 2026-05-06 | 初始创建，列出所有 Agent 的技能依赖 |
| 2026-05-06 | 添加 figma MCP 配置 |