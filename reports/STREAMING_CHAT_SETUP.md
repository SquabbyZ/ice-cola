# 流式对话功能配置指南

## 🚀 快速开始

### 1. 配置 AI API Key

复制 `.env.example` 为 `.env`：

```bash
cp packages/server/.env.example packages/server/.env
```

编辑 `packages/server/.env`，填入你的 AI 提供商信息：

#### 选项 A: MiniMax（推荐，中文支持好）

```env
AI_API_KEY=your-minimax-api-key
AI_BASE_URL=https://api.minimaxi.com/v1
AI_MODEL=abab6.5s-chat
```

获取 API Key: https://platform.minimaxi.com/

#### 选项 B: Anthropic Claude

```env
AI_API_KEY=sk-ant-your-api-key
AI_BASE_URL=https://api.anthropic.com/v1
AI_MODEL=claude-3-5-sonnet-20241022
```

获取 API Key: https://console.anthropic.com/

#### 选项 C: OpenAI

```env
AI_API_KEY=sk-your-openai-key
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o
```

获取 API Key: https://platform.openai.com/

#### 选项 D: 其他兼容 OpenAI 的提供商

DeepSeek、Z.AI (GLM)、Kimi 等都使用相同的格式，只需修改 `BASE_URL` 和 `MODEL`。

### 2. 重启服务器

```bash
cd packages/server
pnpm run dev
```

### 3. 测试对话

打开浏览器访问 http://localhost:1420/chat，发送消息测试流式响应。

## 🔧 技术实现

### 后端架构

```
Client (WebSocket) 
    ↓ hermes.send RPC
Gateway Server
    ↓ HTTP POST (streaming)
AI Provider API
    ↓ SSE (Server-Sent Events)
Gateway Server
    ↓ hermes.delta events (逐字推送)
Client (实时更新UI)
```

### 关键文件

- **后端**: `packages/server/src/gateway/gateway.service.ts`
  - `sendHermesMessage()`: 处理消息发送
  - `streamAIResponse()`: 调用 AI API 并处理流式响应
  - `sendDemoResponse()`: 无 API Key 时的降级方案

- **前端**: `packages/client/src/pages/Chat.tsx`
  - 监听 `hermes.delta` 事件：实时更新消息内容
  - 监听 `hermes.final` 事件：标记消息完成
  - 超时保护：30秒无响应自动显示错误

### 数据流

1. **用户发送消息** → 前端调用 `hermes.send` RPC
2. **后端接收** → 生成 `runId`，调用 AI API
3. **AI 流式响应** → 后端逐字接收 delta
4. **推送到前端** → 通过 WebSocket 发送 `hermes.delta` 事件
5. **前端更新** → 实时显示打字效果
6. **完成信号** → 发送 `hermes.final` 事件，保存消息到数据库

## 📊 支持的 AI 提供商

所有支持 OpenAI 兼容格式的提供商都可以使用：

| 提供商 | 基础 URL | 推荐模型 |
|--------|---------|---------|
| MiniMax | `https://api.minimaxi.com/v1` | `abab6.5s-chat` |
| Anthropic | `https://api.anthropic.com/v1` | `claude-3-5-sonnet-20241022` |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o` |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| Z.AI (GLM) | `https://open.bigmodel.cn/api/paas/v4` | `glm-4-plus` |
| Kimi | `https://api.moonshot.cn/v1` | `moonshot-v1-8k` |

## ⚠️ 注意事项

1. **API Key 安全**: 永远不要将 `.env` 文件提交到 Git
2. **成本控制**: 设置预算限制，监控 API 使用情况
3. **错误处理**: 如果 API 调用失败，会返回友好的错误消息
4. **超时保护**: 30秒无响应会自动超时

## 🐛 故障排除

### 问题：收到演示响应而不是真实 AI 回复

**原因**: 未配置 `AI_API_KEY` 环境变量

**解决**: 
1. 检查 `packages/server/.env` 文件是否存在
2. 确认 `AI_API_KEY` 已正确配置
3. 重启服务器

### 问题：API 调用失败

**检查**:
1. API Key 是否正确
2. 网络连接是否正常
3. 查看服务器日志中的详细错误信息

```bash
# 查看服务器日志
tail -f packages/server/logs/*.log
```

### 问题：流式响应不工作

**检查**:
1. 浏览器控制台是否有 `hermes.delta` 事件日志
2. WebSocket 连接是否正常
3. 防火墙是否阻止了端口 3001

## 📝 下一步

- [ ] 添加多轮对话上下文支持
- [ ] 实现消息历史记录持久化
- [ ] 添加速率限制和配额管理
- [ ] 支持图片等多模态输入
- [ ] 集成更多 AI 提供商
