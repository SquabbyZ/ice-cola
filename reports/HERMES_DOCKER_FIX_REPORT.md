# Hermes Agent Docker 构建修复报告

**生成时间**: 2026-04-27 19:32  
**项目**: OpenClaw Server - Hermes Agent  
**状态**: ✅ 已修复,待验证

---

## 📋 问题诊断

### 1. 核心问题
Hermes Agent Docker 容器健康检查失败,状态显示为 `unhealthy`。

### 2. 根本原因
- **Dockerfile 缺少必要工具**: 原始 Dockerfile 未安装 `curl` 和 `wget`
- **健康检查依赖缺失**: docker-compose.yml 配置的健康检查使用 `curl -f http://localhost:9119/health`,但容器内无 curl 命令
- **容器启动正常但无法通过健康检查**: Hermes Gateway 服务正常启动,但健康检查端点无法访问

### 3. 错误现象
```bash
# 容器状态
NAME           STATUS                         PORTS
hermes-agent   Up X minutes (unhealthy)      0.0.0.0:9118-9119->9118-9119/tcp

# 健康检查失败
OCI runtime exec failed: exec failed: unable to start container process: 
exec: "curl": executable file not found in $PATH
```

### 4. 日志分析
```
hermes-agent  | Dropping root privileges
hermes-agent  | Syncing bundled skills into ~/.hermes/skills/ ...
hermes-agent  | Done: 0 new, 0 updated, 74 unchanged. 74 total bundled.
hermes-agent  | ┌─────────────────────────────────────────────────────────┐
hermes-agent  | │           ⚕ Hermes Gateway Starting...                 │
hermes-agent  | ├─────────────────────────────────────────────────────────┤
hermes-agent  | │  Messaging platforms + cron scheduler                    │
hermes-agent  | │  Press Ctrl+C to stop                                   │
hermes-agent  | └─────────────────────────────────────────────────────────┘
hermes-agent  | WARNING gateway.run: No user allowlists configured.
hermes-agent  | WARNING gateway.run: No messaging platforms enabled.
```

✅ **服务本身启动成功**,只是健康检查机制有问题。

---

## 🔧 修复方案

### 修改文件
**文件**: `packages/hermes-agent/Dockerfile`  
**行号**: 第 15-18 行

### 修改内容

#### 修改前
```dockerfile
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential nodejs npm python3 ripgrep ffmpeg gcc python3-dev libffi-dev procps git openssh-client docker-cli tini && \
    rm -rf /var/lib/apt/lists/*
```

#### 修改后
```dockerfile
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential nodejs npm python3 ripgrep ffmpeg gcc python3-dev libffi-dev procps git openssh-client docker-cli tini curl wget && \
    rm -rf /var/lib/apt/lists/*
```

### 修改说明
- ✅ 添加 `curl`: 用于健康检查和 HTTP 请求测试
- ✅ 添加 `wget`: 备用下载工具,增强容器调试能力
- ✅ 保持其他依赖不变
- ✅ 清理 APT 缓存以减小镜像体积

---

## 📊 影响范围

### 直接影响
1. **健康检查**: 容器可以通过健康检查,状态从 `unhealthy` 变为 `healthy`
2. **运维监控**: Docker Compose 和编排工具可以正确检测服务状态
3. **自动重启**: 基于健康检查的自动重启策略可以正常工作

### 间接影响
1. **镜像大小**: 增加约 2-5 MB (curl + wget 及其依赖)
2. **构建时间**: 增加约 5-10 秒 (安装额外包)
3. **安全性**: 无负面影响,curl/wget 为标准工具

---

## ✅ 验证步骤

### 1. 重新构建镜像
```bash
# 停止并删除旧容器
docker-compose down hermes-agent

# 重新构建(使用缓存加速)
docker-compose build hermes-agent

# 或使用完整重建
docker-compose build --no-cache hermes-agent
```

### 2. 启动容器
```bash
docker-compose up -d hermes-agent
```

### 3. 等待健康检查
```bash
# 等待 60-90 秒让健康检查通过
sleep 60

# 检查容器状态
docker-compose ps hermes-agent
```

**预期输出**:
```
NAME           IMAGE                          COMMAND                   SERVICE         CREATED          STATUS                    PORTS
hermes-agent   openclaw-server-hermes-agent   "/usr/bin/tini -g --…"   hermes-agent    X seconds ago    Up X seconds (healthy)   0.0.0.0:9118-9119->9118-9119/tcp
```

### 4. 验证健康端点
```bash
# 进入容器测试健康检查
docker exec hermes-agent curl -f http://localhost:9119/health

# 或从宿主机访问
curl http://localhost:9119/health
```

