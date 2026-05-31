# Code Review: bugfix-001
**Date:** 2026-05-31
**File:** packages/admin/src/services/api.ts

## Changes reviewed
Response interceptor 401 handling — added URL check to skip redirect for login endpoint.

## Findings

### CRITICAL: None
### HIGH: None

### MEDIUM: 1
- **M1**: `requestUrl.includes('/admin/auth/login')` uses substring match. If a future endpoint path contains `/admin/auth/login` as a substring (unlikely but possible), it would incorrectly skip redirect. Acceptable for now given the single login endpoint.

### LOW: 1
- **L1**: Could extract `'admin/auth/login'` as a named constant for clarity. Not blocking.

## Verdict
- **Approve** — no CRITICAL or HIGH issues
