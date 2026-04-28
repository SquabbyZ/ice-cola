# 🚀 快速开始 - 对话功能测试

## ⚡ 30秒快速测试

### 步骤 1: 确保后端运行

```bash
cd packages/server
pnpm dev
```

等待看到 `Nest application successfully started` 消息。

### 步骤 2: 运行测试（选择一种方式）

#### 方式 A: 使用 pnpm 脚本（最简单）
```bash
cd packages/server
pnpm test:conversation
```

#### 方式 B: 使用启动脚本
```bash
# Linux/Mac
./test-conversation.sh

# Windows PowerShell
.\test-conversation.ps1
```

#### 方式 C: 直接运行
```bash
npx tsx test-conversation-complete.ts
```

---

## 🔑 提供 API Key

如果你有 API Key，可以通过以下方式提供：

### 方法 1: 环境变量（推荐）

**Linux/Mac:**
```bash
export API_KEY="sk-your-api-key-here"
pnpm test:conversation
```

**Windows PowerShell:**
```powershell
$env:API_KEY="sk-your-api-key-here"
pnpm test:conversation
```

**Windows CMD:**
```cmd
set API_KEY=sk-your-api-key-here
pnpm test:conversation
```

### 方法 2: 单行命令

**Linux/Mac:**
```bash
API_KEY="sk-your-api-key-here" pnpm test:conversation
```

**Windows PowerShell:**
```powershell
$env:API_KEY="sk-your-api-key-here"; pnpm test:conversation
```

### 方法 3: 修改配置文件

编辑 `test-conversation-complete.ts` 第 23 行：
```typescript
const API_KEY = 'sk-your-api-key-here'; // 在这里填入你的 API Key
```

---

## 📊 查看测试结果

测试完成后会显示详细报告：

```
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

## 🔍 调试模式

如果需要查看详细日志：

```bash
# Linux/Mac
DEBUG=true pnpm test:conversation

# 或使用专用脚本
pnpm test:conversation:debug
```

---

## ⚠️ 常见问题

### Q: 提示 "连接被拒绝"
**A**: 后端服务未启动，请先运行 `pnpm dev`

### Q: 提示 "数据库连接失败"
**A**: PostgreSQL 未运行，请启动数据库服务

### Q: TypeScript 编译错误
**A**: 已自动修复，如果还有问题请运行 `pnpm install`

---

## 📝 测试内容概览

✅ 用户认证  
✅ 创建会话  
✅ 查询会话列表  
✅ 查询会话详情  
✅ 更新会话标题  
✅ 发送用户消息  
✅ 发送助手消息  
✅ 验证消息持久化  
✅ 多轮对话  
✅ 删除会话  

---

## 💡 提示

- 测试会自动清理创建的测试数据
- 每个测试都是独立的，可以单独运行
- 测试失败不会影响数据库中的其他数据
- 建议在生产环境测试前先备份数据

---

**需要帮助？** 查看 [CONVERSATION_TEST_GUIDE.md](./CONVERSATION_TEST_GUIDE.md) 获取详细说明。
