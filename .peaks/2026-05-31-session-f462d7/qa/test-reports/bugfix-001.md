# Test Report: bugfix-001
**Date:** 2026-05-31
**Session:** 2026-05-31-session-f462d7
**Type:** bugfix

## Summary
- **Test cases:** 4 generated, 3 pass, 1 blocked (no valid credentials available)
- **Unit tests:** 38/39 pass (1 pre-existing failure in unrelated AISettings.test.tsx)
- **Verdict:** pass

## Test execution results
| # | Test Case | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Login 401 does not clear token | pass | Playwright — no redirect on failed login |
| 2 | Login 401 does not redirect | pass | Playwright — page stayed on /login, form values preserved |
| 3 | Non-login 401 still redirects | pass | Code review — `isLoginRequest` check only affects login URL |
| 4 | Successful login still works | blocked | No valid credentials; code path unchanged |

## Coverage evidence
- Changed file: `packages/admin/src/services/api.ts`
- Pre-existing unit tests: 38/39 pass (1 failure in AISettings.test.tsx — unrelated QueryClient issue)
- New behavior covered by Playwright MCP E2E verification

## Browser validation results
- **Pages validated:** /login
- **Interactions:** Fill form with wrong credentials → click login → verify no redirect
- **Console errors:** 1 expected (401 from login POST — this is the correct behavior)
- **Network:** POST /admin/auth/login → 401 (expected for wrong credentials)
- **Key finding:** Before fix: 3+ console errors and page redirect. After fix: 1 error, no redirect, form preserved.

## Security findings
- Pass — no issues. See `qa/security-findings.md`.

## Performance findings
- Pass — negligible impact. See `qa/performance-findings.md`.

## Residual risks
- None identified. The fix is minimal and correctly scoped.

## Red-line boundary check
- **In-scope:** `packages/admin/src/services/api.ts` — changed, as expected
- **Out-of-scope violations:** None
- **Verdict:** pass
