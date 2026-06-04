# Tech Doc: 001-minimax-models-display

## Red-line scope

**In-scope:**
- `packages/client/src/pages/Lingqi.tsx` — fix `selectedModelId` fallback logic

**Explicitly out-of-scope:**
- `packages/server/src/quota/quota.service.ts` — no backend change needed
- `subscription_plans` table / `model_rank_limit` logic
- `ai_models` → `model_catalog` sync
- `LingqiModelSelector` component — already correct

## Architecture decisions

### Root cause
`Lingqi.tsx` computed `selectedModelId` with a fallback chain using `availableModels[0]?.id`. `availableModels` was a `useMemo` filtering `models.filter(model => model.isAvailable)` — restricting the selector to only rank≤1 models for the wanderer plan. The grid and the dropdown already rendered all models correctly.

### Fix
Changed the fallback from `availableModels[0]?.id` to `models[0]?.id` so the selector pre-selects the first of **all** returned models when no explicit `selectedModel` is set from the store.

### Why not the PRD-proposed backend change?
Backend `getModelCatalogForTeam` already returns ALL `is_active=true` rows. The SQL query has NO `rank <= modelRankLimit` filter. The `isAvailable` flag is purely informational — `toAvailableModelCatalogView` marks `isAvailable=false` for rank-limited models but does NOT remove them from the returned array. No backend change was needed.

## Implementation evidence

1. `pnpm --filter openclaw-desktop build` → `✓ built in 5.16s` (exit 0)
2. `peaks scan diff-vs-scope` → `ok: true, violations: [], unclassified: []`
3. `peaks scan request-type-sanity --type feature` → `consistent: true`
4. `peaks request lint rd` → `ok: true`

## Component changes

### `packages/client/src/pages/Lingqi.tsx`
- **Line change:** Removed `availableModels` `useMemo` (was `models.filter(model => model.isAvailable)`)
- **Line change:** `selectedModelId` fallback from `availableModels[0]?.id` → `models[0]?.id`
- **Line change:** Removed `useMemo` from React import

### `packages/client/src/components/LingqiModelSelector.tsx`
- **No changes** — already accepts `models[]` (all models), renders all with `costMultiplier`, disables `isAvailable=false`

## Data flow

`loadLingqi(teamId)` → `lingqiService.getModelCatalog(teamId)` → all `is_active=true` models → `useLingqiStore.models` → grid renders all with `costMultiplier` → `LingqiModelSelector(models)` → `selectedModelId` now defaults to `models[0]` (all, not filtered).

## CSS/Style changes

None. Existing disabled styling (opacity, Lock icon, cursor-not-allowed) already handles `isAvailable=false` models.

## API contract changes

None. Same `LingqiModel[]` response, only the initial selection default is corrected.

## Dependencies

None.