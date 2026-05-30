# Bug Analysis: fix-client-ts-errors

**Date:** 2026-05-30
**Session:** 2026-05-30-session-23ab30
**Request:** fix-client-ts-errors
**Type:** bugfix

## Symptom

`pnpm build` fails with 17 TypeScript compilation errors in `packages/client`. The admin package builds cleanly.

## Root Cause

Multiple type mismatches and unused variable warnings that accumulated across recent changes:

### Category 1: Type mismatches (7 errors)

1. **Sidebar.tsx:118** — `aria-label` prop typed as `unknown` instead of `string`
2. **Sidebar.tsx:138,140,154** — i18n `t()` return type `unknown` used where `ReactNode` expected
3. **Experts.tsx:132, Extensions.tsx:52, MCP.tsx:43** — `user.teamId` accessed but User type has `team` property (not `teamId`)
4. **skillsStore.ts:135** — `Record<string, unknown>` not assignable toSkill mapping callback
5. **workordersStore.ts:159,186,216,251** — `"expert"` type not in WorkorderHistory union type

### Category 2: Unused variables (10 warnings treated as errors)

6. **ChatWorkspace.tsx:8** — `HermesCapabilityBar` imported but unused
7. **ChatWorkspace.tsx:102-105** — `selectedModelName`, `lingqiBalance`, `lingqiEstimateText`, `selectedExpertName` declared but unused
8. **Skills.tsx:65** — `requestPublishToMarketplace` declared but unused
9. **expertMarketplaceStore.ts:78** — `tags` declared but unused

## Fix Strategy

### For type mismatches:
- **Sidebar.tsx**: Cast `aria-label` to `string`, or fix the data source to provide string values. For i18n, ensure `t()` return type is properly typed.
- **Experts/Extensions/MCP**: Change `user.teamId` to `user.team` (the User type schema was updated but component code wasn't)
- **skillsStore.ts**: Fix the generic type parameter in the `.map()` callback
- **workordersStore.ts**: Add `"expert"` to the WorkorderHistory type union, OR remove expert-related code if it's dead

### For unused variables:
- Remove unused imports and variable declarations
- These are likely remnants of features that were refactored or removed

## Risk Assessment

- **Low risk**: All fixes are type-level corrections, no runtime behavior changes
- **Medium risk**: The `teamId` → `team` change may affect runtime if the User object actually has `teamId` from the API (need to verify against actual User type definition)
- **Medium risk**: The workordersStore "expert" type may need the WorkorderHistory type to be extended if expert workorders are actually supported

## Verification

After fixes, run:
```bash
pnpm build  # Should complete without errors
```

## Fix approach

1. **Sidebar.tsx**: Added explicit `: string` return types to `getNavLabel` and `getNavDescription`. Cast `t()` return values and `item.label`/`item.desc` to `string` in type guard branches.

2. **ChatWorkspace.tsx**: Removed unused import `HermesCapabilityBar` and 4 unused variable declarations (`selectedModelName`, `lingqiBalance`, `lingqiEstimateText`, `selectedExpertName`).

3. **Experts.tsx, Extensions.tsx, MCP.tsx**: Changed `user?.teamId` to `user?.team?.id` to match the actual User type definition where `team` is an object with `id`, `name`, `role` properties.

4. **Skills.tsx**: Removed unused `requestPublishToMarketplace` from destructuring.

5. **expertMarketplaceStore.ts**: Removed dead `tags` computation code in `transformExpert` function — Expert type doesn't have a `tags` field.

6. **skillsStore.ts**: Added explicit type cast `(items as Record<string, unknown>[])` for `.map()` callback to match the API response type.

7. **workordersStore.ts**: Added `'expert'` to `WorkorderHistory.type` and `WorkordersState.filterType` unions to match the `Workorder.type` definition.

## Regression test plan

- `pnpm build` passes with 0 TypeScript errors
- Manual spot-check: navigation sidebar renders correctly
- Manual spot-check: experts/extensions/MCP pages load without errors
- Manual spot-check: skills marketplace loads correctly
- Manual spot-check: workorders history displays correctly
