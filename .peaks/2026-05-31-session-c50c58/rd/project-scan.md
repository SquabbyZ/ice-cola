# Project Scan: ice-cola
**Date:** 2026-05-31
**Session:** 2026-05-31-session-c50c58

## Archetype
- Type: legacy-fullstack
- Confidence: medium
- Signals matched:
  - backend-presence: dirs: packages/server
  - monorepo-config: pnpm-workspace.yaml
  - swagger-or-proto: no swagger/openapi/proto (not matched)
  - src-size: 0 source files in src/ (not matched)
  - lockfile-age: 20 days (not matched)

## Project mode
- Frontend-only: false
- Reason: backend-detected

## Build tool
- Framework: Vite 5.0.11
- Config file: packages/admin/vite.config.ts, packages/client/vite.config.ts
- Mixed builds: false (consistent Vite across frontend packages)

## Component library
- Library: Radix UI (headless components)
- Design-system packages: @radix-ui/react-* (alert-dialog, avatar, checkbox, dialog, dropdown-menu, label, select, separator, slot, tabs, toast, tooltip)
- In-house design system: none (uses shadcn/ui pattern with Radix UI + Tailwind CSS)

## CSS solution
- Primary: TailwindCSS 3.4.1
- Conflicts detected: none (Tailwind + Radix UI is a standard shadcn/ui pattern)

## State management, routing, data fetching
- State: Zustand 4.4.7
- Routing: React Router DOM 6.21.1
- Data fetching: @tanstack/react-query 5.100.8 (admin), axios 1.6.5/1.15.2 (both packages)

## Monorepo structure
- Workspace manager: pnpm
- Packages:
  - packages/admin: Admin dashboard (React + Vite + Radix UI + TailwindCSS)
  - packages/client: Desktop client (Tauri + React + Vite + Radix UI + TailwindCSS)
  - packages/server: Backend service (NestJS + PostgreSQL, detected from CLAUDE.md)
  - packages/hermes-agent: Hermes Agent / Dashboard Docker service

## Legacy constraints
- Class components: not detected (modern React with hooks)
- moment: not detected (uses date-fns in client package)
- Enzyme: not detected (uses @testing-library/react)
- redux-saga/redux-thunk: not detected (uses Zustand)
- HOC patterns: not detected
- Legacy lifecycle: not detected
- jQuery/Backbone/Vue 2: not detected
- Inline styles: not detected (uses TailwindCSS utility classes)

**Legacy assessment:** Despite being classified as legacy-fullstack due to monorepo structure and backend presence, the frontend codebase uses modern React patterns (hooks, functional components, Zustand, React Query). No significant legacy constraints detected in frontend code.
