import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, Loader2, Mail, Lock, X, Eye, EyeOff, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import CaptchaVerify from '@/components/CaptchaVerify';
import { authService } from '@/services/auth-service';

type Step = 'email' | 'otp' | 'password';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [localError, setLocalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaImageUrl, setCaptchaImageUrl] = useState<string | null>(null);
  const [captchaModalOpen, setCaptchaModalOpen] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [showPasswords, setShowPasswords] = useState({ password: false, confirm: false });
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const loadCaptcha = async () => {
    const { token, imageUrl } = await authService.getCaptcha();
    setCaptchaToken(token);
    setCaptchaImageUrl(imageUrl);
  };

  const handleOpenCaptchaModal = async () => {
    if (!validateEmail(email)) {
      setLocalError('请输入有效的邮箱地址');
      return;
    }
    if (countdown > 0) {
      setLocalError(`请等待 ${countdown} 秒后再试`);
      return;
    }
    try {
      await loadCaptcha();
      setCaptchaModalOpen(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '获取验证码失败';
      setLocalError(message);
    }
  };

  const handleCaptchaVerify = async (answer: string[]) => {
    if (!captchaToken) {
      throw new Error('验证码已过期，请刷新');
    }
    setIsSendingVerification(true);
    try {
      await authService.sendResetCode({
        email,
        captchaToken,
        captchaAnswer: answer,
      });
      setCaptchaModalOpen(false);
      setStep('otp');
      setCountdown(60);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '发送验证码失败';
      setCaptchaModalOpen(false);
      setLocalError(errorMessage);
      throw err;
    } finally {
      setIsSendingVerification(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    await handleOpenCaptchaModal();
  };

  const handleOtpComplete = async (code: string) => {
    setIsLoading(true);
    setLocalError('');
    try {
      const success = await authService.verifyCode({ email, code, type: 'reset_password' });
      if (success) {
        setOtpCode(code);
        setStep('password');
      } else {
        setLocalError('验证码错误');
        setOtpCode('');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '验证失败';
      setLocalError(message);
      setOtpCode('');
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordRequirements = () => [
    { met: newPassword.length >= 8, text: '至少8位' },
    { met: /[A-Z]/.test(newPassword), text: '包含大写字母' },
    { met: /[a-z]/.test(newPassword), text: '包含小写字母' },
    { met: /[0-9]/.test(newPassword), text: '包含数字' },
  ];

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setLocalError('密码不符合要求');
      return;
    }
    if (newPassword !== confirmPassword) {
      setLocalError('两次输入的密码不一致');
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword({
        email,
        code: otpCode,
        newPassword,
      });
      navigate('/login');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '密码重置失败';
      setLocalError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;
    await handleOpenCaptchaModal();
  };

  const handleBack = () => {
    if (step === 'otp') {
      setStep('email');
      setOtpCode('');
    } else if (step === 'password') {
      setStep('otp');
      setOtpCode('');
    }
    setLocalError(null);
  };

  return (
    <>
      {/* Captcha Modal */}
      {captchaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 relative">
            <button
              type="button"
              onClick={() => setCaptchaModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">图形验证</h3>
            <p className="text-sm text-zinc-500 mb-4">请先完成图形验证，然后我们会发送验证码到您的邮箱</p>
            {captchaImageUrl && (
              <CaptchaVerify
                imageUrl={captchaImageUrl}
                onVerify={handleCaptchaVerify}
                onRefresh={loadCaptcha}
                onError={(message) => {
                  setCaptchaModalOpen(false);
                  setLocalError(message);
                }}
                disabled={isSendingVerification}
              />
            )}
            {isSendingVerification && (
              <div className="mt-4 text-center text-sm text-zinc-500">
                <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                发送中...
              </div>
            )}
          </div>
        </div>
      )}

      <div className="min-h-[100dvh] flex items-center justify-center bg-zinc-50/50 p-4 overflow-y-auto">
        {/* Background decoration */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-20 w-80 h-80 bg-zinc-200/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-zinc-300/10 rounded-full blur-3xl" />
        </div>

        <div className="w-full max-w-md relative z-10 py-8">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center shadow-lg">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 tracking-tight">加冰可乐</h1>
              <p className="text-xs text-zinc-500">AI 办公助手</p>
            </div>
          </div>

          {step === 'email' && (
            /* Step 1: Enter email */
            <div className="bento-tile p-6">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-semibold text-zinc-900">重置密码</h2>
                {localError && (
                  <span className="text-sm text-red-600 bg-red-50 px-3 py-1 rounded-full">{localError}</span>
                )}
              </div>
              <p className="text-xs text-zinc-500 mb-4">输入您的邮箱地址，我们将发送验证码帮您重置密码</p>

              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-700">邮箱地址</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                      <Mail className="w-5 h-5" />
                    </div>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="pl-12 h-12 bg-zinc-50/50 border-zinc-200/50 rounded-xl"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full btn-ice h-12 text-base rounded-xl">
                  发送验证码
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-zinc-500">
                <Link to="/login" className="text-zinc-900 hover:underline font-medium">
                  返回登录
                </Link>
              </p>
            </div>
          )}

          {step === 'otp' && (
            /* Step 2: Enter OTP */
            <div className="bento-tile p-6">
              <button
                onClick={handleBack}
                className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 transition-colors mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                返回修改信息
              </button>

              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-zinc-600" />
                </div>
                <h2 className="text-lg font-semibold text-zinc-900 mb-1">输入验证码</h2>
                <p className="text-sm text-zinc-500">
                  我们已发送验证码到<br />
                  <span className="font-medium text-zinc-700">{email}</span>
                </p>
              </div>

              {localError && (
                <div className="mb-4 p-4 bg-red-50/50 border border-red-200/50 rounded-xl text-red-600 text-sm text-center">
                  {localError}
                </div>
              )}

              <div className="mb-6">
                <InputOTP
                  maxLength={6}
                  value={otpCode}
                  onChange={(value) => {
                    setOtpCode(value);
                    if (value.length === 6) {
                      handleOtpComplete(value);
                    }
                  }}
                  disabled={isLoading}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {isLoading && (
                <div className="flex items-center justify-center gap-2 text-sm text-zinc-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  验证中...
                </div>
              )}

              <div className="text-center mt-6">
                {countdown > 0 ? (
                  <p className="text-sm text-zinc-400">
                    {countdown} 秒后可重新获取验证码
                  </p>
                ) : (
                  <button
                    onClick={handleResendCode}
                    className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
                  >
                    重新获取验证码
                  </button>
                )}
              </div>

              <p className="mt-6 text-center text-sm text-zinc-500">
                <Link to="/login" className="text-zinc-900 hover:underline font-medium">
                  返回登录
                </Link>
              </p>
            </div>
          )}

          {step === 'password' && (
            /* Step 3: Set new password */
            <div className="bento-tile p-6">
              <button
                onClick={handleBack}
                className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 transition-colors mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                返回修改信息
              </button>

              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-zinc-600" />
                </div>
                <h2 className="text-lg font-semibold text-zinc-900 mb-1">设置新密码</h2>
                <p className="text-sm text-zinc-500">请输入您的新密码</p>
              </div>

              {localError && (
                <div className="mb-4 p-4 bg-red-50/50 border border-red-200/50 rounded-xl text-red-600 text-sm text-center">
                  {localError}
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-700">新密码</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                      <Lock className="w-5 h-5" />
                    </div>
                    <Input
                      type={showPasswords.password ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="设置新密码"
                      className="pl-12 pr-12 h-12 bg-zinc-50/50 border-zinc-200/50 rounded-xl"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(p => ({ ...p, password: !p.password }))}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                    >
                      {showPasswords.password ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {newPassword && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {getPasswordRequirements().map((req, i) => (
                        <span
                          key={i}
                          className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                            req.met ? 'bg-green-100/50 text-green-600' : 'bg-zinc-100/50 text-zinc-400'
                          }`}
                        >
                          {req.met && <CheckCircle2 className="w-3 h-3" />}
                          {req.text}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-700">确认新密码</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                      <Lock className="w-5 h-5" />
                    </div>
                    <Input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="再次输入密码"
                      className="pl-12 pr-12 h-12 bg-zinc-50/50 border-zinc-200/50 rounded-xl"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(p => ({ ...p, confirm: !p.confirm }))}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                    >
                      {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full btn-ice h-12 text-base rounded-xl" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      重置中...
                    </>
                  ) : (
                    '重置密码'
                  )}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-zinc-500">
                <Link to="/login" className="text-zinc-900 hover:underline font-medium">
                  返回登录
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ForgotPassword;
