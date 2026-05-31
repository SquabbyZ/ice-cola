# Project Scan: ice-cola (admin)
**Date:** 2026-05-31
**Session:** 2026-05-31-session-f462d7

## Archetype
- Type: frontend-monorepo
- Signals matched: multiple packages (admin, server, client), pnpm workspace

## Project mode
- Frontend-only: false
- Reason: NestJS backend detected at packages/server

## Build tool
- Framework: Vite 5.x
- Config file: packages/admin/vite.config.ts
- Mixed builds: false

## Component library
- Library: shadcn/ui (Radix UI primitives)
- Design-system packages: @radix-ui/*, class-variance-authority, clsx, tailwind-merge
- In-house design system: none

## CSS solution
- Primary: TailwindCSS
- Conflicts detected: none

## State management, routing, data fetching
- State: zustand (useAuthStore)
- Routing: react-router-dom
- Data fetching: axios (custom api service), @tanstack/react-query

## Legacy constraints
- None (greenfield patterns)
