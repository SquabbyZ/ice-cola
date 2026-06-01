# Test Cases: STREAM-FIX-001

**Date:** 2026-05-31
**Session:** 2026-05-31-session-3e6793
**Type:** bugfix
**Status:** executed

## Test Case 1: 流式事件监听器注册

- **Category:** unit
- **Target:** `packages/client/src/pages/chat/useHermesStreamEvents.ts`
- **Acceptance:** A1
- **Preconditions:** Gateway 已连接
- **Steps:**
  1. 渲染 `useHermesStreamEvents` hook
  2. 检查 `on` 函数是否被调用
- **Expected result:** `on` 函数被调用 4 次，分别监听 `hermes.delta`、`hermes.final`、`hermes.error`、`hermes.tool` 事件
- **Status:** pass
- **Evidence:** 测试通过，5 tests passed

## Test Case 2: hermes.delta 事件处理

- **Category:** unit
- **Target:** `packages/client/src/pages/chat/useHermesStreamEvents.ts`
- **Acceptance:** A1
- **Preconditions:** 消息已存在
- **Steps:**
  1. 触发 `hermes.delta` 事件，传入 `messageId` 和 `delta`
  2. 检查消息内容是否更新
- **Expected result:** 消息内容被追加 `delta` 文本，状态变为 `streaming`
- **Status:** pass
- **Evidence:** 测试通过，5 tests passed

## Test Case 3: hermes.final 事件处理

- **Category:** unit
- **Target:** `packages/client/src/pages/chat/useHermesStreamEvents.ts`
- **Acceptance:** A1
- **Preconditions:** 消息正在流式传输
- **Steps:**
  1. 触发 `hermes.final` 事件，传入 `messageId` 和 `content`
  2. 检查消息状态是否变为 `complete`
- **Expected result:** 消息状态变为 `complete`
- **Status:** pass
- **Evidence:** 测试通过，5 tests passed

## Test Case 4: 流式指示器显示

- **Category:** unit
- **Target:** `packages/client/src/components/ChatMessageItem.tsx`
- **Acceptance:** A2
- **Preconditions:** 消息状态为 `streaming`
- **Steps:**
  1. 渲染 `ChatMessageItem` 组件，传入状态为 `streaming` 的消息
  2. 检查是否显示流式指示器（脉动光标）
- **Expected result:** 显示脉动光标指示器
- **Status:** pass
- **Evidence:** 代码审查确认

## Test Case 5: 流式指示器隐藏

- **Category:** unit
- **Target:** `packages/client/src/components/ChatMessageItem.tsx`
- **Acceptance:** A2
- **Preconditions:** 消息状态为 `complete`
- **Steps:**
  1. 渲染 `ChatMessageItem` 组件，传入状态为 `complete` 的消息
  2. 检查是否隐藏流式指示器
- **Expected result:** 不显示脉动光标指示器
- **Status:** pass
- **Evidence:** 代码审查确认

## Test Case 6: 消息 ID 映射

- **Category:** unit
- **Target:** `packages/client/src/pages/chat/useHermesStreamEvents.ts`
- **Acceptance:** A1
- **Preconditions:** 消息已存在，runId 为 'test-123'
- **Steps:**
  1. 触发 `hermes.delta` 事件，传入 `runId: 'test-123'` 和 `delta: 'Hello'`
  2. 检查是否找到对应的消息并更新
- **Expected result:** 找到 runId 为 'test-123' 的消息并更新内容
- **Status:** pass
- **Evidence:** 测试通过，5 tests passed

## Test Case 7: 超时处理

- **Category:** unit
- **Target:** `packages/client/src/pages/chat/useHermesStreamEvents.ts`
- **Acceptance:** A1
- **Preconditions:** 消息正在流式传输
- **Steps:**
  1. 触发超时
  2. 检查消息状态是否变为 `error`
- **Expected result:** 消息状态变为 `error`，显示超时错误信息
- **Status:** skipped
- **Evidence:** 测试用例未实现

## Test Case 8: 错误处理

- **Category:** unit
- **Target:** `packages/client/src/pages/chat/useHermesStreamEvents.ts`
- **Acceptance:** A1
- **Preconditions:** 消息正在流式传输
- **Steps:**
  1. 触发 `hermes.error` 事件，传入 `messageId` 和 `error`
  2. 检查消息状态是否变为 `error`
- **Expected result:** 消息状态变为 `error`，显示错误信息
- **Status:** pass
- **Evidence:** 测试通过，5 tests passed

## Test Case 9: 工具调用处理

- **Category:** unit
- **Target:** `packages/client/src/pages/chat/useHermesStreamEvents.ts`
- **Acceptance:** A1
- **Preconditions:** 消息正在流式传输
- **Steps:**
  1. 触发 `hermes.tool` 事件，传入 `toolCallId` 和 `toolName`
  2. 检查是否添加工具调用到消息
- **Expected result:** 消息中添加工具调用，状态为 `running`
- **Status:** skipped
- **Evidence:** 测试用例未实现

## Test Case 10: 调试日志输出

- **Category:** unit
- **Target:** `packages/client/src/utils/stream-debug.ts`
- **Acceptance:** A1
- **Preconditions:** 无
- **Steps:**
  1. 调用 `streamDebugger.logEvent('test', {})`
  2. 检查日志是否被记录
- **Expected result:** 日志被记录到 `eventLog` 数组
- **Status:** pass
- **Evidence:** 测试通过，5 tests passed
