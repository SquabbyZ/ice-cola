#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f .env ]; then
    echo "[!] .env not found. Copy .env.example to .env and edit it first."
    exit 1
fi

case "${1:-}" in
    down)
        docker compose down
        ;;
    *)
        docker compose up -d "${@}"
        docker compose ps
        ;;
esac
