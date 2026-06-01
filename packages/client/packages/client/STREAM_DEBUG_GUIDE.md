# 流式响应调试指南

## 问题现象

Client 页面的对话回答不是流式的，消息一次性全部显示，而不是逐字显示（打字机效果）。

## 已实施的修复

### 1. 添加了调试工具

**文件：** `packages/client/src/utils/stream-debug.ts`

这个工具会记录所有流式事件，帮助诊断问题。

### 2. 增强了日志输出

在以下文件中添加了详细的调试日志：

- `packages/client/src/pages/chat/useHermesStreamEvents.ts` - 流式事件处理
- `packages/client/src/services/gateway-client.ts` - WebSocket 事件分发

### 3. 创建了调试页面

**文件：** `packages/client/src/pages/StreamDebugPage.tsx`

可以实时查看所有流式事件。

## 如何使用调试工具

### 方法 1：浏览器控制台

1. 启动 client 应用：
   ```bash
   cd packages/client
   npm run dev
   ```

2. 打开浏览器开发者工具（F12）

3. 进入 Chat 页面并发送一条消息

4. 观察控制台输出，查找以下关键日志：

   ```
   ✅ [StreamDebug] stream.listeners.registered
   🔔 [GatewayClient] Emitting event: hermes.delta
   ✅ [StreamDebug] hermes.delta
   ✅ [StreamDebug] hermes.delta.processing
   ✅ [StreamDebug] hermes.delta.updated
   ```

5. 如果看到警告：
   ```
   ⚠️ [GatewayClient] No handlers registered for event: hermes.delta
   ```
   说明事件监听器没有正确注册。

### 方法 2：使用调试页面（可选）

1. 在路由中添加调试页面（如果还没有）：

   编辑 `packages/client/src/App.tsx`：
   ```typescript
   import { StreamDebugPage } from './pages/StreamDebugPage';
   
   // 在路由配置中添加
   <Route path="/debug/stream" element={<StreamDebugPage />} />
   ```

2. 访问 `http://localhost:1420/debug/stream`

3. 点击 "Test Stream" 按钮测试流式响应

4. 查看实时事件日志表格

### 方法 3：打印事件统计

在浏览器控制台执行：

```javascript
// 查看事件统计
window.streamDebugger.printSummary();

// 查看所有事件日志
window.streamDebugger.getEventLog();

// 清除日志
window.streamDebugger.clearLog();
```

## 诊断流程

### 步骤 1：检查事件监听器是否注册

在控制台查找：
```
✅ [StreamDebug] stream.listeners.registered
```

- **如果没有**：说明 `useHermesStreamEvents` hook 没有被调用或 `on` 函数有问题
- **如果有**：继续下一步

### 步骤 2：检查是否收到 hermes.delta 事件

在控制台查找：
```
🔔 [GatewayClient] Emitting event: hermes.delta
```

- **如果没有**：说明后端没有发送流式数据或 WebSocket 连接有问题
- **如果有但显示 "No handlers"**：说明事件名称不匹配或监听器注册失败
- **如果有且有处理器**：继续下一步

### 步骤 3：检查事件是否被处理

在控制台查找：
```
✅ [StreamDebug] hermes.delta.processing
✅ [StreamDebug] hermes.delta.updated
```

- **如果没有 processing**：说明 `handleHermesDelta` 函数没有被调用
- **如果有 processing 但没有 updated**：说明消息 ID 不匹配或消息状态更新失败

### 步骤 4：检查 UI 是否更新

查看 Chat 页面，确认：
- 消息是否逐字显示
- 是否有流式指示器（脉动光标）
- 消息完成后状态是否变为 'complete'

## 常见问题和解决方案

### 问题 1：事件监听器未注册

**症状：** 控制台显示 "No handlers registered for event: hermes.delta"

**原因：** `useHermesStreamEvents` hook 在 Gateway 连接之前就被调用了

**解决方案：**
```typescript
// 确保在 Gateway 连接后才注册监听器
useEffect(() => {
  if (!gatewayConnected) return;
  
  // 注册监听器
  const unsubscribe = on('hermes.delta', handleHermesDelta);
  return unsubscribe;
}, [gatewayConnected, on]);
```

### 问题 2：事件名称不匹配

**症状：** 后端发送事件但前端收不到

**原因：** 后端使用 `hermes:delta` 而前端监听 `hermes.delta`

**解决方案：**
```typescript
// 统一使用点号分隔
const unsubscribeHermesDelta = on('hermes.delta', handleHermesDelta);
```

### 问题 3：数据字段不匹配

**症状：** 事件被接收但数据为空

**原因：** 后端使用 `data` 字段而前端期望 `payload` 字段

**解决方案：**
```typescript
// 在 gateway-client.ts 中统一处理
const eventData = frame.data || frame.payload;
```

### 问题 4：消息 ID 不匹配

**症状：** 事件被处理但消息不更新

**原因：** `messageId` 和 `runId` 不一致

**解决方案：**
```typescript
// 在发送消息时确保使用相同的 ID
const messageId = crypto.randomUUID();
await send('hermes.send', {
  messageId,  // 明确指定
  // ...
});
```

## 验证修复

修复后，验证以下场景：

- [ ] 发送消息后立即看到流式响应
- [ ] 消息逐字显示（打字机效果）
- [ ] 流式指示器（脉动光标）正常显示
- [ ] 消息完成后状态变为 'complete'
- [ ] 多条消息同时流式响应不冲突
- [ ] 控制台没有错误或警告

## 需要帮助？

如果问题仍然存在，请：

1. 收集控制台日志（完整的）
2. 执行 `window.streamDebugger.printSummary()` 并截图
3. 描述具体的问题现象
4. 提供复现步骤

## 相关文件

- `packages/client/src/utils/stream-debug.ts` - 调试工具
- `packages/client/src/pages/chat/useHermesStreamEvents.ts` - 流式事件处理
- `packages/client/src/services/gateway-client.ts` - WebSocket 客户端
- `packages/client/src/components/ChatMessageItem.tsx` - 消息显示组件
- `packages/client/src/pages/StreamDebugPage.tsx` - 调试页面
- `packages/client/STREAM_FIX_REPORT.md` - 详细修复报告
