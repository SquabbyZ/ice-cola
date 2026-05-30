#!/usr/bin/env bash
# ============================================================
# Ice Cola Backend Deployment Script
# ============================================================
# 用法:
#   ./deploy-backend.sh          启动所有后端服务
#   ./deploy-backend.sh down     停止所有后端服务
#   ./deploy-backend.sh ps       查看服务状态
#   ./deploy-backend.sh logs     查看日志
#   ./deploy-backend.sh restart  重启所有服务
# ============================================================
set -euo pipefail
cd "$(dirname "$0")"

COMPOSE_FILE="docker-compose.deploy.yml"
ENV_FILE=".env.deploy"

# 检查 .env.deploy 是否存在
if [ ! -f "$ENV_FILE" ]; then
    echo "[!] $ENV_FILE not found."
    echo "    复制模板并填入配置:"
    echo "      cp .env.deploy.example $ENV_FILE"
    echo "      # 编辑 $ENV_FILE"
    exit 1
fi

case "${1:-}" in
    down)
        echo "Stopping backend services..."
        docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down
        echo "Done."
        ;;
    ps)
        docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
        ;;
    logs)
        docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs -f "${@:2}"
        ;;
    restart)
        echo "Restarting backend services..."
        docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" restart "${@:2}"
        echo "Done."
        ;;
    build)
        echo "Building backend images..."
        docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build "${@:2}"
        echo "Done."
        ;;
    *)
        echo "Starting backend services..."
        docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d "${@:1}"
        echo ""
        echo "Services:"
        docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
        echo ""
        echo "  Server API:       http://localhost:${SERVER_PORT:-3000}"
        echo "  Hermes Dashboard: http://localhost:${HERMES_DASHBOARD_PORT:-9119}"
        echo "  PostgreSQL:       localhost:${POSTGRES_PORT:-5432}"
        echo ""
        echo "Logs:  ./deploy-backend.sh logs"
        echo "Stop:  ./deploy-backend.sh down"
        ;;
esac
