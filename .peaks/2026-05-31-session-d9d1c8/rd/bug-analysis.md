# Bug Analysis: STREAM-FIX-001

**Date:** 2026-05-31
**Session:** 2026-05-31-session-d52f9d
**Type:** bugfix
**Severity:** HIGH (user-visible UI regression)

## Bug Description

Client 页面的对话响应不是流式显示的，而是等待全部完成后一次性显示，失去了打字机效果。

## Root Cause Analysis

### 问题链路分析

流式响应涉及以下组件：

1. **后端** (`packages/server/src/gateway/gateway.service.ts`)
   - 发送 `hermes.delta` 事件（第 972-976 行和 1416-1420 行）
   - 状态：✅ 代码正确

2. **WebSocket 客户端** (`packages/client/src/services/gateway-client.ts`)
   - 接收和分发事件（第 412-437 行）
   - 状态：✅ 代码正确

3. **前端事件处理** (`packages/client/src/pages/chat/useHermesStreamEvents.ts`)
   - 处理 `hermes.delta` 事件（第 58-84 行）
   - 状态：✅ 代码正确

4. **UI 组件** (`packages/client/src/components/ChatMessageItem.tsx`)
   - 显示流式指示器（第 85-87 行）
   - 状态：✅ 代码正确

### 可能的问题原因

由于代码逻辑都是正确的，问题可能出在运行时：

1. **事件监听器未正确注册**：`useHermesStreamEvents` hook 在 Gateway 连接之前被调用
2. **事件名称不匹配**：后端发送 `hermes:delta` 而前端监听 `hermes.delta`
3. **数据字段不匹配**：后端使用 `data` 字段而前端期望 `payload` 字段
4. **消息 ID 映射问题**：`messageId` 和 `runId` 不一致

## Evidence

### 已实施的调试工具

我已在以下文件中添加了详细的调试日志：

1. `packages/client/src/utils/stream-debug.ts` - 流式事件记录器
2. `packages/client/src/pages/chat/useHermesStreamEvents.ts` - 事件处理日志
3. `packages/client/src/services/gateway-client.ts` - 事件分发日志
4. `packages/client/src/pages/StreamDebugPage.tsx` - 调试页面

### 构建状态

✅ **构建成功** - 所有 TypeScript 错误已修复

```bash
cd packages/client
npm run build
# ✓ built in 5.61s
```

## Fix Strategy

### 方案 A：运行时诊断（推荐）

1. 启动应用并打开浏览器控制台
2. 发送测试消息
3. 根据调试日志定位具体问题
4. 针对性修复

### 方案 B：事件监听器注册时机修复

如果问题是事件监听器注册过早：

```typescript
// 确保在 Gateway 连接后才注册监听器
useEffect(() => {
  if (!gatewayConnected) return;

  const unsubscribe = on('hermes.delta', handleHermesDelta);
  return unsubscribe;
}, [gatewayConnected, on]);
```

### 方案 C：事件名称/字段统一

如果发现事件名称或数据字段不匹配：

```typescript
// 统一事件名称
const unsubscribeHermesDelta = on('hermes.delta', handleHermesDelta);

// 统一数据字段（在 gateway-client.ts）
const eventData = frame.data || frame.payload;
```

### 方案 D：消息 ID 映射修复

如果消息 ID 不匹配：

```typescript
// 在发送消息时明确指定 messageId
const messageId = crypto.randomUUID();
await send('hermes.send', {
  messageId,
  // ...
});
```

## Unit Test Plan

### 测试用例 1：事件监听器注册

```typescript
describe('useHermesStreamEvents', () => {
  it('should register event listeners after gateway connected', () => {
    const on = jest.fn();
    const { result } = renderHook(() =>
      useHermesStreamEvents({ messages: [], on, ... })
    );

    expect(on).toHaveBeenCalledWith('hermes.delta', expect.any(Function));
    expect(on).toHaveBeenCalledWith('hermes.final', expect.any(Function));
  });
});
```

### 测试用例 2：流式事件处理

```typescript
it('should update message content on hermes.delta', () => {
  const updateMessage = jest.spyOn(chatStore, 'updateMessage');

  act(() => {
    handleHermesDelta({
      messageId: 'test-123',
      delta: 'Hello',
      sequenceNumber: 1,
    });
  });

  expect(updateMessage).toHaveBeenCalledWith('test-123', {
    content: 'Hello',
    status: 'streaming',
  });
});
```

## Regression Prevention

1. 添加流式响应的 E2E 测试
2. 添加 WebSocket 事件监控的单元测试
3. 添加消息状态流转的集成测试

## Handoff

- to peaks-rd: .peaks/2026-05-31-session-d9d1c8/rd/requests/STREAM-FIX-001.md
- to peaks-qa: .peaks/2026-05-31-session-d9d1c8/qa/requests/STREAM-FIX-001.md
