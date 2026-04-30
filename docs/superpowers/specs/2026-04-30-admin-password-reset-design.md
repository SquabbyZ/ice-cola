# 管理员密码找回设计

> **创建时间：** 2026-04-30
> **目标：** 实现带图形验证码的管理员密码找回功能，防止脚本暴力破解

## 流程概述

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   1. 输入邮箱     │ → │   2. 图形验证     │ → │   3. 邮件验证码   │ → │   4. 重置密码     │
│                  │    │   点击汉字顺序     │    │   6位数字        │    │                  │
└──────────────────┘    └──────────────────┘    └──────────────────┘    └──────────────────┘
```

## 页面

### 1. 忘记密码入口
- Login 页面添加"忘记密码"链接

### 2. 忘记密码页面 `/forgot-password`
- 步骤条显示进度（1. 邮箱 → 2. 图形验证 → 3. 邮箱验证码 → 4. 重置密码）
- 输入邮箱后点击发送验证码

### 3. 图形验证弹窗
- 显示 CaptchaService 生成的 SVG 图片
- 提示用户"依次点击：XX XX XX XX"
- 4个汉字，点击验证

### 4. 邮件验证码验证
- 6位数字输入框
- 有效期10分钟
- 可重新发送（需通过图形验证）

### 5. 重置密码页面
- 新密码 + 确认密码
- 提交后跳转登录页

## API 设计

### POST /admin/auth/send-code

**请求体：**
```typescript
{
  email: string;
  captchaToken: string;
  captchaAnswer: string[]; // 如 ["天", "地", "玄", "黄"]
}
```

**响应：**
```json
{
  "success": true,
  "message": "验证码已发送"
}
```

**后端逻辑：**
1. 验证图形验证码（CaptchaService.verifyCaptcha）
2. 验证管理员邮箱是否存在
3. 生成6位数字验证码，存入 client_verification_codes 表
4. 发送邮件（或console.log开发环境）

### POST /admin/auth/reset-password

**请求体：**
```typescript
{
  email: string;
  code: string;
  newPassword: string;
}
```

**响应：**
```json
{
  "success": true,
  "message": "密码已重置"
}
```

**后端逻辑：**
1. 验证验证码正确且未过期
2. 验证错误次数（超过3次需重新获取）
3. 更新 admin_users 表密码（bcrypt加密）
4. 删除已使用的验证码

## 后端改动

### AdminModule
```typescript
import { CaptchaService } from '../commons/captcha.service';

// providers 添加 CaptchaService
providers: [AdminService, ConfigService, CaptchaService],
```

### AdminController
```typescript
// 修改 send-code 接口，添加 captcha 验证
@Post('send-code')
async sendCode(@Body() dto: SendCodeDto) {
  // dto 包含 email, captchaToken, captchaAnswer
  await this.adminService.sendResetCode(dto.email, dto.captchaToken, dto.captchaAnswer);
}
```

### AdminService
```typescript
async sendResetCode(
  email: string,
  captchaToken: string,
  captchaAnswer: string[]
): Promise<void> {
  // 1. 验证图形验证码
  const captchaValid = await this.captchaService.verifyCaptcha(captchaToken, captchaAnswer);
  if (!captchaValid) {
    throw new AppError('INVALID_CAPTCHA', '图形验证失败', 400);
  }

  // 2. 检查管理员是否存在
  const admin = await this.findAdminByEmail(email);
  if (!admin) {
    return; // 不暴露邮箱是否存在
  }

  // 3. 生成邮件验证码
  const code = await this.createVerificationCode(email, 'reset_password');
  // 4. 发送邮件
}
```

## 前端改动

### packages/admin/src/pages/Login.tsx
- 添加"忘记密码"链接，指向 `/forgot-password`

### packages/admin/src/pages/ForgotPassword.tsx (新建)
- 步骤条组件
- 邮箱输入表单
- 图形验证码弹窗（带刷新按钮）
- 验证码输入组件
- 密码重置表单

## 验证码规则

| 规则 | 限制 |
|------|------|
| 图形验证码有效期 | 5分钟 |
| 邮件验证码有效期 | 10分钟 |
| 验证码错误次数 | 最多3次，超过需重新获取 |
| 图形验证码 | 一次性的，验证后失效 |

## 安全措施

1. **图形验证码防暴力** - 每次发送邮件验证码前必须先通过图形验证
2. **验证码一次性** - 验证后立即删除
3. **不暴露邮箱存在** - 邮箱不存在时返回成功，避免用户枚举
4. **错误次数限制** - 3次错误后需重新获取验证码
