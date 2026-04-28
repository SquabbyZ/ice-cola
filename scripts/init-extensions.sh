#!/bin/bash

# Initialize Extensions - 扩展数据初始化脚本
# This script seeds the database with default extensions

set -e

echo "🌱 Initializing Extensions..."

# Get database connection parameters from environment or use defaults
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-openclaw}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-postgres}

export PGPASSWORD=$DB_PASSWORD

echo "📦 Loading extension data into database..."

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$(dirname "$0")/seed-extensions.sql"

echo ""
echo "✅ Extensions initialized successfully!"
echo ""
echo "Available extensions:"
echo "  - GitHub 集成 (开发工具)"
echo "  - Notion 连接器 (生产力)"
echo "  - Slack 机器人 (通讯)"
echo "  - VS Code 插件 (开发工具)"
echo "  - 日历助手 (生产力)"
echo "  - 实时翻译 (工具)"
echo "  - 天气插件 (工具)"
echo "  - PDF 处理器 (文档)"
echo ""
echo "Total: 8 extensions loaded"

unset PGPASSWORD
