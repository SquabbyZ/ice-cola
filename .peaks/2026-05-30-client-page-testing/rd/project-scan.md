# Project Scan: ice-cola
**Date:** 2026-05-30
**Session:** 2026-05-30-client-page-testing

## Archetype
- Type: legacy-fullstack
- Signals matched: backend-presence (packages/server), monorepo-config (pnpm-workspace.yaml)

## Project mode
- Frontend-only: false
- Reason: backend-detected (packages/server present)

## Build tool
- Framework: Vite
- Config file: packages/client/vite.config.ts
- Mixed builds: false

## Component library
- Library: shadcn/ui (tailwindcss + radix-ui)
- Design-system packages: @radix-ui/*, tailwindcss
- In-house design system: none

## CSS solution
- Primary: TailwindCSS + CSS Modules
- Conflicts detected: none

## State management, routing, data fetching
- State: zustand (likely stores/)
- Routing: react-router-dom
- Data fetching: fetch/axios + custom hooks

## Legacy constraints
- Class components detected in some older files
- Some files use inline styles

## Client Pages (packages/client/src/pages/)
1. Chat.tsx (+ chat/ subdirectory with workspace, utils, hooks)
2. Dashboard.tsx
3. Experts.tsx
4. Extensions.tsx
5. ForgotPassword.tsx
6. Invite.tsx
7. Lingqi.tsx
8. Login.tsx
9. MCP.tsx
10. NotFound.tsx
11. Profile.tsx
12. Register.tsx
13. Settings.tsx
14. Skills.tsx
15. Tasks.tsx
16. Workorders.tsx
