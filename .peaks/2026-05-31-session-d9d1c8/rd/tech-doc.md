# Tech Doc: STREAM-FIX-001

**Date:** 2026-05-31
**Session:** 2026-05-31-session-d9d1c8
**Type:** bugfix
**Status:** in-progress

## Architecture decisions

### 决策 1：添加调试工具而非直接修复

**问题：** 代码逻辑审查显示所有组件都是正确的，但用户报告流式响应不工作。

**决策：** 添加详细的调试日志和诊断工具，而不是直接修改代码。

**理由：**
1. 无法在不运行应用的情况下确定根本原因
2. 调试工具可以帮助定位运行时问题
3. 避免盲目修改可能破坏正常功能的代码

**替代方案：**
- 直接假设问题原因并修改代码（风险高）
- 跳过诊断直接重写流式处理逻辑（过度工程化）

### 决策 2：在前端添加调试日志

**问题：** 需要确定事件是否被正确接收和处理。

**决策：** 在关键位置添加 `streamDebugger.logEvent()` 调用。

**理由：**
1. 可以在浏览器控制台实时查看事件流
2. 不影响生产性能（可以移除）
3. 提供详细的上下文信息

## Component changes

### 已修改的文件

1. **`packages/client/src/utils/stream-debug.ts`** (新建)
   - 作用：流式事件记录和统计工具
   - 改动：创建调试工具类

2. **`packages/client/src/pages/chat/useHermesStreamEvents.ts`**
   - 作用：处理 Hermes 流式事件
   - 改动：添加 `streamDebugger.logEvent()` 调用

3. **`packages/client/src/services/gateway-client.ts`**
   - 作用：WebSocket 客户端，接收和分发事件
   - 改动：增强事件分发日志，添加未注册处理器警告

4. **`packages/client/src/pages/StreamDebugPage.tsx`** (新建)
   - 作用：调试页面，实时查看事件日志
   - 改动：创建调试页面组件

### 未修改的文件

1. **`packages/server/src/gateway/gateway.service.ts`**
   - 状态：✅ 代码正确，无需修改
   - 原因：后端正确发送 `hermes.delta` 事件

2. **`packages/client/src/components/ChatMessageItem.tsx`**
   - 状态：✅ 代码正确，无需修改
   - 原因：正确显示流式指示器

## Data flow

### 流式响应数据流

```
1. 用户发送消息
   ↓
2. 后端接收并处理
   ↓
3. 后端发送 hermes.delta 事件
   ↓
4. WebSocket 客户端接收事件
   ↓
5. GatewayClient.emitEvent() 分发事件
   ↓
6. useHermesStreamEvents.handleHermesDelta() 处理事件
   ↓
7. chatStore.updateMessage() 更新消息状态
   ↓
8. ChatMessageItem 渲染流式内容
   ↓
9. 用户看到打字机效果
```

### 调试数据流

```
1. streamDebugger.logEvent() 记录事件
   ↓
2. 事件存储在 eventLog 数组
   ↓
3. StreamDebugPage 实时显示日志
   ↓
4. 浏览器控制台输出日志
   ↓
5. 开发者诊断问题
```

## CSS/Style changes

无 CSS/Style 改动。

## API contract changes

### WebSocket 事件格式

**hermes.delta 事件：**
```typescript
{
  type: 'evt',
  event: 'hermes.delta',
  data: {
    messageId: string,      // 消息 ID
    delta: string,          // 增量文本
    sequenceNumber: number  // 序列号
  }
}
```

**hermes.final 事件：**
```typescript
{
  type: 'evt',
  event: 'hermes.final',
  data: {
    messageId: string,      // 消息 ID
    content: string,        // 完整内容
    totalTokens: number     // 总 token 数
  }
}
```

### 消息状态流转

```
streaming → complete (正常完成)
streaming → error (发生错误)
```

## Dependencies

无新增依赖。

## Fix Strategy

### 方案 A：运行时诊断（推荐）

**步骤：**
1. 启动应用：`cd packages/client && npm run dev`
2. 打开浏览器开发者工具（F12）
3. 进入 Chat 页面并发送测试消息
4. 观察控制台输出，查找关键日志：
   - `✅ [StreamDebug] stream.listeners.registered`
   - `🔔 [GatewayClient] Emitting event: hermes.delta`
   - `✅ [StreamDebug] hermes.delta`
   - `✅ [StreamDebug] hermes.delta.updated`

5. 根据日志定位问题：
   - 如果没有 `hermes.delta` 事件 → 后端问题或 WebSocket 连接问题
   - 如果有事件但没有处理器 → 事件监听器注册失败
   - 如果有处理器但没有更新 → 消息 ID 不匹配

### 方案 B：事件监听器注册时机修复

**适用场景：** 事件监听器在 Gateway 连接之前被调用

**修复代码：**
```typescript
// 在 useHermesStreamEvents.ts 中
useEffect(() => {
  if (!gatewayConnected) return;
  
  const unsubscribeDelta = on('hermes.delta', handleHermesDelta);
  const unsubscribeFinal = on('hermes.final', handleHermesFinal);
  const unsubscribeError = on('hermes.error', handleHermesError);
  const unsubscribeTool = on('hermes.tool', handleHermesTool);
  
  return () => {
    unsubscribeDelta();
    unsubscribeFinal();
    unsubscribeError();
    unsubscribeTool();
  };
}, [gatewayConnected, on]);
```

### 方案 C：事件名称/字段统一

**适用场景：** 事件名称或数据字段不匹配

**修复代码：**
```typescript
// 在 gateway-client.ts 中
private emitEvent(frame: GatewayMessage): void {
  const eventData = frame.data || frame.payload;
  // ...
}
```

### 方案 D：消息 ID 映射修复

**适用场景：** 消息 ID 不匹配

**修复代码：**
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
    expect(on).toHaveBeenCalledWith('hermes.error', expect.any(Function));
    expect(on).toHaveBeenCalledWith('hermes.tool', expect.any(Function));
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

### 测试用例 3：消息状态流转

```typescript
it('should change message status to complete on hermes.final', () => {
  const updateMessage = jest.spyOn(chatStore, 'updateMessage');

  act(() => {
    handleHermesFinal({
      messageId: 'test-123',
      content: 'Hello World',
      totalTokens: 10,
    });
  });

  expect(updateMessage).toHaveBeenCalledWith('test-123', {
    content: 'Hello World',
    status: 'complete',
  });
});
```

## Regression Prevention

1. **添加 E2E 测试**：验证流式响应在真实浏览器中工作
2. **添加单元测试**：验证事件处理逻辑
3. **添加集成测试**：验证消息状态流转
4. **监控日志**：在生产环境中监控流式事件

## Next Steps

1. 运行应用并收集调试日志
2. 根据日志确定根本原因
3. 实施针对性修复（方案 B/C/D）
4. 添加单元测试
5. 进行代码审查和安全审查
6. 提交修复
