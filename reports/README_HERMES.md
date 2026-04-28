# OpenClaw Server - Hermes Agent 集成

## 🎯 架构重构

我们已将架构从**直接调用 AI API** 改为 **Hermes Agent 代理模式**：

### 之前的设计（❌ 已废弃）
```
Client → Server → AI Provider API (OpenAI/Anthropic/etc.)
```

### 现在的设计（✅ 正确）
```
Client → Server → Hermes Gateway → Hermes Agent → OpenClaw Tools
```

**为什么这样设计？**
- **Hermes Agent** 是完整的 AI Agent 系统，有自己的工具集、技能系统、记忆系统
- **OpenClaw** 作为 Hermes 的工具提供者（通过 MCP/插件）
- **我们的 Server** 只是 WebSocket 代理，转发 JSON-RPC 请求和事件
- 这样可以充分利用 Hermes 的自主能力和 OpenClaw 的执行能力

## 📦 快速开始

### 1. 安装 Hermes Agent

```bash
cd packages/hermes-agent
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
source ~/.bashrc  # 或 source ~/.zshrc
```

### 2. 配置 Hermes

```bash
hermes setup
```

这会引导你配置：
- AI 提供商（OpenAI、Anthropic、MiniMax 等）
- API Key
- 默认模型
- 工具权限

### 3. 启动服务

#### 方法 A: 使用启动脚本（推荐）

```bash
./start.sh
```

这会自动启动：
- Hermes TUI Gateway（ws://localhost:8080/api/ws）
- NestJS Server（http://localhost:3000）
- React Client（http://localhost:1420，可选）

#### 方法 B: 手动启动

**终端 1 - Hermes Gateway:**
```bash
cd packages/hermes-agent
python -m tui_gateway.entry
```

**终端 2 - Server:**
```bash
cd packages/server
pnpm run dev
```

**终端 3 - Client:**
```bash
cd packages/client
pnpm run dev
```

### 4. 测试

打开浏览器访问 http://localhost:1420/chat，发送消息测试流式对话。

## 🔧 配置

### Server 环境变量

编辑 `packages/server/.env`：

```env
# Hermes Gateway URL
HERMES_GATEWAY_URL=ws://localhost:8080/api/ws

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/openclaw?schema=public

# JWT
JWT_SECRET=your-secret-key
```

### Hermes 配置

编辑 `~/.hermes/config.yaml`：

```yaml
# AI Provider
provider: openai
model: gpt-4o
api_key: sk-xxx

# Terminal Backend
terminal:
  backend: local
  cwd: /path/to/workspace

# Gateway
gateway:
  platforms:
    tui:
      enabled: true
      port: 8080
```

## 📡 协议说明

### JSON-RPC 方法（Client → Server → Hermes）

| 方法 | 描述 | 参数 |
|------|------|------|
| `session.create` | 创建新会话 | `{ cols: 80 }` |
| `session.list` | 列出会话 | `{ limit: 20 }` |
| `session.resume` | 恢复会话 | `{ session_id: "..." }` |
| `session.history` | 获取历史 | `{ session_id: "..." }` |
| `prompt.submit` | 发送消息 | `{ session_id: "...", text: "..." }` |

### 事件（Hermes → Server → Client）

| 事件 | 描述 | 数据 |
|------|------|------|
| `hermes.delta` | 流式增量 | `{ runId, delta, accumulated }` |
| `hermes.final` | 消息完成 | `{ runId, content, status, usage }` |
| `hermes.error` | 错误 | `{ errorMessage }` |
| `session.info` | 会话信息 | `{ model, tools, skills, ... }` |

## 🐛 故障排查

### 问题：无法连接到 Hermes Gateway

```bash
# 检查 Hermes 是否运行
ps aux | grep tui_gateway

# 检查端口
lsof -i :8080

# 测试 WebSocket
wscat -c ws://localhost:8080/api/ws
```

### 问题：消息发送后没有响应

1. 检查 Hermes Gateway 日志：`cat /tmp/hermes-gateway.log`
2. 确认 API Key 已配置：`cat ~/.hermes/config.yaml`
3. 测试 Hermes CLI：`hermes`（交互式测试）

### 问题：Server 报错 "Not connected to Hermes Gateway"

1. 确保 Hermes Gateway 先启动
2. 检查 `HERMES_GATEWAY_URL` 环境变量
3. 查看 Server 日志：`cat /tmp/openclaw-server.log`

## 📚 相关文档

- [HERMES_INTEGRATION.md](./HERMES_INTEGRATION.md) - 详细集成指南
- [Hermes Agent 官方文档](https://hermes-agent.nousresearch.com/docs/)
- [TUI Gateway 源码](packages/hermes-agent/tui_gateway/)

## 🔄 停止服务

```bash
./stop.sh
```

或手动停止：

```bash
# 停止 Hermes
kill $(cat /tmp/hermes-gateway.pid)

# 停止 Server
kill $(cat /tmp/openclaw-server.pid)

# 停止 Client
kill $(cat /tmp/openclaw-client.pid)
```
