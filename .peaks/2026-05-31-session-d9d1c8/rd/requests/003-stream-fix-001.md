# RD Request STREAM-FIX-001

- session: 2026-05-31-session-d9d1c8
- linked-prd: .peaks/2026-05-31-session-d9d1c8/prd/requests/STREAM-FIX-001.md
- type: bugfix

## Red-line scope

### In-scope files
- `packages/client/src/pages/chat/useHermesStreamEvents.ts` - 流式事件处理 hook
- `packages/client/src/services/gateway-client.ts` - WebSocket 客户端
- `packages/client/src/pages/Chat.tsx` - Chat 页面主组件
- `packages/client/src/components/ChatMessageItem.tsx` - 消息显示组件

### Out-of-scope surfaces
- 后端 Gateway 服务（代码逻辑已验证正确）
- 数据库和认证系统
- 管理后台（packages/admin）
- AI Agent 服务（packages/hermes-agent）

## Standards preflight

- peaks standards init/update --project . --dry-run: 已完成
- planned application: apply（项目已有 CLAUDE.md 和 .claude/rules）

## Coverage status

- current total UT coverage: 未知（需要运行测试）
- new/changed code coverage: 待实现
- gate verdict: 待验证

## Slice contract

### Slice 1: 诊断阶段
- slice id: STREAM-FIX-001-DIAG
- functional boundary: 运行应用并收集调试日志
- pre-refactor behavior: 对话响应不是流式显示
- target structure: 确定根本原因
- unit-test requirements: N/A（诊断阶段）
- acceptance checks: 控制台日志显示事件流
- rollback plan: N/A
- commit boundary: 诊断完成后决定修复方案

### Slice 2: 修复阶段
- slice id: STREAM-FIX-001-FIX
- functional boundary: 修复流式响应问题
- pre-refactor behavior: 对话响应一次性显示
- target structure: 对话响应逐字显示（打字机效果）
- unit-test requirements: 添加流式事件处理测试
- acceptance checks: 发送消息后立即看到流式响应
- rollback plan: git revert
- commit boundary: 修复完成后提交

## Implementation evidence

### 已完成的工作
1. 添加了调试工具：
   - `packages/client/src/utils/stream-debug.ts`
   - `packages/client/src/pages/StreamDebugPage.tsx`

2. 增强了日志输出：
   - `packages/client/src/pages/chat/useHermesStreamEvents.ts`
   - `packages/client/src/services/gateway-client.ts`

3. 创建了文档：
   - `packages/client/STREAM_FIX_REPORT.md`
   - `packages/client/STREAM_DEBUG_GUIDE.md`
   - `packages/client/STREAM_FIX_SUMMARY.md`

### 待完成的工作
1. 运行应用并收集调试日志
2. 根据日志确定根本原因
3. 实施针对性修复
4. 添加单元测试
5. 进行代码审查和安全审查

## Handoff

- to peaks-qa: .peaks/2026-05-31-session-d9d1c8/qa/requests/STREAM-FIX-001.md

## Status

- created: 2026-05-31T14:40:14.391Z
- last update: 2026-05-31T14:40:14.391Z
- state: spec-locked
