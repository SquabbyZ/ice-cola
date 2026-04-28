# Hermes Agent 集成指南

## 架构说明

本项目使用 **Hermes Agent** 作为 AI 大脑，我们的 Server 作为代理层连接到 Hermes Gateway。

```
┌─────────────┐       ┌──────────────┐       ┌─────────────────┐
│   Client    │◄─────►│   Server     │◄─────►│  Hermes Agent   │
│  (React)    │ WebSocket │ (NestJS)  │ WebSocket │  (Python)      │
└─────────────┘       └──────────────┘       └─────────────────┘
                                                  │
                                                  ▼
                                           ┌─────────────────┐
                                           │  OpenClaw Tools │
                                           │  (MCP/Plugins)  │
                                           └─────────────────┘
```

## 前置要求

1. **Python 3.10+** - Hermes Agent 需要 Python 环境
2. **Node.js 18+** - Server 和 Client 需要 Node.js

## 步骤 1: 安装 Hermes Agent

```bash
cd packages/hermes-agent

# 方法 1: 使用官方安装脚本（推荐）
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash

# 方法 2: 手动安装
pip install uv
uv sync
```

## 步骤 2: 配置 Hermes Agent

### 2.1 初始化配置

```bash
cd packages/hermes-agent
hermes setup
```

这会引导你完成：
- 选择 AI 提供商（OpenAI、Anthropic、MiniMax 等）
- 配置 API Key
- 设置默认模型
- 配置工具权限

### 2.2 手动配置（可选）

编辑 `~/.hermes/config.yaml`：

```yaml
# ~/.hermes/config.yaml

# AI Provider 配置
provider: openai  # 或 anthropic, minimax, etc.
model: gpt-4o     # 或 claude-3-5-sonnet, abab6.5s-chat, etc.
api_key: your-api-key-here

# Terminal Backend 配置
terminal:
  backend: local  # 或 docker, ssh, daytona, modal
  cwd: /path/to/your/workspace

# Gateway 配置
gateway:
  platforms:
    tui:
      enabled: true
      port: 8080  # TUI Gateway WebSocket 端口
```

## 步骤 3: 启动 Hermes TUI Gateway

```bash
cd packages/hermes-agent

# 启动 TUI Gateway（WebSocket 服务器）
python -m tui_gateway.entry

# 或者使用 CLI
hermes gateway start --platform tui
```

Gateway 会在 `ws://localhost:8080/api/ws` 监听连接。

## 步骤 4: 配置 Server 环境变量

编辑 `packages/server/.env`：

```env
# Hermes Gateway URL
HERMES_GATEWAY_URL=ws://localhost:8080/api/ws

# 其他配置...
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret
```

## 步骤 5: 启动服务

### 5.1 启动 Hermes Gateway（终端 1）

```bash
cd packages/hermes-agent
python -m tui_gateway.entry
```

你会看到类似输出：
```
[TUI Gateway] Starting on ws://0.0.0.0:8080/api/ws
[TUI Gateway] Ready to accept connections
```

### 5.2 启动 Server（终端 2）

```bash
cd packages/server
pnpm run dev
```

### 5.3 启动 Client（终端 3）

```bash
cd packages/client
pnpm run dev
```

## 验证连接

1. 打开浏览器访问 http://localhost:1420/chat
2. 发送一条消息
3. 检查控制台日志：
   - Server 应该显示 "✅ Connected to Hermes Gateway"
   - 应该能看到来自 Hermes 的 `message.delta` 和 `message.complete` 事件

## 协议映射

### Server → Hermes (JSON-RPC)

| 功能 | RPC 方法 | 参数 |
|------|---------|------|
| 创建会话 | `session.create` | `{ cols: 80 }` |
| 列出会话 | `session.list` | `{ limit: 20 }` |
| 恢复会话 | `session.resume` | `{ session_id: "..." }` |
| 获取历史 | `session.history` | `{ session_id: "..." }` |
| 发送消息 | `prompt.submit` | `{ session_id: "...", text: "..." }` |

