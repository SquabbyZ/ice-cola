#!/bin/bash

# 对话功能测试快速启动脚本

echo "🚀 OpenClaw 对话功能测试"
echo ""

# 检查后端服务是否运行
echo "📡 检查后端服务状态..."
if curl -s http://localhost:3000/api/v1/health > /dev/null 2>&1; then
    echo "✅ 后端服务运行正常"
else
    echo "⚠️  后端服务未运行，请先启动："
    echo "   cd packages/server && pnpm dev"
    echo ""
    read -p "是否继续测试？(y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    exit 1
fi

echo ""
echo "📋 测试配置:"
echo "   API Base: ${API_BASE:-http://localhost:3000/api/v1}"
echo "   Team ID: default"
echo "   Debug: ${DEBUG:-false}"
echo ""

# 运行测试
echo "🧪 开始执行测试..."
echo ""

cd "$(dirname "$0")"
npx tsx test-conversation-complete.ts

exit_code=$?

echo ""
if [ $exit_code -eq 0 ]; then
    echo "✅ 测试脚本执行完成"
else
    echo "❌ 测试脚本执行失败 (exit code: $exit_code)"
fi

exit $exit_code
