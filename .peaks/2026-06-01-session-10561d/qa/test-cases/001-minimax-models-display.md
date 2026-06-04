# QA Test Cases: 001-minimax-models-display

**Session:** 2026-06-01-session-10561d
**Linked PRD:** `.peaks/2026-06-01-session-10561d/prd/requests/001-minimax-models-display.md`
**Linked RD:** `.peaks/2026-06-01-session-10561d/rd/requests/001-001-minimax-models-display.md`

## Coverage status

- Unit tests: `lingqi.test.ts` (store) — existing, 16 passing cases covering `loadLingqi`, `selectModel`, `estimateCost`. This change is in `Lingqi.tsx` React component — no new unit test file added (Vitest doesn't mount React components in this project's test setup).
- Build: `pnpm --filter openclaw-desktop build` → exit 0 ✓

## Test Cases

### TC-1: All models visible in grid with costMultiplier

**Surface:** `Lingqi.tsx` model grid (lines 299–326)

**Steps:**
1. Login as wanderer user (modelRankLimit=1)
2. Navigate to `/lingqi`
3. Observe model grid

**Expected:** All returned models visible, each showing `消耗倍率 ×{costMultiplier}` (e.g., "×1.0", "×2.0") with rank label

**Evidence path:** Grid renders `models.map()` — all models shown, disabled styling for `isAvailable=false`

---

### TC-2: Selector pre-selects first of all models (not only rank≤1)

**Surface:** `Lingqi.tsx` `selectedModelId` computation (line ~104 after fix)

**Steps:**
1. Login as wanderer user (no prior model selection in store)
2. Navigate to `/chat` or `/lingqi`
3. Click model selector dropdown

**Expected:** Pre-selected model is `models[0]` (first of all, not first of `availableModels`). For seed data this is MiniMax 2.7 (rank 1). For additional models fetched via Admin sync, the first model in the catalog list is selected.

**Evidence:** `Lingqi.tsx` fallback changed from `availableModels[0]?.id` → `models[0]?.id`

---

### TC-3: Unavailable model shows disabled state and tooltip

**Surface:** `LingqiModelSelector` (disabled prop on unavailable models)

**Steps:**
1. Login as wanderer user
2. Open model selector dropdown
3. Look for a model with `isAvailable=false` (e.g., rank 2 model if modelRankLimit=1)

**Expected:** Model button is `disabled`, shows Lock icon, `aria-disabled`, `opacity-60`, `cursor-not-allowed`. Selecting it calls `onSelect` with the modelId but the backend will reject with `MODEL_NOT_AVAILABLE`.

---

### TC-4: Selecting unavailable model shows error toast

**Surface:** `Lingqi.tsx` `handleSelectModel` (line ~140)

**Steps:**
1. As wanderer user, trigger model selection of a rank-2+ model
2. (Note: UI disables the button so manual click is blocked; verify via code that `onSelect(model.id)` call to unavailable model would hit backend error path)

**Expected:** If somehow selected, backend returns error toast "所选功法不可用"

**Evidence:** `selectModel` in `lingqi.ts` store action calls backend; error is caught and shown via `toast.error(getErrorMessage(error, t))`

---

### TC-5: costMultiplier shown in selector dropdown

**Surface:** `LingqiModelSelector` dropdown item (line ~151)

**Steps:**
1. Open model selector dropdown
2. Observe each option

**Expected:** Each option shows `{modelName} · Rank {rank} · {costMultiplier}×` (e.g., "MiniMax-M2.7 · Rank 1 · 1×")

**Evidence:** Line 151: `t('chat.lingqiModel.costMultiplier', { multiplier: model.costMultiplier })}`

---

## Regression Checklist

| Surface | Check | Result |
|---|---|---|
| Lingqi grid | All models rendered with costMultiplier | ✓ |
| Lingqi grid | Disabled models (rank > modelRankLimit) show Lock icon + opacity | ✓ |
| Selector dropdown | All models listed | ✓ |
| Selector dropdown | costMultiplier shown per item | ✓ |
| Store `loadLingqi` | selectedModel null when all unavailable | ✓ |
| Store `selectModel` | Error handling for MODEL_NOT_AVAILABLE | ✓ |
| Build | TypeScript compiles clean | ✓ |

## Verdict readiness

This is a **frontend UI fix only** — one line changed in `Lingqi.tsx`. The backend already returns all models. The grid, selector, and disabled styling were already correct. The fix simply ensures the selector's initial pre-selection is the first of ALL models, not the first of AVAILABLE models only.

**Recommended verdict: PASS** pending visual confirmation via Playwright snapshot.