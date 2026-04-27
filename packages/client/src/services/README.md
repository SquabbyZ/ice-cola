# Services Layer - OpenClaw Desktop Backend

## 📁 目录结构

```
src/services/
├── usage-metering-engine.ts   # 用量计量引擎
├── quota-controller.ts        # 配额控制器
├── auth-service.ts            # 认证服务
├── gateway-client.ts          # Gateway 通信客户端
├── service-container.ts       # 服务容器
└── verify.ts                  # 快速验证脚本
```

## 🚀 快速开始

### 1. 初始化服务容器

```typescript
import { getServiceContainer } from './services/service-container';

// 获取单例实例
const container = getServiceContainer('openclaw.db');

// 初始化所有服务 (创建数据库表)
await container.initialize();
```

### 2. 使用认证服务

```typescript
// 用户登录
const session = await container.authService.login();
console.log('Logged in as:', session.userInfo.displayName);

// 获取当前用户
const currentUser = await container.authService.getCurrentUser();

// 用户登出
await container.authService.logout();
```

### 3. 记录用量

```typescript
// 记录 API 调用用量
await container.usageMetering.recordUsage({
  userId: 'user-123',
  sessionId: 'session-1',
  conversationId: 'conv-1',
  messageId: 'msg-1',
  model: 'gpt-4',
  inputTokens: 100,
  outputTokens: 50,
});

// 自动计算成本并检查配额
```

### 4. 查询用量统计

```typescript
// 获取本月统计
const stats = await container.usageMetering.getStats('user-123', 'month');
console.log('Total Cost:', stats.totalCost);
console.log('Total Tokens:', stats.totalInputTokens + stats.totalOutputTokens);

// 获取详细记录
const records = await container.usageMetering.getUsageRecords('user-123', {
  start: new Date('2024-01-01'),
  end: new Date('2024-01-31'),
});
```

### 5. 配置配额

```typescript
import { QuotaConfig } from './services/quota-controller';

// 设置用户配额
const config: QuotaConfig = {
  userId: 'user-123',
  monthlyBudget: 50,      // $50/月
  warningThreshold: 0.8,  // 80% 时警告
  hardLimit: true,        // 启用硬限制
};

await container.quotaController.updateConfig(config);

// 检查配额状态
const status = await container.quotaController.getStatus('user-123');
console.log('Utilization:', status.utilization * 100 + '%');
console.log('Is Exceeded:', status.isExceeded);
```

### 6. 使用 Gateway Client

```typescript
// 连接到 Gateway
await container.gatewayClient.connect();

// 发送 RPC 请求
const result = await container.gatewayClient.send('chat.send', {
  message: 'Hello!',
  model: 'gpt-4',
});

// 订阅事件
const unsubscribe = container.gatewayClient.on('chat.chunk', (chunk) => {
  console.log('Received chunk:', chunk);
});

// 断开连接
container.gatewayClient.disconnect();
```

## 🏗️ 架构设计

### 服务依赖关系

```
ServiceContainer (顶层)
    ├── Repositories
    │   ├── SessionRepository
    │   └── UsageRepository
    │
    └── Services
        ├── AuthService
        ├── QuotaController
        ├── UsageMeteringEngine (依赖 QuotaController)
        └── GatewayClient
```

### 关键设计模式

1. **单例模式**: ServiceContainer 确保全局唯一
2. **依赖注入**: 通过构造函数注入依赖
3. **策略模式**: IAuthProvider 支持多种认证方式
4. **观察者模式**: GatewayClient 事件订阅
5. **工厂模式**: getServiceContainer() 便捷函数

## 📖 API 参考

### UsageMeteringEngine

| 方法 | 说明 | 参数 | 返回值 |
|------|------|------|--------|
| `recordUsage()` | 记录用量 | UsageRecordParams | Promise<void> |
| `getStats()` | 获取统计 | userId, period | Promise<UsageStats> |
| `getUsageRecords()` | 获取记录列表 | userId, period | Promise<Array> |
| `cleanupOldData()` | 清理旧数据 | beforeDate | Promise<number> |

### QuotaController

| 方法 | 说明 | 参数 | 返回值 |
|------|------|------|--------|
| `checkAndEnforce()` | 检查并执行配额 | userId, newUsage | Promise<void> |
| `getStatus()` | 获取配额状态 | userId | Promise<QuotaStatus \| null> |
| `updateConfig()` | 更新配置 | QuotaConfig | Promise<void> |

### AuthService

| 方法 | 说明 | 参数 | 返回值 |
|------|------|------|--------|
| `login()` | 用户登录 | - | Promise<IUserSession> |
| `getCurrentUser()` | 获取当前用户 | - | Promise<IUserSession \| null> |
| `logout()` | 用户登出 | - | Promise<void> |

### GatewayClient

| 方法 | 说明 | 参数 | 返回值 |
|------|------|------|--------|
| `connect()` | 连接 Gateway | - | Promise<void> |
| `send()` | 发送 RPC 请求 | method, params | Promise<any> |
| `on()` | 订阅事件 | eventName, handler | () => void (unsubscribe) |
| `disconnect()` | 断开连接 | - | void |
| `isConnected()` | 检查连接状态 | - | boolean |

## 🧪 测试

### 运行验证脚本

```bash
npx tsx src/services/verify.ts
```

### 单元测试 (TODO)

Week 4 将添加完整的单元测试:
- UsageMeteringEngine 成本计算测试
- QuotaController 配额控制测试
- AuthService 认证流程测试
- GatewayClient 连接管理测试

## 🔒 安全性

1. **配额控制**: 硬限制防止超额使用
2. **会话管理**: TODO Tauri Secure Storage
3. **错误隔离**: Gateway 事件处理器失败不影响其他
4. **输入验证**: TypeScript 类型系统保证

## 📊 性能指标

| 操作 | 预期时间 | 说明 |
|------|---------|------|
| 用量记录 | < 10ms | 包含成本计算和配额检查 |
| 统计查询 | < 50ms | 月度聚合查询 |
| Gateway 请求 | < 100ms | 取决于网络延迟 |
| 认证登录 | < 5ms | 本地匿名认证 |

## ⚠️ 注意事项

1. **初始化顺序**: 必须先调用 `container.initialize()`
2. **单例模式**: 不要直接 `new ServiceContainer()`,使用 `getInstance()`
3. **资源清理**: 应用关闭时调用 `container.dispose()`
4. **Gateway 连接**: 需要运行中的 OpenClaw Gateway

## 🔗 相关文档

- [Week 2 完成报告](./WEEK2_COMPLETION_REPORT.md)
- [Repository 层文档](../repositories/README.md)
- [后端开发计划](../../docs/dev-plan-backend.md)

---

**版本**: 0.1.0  
**最后更新**: 2024-01-XX  
**维护者**: OpenClaw Team
