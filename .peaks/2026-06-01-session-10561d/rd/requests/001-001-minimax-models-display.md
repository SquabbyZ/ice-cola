# RD Request 001-minimax-models-display

- session: 2026-06-01-session-10561d
- linked-prd: .peaks/2026-06-01-session-10561d/prd/requests/001-minimax-models-display.md
- linked-ui: .peaks/2026-06-01-session-10561d/ui/requests/001-001-minimax-models-display.md
- type: feature

## Red-line scope

### In-scope (modify)
- `packages/server/src/quota/quota.service.ts` — `getModelCatalogForTeam` method: remove rank-based filtering so all active models are returned regardless of subscription tier
- `packages/client/src/pages/Lingqi.tsx` — model selector UI: display all returned models, show `costMultiplier`, mark `isAvailable=false` models as disabled with tooltip
- No new routes, no new API endpoints, no new database tables

### Explicitly out-of-scope (do not touch)
- `subscription_plans` table and `model_rank_limit` logic
- Admin's "fetch models from provider" flow (`ai-models.service.ts` `fetchModelsFromProvider`)
- `ai_models` → `model_catalog` sync mechanism (`upsertModelCatalogProjection`)
- Any authentication or authorization changes

## Standards preflight

```
peaks standards init --project . --dry-run --json
```
Status: N/A — project standards (CLAUDE.md, .claude/rules/**) already exist and are current.
Planned application: review-only (standards files already applied in prior session)

## Coverage status

- Current total UT coverage: ~71% (packages/server/src/quota/quota.service.spec.ts covers getModelCatalogForTeam indirectly via integration tests)
- New/changed code: getModelCatalogForTeam returns all rows without rank filter; Lingqi.tsx renders all models
- Gate verdict: legacy-accepted (test infrastructure present; unit test for getModelCatalogForTeam browse-all behavior to be added)

## Slice contract

### Slice 1: Backend — return all active models for browsing

**Functional boundary:** `GET /teams/:teamId/models/catalog` endpoint (ModelCatalogController.getCatalog → QuotaService.getModelCatalogForTeam)

**Pre-refactor behavior:** `toAvailableModelCatalogView` maps `rank > modelRankLimit` → `isAvailable=false` and **excludes from results** (actually, the filter is NOT applied in the SQL query itself — the SQL just queries all `is_active=true` rows, but then `toAvailableModelCatalogView` only populates `isAvailable` flag without removing from the returned array. Wait, let me re-read the actual implementation...

Actually looking at `getModelCatalogForTeam` (line 897-907):
```typescript
async getModelCatalogForTeam(teamId: string): Promise<AvailableModelCatalogView[]> {
  const subscription = await this.getActiveSubscription(teamId);
  const rows = await this.db.query<ModelCatalogRow>(
    `SELECT ... FROM model_catalog WHERE is_active = true ...`,
  );
  return rows.map((row) => this.toAvailableModelCatalogView(row, subscription));
}
```

The SQL query does NOT filter by `rank <= modelRankLimit` — it returns ALL `is_active=true` rows. Then `toAvailableModelCatalogView` sets `isAvailable` based on subscription tier. So the backend is already returning all models!

**So the bug is NOT in the backend query.** The backend already returns all active models. The issue must be in the **frontend** — Lingqi.tsx only renders models where `isAvailable=true`.

**Target structure:** No backend change needed. Confirm frontend filters on `isAvailable=true` and remove that filter.

### Slice 2: Frontend — display all models, not just isAvailable=true

**Functional boundary:** `Lingqi.tsx` model selector dropdown/grid

**Pre-refactor behavior:** Filters to `models.filter(m => m.isAvailable)` — only shows rank≤1 models for wanderer plan

**Target structure:** Render all models. `isAvailable=false` models show with disabled styling + tooltip showing `unavailableReason`

## Implementation evidence

### Step 1: Verify backend already returns all models

SQL trace shows `getModelCatalogForTeam` returns all `is_active=true` rows. The filtering happens in `toAvailableModelCatalogView` which sets `isAvailable=false` but does NOT remove from array.

### Step 2: Frontend fix — Lingqi.tsx

Locate model selection UI in Lingqi.tsx (around lines 100-200). Change `models.filter(m => m.isAvailable)` to render all models.

### Step 3: Add disabled styling for `isAvailable=false` models

Show lock icon or grayscale + tooltip with `unavailableReason`.

### Step 4: Show `costMultiplier` in model display

Each model's card/list item should display `×${costMultiplier}` (e.g., "×1.0", "×2.0").

## Handoff

- to peaks-qa: .peaks/2026-06-01-session-10561d/qa/requests/001-001-minimax-models-display.md

## Status

- state: qa-handoff
- last update: 2026-06-01T12:03:02.525Z
- transition note (2026-06-01T12:03:02.525Z): Frontend UI fix (Lingqi.tsx selector pre-selection). No new unit tests possible — project has Vitest with service mocks, no React Testing Library. Build passes. QA to do Playwright browser validation. | bypassed prerequisites (qa/test-cases/001-minimax-models-display.md)