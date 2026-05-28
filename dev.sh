#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

case "${1:-}" in
    stop)
        pkill -f "nest start" 2>/dev/null || true
        pkill -f "vite" 2>/dev/null || true
        echo "dev servers stopped"
        ;;
    *)
        echo "starting dev servers..."
        pnpm dev &
        sleep 2
        echo ""
        echo "  Admin:  http://localhost:1992"
        echo "  Client: http://localhost:1420"
        echo "  Server: http://localhost:3000"
        echo ""
        wait
        ;;
esac
