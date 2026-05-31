# QA Request: bugfix-001
**Date:** 2026-05-31
**Session:** 2026-05-31-session-f462d7
**Type:** bugfix
**State:** verdict-issued
**Verdict:** pass

## Acceptance criteria
- A1: Failed login (wrong credentials) should NOT trigger token clear or redirect — should stay on /login and show error toast

## Acceptance results
| ID | Criterion | Result | Evidence |
|----|-----------|--------|----------|
| A1 | Login 401 no redirect | pass | Playwright MCP: page stayed on /login, form preserved, 1 error (not 3+) |

## Regression matrix
| Area | Status | Notes |
|------|--------|-------|
| Login with wrong creds | pass | No redirect, form preserved |
| Non-login 401 handling | pass | Code review confirms redirect logic preserved for other endpoints |
| Existing unit tests | pass | 38/39 pass (1 pre-existing failure unrelated) |

## Linked artifacts
- Test cases: `qa/test-cases/bugfix-001.md`
- Test report: `qa/test-reports/bugfix-001.md`
- Security findings: `qa/security-findings.md`
- Performance findings: `qa/performance-findings.md`
- RD bug analysis: `rd/bug-analysis.md`
- RD code review: `rd/code-review.md`
- RD security review: `rd/security-review.md`

## Verdict
**PASS** — all acceptance criteria met, no security or performance concerns, no regression.
