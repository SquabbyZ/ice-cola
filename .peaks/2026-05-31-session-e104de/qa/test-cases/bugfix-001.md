# Test Cases: bugfix-001

**Date:** 2026-05-31
**Session:** 2026-05-31-session-e104de

## Test cases

### test('forgot password shows error when email service not configured')

**Priority:** HIGH
**Type:** Integration

**Steps:**
1. 确保 RESEND_API_KEY 未配置
2. 访问 Admin 忘记密码页面
3. 输入有效邮箱地址
4. 完成图形验证码
5. 点击发送验证码

**Expected:**
- 前端显示错误提示："EMAIL_NOT_CONFIGURED: Email service is not configured. Please contact administrator."
- 页面不跳转到验证码输入步骤

---

### test('login shows toast error on invalid credentials')

**Priority:** HIGH
**Type:** E2E

**Steps:**
1. 访问 Admin 登录页面
2. 输入有效邮箱地址
3. 输入错误密码
4. 点击登录按钮

**Expected:**
- 页面显示 toast 错误提示："邮箱或密码错误"
- 用户可以清楚看到错误信息

---

### test('login shows toast error on non-existent email')

**Priority:** MEDIUM
**Type:** E2E

**Steps:**
1. 访问 Admin 登录页面
2. 输入不存在的邮箱地址
3. 输入任意密码
4. 点击登录按钮

**Expected:**
- 页面显示 toast 错误提示："邮箱或密码错误"
- 不泄露邮箱是否存在

---

### test('forgot password complete flow with email service configured')

**Priority:** MEDIUM
**Type:** E2E

**Steps:**
1. 确保 RESEND_API_KEY 已配置
2. 访问 Admin 忘记密码页面
3. 输入有效邮箱地址
4. 完成图形验证码
5. 检查邮箱收到验证码
6. 输入验证码
7. 设置新密码

**Expected:**
- 验证码成功发送到邮箱
- 验证码验证通过
- 密码重置成功
- 跳转到登录页面

---

## Regression Matrix

| Test Case | Status | Notes |
|-----------|--------|-------|
| forgot password error on no config | Pending | - |
| login toast error on invalid creds | Pending | - |
| login toast error on non-existent email | Pending | - |
| forgot password complete flow | Pending | 需要邮件服务配置 |
