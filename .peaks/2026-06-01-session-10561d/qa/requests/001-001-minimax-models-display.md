# QA Request: 001-minimax-models-display

- session: 2026-06-01-session-10561d
- linked-prd: .peaks/2026-06-01-session-10561d/prd/requests/001-minimax-models-display.md
- linked-rd: .peaks/2026-06-01-session-10561d/rd/requests/001-001-minimax-models-display.md
- linked-ui: .peaks/2026-06-01-session-10561d/ui/requests/001-001-minimax-models-display.md
- type: feature

## Red-line boundary check

**In-scope changed file:** `packages/client/src/pages/Lingqi.tsx` (selectedModelId fallback logic)
**Out-of-scope:** quota.service.ts, LingqiModelSelector, lingqi-service.ts
**verdict:** clean — only declared in-scope file touched

## OpenSpec exit gate (no openspec/ in this repo)
- change-id: N/A — no openspec/ in project
- issues: N/A

## Acceptance checks

| ID | Criterion | Method | Result | Evidence |
|---|---|---|---|---|
| A1 | All MiniMax models visible in selector | Playwright browser, /chat route | PASS | Dropdown shows MiniMax 2.7 + Text-01 |
| A2 | costMultiplier displayed per model | Playwright snapshot | PASS | Dropdown items show "×1" multiplier |
| A3 | Disabled state for unavailable models | Playwright snapshot | PASS | Text-01 disabled, Lock icon shown |
| A4 | Backend enforces execution restrictions | Existing backend enforcement | PASS | selectModel returns MODEL_NOT_AVAILABLE for unavailable models |
| A5 | Build passes | pnpm build | PASS | Exit 0 |

## Mandatory validation gates

| Gate | Command | Result |
|---|---|---|
| Unit tests | Vitest (no React component tests in project) | N/A — frontend UI change |
| API validation | N/A | No API surface changed |
| Browser E2E | Playwright MCP headed browser /chat | PASS — screenshot证据 captured |
| Security | Static analysis of Lingqi.tsx change | PASS — no new surface |
| Performance | Build size check | PASS — no new bundle entries |

## Browser evidence
- Screenshot: model-selector-dropdown.png (mini-max-selector-open PNG captured)
- Console: 0 errors, 2 warnings (pre-existing)
- Network: 0 new network errors introduced by this change

## Verdict
**PASS** — frontend change verified in headed browser. MiniMax 2.7 pre-selected (models[0]), dropdown shows all models with costMultiplier, unavailable models are disabled. Build clean. No security/performance impact.

## Status

- state: verdict-issued
- last update: 2026-06-01T12:24:56.669Z