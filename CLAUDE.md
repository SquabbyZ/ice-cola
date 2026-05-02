# Ice Cola 项目开发规范

## 项目概述

Ice Cola 是一个功能丰富的管理平台，包含：
- **packages/admin** - 管理后台前端 (React)
- **packages/server** - 后端服务 (NestJS)
- **packages/client** - 客户端应用 (Tauri)

## 核心开发规范

### 1. 功能完成后必须进行 E2E 测试

**重要规则**：每一个功能开发完成后，必须使用 Playwright MCP 进行端到端测试验证，并在 `reports/` 目录下生成测试报告。

#### E2E 测试流程

```
功能开发完成
    ↓
使用 Playwright MCP 进行 E2E 测试
    ↓
生成测试报告到 reports/ 目录
    ↓
验证通过后功能才算完成
```

#### Playwright MCP 使用方式

项目已配置 Playwright MCP (`.playwright-mcp/`)，使用方式：

1. **页面导航测试**：验证页面正常加载和导航
2. **用户交互测试**：验证按钮、表单、对话框等交互
3. **数据流测试**：验证数据的正确显示和更新
4. **表单验证测试**：验证表单验证和错误处理

#### 测试报告要求

每个功能测试完成后，必须生成报告到 `reports/` 目录，命名格式：

```
reports/[功能名称]_E2E_TEST_REPORT_YYYYMMDD.md
```

报告必须包含：
- **测试时间**：ISO 8601 格式
- **测试功能**：被测试的功能描述
- **测试步骤**：详细的操作步骤
- **测试结果**：通过/失败状态
- **截图证据**：关键步骤的截图（可选但推荐）
- **问题清单**：发现的问题及优先级

#### 报告模板

```markdown
# [功能名称] E2E 测试报告

## 测试信息
- **测试时间**: YYYY-MM-DD HH:mm:ss
- **测试工程师**: Claude Code
- **功能版本**: v1.0.0

## 测试环境
- **浏览器**: Chrome / Firefox / Safari
- **viewport**: 1920x1080
- **测试数据**: [测试账号信息]

## 测试功能
[功能描述]

## 测试步骤

### Step 1: [操作名称]
- 操作：点击登录按钮
- 预期：页面跳转到仪表盘

### Step 2: [操作名称]
- 操作：填写表单
- 预期：显示验证成功

## 测试结果

| 测试项 | 状态 | 备注 |
|--------|------|------|
| 页面加载 | ✅ PASS | |
| 用户登录 | ✅ PASS | |
| 数据展示 | ✅ PASS | |

## 发现的问题

| 优先级 | 问题描述 | 状态 |
|--------|----------|------|
| MEDIUM | 表单验证提示不够清晰 | OPEN |

## 结论

✅ **测试通过** / ❌ **测试失败**

[功能名称] 功能测试完成，测试结果：[通过/失败]
```

### 2. 测试覆盖范围

每个功能必须覆盖以下测试场景：

| 测试类型 | 描述 |
|----------|------|
| Happy Path | 主要用户流程正常执行 |
| 表单验证 | 输入验证和错误提示 |
| 边界条件 | 空值、特殊字符、超长输入 |
| 权限控制 | 未登录访问、越权访问 |
| 错误处理 | 服务器错误的用户反馈 |

### 3. 提交前检查

功能提交前必须确认：
- [ ] E2E 测试已执行
- [ ] 测试报告已生成到 `reports/` 目录
- [ ] 无 CRITICAL 或 HIGH 问题
- [ ] 测试结果通过或已知问题已记录

## 开发工作流

参见 `rules/common/development-workflow.md`

## 技术栈

- **前端**: React 18 + TypeScript + Vite
- **后端**: NestJS + TypeORM + PostgreSQL
- **状态管理**: TanStack Query + Zustand
- **表单**: React Hook Form + Zod
- **UI**: shadcn/ui + Tailwind CSS
- **测试**: Playwright MCP + Vitest
- **国际化**: i18next

## 目录结构

```
ice-cola/
├── packages/
│   ├── admin/         # 管理后台
│   ├── server/        # 后端服务
│   └── client/        # 客户端应用
├── reports/           # 测试报告目录
├── .playwright-mcp/   # Playwright MCP 配置
├── CONFIG.md          # 项目配置
└── CLAUDE.md          # 本文件
```

## 常用命令

```bash
# 启动开发服务器
pnpm dev

# 运行构建
pnpm build

# 运行单元测试
pnpm test

# 运行 E2E 测试 (Playwright)
pnpm playwright test
```

## 注意事项

1. **测试先行**：遵循 TDD 原则，先写测试再实现功能
2. **报告存档**：所有测试报告必须保留在 `reports/` 目录
3. **问题追踪**：测试中发现的问题必须记录并跟踪
4. **回归测试**：重大功能修改后必须执行回归测试

### 确认弹窗规范

**禁止使用浏览器原生 `window.confirm()`**，所有确认弹窗必须使用项目自定义的 Dialog 组件。

#### 使用方式

项目提供了 `ConfirmDialog` 组件，位于 `packages/client/src/components/ConfirmDialog.tsx`，或使用 `packages/client/src/components/ui/dialog.tsx` 中的 Dialog 组件自行构建。

```tsx
// 推荐方式
import ConfirmDialog from '@/components/ConfirmDialog';

// 或使用 Dialog 组件构建确认弹窗
```

#### 原因

- 浏览器原生弹窗样式不统一，影响用户体验
- 无法自定义样式和品牌一致性
- 在某些场景下会被浏览器拦截

## 相关规则

- `rules/common/` - 通用开发规范
- `rules/typescript/` - TypeScript 开发规范
- `rules/zh/` - 中文开发规范
