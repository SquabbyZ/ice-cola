# ============================================
# Stage 1: Build NestJS application
# ============================================
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace root files (needed for pnpm install)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./

# Copy server package files and install deps (cached unless deps change)
COPY packages/server/package.json packages/server/tsconfig.json packages/server/nest-cli.json \
     packages/server/
RUN pnpm install --frozen-lockfile --filter @ice-cola/server

# Copy server source and build
COPY packages/server/src packages/server/src/
RUN pnpm --filter @ice-cola/server build

# ============================================
# Stage 2: Production runtime
# ============================================
FROM node:20-alpine

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 && \
    chown -R nestjs:nodejs /app

# Copy workspace root for pnpm
COPY --chown=nestjs:nodejs pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY --chown=nestjs:nodejs packages/server/package.json packages/server/

# Install production deps only
RUN corepack enable && corepack prepare pnpm@latest --activate && \
    pnpm install --frozen-lockfile --filter @ice-cola/server --prod && \
    pnpm store prune

# Copy built dist from builder
COPY --chown=nestjs:nodejs --from=builder /app/packages/server/dist packages/server/dist

WORKDIR /app/packages/server

USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/hermes/status', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/main"]
