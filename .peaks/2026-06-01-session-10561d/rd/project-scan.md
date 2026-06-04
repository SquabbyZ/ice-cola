# Project Scan: ice-cola
**Date:** 2026-06-01
**Session:** 2026-06-01-session-10561d

## Archetype
- Type: legacy-fullstack
- Confidence: medium
- Signals matched: backend-presence (dirs: packages/server), monorepo-config (pnpm-workspace.yaml)

## Project mode
- Frontend-only: false
- Reason: backend-detected (NestJS backend in packages/server)

## Build tool
- Framework: Vite (for packages/admin and packages/client)
- Config files: packages/client/vite.config.ts, packages/admin/vite.config.ts
- Mixed builds: false

## Component library
- Library: antd 5.x (in packages/admin)
- Design-system packages: none detected
- In-house design system: none

## CSS solution
- Primary: Less (antd default)
- Conflicts detected: none

## State management, routing, data fetching
- State: zustand (in client/app stores)
- Routing: react-router-dom
- Data fetching: @tanstack/react-query (admin), tRPC-like service layer (client)

## Legacy constraints
- None from current scan (greenfield-style structure in client/admin)

## Context summary
- packages/admin: React + Vite + antd admin UI
- packages/server: NestJS backend (Hermes agent integration)
- packages/client: Tauri + React desktop client
- packages/hermes-agent: Hermes Agent Docker service