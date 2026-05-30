# Project Scan: ice-cola
**Date:** 2026-05-30
**Session:** 2026-05-30-session-23ab30

## Archetype
- Type: legacy-fullstack
- Confidence: medium
- Signals matched:
  - backend-presence: dirs: packages/server
  - monorepo-config: pnpm-workspace.yaml

## Project mode
- Frontend-only: false
- Reason: backend-detected

## Build tool
- Framework: Vite
- Config files: packages/admin/vite.config.ts, packages/client/vite.config.ts
- Mixed builds: false

## Component library
- Library: shadcn/ui (radix-ui + tailwind-merge + class-variance-authority)
- Design-system packages: @radix-ui/react-*, lucide-react
- In-house design system: none

## CSS solution
- Primary: TailwindCSS
- Conflicts detected: none

## State management, routing, data fetching
- State: zustand
- Routing: react-router-dom
- Data fetching: @tanstack/react-query
- Forms: react-hook-form + zod

## Legacy constraints
- (empty for now — legacy-fullstack but no explicit legacy signals detected in scan)
