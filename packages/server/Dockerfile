FROM node:20-alpine AS builder

WORKDIR /app

# Copy all source
COPY packages/server .
COPY tsconfig.base.json ../

# Install dependencies
RUN npm install

# Build NestJS application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY packages/server/package.json .
RUN npm install --omit=dev

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
USER nestjs

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/main"]