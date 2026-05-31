# RD Request: bugfix-001
**Date:** 2026-05-31
**Session:** 2026-05-31-session-f462d7
**Type:** bugfix
**State:** implemented

## Problem
Admin login POST to `/admin/auth/login` returns 401. Frontend axios interceptor catches ALL 401 responses (including login failures), clears `adminToken`, and redirects to `/login`. This causes:
- Page reload losing form state on failed login attempts
- Confusing redirect loop when already on login page
- Browser autofill triggering premature 401s that fire the interceptor

## Root Cause
`packages/admin/src/services/api.ts` response interceptor has no distinction between:
- **Authenticated endpoint 401** (token expired → should redirect to login)
- **Login endpoint 401** (wrong credentials → should NOT redirect, just show error)

## Fix
Modified the interceptor to check `error.config.url` — if the request URL contains `/admin/auth/login`, skip the token-clear and redirect logic.

## Red-line scope
- In-scope: `packages/admin/src/services/api.ts`
- Out-of-scope: server-side auth, database, other frontend pages

## Files changed
- `packages/admin/src/services/api.ts` — response interceptor 401 handling

## Coverage
- Manual E2E verification via Playwright MCP (login page behavior)
- No new unit tests needed (interceptor change is a 3-line conditional guard)

## Linked artifacts
- Bug analysis: `.peaks/2026-05-31-session-f462d7/rd/bug-analysis.md`
- Code review: `.peaks/2026-05-31-session-f462d7/rd/code-review.md`
- Security review: `.peaks/2026-05-31-session-f462d7/rd/security-review.md`
