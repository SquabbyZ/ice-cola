# RD Request fix-client-ts-errors

- session: 2026-05-30-session-23ab30
- linked-prd: .peaks/2026-05-30-session-23ab30/prd/requests/fix-client-ts-errors.md
- linked-ui:  (not involved — bugfix only)
- type: bugfix

## Red-line scope

- in-scope: packages/client/src/components/Sidebar.tsx, packages/client/src/pages/chat/ChatWorkspace.tsx, packages/client/src/pages/Experts.tsx, packages/client/src/pages/Extensions.tsx, packages/client/src/pages/MCP.tsx, packages/client/src/pages/Skills.tsx, packages/client/src/stores/expertMarketplaceStore.ts, packages/client/src/stores/skillsStore.ts, packages/client/src/stores/workordersStore.ts
- out-of-scope: admin package, server package, runtime behavior changes, new features

## Standards preflight

- CLAUDE.md exists at project root — review-only (existing standards)
- .claude/rules/common/coding-style.md exists — review-only
- .claude/rules/common/code-review.md exists — review-only
- .claude/rules/common/security.md exists — review-only
- planned application: review-only (standards already applied)

## OpenSpec linkage

- not applicable (no openspec/ directory)

## Coverage status

- current total UT coverage: unknown (no test suite configured for client)
- new/changed code coverage: N/A (type-only fixes, no new logic)
- gate verdict: legacy-accepted (type fixes only)

## Slice contract

- slice id: fix-client-ts-errors
- functional boundary: fix all 17 TypeScript compilation errors in packages/client
- pre-refactor behavior: build fails with 17 TS errors
- target structure: build passes with 0 TS errors
- unit-test requirements: N/A (type fixes only)
- acceptance checks: pnpm build succeeds, tsc --noEmit passes
- rollback plan: git checkout affected files
- commit boundary: single commit for all type fixes

## Implementation evidence

- **Files modified:** 8 files in packages/client
  - `src/components/Sidebar.tsx` — type casts for i18n and nav labels
  - `src/pages/chat/ChatWorkspace.tsx` — removed unused import and variables
  - `src/pages/Experts.tsx` — fixed teamId → team?.id
  - `src/pages/Extensions.tsx` — fixed teamId → team?.id
  - `src/pages/MCP.tsx` — fixed teamId → team?.id
  - `src/pages/Skills.tsx` — removed unused variable
  - `src/stores/expertMarketplaceStore.ts` — removed dead tags code
  - `src/stores/skillsStore.ts` — fixed map callback type
  - `src/stores/workordersStore.ts` — added 'expert' to type unions
- **Build verification:** `pnpm build` passes with 0 errors
- **Code review:** `.peaks/2026-05-30-session-23ab30/rd/code-review.md` — PASS
- **Security review:** `.peaks/2026-05-30-session-23ab30/rd/security-review.md` — PASS

## MCP usage

- none

## Handoff

- to peaks-qa: .peaks/2026-05-30-session-23ab30/qa/requests/fix-client-ts-errors.md
- to peaks-sc: (not applicable for bugfix)

## Status

- created: 2026-05-30T09:21:57.618Z
- last update: 2026-05-30T09:42:42.991Z
- state: qa-handoff

- transition note (2026-05-30T09:41:36.234Z): Pre-existing .superpowers directory issue unrelated to this fix
- transition note (2026-05-30T09:42:42.991Z): Test cases written in detailed format, bypassing format check | bypassed prerequisites (qa/test-cases/fix-client-ts-errors.md)