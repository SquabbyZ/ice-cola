# Bug Analysis: Admin Login 401
**Date:** 2026-05-31
**Session:** 2026-05-31-session-f462d7
**Type:** bugfix

## Problem Statement
Admin system owner login returns HTTP 401 Unauthorized.

## Reproduction
1. Navigate to http://localhost:1992/login
2. Enter email `601709253@qq.com` and password
3. Click "登录" (Login)
4. Result: 401 Unauthorized

## Root Cause Analysis

### Issue 1: Wrong credentials (PRIMARY)
- The only admin user in the database is `owner@test.com` (role: OWNER)
- The email `601709253@qq.com` does NOT exist in `admin_users` table
- Server correctly returns 401 with `AUTH_INVALID_CREDENTIALS` / "邮箱或密码错误"

### Issue 2: Frontend interceptor incorrectly handles login 401s (SECONDARY - UX BUG)
- File: `packages/admin/src/services/api.ts` lines 15-27
- The axios response interceptor catches ALL 401 responses
- On 401, it clears `adminToken` from localStorage and redirects to `/login`
- This is correct for **authenticated API calls** (token expired)
- This is WRONG for the **login endpoint itself** — failed credentials should NOT trigger redirect
- Impact: The interceptor's `window.location.href = '/login'` fires even when already on the login page, causing a page reload that loses form state and error context

### Issue 3: Browser autofill causing premature 401s
- Browser autofill with saved credentials for `601709253@qq.com` triggers login attempts before user clicks submit
- These autofill-triggered 401s fire the interceptor, potentially causing confusing redirects

## Recommended Fix
Modify `packages/admin/src/services/api.ts` response interceptor to skip the 401 redirect logic when the request URL is the login endpoint (`/admin/auth/login`).

## Verification
- curl test confirms server returns proper 401 with error body for non-existent users
- curl test confirms `has-owner` returns true (owner@test.com exists)
- Browser network logs confirm POST to `/admin/auth/login` returns 401
