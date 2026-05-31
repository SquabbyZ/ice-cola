# Bug Analysis: bugfix-001

**Date:** 2026-05-31
**Session:** 2026-05-31-session-e104de

## Bug 1: 忘记密码邮件发送不生效

### Symptom
用户在Admin忘记密码页面点击"发送验证码"后，页面显示成功跳转到验证码输入步骤，但用户邮箱未收到验证码邮件。

### Root Cause
`packages/server/src/commons/email.service.ts:90-96`

```typescript
private async sendEmail(to: string, subject: string, html: string): Promise<void> {
    const apiKey = await this.getResendApiKey();
    if (!apiKey) {
      this.logger.warn('Resend API key not configured (env or admin), logging email instead');
      this.logger.log(`[DEV] Email to ${to}:\nSubject: ${subject}\n${html}`);
      return; // BUG: 静默返回成功，前端不知道邮件未发送
    }
```

当 `RESEND_API_KEY` 未配置时：
1. 邮件服务只打印日志并返回（不抛出错误）
2. Controller返回 `{ success: true, message: '验证码已发送' }`
3. 前端收到success响应，切换到验证码输入步骤
4. 用户等待永远不会到达的验证码

### Fix approach
1. 后端：当API key未配置时抛出明确错误，错误消息包含错误代码便于调试
2. 前端：ForgotPassword页面已有错误提示UI，会自动捕获并显示后端返回的错误

## Bug 2: 登录异常没有错误提示

### Symptom
用户在Admin登录页面输入错误的邮箱或密码后，页面没有任何错误提示，用户不知道发生了什么。

### Root Cause
`packages/admin/src/pages/Login.tsx:57-61`

```typescript
catch (error: any) {
    const message = error.response?.data?.message || t('login.loginFailed');
    setError('email', { message });    // 设置email field error
    setError('password', { message }); // 覆盖上面的error
}
```

问题：
1. `setError('email', ...)` 设置后被 `setError('password', ...)` 覆盖
2. 两个field的error message相同，显示时会重复
3. 没有使用toast或alert等明显的错误提示UI

### Fix approach
1. 使用项目现有的 toast 组件显示错误消息
2. 移除无用的 setError 调用，简化代码

## Files to Modify

| File | Change |
|------|--------|
| `packages/server/src/commons/email.service.ts` | 添加API key缺失时的错误抛出 |
| `packages/admin/src/pages/Login.tsx` | 修复错误提示显示 |
| `packages/admin/src/pages/ForgotPassword.tsx` | 添加错误提示UI |

## Test Plan

1. **Unit Tests:**
   - EmailService: 测试API key缺失时抛出错误
   - Login: 测试错误消息显示

2. **E2E Tests:**
   - 忘记密码流程：验证码发送失败有提示
   - 登录流程：错误密码有提示
