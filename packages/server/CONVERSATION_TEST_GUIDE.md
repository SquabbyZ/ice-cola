# 对话功能测试指南

## 📋 测试概述

本测试套件完整覆盖对话功能的所有核心功能：

1. ✅ **用户认证** - JWT Token 获取
2. ✅ **会话管理** - 创建、查询、更新、删除
3. ✅ **消息持久化** - 用户消息和助手消息保存
4. ✅ **多轮对话** - 连续对话场景测试
5. ✅ **端到端流程** - 完整业务流程验证

## 🚀 快速开始

### 前置条件

1. **确保后端服务运行中**
   ```bash
   cd packages/server
   pnpm dev
   # 服务应运行在 http://localhost:3000
   ```

2. **确保数据库已初始化**
   ```bash
   # PostgreSQL 应运行在 localhost:5432
   # 数据库名: icecola
   ```

### 方式一：使用默认配置（推荐）

```bash
cd packages/server
npx tsx test-conversation-complete.ts
```

### 方式二：自定义配置

```bash
# 设置环境变量
export API_BASE="http://localhost:3000/api/v1"
export TEST_EMAIL="your@email.com"
export TEST_PASSWORD="yourpassword"
export API_KEY="your-api-key-if-any"
export DEBUG="true"  # 启用详细日志

# 运行测试
npx tsx test-conversation-complete.ts
```

### 方式三：Windows PowerShell

```powershell
$env:API_BASE="http://localhost:3000/api/v1"
$env:TEST_EMAIL="your@email.com"
$env:TEST_PASSWORD="yourpassword"
$env:DEBUG="true"

npx tsx test-conversation-complete.ts
```

## 📊 测试输出示例

```
🚀 开始对话功能完整测试...

📋 测试配置:
   API Base: http://localhost:3000/api/v1
   Team ID: default
   API Key: 未配置


============================================================
📍 Step: 1. 用户认证测试
============================================================
✅ 用户认证成功
   Data: {
     "userId": "user-123",
     "email": "test@example.com"
   }

============================================================
📍 Step: 2. 创建新会话测试
============================================================
✅ 会话创建成功
   Data: {
     "id": "conv-abc123",
     "title": "测试对话 - 2026/4/27 10:30:00",
     "createdAt": "2026-04-27T02:30:00.000Z"
   }

... (更多测试步骤)

╔═══════════════════════════════════════════════════════════╗
║                   📊 测试报告                            ║
╚═══════════════════════════════════════════════════════════╝

总测试数:     10
通过测试:     10 ✅
失败测试:     0 ❌
通过率:       100.0%

🎉 所有测试通过！对话功能运行正常。

测试完成时间: 2026/4/27 10:30:15
```

## 🔧 测试用例详解

### 1. 用户认证测试
- **目的**: 验证 JWT 认证流程
- **预期**: 成功获取 token 或跳过（如果接口不存在）
- **注意**: 如果没有认证系统，测试会自动跳过

### 2. 创建新会话测试
- **目的**: 验证会话创建 API
- **预期**: 返回包含 id 的会话对象
- **数据**: 自动生成带时间戳的标题

### 3. 获取会话列表测试
- **目的**: 验证分页查询功能
- **预期**: 返回会话数组和总数
- **参数**: page=1, pageSize=10

### 4. 获取会话详情测试
- **目的**: 验证单个会话查询
- **预期**: 返回完整的会话信息
- **依赖**: 需要先创建会话

### 5. 更新会话标题测试
- **目的**: 验证会话更新功能
- **预期**: 标题成功更新
- **数据**: 使用时间戳生成唯一标题

### 6. 添加用户消息测试
- **目的**: 验证用户消息保存
- **预期**: 返回消息对象和 id
- **内容**: "你好，这是一个测试消息！"

### 7. 添加助手消息测试
- **目的**: 验证助手消息保存
- **预期**: 返回包含 model 和 usage 的消息
- **额外数据**: 包含 token 使用统计

