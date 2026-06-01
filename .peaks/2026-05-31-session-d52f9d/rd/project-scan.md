# Project Scan: ice-cola
**Date:** 2026-05-31
**Session:** 2026-05-31-session-d52f9d

## Archetype
- Type: legacy-fullstack
- Confidence: medium
- Signals matched:
  - backend-presence: packages/server directory detected
  - monorepo-config: pnpm-workspace.yaml exists

## Project mode
- Frontend-only: false
- Reason: backend-detected (packages/server directory exists)

## Build tool
- Framework: Vite (packages/client, packages/admin), NestJS (packages/server)
- Config file: vite.config.ts
- Mixed builds: true

## Component library
- Library: TailwindCSS + custom UI components
- Design-system packages: @radix-ui/* components
- In-house design system: none

## CSS solution
- Primary: TailwindCSS
- Conflicts detected: none

## State management, routing, data fetching
- State: Zustand
- Routing: react-router-dom
- Data fetching: custom GatewayClient WebSocket

## Legacy constraints
- No legacy constraints detected (greenfield components)
