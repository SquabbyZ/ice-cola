# TXT Handoff: bugfix-001

**Date:** 2026-05-31
**Session:** 2026-05-31-session-e104de
**Mode:** full-auto

## Summary

修复了Admin前端两个认证相关的bug：
1. 忘记密码邮件发送不生效
2. 登录异常没有错误提示

## Validated Decisions

1. **EmailService错误处理**: 当RESEND_API_KEY未配置时抛出错误而非静默返回
2. **Login错误提示**: 使用toast替代setError显示登录错误

## Changes Made

| File | Change |
|------|--------|
| `packages/server/src/commons/email.service.ts` | `return` → `throw new Error('EMAIL_NOT_CONFIGURED: ...')` |
| `packages/admin/src/pages/Login.tsx` | 使用toast显示登录错误 |

## Artifact Paths

- PRD: `.peaks/2026-05-31-session-e104de/prd/requests/bugfix-001.md`
- RD: `.peaks/2026-05-31-session-e104de/rd/requests/001-bugfix-001.md`
- QA: `.peaks/2026-05-31-session-e104de/qa/requests/001-bugfix-001.md`
- Test Report: `.peaks/2026-05-31-session-e104de/qa/test-reports/bugfix-001.md`

## Standards Deltas

- CLAUDE.md: Existing, no changes needed
- .claude/rules/: Existing, no changes needed

## Open Questions

1. 生产环境需要配置RESEND_API_KEY才能发送邮件
2. AISettings.test.tsx有一个预先存在的测试失败需要单独修复

## Next Action

代码已通过QA验证(verdict=pass)，可以提交。