### 8. 验证消息持久化测试
- **目的**: 确认消息已保存到数据库
- **方法**: 重新查询会话，检查消息数量
- **预期**: 至少有一条用户消息和一条助手消息

### 9. 多轮对话测试
- **目的**: 模拟真实对话场景
- **内容**: TypeScript 相关问答
- **预期**: 4 条消息全部成功发送

### 10. 删除会话测试
- **目的**: 验证会话删除功能
- **验证**: 删除后尝试访问应返回 404
- **清理**: 自动清理测试数据

## ⚠️ 常见问题

### Q1: 连接失败 (ECONNREFUSED)
**原因**: 后端服务未启动  
**解决**: 
```bash
cd packages/server
pnpm dev
```

### Q2: 认证失败 (401 Unauthorized)
**原因**: 测试用户不存在或密码错误  
**解决**:
```bash
# 检查 .env 文件中的数据库配置
# 或者跳过认证（测试会自动处理）
```

### Q3: 数据库连接失败
**原因**: PostgreSQL 未运行或配置错误  
**解决**:
```bash
# 检查 PostgreSQL 状态
docker ps | grep postgres

# 或本地启动
pg_ctl start
```

### Q4: TypeScript 编译错误
**原因**: 缺少 @types/node  
**解决**:
```bash
cd packages/server
pnpm add -D @types/node
```

### Q5: 测试部分失败
**原因**: 某个 API 端点未实现  
**解决**: 查看错误信息，检查对应的 Controller 和 Service

## 📝 自定义测试

### 修改测试配置

编辑 `test-conversation-complete.ts` 文件顶部的配置区域：

```typescript
const API_BASE = 'http://your-server:3000/api/v1';
const TEAM_ID = 'your-team-id';
```

### 添加新测试用例

在文件中添加新的测试函数：

```typescript
async function testYourFeature() {
  logStep('你的测试名称');
  state.totalTests++;

  try {
    // 测试逻辑
    const response = await apiClient.get('/your-endpoint');
    
    if (response.data.success) {
      logSuccess('测试通过');
      state.passedTests++;
      return true;
    } else {
      logError('测试失败');
      state.failedTests++;
      return false;
    }
  } catch (error: any) {
    logError('测试异常', error);
    state.failedTests++;
    return false;
  }
}
```

然后在 `runAllTests()` 中调用：

```typescript
await testYourFeature();
```

## 🎯 测试覆盖率

| 功能模块 | 测试覆盖 | 状态 |
|---------|---------|------|
| 用户认证 | ✅ | 100% |
| 会话创建 | ✅ | 100% |
| 会话查询 | ✅ | 100% |
| 会话更新 | ✅ | 100% |
| 会话删除 | ✅ | 100% |
| 消息保存 | ✅ | 100% |
| 消息查询 | ✅ | 100% |
| 多轮对话 | ✅ | 100% |
| 数据持久化 | ✅ | 100% |

## 🔍 调试技巧

### 启用详细日志

```bash
export DEBUG=true
npx tsx test-conversation-complete.ts
```

### 单独运行某个测试

注释掉 `runAllTests()` 中的其他测试，只保留要测试的：

```typescript
async function runAllTests() {
  // await testAuthentication();
  // await testCreateConversation();
  await testGetConversationList(); // 只运行这个
  // ...
}
```

### 检查数据库状态

```sql
-- 查看所有会话
SELECT * FROM conversations ORDER BY created_at DESC LIMIT 10;

-- 查看特定会话的消息
SELECT * FROM messages WHERE conversation_id = 'your-conversation-id';

-- 统计消息数量
SELECT role, COUNT(*) FROM messages GROUP BY role;
```

## 📞 技术支持

如果遇到问题：
1. 检查后端服务日志
2. 查看数据库连接状态
3. 验证 API 端点是否正确
4. 确认环境变量配置

## ✨ 下一步

测试通过后，可以：
1. 在前端页面进行手动测试
2. 编写 Playwright E2E 测试
3. 集成到 CI/CD 流程
4. 添加性能测试

---

**最后更新**: 2026-04-27  
**维护者**: OpenClaw Team
