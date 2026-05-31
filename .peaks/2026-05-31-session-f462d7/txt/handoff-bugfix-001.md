# TXT Handoff: bugfix-001
**Date:** 2026-05-31
**Session:** 2026-05-31-session-f462d7
**Mode:** full-auto
**Verdict:** pass

## Summary
Fixed admin login 401 interceptor bug. The axios response interceptor was incorrectly redirecting to `/login` on ALL 401 responses, including login failures. Added URL check to skip redirect for login endpoint.

## Validated decisions
- Fix scoped to `packages/admin/src/services/api.ts` only
- Interceptor checks `error.config.url` for `/admin/auth/login` before clearing token/redirecting
- Non-login 401s still correctly handled (token clear + redirect)

## Files changed
- `packages/admin/src/services/api.ts` — response interceptor 401 handling (lines 17-27)

## Artifact paths
- RD: `.peaks/2026-05-31-session-f462d7/rd/`
  - bug-analysis.md, requests/bugfix-001.md, code-review.md, security-review.md, project-scan.md
- QA: `.peaks/2026-05-31-session-f462d7/qa/`
  - test-cases/bugfix-001.md, test-reports/bugfix-001.md, security-findings.md, performance-findings.md, requests/bugfix-001.md

## Standards deltas
- No CLAUDE.md or .claude/rules/ changes needed (fix is in existing file, no new patterns introduced)

## Open questions
- User's actual admin credentials unknown — test with `owner@test.com` requires user to provide correct password
- Pre-existing AISettings.test.tsx failure (QueryClientProvider missing) is unrelated

## Next action
- User should log in with `owner@test.com` and their actual password to verify the fix end-to-end
- If the user needs to register a new owner, navigate to `/register-owner`