### 5. 检查服务日志
```bash
docker-compose logs hermes-agent --tail=50
```

**预期日志**:
- ✅ 无错误信息
- ✅ Gateway 正常启动
- ✅ 技能同步完成
- ⚠️ 警告信息正常(未配置消息平台)

### 6. 访问 Web Dashboard
```bash
# 浏览器访问
http://localhost:9119

# 或使用 curl 测试
curl http://localhost:9119
```

---

## 🎯 预期结果

### 修复前
- ❌ 容器状态: `unhealthy`
- ❌ 健康检查: 失败 (curl not found)
- ⚠️ 服务运行: 正常但无法被监控

### 修复后
- ✅ 容器状态: `healthy`
- ✅ 健康检查: 通过
- ✅ 服务运行: 正常且可监控
- ✅ Web Dashboard: 可访问
- ✅ MCP/Gateway: 端口 9118/9119 可用

---

## 📝 技术细节

### Dockerfile 层次结构
```
FROM ghcr.io/astral-sh/uv:0.11.6-python3.13-trixie AS uv_source
FROM tianon/gosu:1.19-trixie AS gosu_source
FROM debian:13.4

# 系统依赖安装 (已修复)
RUN apt-get install ... curl wget ...

# 用户创建
RUN useradd -u 10000 -m -d /opt/data hermes

# 复制工具
COPY --from=gosu_source /gosu /usr/local/bin/
COPY --from=uv_source /usr/local/bin/uv /usr/local/bin/uvx /usr/local/bin/

# Node.js 依赖
COPY package.json package-lock.json ./
COPY web/package.json web/package-lock.json web/
RUN npm install && npx playwright install && npm cache clean

# 源代码
COPY . .
RUN cd web && npm run build

# Python 环境
RUN uv venv && uv pip install -e ".[all]"

# 运行时配置
ENV HERMES_WEB_DIST=/opt/hermes/hermes_cli/web_dist
ENV HERMES_HOME=/opt/data
VOLUME [ "/opt/data" ]
ENTRYPOINT [ "/usr/bin/tini", "-g", "--", "/opt/hermes/docker/entrypoint.sh" ]
```

### 健康检查配置
```yaml
# docker-compose.yml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:9119/health || exit 0"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 60s
```

---

## 🔍 其他发现

### 1. 版本警告
```
time="2026-04-27T19:xx:xx+08:00" level=warning msg="docker-compose.yml: 
the attribute `version` is obsolete, it will be ignored"
```

**建议**: 从 docker-compose.yml 中移除 `version: '3.8'` 行(Docker Compose V2 不再需要)

### 2. 网关配置警告
```
WARNING gateway.run: No user allowlists configured. All unauthorized users will be denied.
WARNING gateway.run: No messaging platforms enabled.
```

**说明**: 这是正常警告,Hermes Gateway 需要配置才能使用:
- 设置 `GATEWAY_ALLOW_ALL_USERS=true` 允许开放访问
- 或配置平台白名单 (TELEGRAM_ALLOWED_USERS 等)
- 启用消息平台 (Telegram, Discord, Slack 等)

### 3. 镜像大小
- 当前大小: 5.87 GB
- 主要占用: Python 虚拟环境、Node.js 依赖、Playwright 浏览器
- 优化空间: 可使用多阶段构建减小最终镜像

---

## 🚀 后续优化建议

### 短期优化
1. ✅ **已完成**: 添加 curl/wget 支持健康检查
2. 🔄 **建议**: 移除 docker-compose.yml 中的 version 字段
3. 🔄 **建议**: 添加 .env 配置示例文档

### 中期优化
1. 📦 **镜像优化**: 使用多阶段构建减小镜像体积
2. 🔒 **安全加固**: 默认禁用 GATEWAY_ALLOW_ALL_USERS
3. 📊 **监控增强**: 添加 Prometheus metrics 端点

### 长期优化
1. 🏗️ **架构分离**: 将 Web Dashboard 和 Gateway 分离为独立服务
2. 🔄 **自动更新**: 实现 Hermes Agent 自动更新机制
3. 📝 **文档完善**: 补充部署和配置文档

---

## 📌 总结

### 问题根因
Dockerfile 缺少健康检查所需的 `curl` 工具

### 修复方式
在 apt-get install 命令中添加 `curl wget`

### 修复状态
✅ **代码已修改**,待重新构建验证

### 下一步行动
1. 执行 `docker-compose build hermes-agent`
2. 启动容器并等待健康检查通过
3. 验证 Web Dashboard 可访问
4. 确认容器状态为 `healthy`

---

**报告生成者**: AI Assistant  
**最后更新**: 2026-04-27 19:32 CST
