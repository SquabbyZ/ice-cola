# Code Review: 001-minimax-models-display

## Changed file
- `packages/client/src/pages/Lingqi.tsx`

## Changes
1. Removed `availableModels` `useMemo` (was filtering to `isAvailable=true` only)
2. Changed `selectedModelId` fallback from `availableModels[0]?.id` → `models[0]?.id`
3. Removed `useMemo` from React import

## Findings

### HIGH: Unused `availableModels` — DEAD CODE REMOVED ✓
The `availableModels` `useMemo` was only consumed in one place: the `selectedModelId` fallback. After the fix, it becomes entirely unused code. Removed.

### MEDIUM: `useMemo` import now orphaned
`useMemo` was removed from the import statement. No other `useMemo` usage remains in the file. Done.

### LOW: Build warning — chunk size >500kB
Pre-existing bundle size warning on `index-Df3nyzlh.js` (1196 kB / 347 kB gzip). Not introduced by this change; unrelated to this fix.

## Verdict
**Approve** — CRITICAL/HIGH: 0. The fix is a one-line logic change with one dead-code removal. The existing disabled styling (opacity, Lock icon, aria-disabled) handles `isAvailable=false` models without any additional work.