# PRD Request 001-STREAM-TYPEWRITER

- session: 2026-06-01-session-d4900a
- type: bugfix
- source: /peaks-solo invocation
- raw input: "对话回答不是打字机效果，而是一段一段的回复"

## Goals

- 让 AI 对话响应以逐字打字机效果显示，而不是一段一段地出现
- 保持流式传输的实时性（延迟 < 100ms）

## Non-goals

- 修改后端流式传输逻辑
- 修改 WebSocket 协议

## Preserved behavior

- WebSocket 连接和握手流程
- 消息发送和接收机制
- 消息状态管理（streaming、complete、error）
- 流式指示器（脉动光标）

## Acceptance criteria

- A1: 发送消息后，AI 响应以逐字（或逐词）方式逐步显示
- A2: 每个字符/词的显示间隔均匀，无跳跃感
- A3: 流式过程中显示脉动光标指示器
- A4: 消息完成后光标消失，状态变为 'complete'

## Root cause hypothesis

React 18 的 automatic batching 机制将同一事件循环中的多次 `updateMessage` 调用合并为一次渲染。当多个 `hermes.delta` 事件快速到达时，它们在同一 microtask 中被处理，导致 UI 一次性显示大量文本。

## Fix direction

在 `useHermesStreamEvents` 中使用 `requestAnimationFrame` 控制渲染节奏：
- 收到 delta 时累积到 buffer
- 使用 rAF 以 ~60fps 频率将 buffer 内容刷新到 store
- 保证每个动画帧只显示一小段文本

## Handoff

- to peaks-rd: .peaks/2026-06-01-session-d4900a/rd/requests/001-stream-typewriter.md
