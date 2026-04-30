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
    .regex(/[A-Z]/, '密码必须包含大写字母')
    .regex(/[a-z]/, '密码必须包含小写字母')
    .regex(/[0-9]/, '密码必须包含数字'),
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