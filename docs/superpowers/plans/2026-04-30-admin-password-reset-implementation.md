# 管理员密码找回实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现带图形验证码的管理员密码找回功能

**Architecture:**
- 后端：在 AdminModule 中引入 CaptchaService，修改 send-code 接口增加图形验证码验证
- 前端：新建 ForgotPassword 页面，包含邮箱输入→图形验证→邮件验证码→重置密码的完整流程

**Tech Stack:** NestJS, React, Radix UI Dialog, class-validator

---

## 文件结构

### 后端改动
- Modify: `packages/server/src/admin-admin/admin.module.ts` - 引入 CaptchaService
- Modify: `packages/server/src/admin-admin/dto/login.dto.ts` - SendCodeDto 增加 captcha 字段
- Modify: `packages/server/src/admin-admin/admin.service.ts` - sendResetCode 增加图形验证码验证
- Modify: `packages/server/src/admin-admin/admin.controller.ts` - send-code 接口文档更新

### 前端改动
- Create: `packages/admin/src/pages/ForgotPassword.tsx` - 忘记密码页面
- Modify: `packages/admin/src/App.tsx` - 添加路由
- Modify: `packages/admin/src/pages/Login.tsx` - 添加忘记密码链接

---

## Task 1: 后端 - AdminModule 引入 CaptchaService

**Files:**
- Modify: `packages/server/src/admin-admin/admin.module.ts`

- [ ] **Step 1: 添加 CaptchaService 导入和 providers**

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService as NestConfigService } from '@nestjs/config';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ConfigController } from './config.controller';
import { ConfigService } from './config.service';
import { CaptchaService } from '../commons/captcha.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: NestConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '15m'),
        },
      }),
      inject: [NestConfigService],
    }),
  ],
  controllers: [AdminController, ConfigController],
  providers: [AdminService, ConfigService, CaptchaService],
  exports: [AdminService, ConfigService],
})
export class AdminModule {}
```

- [ ] **Step 2: 提交代码**

```bash
git add packages/server/src/admin-admin/admin.module.ts
git commit -m "feat(admin): inject CaptchaService in AdminModule"
```

---

## Task 2: 后端 - DTO 更新

**Files:**
- Modify: `packages/server/src/admin-admin/dto/login.dto.ts`

- [ ] **Step 1: 更新 SendCodeDto 添加 captcha 字段**

```typescript
import { IsEmail, IsString, MinLength, MaxLength, Matches, IsOptional, IsArray } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email: string;

  @IsString()
  password: string;
}

export class RegisterDto {
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email: string;

  @IsString()
  @MinLength(8, { message: '密码至少8位' })
  @MaxLength(128)
  @Matches(/[A-Z]/, { message: '密码必须包含大写字母' })
  @Matches(/[a-z]/, { message: '密码必须包含小写字母' })
  @Matches(/[0-9]/, { message: '密码必须包含数字' })
  password: string;

  @IsString()
  @MinLength(2, { message: '名称至少2个字符' })
  @MaxLength(50)
  name: string;
}

export class SendCodeDto {
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email: string;

  @IsString()
  captchaToken: string;

  @IsArray()
  @IsString({ each: true })
  captchaAnswer: string[];
}

export class ResetPasswordDto {
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email: string;

  @IsString()
  code: string;

  @IsString()
  @MinLength(8, { message: '密码至少8位' })
  @MaxLength(128)
  @Matches(/[A-Z]/, { message: '密码必须包含大写字母' })
  @Matches(/[a-z]/, { message: '密码必须包含小写字母' })
  @Matches(/[0-9]/, { message: '密码必须包含数字' })
  newPassword: string;
}
```

- [ ] **Step 2: 提交代码**

```bash
git add packages/server/src/admin-admin/dto/login.dto.ts
git commit -m "feat(admin): add captcha fields to SendCodeDto"
```

---

## Task 3: 后端 - AdminService 更新

**Files:**
- Modify: `packages/server/src/admin-admin/admin.service.ts`

- [ ] **Step 1: 更新 sendResetCode 方法，注入 CaptchaService 并验证**

找到现有的 `sendResetCode` 方法，修改签名和实现：

```typescript
import { Injectable, Inject, forwardRef } from '@nestjs/common';
// ... existing imports ...

