# Test Cases: bugfix-001
**Date:** 2026-05-31
**Session:** 2026-05-31-session-f462d7

## Test Case: Login 401 does not clear token
- **Category:** unit
- **Target:** packages/admin/src/services/api.ts
- **Acceptance:** A1
- **Preconditions:** No adminToken in localStorage
- **Steps:** 1. POST to /admin/auth/login with wrong credentials 2. Observe 401 response
- **Expected result:** `adminToken` is NOT cleared from localStorage (no token to clear, but importantly no redirect)
- **Status:** pass
- **Evidence:** Playwright browser test — page stayed on /login, no redirect triggered

## Test Case: Login 401 does not redirect
- **Category:** ui-regression
- **Target:** packages/admin/src/pages/Login.tsx
- **Acceptance:** A1
- **Preconditions:** User is on /login page
- **Steps:** 1. Fill email and password fields 2. Click login button 3. Server returns 401
- **Expected result:** Page stays on /login, form values preserved, error toast shown
- **Status:** pass
- **Evidence:** Playwright MCP — URL remained /login, form values `wrong@test.com` / `wrongpass` preserved after failed login

## Test Case: Non-login 401 still redirects
- **Category:** unit
- **Target:** packages/admin/src/services/api.ts
- **Acceptance:** A1
- **Preconditions:** User has stale token in localStorage
- **Steps:** 1. Make authenticated request to /admin/auth/stats 2. Server returns 401 (token expired)
- **Expected result:** adminToken cleared from localStorage, redirect to /login
- **Status:** pass (verified by code review — the `isLoginRequest` check only affects `/admin/auth/login` URL)

## Test Case: Successful login still works
- **Category:** ui-regression
- **Target:** packages/admin/pages/Login.tsx
- **Acceptance:** A1
- **Preconditions:** Valid admin credentials exist
- **Steps:** 1. Fill correct email/password 2. Click login 3. Server returns 200 with token
- **Expected result:** Token stored, navigate to dashboard
- **Status:** blocked (cannot test without valid credentials; code path unchanged)
