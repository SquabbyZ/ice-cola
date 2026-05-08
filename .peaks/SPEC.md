# .peaks 工作流规范

## 目录结构

```
.peaks/
├── plans/          # 开发计划（每次需求的实现计划）
├── prds/           # PRD 文档（脑暴后确认的需求文档）
├── designs/        # 设计稿截图（Figma 设计导出）
├── test-docs/      # 测试用例（QA 编写的功能测试用例）
├── reports/        # 各类报告（功能、性能、压测、安全）
├── auto-tests/     # 自动化测试脚本（前端/后端）
└── deploys/        # 部署脚本（devops-cn 维护）
```

## 核心工作流

### Phase 1: 需求分析（product-cn）

```
用户输入（vibe coding / 自然语言 / 粗稿 / 详细文档）
    ↓
orchestrator-cn 调度 product-cn
    ↓
product-cn 进行 brainstorming（考虑边界场景）
    ↓
与用户交互多次确认，直到用户明确表示没有需要改动
    ↓
product-cn 根据经验指出不足，直到 PRD 完善
    ↓
产出 PRD 文档到 .peaks/prds/prd-[功能名]-[日期].md
    ↓
PRD 中使用 [CHANGED] 高亮标注对已开发功能的变更部分
```

**PRD 标识格式**：
- `[CHANGED]` — 标识本次对已存在功能的修改
- `[NEW]` — 标识本次新增的功能
- `[DEPRECATED]` — 标识本次废弃的功能

### Phase 2: UI/UX 设计（design-cn，可选）

```
前置条件：涉及新页面、新交互、或需要明确视觉方向
跳过条件：纯数据管理、纯接口开发、简单功能扩展
    ↓
orchestrator-cn 调度 design-cn
    ↓
design-cn 使用 Figma MCP 生成设计稿
    ↓
用户确认设计（审查 / 提修改意见）
    ↓
design-cn 修改直到用户确认
    ↓
截图保存到 .peaks/designs/[功能名]-[日期].png
```

### Phase 3: 测试用例编写（qa-cn）

```
前置条件：PRD 已确认、设计稿已就绪（如有）
    ↓
orchestrator-cn 调度 qa-cn
    ↓
qa-cn 基于 PRD + 设计截图编写测试用例
    ↓
产出测试用例到 .peaks/test-docs/test-case-[功能名]-[日期].md
```

### Phase 4: 开发（frontend-cn + backend-cn + tauri-cn）

```
前后端并行开发，经过质量门禁：
- Code Review（循环直到通过）
- 安全检查（循环直到通过）
- QA 验证（循环直到通过）
```

### Phase 5: 自动化测试（qa-cn）

```
前置条件：Code Review + 安全检查通过
    ↓
qa-cn 执行存量自动化测试（.peaks/auto-tests/）
    ↓
不通过 → 打回开发 agent 整改 → 重新执行
    ↓
通过后 → 基于测试用例执行功能测试
    ↓
测试通过 → 产出报告 + 更新自动化测试脚本
```

### Phase 6: 报告生成（qa-cn + devops-cn）

```
测试通过后：
1. qa-cn 生成功能/性能/安全报告 → .peaks/reports/
2. qa-cn 更新/新增自动化测试脚本 → .peaks/auto-tests/
3. devops-cn 创建/更新部署脚本 → .peaks/deploys/
```

### Phase 7: 部署（devops-cn）

```
执行 .peaks/deploys/ 中的部署脚本
- 数据库迁移
- 服务启动
- 健康检查
```

## 文件命名规范

| 类型 | 格式 | 示例 |
|------|------|------|
| PRD | `prd-[功能名]-[YYYYMMDD].md` | `prd-marketplace-20260506.md` |
| 设计稿 | `[功能名]-[YYYYMMDD].png` | `marketplace-20260506.png` |
| 测试用例 | `test-case-[功能名]-[YYYYMMDD].md` | `test-case-marketplace-20260506.md` |
| 功能报告 | `report-[功能名]-[YYYYMMDD].md` | `report-marketplace-20260506.md` |
| 性能报告 | `perf-[功能名]-[YYYYMMDD].md` | `perf-marketplace-20260506.md` |
| 安全报告 | `security-[功能名]-[YYYYMMDD].md` | `security-marketplace-20260506.md` |
| 自动化脚本 | `[功能名]-[类型].py` 或 `[功能名]-[类型].ts` | `marketplace-e2e.py` |
| 部署脚本 | `deploy-[环境]-[YYYYMMDD].sh` | `deploy-dev-20260506.sh` |
| 开发计划 | `plan-[功能名]-[YYYYMMDD].md` | `plan-marketplace-20260506.md` |

## PRD 变更标识示例

```markdown
# PRD - 市场系统

## 功能列表

### [NEW] 市场项浏览
- 用户可以浏览市场中的专家/技能

### [CHANGED] 审批流程
- 原流程：管理员手动审批
- 新流程：支持批量审批 [CHANGED]

### [DEPRECATED] 旧版分享功能
- 已被新的分享组件替代
```

## 状态文件

orchestrator-cn 在执行过程中会更新 `.claude/session-state.json`，记录当前进度。

## Figma MCP 调研任务

需调研以下内容：
1. `figma-developer-mcp` 的具体能力（是否能直接生成设计稿）
2. `@figma/code-connect` 如何连接 Figma 设计到 React 组件
3. 用户需要提供哪些配置（FIGMA_API_KEY 等）