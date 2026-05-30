# Bug Analysis: Admin Panel E2E Testing
**Date:** 2026-05-31
**Session:** 2026-05-31-session-f39009

## Issue 1: Users page - untranslated i18n key (HIGH)
- **File:** packages/admin/src/pages/Users.tsx
- **Bug:** "没有找到用户" 副标题显示 `users.noUsersDesc` 原始 key
- **Fix:** Add missing translation key or fix the key reference

## Issue 2: Invitations page - untranslated i18n keys (HIGH)
- **File:** packages/admin/src/pages/Invitations.tsx
- **Bug:** 显示 `INVITATIONS.PENDING`、`INVITATIONS.ACCEPTED`、`INVITATIONS.EXPIRED` 原始 key
- **Bug:** "Forbidden resource" 错误直接显示给用户
- **Fix:** Add missing translation keys; handle 403 errors gracefully

## Issue 3: Settings page - data mapping issue (MEDIUM)
- **File:** packages/admin/src/pages/Settings.tsx
- **Bug:** "Captcha Site Key" 字段显示邮箱地址
- **Fix:** Fix field mapping or data loading logic

## Issue 4: Redemption codes page - error state (LOW)
- **File:** packages/admin/src/pages/RedemptionCodes.tsx
- **Bug:** 显示 "加载兑换码失败" 错误
- **Fix:** Handle 401/403 errors gracefully