@Injectable()
export class AdminService {
  constructor(
    private db: DatabaseService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(forwardRef(() => CaptchaService))
    private captchaService: CaptchaService,
  ) {}
  // ... existing methods ...
```

找到 `sendResetCode` 方法（约在325行），修改为：

```typescript
async sendResetCode(
  email: string,
  captchaToken: string,
  captchaAnswer: string[]
): Promise<void> {
  // 1. Verify captcha
  const captchaValid = await this.captchaService.verifyCaptcha(captchaToken, captchaAnswer);
  if (!captchaValid) {
    throw new AppError('INVALID_CAPTCHA', '图形验证失败', 400);
  }

  // 2. Check if admin exists (don't reveal if email exists)
  const admin = await this.findAdminByEmail(email);
  if (!admin) {
    return;
  }

  // 3. Generate and store verification code
  const code = await this.createVerificationCode(email, 'reset_password');

  // 4. Send email (console.log in dev)
  console.log(`[DEV] Password reset code for ${email}: ${code}`);
}
```

- [ ] **Step 2: 提交代码**

```bash
git add packages/server/src/admin-admin/admin.service.ts
git commit -m "feat(admin): add captcha verification to sendResetCode"
```

---

## Task 4: 前端 - 新建 ForgotPassword 页面

**Files:**
- Create: `packages/admin/src/pages/ForgotPassword.tsx`

- [ ] **Step 1: 创建忘记密码页面组件**

```tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import api from '../services/api';

const emailSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
});

const codeSchema = z.object({
  code: z.string().length(6, '验证码为6位数字'),
});

