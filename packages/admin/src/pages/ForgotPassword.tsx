import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  email: z.string().email('forgotPassword.invalidEmail'),
});

const codeSchema = z.object({
  code: z.string().length(6, 'forgotPassword.codeLength'),
});

const passwordSchema = z.object({
  password: z.string()
    .min(8, 'forgotPassword.passwordMinLength')
    .max(128)
    .regex(/[A-Z]/, 'forgotPassword.passwordUppercase')
    .regex(/[a-z]/, 'forgotPassword.passwordLowercase')
    .regex(/[0-9]/, 'forgotPassword.passwordNumber'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'forgotPassword.passwordsNotMatch',
  path: ['confirmPassword'],
});

type EmailForm = z.infer<typeof emailSchema>;
type CodeForm = z.infer<typeof codeSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

type Step = 'email' | 'captcha' | 'code' | 'password';

const ForgotPassword: React.FC = () => {
  const { t } = useTranslation();
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
      const message = error.response?.data?.message || t('forgotPassword.verificationFailed');
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
      const message = error.response?.data?.message || t('forgotPassword.invalidCode');
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
      alert(t('forgotPassword.resetSuccess'));
      navigate('/login');
    } catch (error: any) {
      const message = error.response?.data?.message || t('forgotPassword.resetFailed');
      alert(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('forgotPassword.title')}</CardTitle>
          <CardDescription>
            {step === 'email' && t('forgotPassword.stepEmail')}
            {step === 'captcha' && t('forgotPassword.stepCaptcha')}
            {step === 'code' && t('forgotPassword.stepCode')}
            {step === 'password' && t('forgotPassword.stepPassword')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'email' && (
            <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('forgotPassword.emailLabel')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('forgotPassword.emailPlaceholder')}
                  {...emailForm.register('email')}
                />
                {emailForm.formState.errors.email && (
                  <p className="text-sm text-red-500">{t(emailForm.formState.errors.email.message as string)}</p>
                )}
              </div>
              <Button type="submit" className="w-full">{t('forgotPassword.sendCode')}</Button>
            </form>
          )}

          {step === 'code' && (
            <form onSubmit={codeForm.handleSubmit(handleCodeSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">{t('forgotPassword.codeLabel')}</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder={t('forgotPassword.codePlaceholder')}
                  maxLength={6}
                  {...codeForm.register('code')}
                />
                {codeForm.formState.errors.code && (
                  <p className="text-sm text-red-500">{t('forgotPassword.codeLength')}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t('forgotPassword.verifying') : t('forgotPassword.verify')}
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={loadCaptcha}>
                {t('forgotPassword.resendCode')}
              </Button>
            </form>
          )}

          {step === 'password' && (
            <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">{t('forgotPassword.newPassword')}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t('forgotPassword.passwordPlaceholder')}
                  {...passwordForm.register('password')}
                />
                {passwordForm.formState.errors.password && (
                  <p className="text-sm text-red-500">{t(passwordForm.formState.errors.password.message as string)}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('forgotPassword.confirmPassword')}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder={t('forgotPassword.confirmPasswordPlaceholder')}
                  {...passwordForm.register('confirmPassword')}
                />
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-red-500">{t('forgotPassword.passwordsNotMatch')}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t('forgotPassword.resetting') : t('forgotPassword.resetPassword')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCaptchaDialog} onOpenChange={setShowCaptchaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('captcha.title')}</DialogTitle>
            <DialogDescription>{t('captcha.instruction')}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            <img src={captchaImage} alt={t('captcha.title')} className="rounded-md" />
            <CaptchaInput onVerify={handleCaptchaVerify} disabled={isLoading} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const CaptchaInput: React.FC<{
  onVerify: (answer: string[]) => void;
  disabled: boolean;
}> = ({ onVerify, disabled }) => {
  const { t } = useTranslation();
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
        {t('captcha.selected')}: {answer.join(' ')} ({answer.length}/4)
      </div>
      <Button type="button" variant="outline" className="w-full" onClick={handleReset}>
        {t('captcha.reset')}
      </Button>
    </div>
  );
};

export default ForgotPassword;