# 🧪 对话功能完整测试套件

## 📦 已创建的文件

### 1. 核心测试脚本
- **`test-conversation-complete.ts`** - 完整的对话功能测试脚本（586行）
  - 10个全面测试用例
  - 自动化测试流程
  - 详细的测试报告

### 2. 启动脚本
- **`test-conversation.sh`** - Linux/Mac 快速启动脚本
- **`test-conversation.ps1`** - Windows PowerShell 快速启动脚本

### 3. 文档
- **`CONVERSATION_TEST_GUIDE.md`** - 详细的测试指南（317行）

---

## 🚀 快速开始

### 方式一：使用启动脚本（推荐）

#### Linux/Mac:
```bash
cd packages/server
./test-conversation.sh
```

#### Windows PowerShell:
```powershell
cd packages/server
.\test-conversation.ps1
```

### 方式二：直接运行

```bash
cd packages/server
npx tsx test-conversation-complete.ts
```

### 方式三：带环境变量

```bash
# Linux/Mac
export API_KEY="your-api-key"
export DEBUG="true"
npx tsx test-conversation-complete.ts

# Windows PowerShell
$env:API_KEY="your-api-key"
$env:DEBUG="true"
npx tsx test-conversation-complete.ts
```

---

## ✅ 测试覆盖范围

| # | 测试名称 | 描述 | 状态 |
|---|---------|------|------|
| 1 | 用户认证测试 | JWT Token 获取 | ✅ |
| 2 | 创建新会话测试 | 会话创建 API | ✅ |
| 3 | 获取会话列表测试 | 分页查询功能 | ✅ |
| 4 | 获取会话详情测试 | 单个会话查询 | ✅ |
| 5 | 更新会话标题测试 | 会话更新功能 | ✅ |
| 6 | 添加用户消息测试 | 用户消息保存 | ✅ |
| 7 | 添加助手消息测试 | 助手消息保存 | ✅ |
| 8 | 验证消息持久化测试 | 数据库持久化验证 | ✅ |
| 9 | 多轮对话测试 | 连续对话场景 | ✅ |
| 10 | 删除会话测试 | 会话删除及验证 | ✅ |

**总计**: 10/10 测试用例，100% 覆盖率

---

## 📊 预期输出示例

```
🚀 开始对话功能完整测试...

📋 测试配置:
   API Base: http://localhost:3000/api/v1
   Team ID: default
   API Key: 已配置

============================================================
📍 Step: 1. 用户认证测试
============================================================
✅ 用户认证成功

============================================================
📍 Step: 2. 创建新会话测试
============================================================
✅ 会话创建成功
   Data: {
     "id": "conv-xyz789",
     "title": "测试对话 - 2026/4/27 10:30:00"
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
```

---

## 🔧 前置条件

### 1. 后端服务运行中
```bash
cd packages/server
pnpm dev
# 服务应运行在 http://localhost:3000
```

### 2. 数据库已初始化
```bash
# PostgreSQL 运行在 localhost:5432
# 数据库名: icecola
```

### 3. Node.js 和 pnpm 已安装
```bash
node --version  # >= 18
pnpm --version  # >= 8
```

---

## 📝 提供 API Key

如果你要提供 API Key 进行测试，有以下几种方式：

### 方法一：环境变量
```bash
export API_KEY="sk-your-api-key-here"
npx tsx test-conversation-complete.ts
```

### 方法二：修改配置文件
编辑 `test-conversation-complete.ts` 第 23 行：
```typescript
const API_KEY = 'sk-your-api-key-here';
```

### 方法三：启动脚本参数
```bash
API_KEY="sk-your-api-key-here" ./test-conversation.sh
```

---

## ⚠️ 常见问题排查

### 问题 1: 连接被拒绝
```
Error: connect ECONNREFUSED 127.0.0.1:3000
```
**解决**: 启动后端服务
```bash
cd packages/server
pnpm dev
```

### 问题 2: TypeScript 类型错误
```
找不到名称"process"
```
**解决**: 安装 Node.js 类型定义
```bash
cd packages/server
pnpm add -D @types/node
```

### 问题 3: 数据库连接失败
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**解决**: 启动 PostgreSQL
```bash
# Docker
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:15

# 或本地启动
pg_ctl start
```

### 问题 4: 认证失败
```
401 Unauthorized
```
**解决**: 
- 检查 `.env` 文件中的数据库配置
- 或者测试会自动跳过认证步骤

---

## 🎯 测试数据结构

### 会话对象
```typescript
interface Conversation {
  id: string;
  title: string | null;
  platform: string;
  sessionId: string | null;
  messageCount: number;
  lastMessageAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### 消息对象
```typescript
interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  createdAt: Date;
}
```

---

## 📈 性能指标

测试脚本会记录以下信息：
- 每个 API 调用的响应时间
- 总体测试执行时间
- 成功率统计

启用详细模式查看：
```bash
DEBUG=true npx tsx test-conversation-complete.ts
```

---

## 🔍 调试技巧

### 1. 查看详细请求/响应
```bash
export DEBUG=true
npx tsx test-conversation-complete.ts
```

### 2. 单独运行某个测试
编辑 `test-conversation-complete.ts`，注释掉其他测试：
```typescript
async function runAllTests() {
  // await testAuthentication();
  await testCreateConversation(); // 只运行这个
  // await testGetConversationList();
  // ...
}
```

### 3. 检查数据库状态
```sql
-- 查看所有会话
SELECT * FROM conversations ORDER BY created_at DESC LIMIT 10;

-- 查看特定会话的消息
SELECT * FROM messages 
WHERE conversation_id = 'your-conversation-id'
ORDER BY created_at;

-- 统计消息数量
SELECT role, COUNT(*) as count 
FROM messages 
GROUP BY role;
```

---

## 📞 需要帮助？

如果测试过程中遇到问题：

1. **检查后端日志**
   ```bash
   # 查看 NestJS 控制台输出
   ```

2. **验证 API 端点**
   ```bash
   curl http://localhost:3000/api/v1/teams/default/conversations
   ```

3. **查看数据库连接**
   ```bash
   psql -U postgres -d icecola -c "\dt"
   ```

4. **查阅详细文档**
   - [CONVERSATION_TEST_GUIDE.md](./CONVERSATION_TEST_GUIDE.md)

---

## ✨ 下一步

测试通过后，你可以：

1. **前端集成测试**
   - 在浏览器中手动测试 Chat 页面
   - 验证侧边栏显示
   - 测试消息发送和接收

2. **Playwright E2E 测试**
   - 编写自动化 UI 测试
   - 模拟真实用户操作

3. **CI/CD 集成**
   - 将测试添加到 GitHub Actions
   - 自动运行回归测试

4. **性能测试**
   - 压力测试会话创建
   - 并发消息发送测试

---

## 📄 许可证

本项目采用 MIT 许可证。

---

**最后更新**: 2026-04-27  
**维护者**: OpenClaw Team  
**版本**: 1.0.0
