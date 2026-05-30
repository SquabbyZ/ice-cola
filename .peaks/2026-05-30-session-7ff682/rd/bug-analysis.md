# Bug Analysis: Client Page Testing
**Date:** 2026-05-30
**Session:** 2026-05-30-client-page-testing
**Request:** R001

## Root cause

### 1. Chat.tsx — Uncleaned setTimeout on unmount
- **Root cause:** setTimeout in handleDeleteMessage creates a 3-second timeout that is never stored or cleaned up. When component unmounts, the callback attempts to update state on an unmounted component.
- **Affected paths:** packages/client/src/pages/Chat.tsx, line 392

### 2. Dashboard.tsx — Unhandled promise rejections
- **Root cause:** try...finally block without catch in loadData. If any store loader rejects, the error propagates as unhandled promise rejection with no user feedback.
- **Affected paths:** packages/client/src/pages/Dashboard.tsx, lines 48-67

### 3. Experts.tsx — confirmDelete does not close dialog
- **Root cause:** confirmDelete sets pendingDeleteId to null but never calls setDeleteConfirmOpen(false). Dialog relies on ConfirmDialog's internal onOpenChange which may not fire after onConfirm.
- **Affected paths:** packages/client/src/pages/Experts.tsx, lines 166-175

### 4. Profile.tsx — Missing useEffect dependencies
- **Root cause:** loadTeams and loadMembers are defined with const AFTER useEffect hooks that reference them. Const declarations are not hoisted, causing potential ReferenceError. Also missing from dependency arrays.
- **Affected paths:** packages/client/src/pages/Profile.tsx, lines 52-60

### 5. Settings.tsx — Missing useEffect dependencies
- **Root cause:** loadConfig and refreshStatus from zustand store not in dependency array. While zustand functions are stable, this violates exhaustive-deps linting rules.
- **Affected paths:** packages/client/src/pages/Settings.tsx, lines 70-73

### 6. Register.tsx — loadCaptcha swallows errors
- **Root cause:** loadCaptcha has internal try/catch that catches and sets localError, never re-throws. Outer catch in handleOpenCaptchaModal is unreachable. Captcha modal opens even on load failure.
- **Affected paths:** packages/client/src/pages/Register.tsx, lines 41-68

### 7. ForgotPassword.tsx — Inconsistent error state
- **Root cause:** setLocalError('') (empty string) used in some places, setLocalError(null) in others. Both are falsy but inconsistent representation could cause issues if check changes to strict null comparison.
- **Affected paths:** packages/client/src/pages/ForgotPassword.tsx, lines 92, 98, 126, 166

## Fix approach

### 1. Chat.tsx — setTimeout cleanup
- Store timeout ID in useRef (deleteTimeoutRef)
- Add cleanup useEffect that clears timeout on unmount
- Update handleDeleteMessage to clear existing timeout before setting new one
- Clear timeout when confirming deletion

### 2. Dashboard.tsx — error handling
- Add toast import from sonner
- Add catch block in loadData to handle errors
- Show user-friendly error toast on failure

### 3. Experts.tsx — dialog close
- Add setDeleteConfirmOpen(false) in confirmDelete finally block
- Dialog now closes after both success and failure

### 4. Profile.tsx — function hoisting + deps
- Move loadTeams and loadMembers function definitions BEFORE useEffect hooks
- Add loadTeams and loadMembers to dependency arrays
- Functions are now properly defined before being referenced

### 5. Settings.tsx — dependency array
- Add loadConfig and refreshStatus to dependency array
- Zustand store functions are stable references, safe to include

### 6. Register.tsx — error flow
- Change loadCaptcha to return Promise<boolean> indicating success
- Only open captcha modal if loadCaptcha returns true
- Wrap loadCaptcha call for CapturaVerify component compatibility

### 7. ForgotPassword.tsx — error state
- Standardize setLocalError('') to setLocalError(null) across all occurrences
- Consistent "no error" representation throughout

## Regression test plan

- All existing unit tests pass (212 tests)
- TypeScript type check passes
- Manual verification of each fixed page:
  - Chat: Delete timeout cleans up on navigation
  - Dashboard: Network errors show toast
  - Experts: Delete dialog closes after confirmation
  - Profile: Teams load correctly on mount
  - Settings: Config loads on mount
  - Register: Captcha modal doesn't open on load failure
  - ForgotPassword: Error state consistent throughout

## CRITICAL Issues

### 1. Chat.tsx — Uncleaned setTimeout on unmount
- **File:** packages/client/src/pages/Chat.tsx, line 392
- **Issue:** setTimeout in handleDeleteMessage never cleaned up on unmount
- **Impact:** Memory leak, React state update on unmounted component
- **Fix:** Store timeout ID in useRef, clear on useEffect cleanup

### 2. Dashboard.tsx — Unhandled promise rejections
- **File:** packages/client/src/pages/Dashboard.tsx, lines 48-67
- **Issue:** try...finally without catch in loadData
- **Impact:** Silent failure on network errors, no user feedback
- **Fix:** Add catch block with error state/toast

## HIGH Issues

### 3. Experts.tsx — confirmDelete does not close dialog
- **File:** packages/client/src/pages/Experts.tsx, lines 166-175
- **Issue:** setPendingDeleteId(null) without setDeleteConfirmOpen(false)
- **Impact:** Dialog may remain open after successful deletion
- **Fix:** Add setDeleteConfirmOpen(false) in finally block

### 4. Profile.tsx — Missing useEffect dependencies
- **File:** packages/client/src/pages/Profile.tsx, lines 52-60
- **Issue:** loadTeams and loadMembers not in dependency arrays
- **Impact:** Stale closures, exhaustive-deps lint warnings
- **Fix:** Add dependencies or wrap in useCallback

### 5. Settings.tsx — Missing useEffect dependencies
- **File:** packages/client/src/pages/Settings.tsx, lines 70-73
- **Issue:** loadConfig and refreshStatus not in dependency array
- **Impact:** Stale closures
- **Fix:** Add dependencies or use useCallback pattern

## MEDIUM Issues

### 6. Register.tsx — loadCaptcha swallows errors
- **File:** packages/client/src/pages/Register.tsx, lines 41-68
- **Issue:** loadCaptcha catches internally, outer catch unreachable
- **Impact:** Captcha modal opens even on load failure
- **Fix:** Re-throw from loadCaptcha or remove outer catch

### 7. ForgotPassword.tsx — Same loadCaptcha issue
- **File:** packages/client/src/pages/ForgotPassword.tsx, lines 42-64
- **Issue:** Same pattern as Register.tsx
- **Fix:** Same approach

### 8. ForgotPassword.tsx — Inconsistent error state
- **File:** packages/client/src/pages/ForgotPassword.tsx, lines 93 vs 166
- **Issue:** setLocalError('') vs setLocalError(null)
- **Fix:** Standardize to null for "no error"

## Priority Fix Order
1. CRITICAL: Chat.tsx setTimeout cleanup
2. CRITICAL: Dashboard.tsx error handling
3. HIGH: Experts.tsx dialog close
4. HIGH: Profile.tsx useEffect deps
5. HIGH: Settings.tsx useEffect deps
6. MEDIUM: Register.tsx captcha error flow
7. MEDIUM: ForgotPassword.tsx captcha + error state
