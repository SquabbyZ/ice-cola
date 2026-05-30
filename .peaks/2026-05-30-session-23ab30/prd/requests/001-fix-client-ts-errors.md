# PRD Request fix-client-ts-errors

- session: 2026-05-30-session-23ab30
- type: bugfix
- source: verbal — "当前项目有问题，需要你修复"
- raw input: Client package (packages/client) fails to build with 17 TypeScript compilation errors across 8 files. Admin package builds cleanly.

## Goals

- Fix all 17 TypeScript compilation errors in packages/client so `pnpm build` succeeds
- Maintain existing functionality — no behavior changes

## Non-goals

- Refactoring beyond what's needed to fix the type errors
- Adding new features or changing business logic
- Fixing admin package (it builds cleanly)

## Preserved behavior

- All existing UI components, routes, stores, and pages must continue to work as-is
- No runtime behavior changes — only type-level fixes

## Acceptance criteria

- `pnpm build` from project root completes without errors
- `packages/client` TypeScript compilation passes with zero errors
- No regressions in existing functionality (manual spot-check)

## Frontend delta (only when target is frontend)

Affected files in packages/client:
- `src/components/Sidebar.tsx` — aria-label type (unknown → string), i18n children types
- `src/pages/chat/ChatWorkspace.tsx` — unused variables (TS6133)
- `src/pages/Experts.tsx` — `teamId` → `team` on User type
- `src/pages/Extensions.tsx` — `teamId` → `team` on User type
- `src/pages/MCP.tsx` — `teamId` → `team` on User type
- `src/pages/Skills.tsx` — unused variable
- `src/stores/expertMarketplaceStore.ts` — unused variable
- `src/stores/skillsStore.ts` — generic Record type mismatch with Skill mapping
- `src/stores/workordersStore.ts` — "expert" not in WorkorderHistory type union

## Risks and open questions

- The `teamId` → `team` change may indicate a User type schema change that needs verification
- The workordersStore "expert" type may need the WorkorderHistory type to be extended

## Handoff

- to peaks-rd: .peaks/2026-05-30-session-23ab30/rd/requests/fix-client-ts-errors.md
- to peaks-qa: .peaks/2026-05-30-session-23ab30/qa/requests/fix-client-ts-errors.md
- to peaks-ui: .peaks/2026-05-30-session-23ab30/ui/requests/fix-client-ts-errors.md  (when UI involved)

## Status

- created: 2026-05-30T09:20:14.151Z
- last update: 2026-05-30T09:21:31.880Z
- state: handed-off
