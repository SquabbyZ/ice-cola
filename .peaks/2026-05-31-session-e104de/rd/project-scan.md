# Project Scan: ice-cola
**Date:** 2026-05-31
**Session:** 2026-05-31-session-e104de

## Archetype
- Type: legacy-fullstack
- Confidence: medium
- Signals matched:
  - backend-presence: dirs: packages/server
  - monorepo-config: pnpm-workspace.yaml

## Project mode
- Frontend-only: false
- Reason: backend-detected (packages/server exists)

## Build tool
- Framework: Vite 5.x
- Config file: packages/admin/vite.config.ts
- Mixed builds: false

## Component library
- Library: Radix UI (shadcn/ui pattern)
- Design-system packages: @radix-ui/react-*
- In-house design system: none

## CSS solution
- Primary: TailwindCSS 3.x
- Conflicts detected: none (shadcn/ui + TailwindCSS is standard)

## State management, routing, data fetching
- State: zustand 4.x
- Routing: react-router-dom 6.x
- Data fetching: @tanstack/react-query 5.x

## Legacy constraints
- None (modern stack)
