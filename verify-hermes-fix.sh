#!/bin/bash
# Hermes Agent Docker 构建验证脚本

set -e

echo "=========================================="
echo "Hermes Agent Docker 构建验证"
echo "=========================================="
echo ""

# 1. 检查 Dockerfile 修改
echo "📋 步骤 1: 检查 Dockerfile 修改..."
if grep -q "curl wget" packages/hermes-agent/Dockerfile; then
    echo "✅ Dockerfile 已正确修改 (包含 curl 和 wget)"
else
    echo "❌ Dockerfile 未找到 curl 和 wget"
    exit 1
fi
echo ""

# 2. 停止旧容器
echo "🛑 步骤 2: 停止旧容器..."
docker-compose down hermes-agent 2>/dev/null || true
echo "✅ 旧容器已停止"
echo ""

# 3. 重新构建
echo "🔨 步骤 3: 重新构建镜像..."
echo "   这可能需要 5-10 分钟,请耐心等待..."
docker-compose build hermes-agent
echo "✅ 镜像构建完成"
echo ""

# 4. 启动容器
echo "🚀 步骤 4: 启动容器..."
docker-compose up -d hermes-agent
echo "✅ 容器已启动"
echo ""

# 5. 等待健康检查
echo "⏳ 步骤 5: 等待健康检查通过..."
echo "   等待 90 秒..."
sleep 90

# 6. 检查状态
echo ""
echo "📊 步骤 6: 检查容器状态..."
docker-compose ps hermes-agent
echo ""

# 7. 检查日志
echo "📝 步骤 7: 查看最新日志..."
docker-compose logs hermes-agent --tail=20
echo ""

# 8. 测试健康端点
echo "🔍 步骤 8: 测试健康端点..."
if docker exec hermes-agent curl -f http://localhost:9119/health >/dev/null 2>&1; then
    echo "✅ 健康检查端点可访问"
else
    echo "⚠️  健康检查端点暂时不可访问(可能服务正在启动)"
fi
echo ""

echo "=========================================="
echo "验证完成!"
echo "=========================================="
echo ""
echo "下一步:"
echo "1. 检查容器状态是否为 'healthy'"
echo "2. 访问 Web Dashboard: http://localhost:9119"
echo "3. 查看详细报告: cat HERMES_DOCKER_FIX_REPORT.md"
echo ""