### Hermes → Server (Events)

| 事件类型 | 描述 | 转发为 |
|---------|------|--------|
| `gateway.ready` | 连接就绪 | （内部处理） |
| `session.info` | 会话信息 | `session.info` |
| `message.start` | 消息开始 | （内部处理） |
| `message.delta` | 流式增量 | `hermes.delta` |
| `message.complete` | 消息完成 | `hermes.final` |
| `error` | 错误 | `hermes.error` |

## 故障排查

### 问题 1: 无法连接到 Hermes Gateway

**症状**: Server 日志显示 "Failed to connect to Hermes Gateway"

**解决**:
1. 确认 Hermes Gateway 正在运行：`ps aux | grep tui_gateway`
2. 检查端口是否正确：`lsof -i :8080`
3. 测试 WebSocket 连接：
   ```bash
   wscat -c ws://localhost:8080/api/ws
   ```

### 问题 2: Hermes Gateway 启动失败

**症状**: Python 报错或立即退出

**解决**:
1. 检查 Python 版本：`python --version`（需要 3.10+）
2. 检查依赖：`cd packages/hermes-agent && pip install -e .`
3. 查看日志：`~/.hermes/logs/tui_gateway_crash.log`

### 问题 3: 消息发送后没有响应

**症状**: 前端显示 "streaming" 但一直等待

**解决**:
1. 检查 Hermes Gateway 日志
2. 确认 API Key 已正确配置
3. 测试直接调用 Hermes：
   ```bash
   cd packages/hermes-agent
   hermes
   # 在交互式 CLI 中发送消息测试
   ```

### 问题 4: WebSocket 频繁断开

**症状**: 连接建立后立即断开

**解决**:
1. 检查防火墙设置
2. 确认没有其他进程占用端口 8080
3. 尝试更改端口：修改 `config.yaml` 中的 `gateway.platforms.tui.port`

## 高级配置

### 使用 Docker 运行 Hermes

```bash
cd packages/hermes-agent
docker-compose up -d
```

### 配置多个 AI 提供商

在 `~/.hermes/config.yaml` 中：

```yaml
providers:
  openai:
    api_key: sk-xxx
    model: gpt-4o
  anthropic:
    api_key: sk-ant-xxx
    model: claude-3-5-sonnet-20241022
  minimax:
    api_key: xxx
    model: abab6.5s-chat

# 切换提供商
hermes model openai:gpt-4o
hermes model anthropic:claude-3-5-sonnet-20241022
```

### 启用 OpenClaw 工具

Hermes 可以调用 OpenClaw 的工具（文件操作、浏览器自动化等）：

```bash
# 安装 OpenClaw 工具集
hermes tools enable file_operations
hermes tools enable browser_tool
hermes tools enable web_tools
```

## 开发调试

### 启用详细日志

```bash
# Hermes Gateway 日志
export HERMES_LOG_LEVEL=DEBUG
python -m tui_gateway.entry

# Server 日志
export DEBUG=openclaw:*
pnpm run dev
```

### 测试 JSON-RPC 调用

```bash
# 使用 wscat 测试
wscat -c ws://localhost:8080/api/ws

# 创建会话
> {"jsonrpc":"2.0","method":"session.create","params":{"cols":80},"id":1}

# 发送消息
> {"jsonrpc":"2.0","method":"prompt.submit","params":{"session_id":"abc123","text":"Hello"},"id":2}
```

## 参考资料

- [Hermes Agent 官方文档](https://hermes-agent.nousresearch.com/docs/)
- [Hermes GitHub](https://github.com/NousResearch/hermes-agent)
- [TUI Gateway 源码](packages/hermes-agent/tui_gateway/)
- [JSON-RPC 2.0 规范](https://www.jsonrpc.org/specification)
