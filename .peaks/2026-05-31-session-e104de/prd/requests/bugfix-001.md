# PRD: 修复Admin忘记密码邮件和登录错误提示

**ID:** bugfix-001
**Type:** bugfix
**Date:** 2026-05-31
**Session:** 2026-05-31-session-e104de

## Goals

1. 修复忘记密码邮件发送不生效的问题
2. 修复登录失败没有错误提示的问题
3. 确保所有认证流程的错误都有用户友好的提示

## Problem Statement

Admin前端存在两个认证相关的bug：

1. **忘记密码发送邮件不生效**：用户点击发送验证码后，前端显示成功但实际邮件未发送
2. **登录异常没有错误提示**：登录失败时用户看不到错误信息

## Root Cause Analysis

### Bug 1: 邮件发送不生效

**File:** `packages/server/src/commons/email.service.ts:90-96`

```typescript
private async sendEmail(to: string, subject: string, html: string): Promise<void> {
    const apiKey = await this.getResendApiKey();
    if (!apiKey) {
      this.logger.warn('Resend API key not configured');
      this.logger.log(`[DEV] Email to ${to}:...`);
      return; // <-- 问题：静默返回，不抛出错误
    }
```

当 `RESEND_API_KEY` 未配置时，邮件服务只打印日志并返回成功，前端收到success响应但邮件实际未发送。

### Bug 2: 登录错误提示不显示

**File:** `packages/admin/src/pages/Login.tsx:58-60`

```typescript
catch (error: any) {
    const message = error.response?.data?.message || t('login.loginFailed');
    setError('email', { message });    // 设置email错误
    setError('password', { message }); // 覆盖email错误
}
```

`setError` 只保留最后一次调用的结果，且没有使用toast等UI组件显示错误。

## Acceptance Criteria

1. [ ] 邮件服务未配置时，前端收到明确错误提示
2. [ ] 登录失败时，用户能看到错误消息（使用toast或页面内提示）
3. [ ] 忘记密码流程中验证码发送失败有错误提示
4. [ ] 所有认证相关的错误都有用户友好的提示

## Scope

- **In scope:** 
  - 修复EmailService错误处理
  - 修复Login页面错误提示
  - 修复ForgotPassword页面错误提示
- **Out of scope:** 配置邮件服务、新增功能

## Non-Goals

- 不修改邮件模板
- 不添加新的认证方式


## Status

- state: handed-off
- last update: 2026-05-31T02:58:20.473Z