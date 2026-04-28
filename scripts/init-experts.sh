#!/bin/bash
# 专家系统初始化脚本
# 用于快速设置预设专家数据

set -e

echo "🔧 初始化专家系统..."
echo ""

# 检查参数
DB_NAME="${1:-openclaw}"
DB_USER="${2:-postgres}"
DB_HOST="${3:-localhost}"
DB_PORT="${4:-5432}"

echo "📊 数据库信息:"
echo "   名称: $DB_NAME"
echo "   用户: $DB_USER"
echo "   主机: $DB_HOST:$DB_PORT"
echo ""

# 检查数据库连接
echo "🔍 检查数据库连接..."
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "❌ 无法连接到数据库，请检查配置"
    exit 1
fi
echo "✅ 数据库连接成功"
echo ""

# 检查 experts 表是否存在
echo "🔍 检查 experts 表..."
TABLE_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'experts');")

if [ "$TABLE_EXISTS" != "t" ]; then
    echo "❌ experts 表不存在，请先运行 init.sql"
    exit 1
fi
echo "✅ experts 表存在"
echo ""

# 检查是否已有数据
echo "🔍 检查现有专家数据..."
EXPERT_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM experts;")
echo "   当前专家数量: $EXPERT_COUNT"
echo ""

if [ "$EXPERT_COUNT" -gt 0 ]; then
    echo "⚠️  数据库中已有专家数据"
    read -p "是否继续插入预设专家？(y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ 操作已取消"
        exit 0
    fi
fi

# 插入预设专家
echo "📥 插入预设专家..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SEED_FILE="$SCRIPT_DIR/seed-experts.sql"

if [ ! -f "$SEED_FILE" ]; then
    echo "❌ 找不到 seed-experts.sql 文件"
    exit 1
fi

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SEED_FILE"

echo ""
echo "✅ 预设专家插入成功"
echo ""

# 显示结果
echo "📊 当前专家列表:"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT name, icon, color, enabled FROM experts ORDER BY \"createdAt\" DESC;"

echo ""
echo "🎉 专家系统初始化完成！"
echo ""
echo "下一步："
echo "  1. 启动后端服务: cd packages/server && pnpm run dev"
echo "  2. 启动前端应用: cd packages/client && pnpm tauri dev"
echo "  3. 访问专家系统页面查看预设专家"
echo ""
