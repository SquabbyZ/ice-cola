# Code Review: bugfix-001

**Date:** 2026-05-31
**Session:** 2026-05-31-session-e104de

## Review Summary

修复了两个认证相关的bug，代码变更简洁且符合项目规范。

## Changes Reviewed

### 1. `packages/server/src/commons/email.service.ts`

**Change:** 当 Resend API key 未配置时抛出错误而非静默返回

```typescript
// Before:
if (!apiKey) {
  this.logger.warn('...');
  return; // 静默返回
}

// After:
if (!apiKey) {
  this.logger.warn('...');
  throw new Error('EMAIL_NOT_CONFIGURED: ...'); // 抛出错误
}
```

**Assessment:** ✅ PASS
- 错误消息清晰，包含错误代码便于调试
- 日志保留，便于运维排查
- 不泄露敏感信息

### 2. `packages/admin/src/pages/Login.tsx`

**Change:** 使用 toast 替代 setError 显示登录错误

```typescript
// Before:
setError('email', { message });
setError('password', { message }); // 覆盖前一个

// After:
toast(message, 'error');
```

**Assessment:** ✅ PASS
- 使用项目现有的 toast 组件
- 错误消息用户友好
- 移除了无用的 setError 调用

## Findings

| Severity | Finding | Status |
|----------|---------|--------|
| - | No critical issues | - |
| - | No high issues | - |
| LOW | Login 页面的错误不再显示在表单字段下方 | Accepted - toast 更明显 |

## Verdict

**APPROVED** - 无 CRITICAL 或 HIGH 问题，代码变更安全且有效。
