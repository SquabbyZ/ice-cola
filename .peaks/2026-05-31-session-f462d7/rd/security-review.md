# Security Review: bugfix-001
**Date:** 2026-05-31
**File:** packages/admin/src/services/api.ts

## Security checklist
- [x] No hardcoded secrets
- [x] No user input injection
- [x] No XSS vectors
- [x] Token management unchanged for authenticated endpoints
- [x] Login 401 no longer clears token (correct — login has no token to clear)

## Findings
- **Positive**: The fix actually improves security by preventing unnecessary token state manipulation during login failures
- **Positive**: Non-login 401s still correctly clear tokens and redirect (token expiry handling preserved)
- No new attack surface introduced

## Verdict
- **Pass** — no security concerns
