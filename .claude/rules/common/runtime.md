# Runtime and Operations

Source: Extracted from project `CLAUDE.md` to keep the root instruction file compact.
Scope: local development services, commands, and ports for Ice Cola.

## Common Commands

```bash
# Ensure the Docker database is running
docker ps | grep postgres

# Start all dev servers
pnpm dev

# Build all packages
pnpm build

# Run unit tests
pnpm test

# Run Playwright tests
pnpm playwright test
```

## Development Ports

| Service | URL / Port |
|---|---|
| Admin frontend | http://localhost:1992 |
| Client frontend | http://localhost:1420 |
| Server HTTP API | http://localhost:3000 |
| WebSocket Gateway | 3001 |
| PostgreSQL host port | 5433 |
| Hermes Dashboard | 9119 |

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
