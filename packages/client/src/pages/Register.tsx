import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, Loader2, Mail, Lock, User, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CaptchaVerify from '@/components/CaptchaVerify';
import { authService } from '@/services/auth-service';

type RegisterStep = 'email' | 'captcha' | 'code' | 'password' | 'submitting';

const Register: React.FC = () => {
  const navigate = useNavigate();

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  // UI state
  const [step, setStep] = useState<RegisterStep>('email');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaImageUrl, setCaptchaImageUrl] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [codeVerified, setCodeVerified] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Load captcha when reaching captcha step
  useEffect(() => {
    if (step === 'captcha' && !captchaToken) {
      loadCaptcha();
    }
  }, [step, captchaToken]);

  const loadCaptcha = async () => {
    try {
      const { token, imageUrl } = await authService.getCaptcha();
      setCaptchaToken(token);
      setCaptchaImageUrl(imageUrl);
    } catch (err: any) {
      setLocalError(err.response?.data?.message || '获取验证码失败');
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!validateEmail(email)) {
      setLocalError('请输入有效的邮箱地址');
      return;
    }

    setStep('captcha');
  };

  const handleCaptchaVerify = async (answer: string[]) => {
    if (!captchaToken) {
      throw new Error('验证码已过期，请刷新');
    }

    await authService.sendVerificationCode({
      email,
      captchaToken,
      captchaAnswer: answer,
    });

    // Refresh captcha after use
    await loadCaptcha();
    setStep('code');
    setCountdown(300); // 5 minutes
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (code.length !== 6) {
      setLocalError('请输入6位验证码');
      return;
    }

    setIsLoading(true);
    try {
      const success = await authService.verifyCode({ email, code });
      if (success) {
        setCodeVerified(true);
        setStep('password');
      } else {
        setLocalError('验证码错误');
      }
    } catch (err: any) {
      setLocalError(err.response?.data?.message || '验证码错误');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLocalError('');
    if (countdown > 0) return;

    // Need to re-verify captcha first
    setStep('captcha');
    await loadCaptcha();
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (password !== confirmPassword) {
      setLocalError('两次输入的密码不一致');
      return;
    }

    if (password.length < 8) {
      setLocalError('密码至少8位');
      return;
    }

    if (!/[A-Z]/.test(password)) {
      setLocalError('密码必须包含大写字母');
      return;
    }

    if (!/[a-z]/.test(password)) {
      setLocalError('密码必须包含小写字母');
      return;
    }

    if (!/[0-9]/.test(password)) {
      setLocalError('密码必须包含数字');
      return;
    }

    if (name.length < 2) {
      setLocalError('名称至少2个字符');
      return;
    }

    setStep('submitting');
    setIsLoading(true);

    try {
      await authService.clientRegister({ email, code, password, name });
      navigate('/');
    } catch (err: any) {
      setLocalError(err.response?.data?.message || err.message || '注册失败');
      setStep('password');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { key: 'email', label: '邮箱' },
      { key: 'captcha', label: '验证' },
      { key: 'code', label: '验证码' },
      { key: 'password', label: '密码' },
    ];

    const currentIndex = steps.findIndex(s => s.key === step);

    return (
      <div className="flex items-center justify-center gap-2 mb-6">
        {steps.map((s, index) => (
          <React.Fragment key={s.key}>
            <div className={`
              flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
              ${index <= currentIndex ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}
            `}>
              {index + 1}
            </div>
            <span className={`text-sm ${index <= currentIndex ? 'text-primary' : 'text-gray-400'}`}>
              {s.label}
            </span>
            {index < steps.length - 1 && (
              <div className={`w-8 h-0.5 ${index < currentIndex ? 'bg-primary' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
            <Activity className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">加冰可乐</h1>
            <p className="text-sm text-gray-500">AI 办公助手</p>
          </div>
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-2">注册账号</h2>
        <p className="text-sm text-gray-500 mb-6">
          {step === 'email' && '请输入您的邮箱'}
          {step === 'captcha' && '请完成图形验证'}
          {step === 'code' && '请输入发送到邮箱的验证码'}
          {step === 'password' && '最后设置您的密码'}
          {step === 'submitting' && '正在创建账号...'}
        </p>

        {renderStepIndicator()}

        {localError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {localError}
          </div>
        )}

        {/* Step 1: Email */}
        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                邮箱地址
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full">
              下一步
            </Button>
          </form>
        )}

        {/* Step 2: Captcha */}
        {step === 'captcha' && captchaImageUrl && (
          <div className="space-y-4">
            <CaptchaVerify
              imageUrl={captchaImageUrl}
              onVerify={handleCaptchaVerify}
              onRefresh={loadCaptcha}
            />
          </div>
        )}

        {/* Step 3: Email Code */}
        {step === 'code' && (
          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                验证码
              </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6位数字"
                  className="flex-1 text-center text-lg tracking-widest"
                  maxLength={6}
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                验证码已发送到 {email}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleResendCode}
                disabled={countdown > 0}
                className="flex-1"
              >
                {countdown > 0 ? `${countdown}秒后重发` : '重新获取'}
              </Button>
              <Button type="submit" className="flex-1" disabled={isLoading || code.length !== 6}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    验证中...
                  </>
                ) : (
                  '验证'
                )}
              </Button>
            </div>
          </form>
        )}

        {/* Step 4: Password */}
        {step === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {codeVerified && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                邮箱验证成功
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                姓名
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="你的名字"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="至少8位，包含大写字母、小写字母和数字"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                确认密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入密码"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !codeVerified}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  注册中...
                </>
              ) : (
                '完成注册'
              )}
            </Button>
          </form>
        )}

        {/* Submitting */}
        {step === 'submitting' && (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="mt-4 text-gray-500">正在创建账号...</p>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-gray-600">
          已有账号？{' '}
          <Link to="/login" className="text-primary hover:underline font-medium">
            登录
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;