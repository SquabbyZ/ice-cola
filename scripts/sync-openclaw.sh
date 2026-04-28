#!/bin/bash

# OpenClaw Submodule 同步脚本
# 用于更新 packages/client/openclaw-official 到最新版本

set -e

OPENCLAW_DIR="packages/client/openclaw-official"

echo "🔄 Syncing OpenClaw submodule..."
echo "📁 Directory: $OPENCLAW_DIR"

# 检查目录是否存在
if [ ! -d "$OPENCLAW_DIR" ]; then
    echo "❌ Error: $OPENCLAW_DIR does not exist!"
    echo "💡 Please copy OpenClaw to this directory first."
    exit 1
fi

# 进入 OpenClaw 目录
cd "$OPENCLAW_DIR"

# 检查是否是 git 仓库
if [ ! -d ".git" ]; then
    echo "⚠️  Warning: Not a git repository."
    echo "💡 This is a manual copy. To enable auto-sync:"
    echo "   1. Remove the current directory"
    echo "   2. Run: git submodule add https://github.com/openclaw/openclaw.git $OPENCLAW_DIR"
    exit 1
fi

# 获取当前分支
CURRENT_BRANCH=$(git branch --show-current)
echo "📌 Current branch: $CURRENT_BRANCH"

# 拉取最新代码
echo "📥 Pulling latest changes from upstream..."
git pull origin "$CURRENT_BRANCH"

# 显示最新版本
LATEST_COMMIT=$(git log -1 --oneline)
echo "✅ Updated to: $LATEST_COMMIT"

# 返回根目录
cd ../..

echo ""
echo "🎉 OpenClaw sync completed!"
echo ""
echo "Next steps:"
echo "  1. Rebuild Tauri app: cd packages/client && pnpm tauri dev"
echo "  2. Commit the update: git add $OPENCLAW_DIR && git commit -m 'chore: update openclaw submodule'"
