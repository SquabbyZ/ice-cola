# ============================================
# Stage 1: Build React Admin SPA
# ============================================
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace root files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy admin package files (cached layer for dependency install)
COPY packages/admin/package.json packages/admin/tsconfig.json packages/admin/tsconfig.node.json \
     packages/admin/vite.config.ts packages/admin/postcss.config.js packages/admin/tailwind.config.js \
     packages/admin/index.html packages/admin/
RUN pnpm install --frozen-lockfile --filter openclaw-admin

# Copy admin source and build
COPY packages/admin/src packages/admin/src/
RUN pnpm --filter openclaw-admin build

# ============================================
# Stage 2: Serve with nginx
# ============================================
FROM nginx:1.27-alpine

RUN rm /etc/nginx/conf.d/default.conf

COPY packages/admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/packages/admin/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:80/ > /dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
