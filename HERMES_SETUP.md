# Hermes Agent 本地开发配置

## 概述

Hermes Agent 已成功集成到 Ice Cola 项目的本地开发一键启动脚本中。

## 配置变更

### 1. dev.mjs 更新
- 添加了 `hermes` 服务配置（端口 9119）
- 更新了日志前缀，添加 `[hrm]` 标识
- 更新了启动横幅，显示 Hermes Dashboard URL

### 2. ecosystem.config.cjs 更新
- 添加了 `ice-cola-hermes-9119` PM2 服务配置
- 使用 Python 启动 Hermes Web Dashboard

### 3. 文档更新
- 更新了 `.claude/rules/common/runtime.md`
- 添加了 Hermes 相关的 PM2 命令

## Python 依赖安装

Hermes Agent 需要以下核心 Python 依赖：

```bash
# 已安装的核心依赖
pyyaml
anthropic
openai
python-dotenv
fire
httpx
rich
tenacity
requests
jinja2
pydantic
prompt_toolkit
exa-py
firecrawl-py
```

### 安装方法

如果需要重新安装依赖：

```bash
# 方法 1: 使用 pip（推荐，避免代理问题）
cd packages/hermes-agent
unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy
pip install pyyaml anthropic openai python-dotenv fire httpx rich tenacity requests jinja2 pydantic prompt_toolkit exa-py firecrawl-py

# 方法 2: 使用 pyproject.toml（需要配置好网络）
cd packages/hermes-agent
pip install -e .
```

## 使用方法

### 启动所有服务（包括 Hermes）

```bash
# 方法 1: 使用 dev.mjs（推荐）
node dev.mjs

# 方法 2: 使用 pnpm
pnpm dev
```

### 单独管理 Hermes 服务

```bash
# 使用 PM2
pm2 start ice-cola-hermes-9119
pm2 stop ice-cola-hermes-9119
pm2 restart ice-cola-hermes-9119

# 查看日志
pm2 logs ice-cola-hermes-9119
```

### 检查服务状态

```bash
node dev.mjs status
```

输出示例：
```
  Ice Cola Dev Server Status
  ─────────────────────────
  Server (NestJS)      :3000  RUNNING
  Admin (Vite)         :1992  RUNNING
  Client (Vite)        :1420  RUNNING
  Hermes Dashboard     :9119  RUNNING
```

## 访问地址

启动后可以通过以下地址访问：

- **Hermes Dashboard**: http://localhost:9119
- Admin 前端: http://localhost:1992
- Client 前端: http://localhost:1420
- Server 后端: http://localhost:3000

## 环境配置

Hermes Agent 使用 `packages/hermes-agent/.env` 文件进行配置。

关键配置项：
```env
# LLM Provider
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Hermes Configuration
HERMES_HOME=/home/hermes/.hermes
HERMES_WEB_DIST=/app/hermes_cli/web_dist
HERMES_DASHBOARD_TUI=0
```

## 故障排查

### 问题 1: Python 依赖缺失

**症状**: 启动时报错 `ModuleNotFoundError: No module named 'yaml'`

**解决方案**:
```bash
cd packages/hermes-agent
unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy
pip install pyyaml anthropic openai python-dotenv fire httpx rich tenacity requests jinja2 pydantic prompt_toolkit
```

### 问题 2: 代理连接失败

**症状**: pip 安装时报错 `ProxyError: Cannot connect to proxy`

**解决方案**:
```bash
# 临时禁用代理
unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy
pip install <package_name>
```

### 问题 3: 端口被占用

**症状**: 启动失败，提示端口 9119 已被占用

**解决方案**:
```bash
# Windows
netstat -ano | findstr :9119
taskkill /F /PID <PID>

# Linux/macOS
lsof -ti:9119 | xargs kill -9
```

## 注意事项

1. **Python 版本要求**: Python >= 3.11
2. **网络要求**: 首次安装依赖需要网络连接
3. **代理配置**: 如果系统配置了代理但代理不可用，需要临时禁用代理
4. **环境变量**: Hermes 需要配置 API Key 才能正常使用 LLM 功能

## 相关文档

- [CLAUDE.md](./CLAUDE.md) - 项目开发规范
- [.claude/rules/common/runtime.md](./.claude/rules/common/runtime.md) - 运行时配置
- [packages/hermes-agent/README.md](./packages/hermes-agent/README.md) - Hermes Agent 官方文档