const passwordSchema = z.object({
  password: z.string()
    .min(8, '密码至少8位')
    .max(128)
    .matches(/[A-Z]/, '密码必须包含大写字母')
    .matches(/[a-z]/, '密码必须包含小写字母')
    .matches(/[0-9]/, '密码必须包含数字'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: '两次密码输入不一致',
  path: ['confirmPassword'],
});

type EmailForm = z.infer<typeof emailSchema>;
type CodeForm = z.infer<typeof codeSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

type Step = 'email' | 'captcha' | 'code' | 'password';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaImage, setCaptchaImage] = useState('');
  const [showCaptchaDialog, setShowCaptchaDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
  });

  const codeForm = useForm<CodeForm>({
    resolver: zodResolver(codeSchema),
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  const loadCaptcha = async () => {
    try {
      const response = await api.post('/client/auth/captcha');
      const { token, imageUrl } = response.data.data;
      setCaptchaToken(token);
      setCaptchaImage(imageUrl);
      setShowCaptchaDialog(true);
    } catch (error) {
      console.error('Failed to load captcha:', error);
    }
  };

  const handleEmailSubmit = async (data: EmailForm) => {
    setEmail(data.email);
    await loadCaptcha();
  };

  const handleCaptchaVerify = async (answer: string[]) => {
    setIsLoading(true);
    try {
      const response = await api.post('/admin/auth/send-code', {
        email,
        captchaToken,
        captchaAnswer: answer,
      });
      if (response.data.success) {
        setShowCaptchaDialog(false);
        setStep('code');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || '验证失败，请重试';
      alert(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeSubmit = async (data: CodeForm) => {
    setIsLoading(true);
    try {
      await api.post('/admin/auth/reset-password', {
        email,
        code: data.code,
        newPassword: passwordForm.getValues('password'),
      });
      setStep('password');
    } catch (error: any) {
      const message = error.response?.data?.message || '验证码错误';
      codeForm.setError('code', { message });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (data: PasswordForm) => {
    setIsLoading(true);
    try {
      await api.post('/admin/auth/reset-password', {
        email,
        code: codeForm.getValues('code'),
        newPassword: data.password,
      });
      alert('密码重置成功，请使用新密码登录');
      navigate('/login');
    } catch (error: any) {
      const message = error.response?.data?.message || '重置失败，请重试';
      alert(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>找回密码</CardTitle>
          <CardDescription>
            {step === 'email' && '请输入您的管理员邮箱'}
            {step === 'captcha' && '请先完成图形验证'}
            {step === 'code' && '请输入发送到邮箱的验证码'}
            {step === 'password' && '请设置新密码'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Email Step */}
          {step === 'email' && (
            <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">邮箱</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  {...emailForm.register('email')}
                />
                {emailForm.formState.errors.email && (
                  <p className="text-sm text-red-500">{emailForm.formState.errors.email.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full">发送验证码</Button>
            </form>
          )}

          {/* Code Step */}
          {step === 'code' && (
            <form onSubmit={codeForm.handleSubmit(handleCodeSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">验证码</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="请输入6位验证码"
                  maxLength={6}
                  {...codeForm.register('code')}
                />
                {codeForm.formState.errors.code && (
                  <p className="text-sm text-red-500">{codeForm.formState.errors.code.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? '验证中...' : '验证'}
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={loadCaptcha}>
                重新获取验证码
              </Button>
            </form>
          )}

          {/* Password Step */}
          {step === 'password' && (
            <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">新密码</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="至少8位，包含大小写和数字"
                  {...passwordForm.register('password')}
                />
                {passwordForm.formState.errors.password && (
                  <p className="text-sm text-red-500">{passwordForm.formState.errors.password.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">确认密码</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="再次输入新密码"
                  {...passwordForm.register('confirmPassword')}
                />
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-red-500">{passwordForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? '重置中...' : '重置密码'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Captcha Dialog */}
      <Dialog open={showCaptchaDialog} onOpenChange={setShowCaptchaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>图形验证</DialogTitle>
            <DialogDescription>请依次点击以下汉字</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            <img src={captchaImage} alt="验证码" className="rounded-md" />
            <CaptchaInput onVerify={handleCaptchaVerify} disabled={isLoading} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Captcha input component for click-based verification
const CaptchaInput: React.FC<{
  onVerify: (answer: string[]) => void;
  disabled: boolean;
}> = ({ onVerify, disabled }) => {
  const [answer, setAnswer] = useState<string[]>([]);
  const chars = '天地玄黄宇宙洪荒日月盈昃辰宿列张寒来暑往秋收冬藏';

  const handleCharClick = (char: string) => {
    if (answer.length < 4) {
      const newAnswer = [...answer, char];
      setAnswer(newAnswer);
      if (newAnswer.length === 4) {
        onVerify(newAnswer);
      }
    }
  };

  const handleReset = () => {
    setAnswer([]);
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap justify-center gap-2 mb-4">
        {chars.split('').map((char) => (
          <button
            key={char}
            type="button"
            onClick={() => handleCharClick(char)}
            disabled={disabled || answer.length >= 4}
            className="w-10 h-10 text-lg font-bold bg-amber-100 hover:bg-amber-200 rounded"
          >
            {char}
          </button>
        ))}
      </div>
      <div className="text-center text-sm text-muted-foreground mb-2">
        已选择: {answer.join(' ')} ({answer.length}/4)
      </div>
      <Button type="button" variant="outline" className="w-full" onClick={handleReset}>
        重置
      </Button>
    </div>
  );
};

export default ForgotPassword;
```

- [ ] **Step 2: 提交代码**

```bash
git add packages/admin/src/pages/ForgotPassword.tsx
git commit -m "feat(admin): add ForgotPassword page with captcha verification"
```

---

## Task 5: 前端 - 添加路由和链接

**Files:**
- Modify: `packages/admin/src/App.tsx`
- Modify: `packages/admin/src/pages/Login.tsx`

- [ ] **Step 1: 更新 App.tsx 添加路由**

```tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Invitations from './pages/Invitations';
import Settings from './pages/Settings';
import AcceptInvite from './pages/AcceptInvite';
import ForgotPassword from './pages/ForgotPassword';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/accept-invite" element={<AcceptInvite />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="invitations" element={<Invitations />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
};

export default App;
```

- [ ] **Step 2: 更新 Login.tsx 添加忘记密码链接**

在 `<CardContent>` 中的 `<form>` 之后添加：

```tsx
          <div className="mt-4 text-center text-sm">
            <Button
              type="button"
              variant="link"
              className="text-primary"
              onClick={() => navigate('/forgot-password')}
            >
              忘记密码？
            </Button>
          </div>
```

完整 Login.tsx：

```tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      const response = await api.post('/admin/auth/login', data);
      const { user, accessToken } = response.data.data;
      setAuth(user, accessToken);
      navigate('/');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed';
      setError('email', { message });
      setError('password', { message });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin Login</CardTitle>
          <CardDescription>Sign in to access the admin dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <Button
              type="button"
              variant="link"
              className="text-primary"
              onClick={() => navigate('/forgot-password')}
            >
              忘记密码？
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
```

- [ ] **Step 3: 提交代码**

```bash
git add packages/admin/src/App.tsx packages/admin/src/pages/Login.tsx
git commit -m "feat(admin): add ForgotPassword route and link in Login"
```

---

## Task 6: 验证和测试

- [ ] **Step 1: 启动开发服务器**

```bash
cd packages/server && npm run dev
cd packages/admin && npm run dev
```

- [ ] **Step 2: 测试流程**

1. 访问 `http://localhost:1992/forgot-password`
2. 输入管理员邮箱，点击发送验证码
3. 图形验证弹窗应该显示
4. 点击正确的汉字顺序
5. 检查服务器 console 输出的验证码
6. 输入验证码，设置新密码
7. 提交后跳转到登录页

- [ ] **Step 3: 提交最终版本**

```bash
git status
git add -A
git commit -m "feat(admin): complete password reset feature with captcha"
```
