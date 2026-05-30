# Runtime and Operations

Source: Extracted from project `CLAUDE.md` to keep the root instruction file compact.
Scope: local development services, commands, and ports for Ice Cola.

## Common Commands

```bash
# Start all dev servers (cross-platform, recommended)
node dev.mjs

# Stop dev servers
node dev.mjs stop

# Check service status
node dev.mjs status

# Alternative: pnpm recursive (also works)
pnpm dev

# Build all packages
pnpm build

# Run unit tests
pnpm test

# Run Playwright tests
pnpm playwright test
```

## Development Ports

| Service | URL / Port | Notes |
|---|---|---|
| Admin frontend | http://localhost:1992 | React + Vite |
| Client frontend | http://localhost:1420 | Tauri + React |
| Server HTTP API | http://localhost:3000 | NestJS |
| WebSocket Gateway | 3001 | Socket.IO |
| PostgreSQL (本地) | 5432 | 原生安装 (D:\pg18\bin) |
| PostgreSQL (Docker) | 5433 | docker-compose 映射 |
| Hermes Dashboard | 9119 | Hermes Web UI |

> **端口说明**：本地开发用 5432，Docker 部署用 5433。确保 server `.env` 的 `DATABASE_URL` 匹配。

## PM2 Services

| Port | Name | Type |
|---|---|---|
| 1992 | ice-cola-admin-1992 | Vite Admin |
| 1420 | ice-cola-client-1420 | Vite Client |

## PM2 Commands

```bash
cd "c:/Users/smallMark/Desktop/peaksclaw/ice-cola" && pm2 start ecosystem.config.cjs
cd "c:/Users/smallMark/Desktop/peaksclaw/ice-cola" && pm2 start ecosystem.config.cjs --update-env
cd "c:/Users/smallMark/Desktop/peaksclaw/ice-cola" && pm2 restart ecosystem.config.cjs --update-env
cd "c:/Users/smallMark/Desktop/peaksclaw/ice-cola" && pm2 stop all
cd "c:/Users/smallMark/Desktop/peaksclaw/ice-cola" && pm2 start ice-cola-admin-1992
cd "c:/Users/smallMark/Desktop/peaksclaw/ice-cola" && pm2 stop ice-cola-admin-1992
cd "c:/Users/smallMark/Desktop/peaksclaw/ice-cola" && pm2 start ice-cola-client-1420
cd "c:/Users/smallMark/Desktop/peaksclaw/ice-cola" && pm2 stop ice-cola-client-1420
cd "c:/Users/smallMark/Desktop/peaksclaw/ice-cola" && pm2 logs
cd "c:/Users/smallMark/Desktop/peaksclaw/ice-cola" && pm2 status
cd "c:/Users/smallMark/Desktop/peaksclaw/ice-cola" && pm2 monit
pm2 save
pm2 resurrect
```
