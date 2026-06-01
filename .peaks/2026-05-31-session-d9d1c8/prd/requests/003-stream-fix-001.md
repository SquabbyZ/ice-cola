# PRD Request STREAM-FIX-001

- session: 2026-05-31-session-d9d1c8
- type: bugfix
- source: /peaks-solo invocation
- raw input: "client的对话不是打字机效果的"

## Goals

- 修复 client 页面对话响应不是流式显示的问题
- 确保 AI 对话响应以打字机效果逐字显示
- 保持流式指示器（脉动光标）正常工作

## Non-goals

- 重构整个对话系统架构
- 添加新的对话功能（非流式相关）

## Preserved behavior

- WebSocket 连接和握手流程
- 消息发送和接收机制
- 消息状态管理（streaming、complete、error）

## Acceptance criteria

- 发送消息后立即看到流式响应（打字机效果）
- 消息内容逐字显示，不是一次性全部显示
- 流式过程中显示脉动光标指示器
- 消息完成后光标消失，状态变为 'complete'
- 控制台无错误或警告

## Frontend delta

### 影响的页面和组件
- `packages/client/src/pages/Chat.tsx` - Chat 页面主组件
- `packages/client/src/pages/chat/useHermesStreamEvents.ts` - 流式事件处理 hook
- `packages/client/src/components/ChatMessageItem.tsx` - 消息显示组件

### 数据依赖
- `packages/client/src/services/gateway-client.ts` - WebSocket 客户端
- `packages/client/src/stores/chat.ts` - Chat 状态管理
- `packages/client/src/hooks/useGateway.ts` - Gateway 连接 hook

### 待联调态
- 需要验证后端是否正确发送 `hermes.delta` 事件
- 需要验证事件名称和数据格式是否匹配

### API contracts pending
- WebSocket 事件格式：`{ type: 'evt', event: 'hermes.delta', data: { messageId, delta, sequenceNumber } }`
- 消息状态流转：streaming → complete | error

## Risks and open questions

1. 后端可能没有正确发送流式数据
2. 事件监听器可能没有正确注册
3. 事件名称或数据格式可能不匹配
4. 消息 ID 映射可能有问题

## Handoff

- to peaks-rd: .peaks/2026-05-31-session-d9d1c8/rd/requests/STREAM-FIX-001.md
- to peaks-qa: .peaks/2026-05-31-session-d9d1c8/qa/requests/STREAM-FIX-001.md

## Status

- created: 2026-05-31T14:32:07.389Z
- last update: 2026-05-31T14:32:07.389Z
- state: draft
