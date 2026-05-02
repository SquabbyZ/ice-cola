import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, Loader2, Mail, Lock, User, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CaptchaVerify from '@/components/CaptchaVerify';
import { authService } from '@/services/auth-service';

const Register: React.FC = () => {
  const navigate = useNavigate();

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  // UI state
  const [localError, setLocalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaImageUrl, setCaptchaImageUrl] = useState<string | null>(null);
  const [codeVerified, setCodeVerified] = useState(false);
  const [captchaModalOpen, setCaptchaModalOpen] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);

  // Countdown timer
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const loadCaptcha = async () => {
    try {
      const { token, imageUrl } = await authService.getCaptcha();
      setCaptchaToken(token);
      setCaptchaImageUrl(imageUrl);
    } catch (err: any) {
      setLocalError(err.response?.data?.message || '获取验证码失败');
    }
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
    } catch (err: any) {
      setLocalError(err.response?.data?.message || '获取验证码失败');
    }
  };

  const handleCaptchaVerify = async (answer: string[]) => {
    if (!captchaToken) {
      throw new Error('验证码已过期，请刷新');
    }

    setIsSendingCode(true);
    try {
      await authService.sendVerificationCode({
        email,
        captchaToken,
        captchaAnswer: answer,
      });
      setCaptchaModalOpen(false);
      setCountdown(60);
    } catch (err: any) {
      throw err;
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      setLocalError('请输入6位验证码');
      return;
    }

    setIsLoading(true);
    setLocalError('');
    try {
      const success = await authService.verifyCode({ email, code });
      if (success) {
        setCodeVerified(true);
      } else {
        setLocalError('验证码错误');
      }
    } catch (err: any) {
      setLocalError(err.response?.data?.message || '验证码错误');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    // Validation
    if (!validateEmail(email)) {
      setLocalError('请输入有效的邮箱地址');
      return;
    }

    if (!codeVerified) {
      setLocalError('请先验证邮箱验证码');
      return;
    }

    if (name.length < 2) {
      setLocalError('名称至少2个字符');
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

    if (confirmPassword.length < 8) {
      setLocalError('确认密码至少8位');
      return;
    }

    if (!/[A-Z]/.test(confirmPassword)) {
      setLocalError('确认密码必须包含大写字母');
      return;
    }

    if (!/[a-z]/.test(confirmPassword)) {
      setLocalError('确认密码必须包含小写字母');
      return;
    }

    if (!/[0-9]/.test(confirmPassword)) {
      setLocalError('确认密码必须包含数字');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('两次输入的密码不一致');
      return;
    }

    setIsLoading(true);

    try {
      await authService.clientRegister({ email, code, password, name });
      navigate('/');
    } catch (err: any) {
      setLocalError(err.response?.data?.message || err.message || '注册失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Captcha Modal */}
      {captchaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 relative">
            <button
              type="button"
              onClick={() => setCaptchaModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-semibold text-gray-900 mb-4">图形验证</h3>
            <p className="text-sm text-gray-500 mb-4">请先完成图形验证，然后我们会发送验证码到您的邮箱</p>

            {captchaImageUrl && (
              <CaptchaVerify
                imageUrl={captchaImageUrl}
                onVerify={handleCaptchaVerify}
                onRefresh={loadCaptcha}
                disabled={isSendingCode}
              />
            )}

            {isSendingCode && (
              <div className="mt-4 text-center text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                发送中...
              </div>
            )}
          </div>
        </div>
      )}

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <div className="w-full max-w-md p-6 sm:p-8 bg-white rounded-2xl shadow-xl">
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
          <p className="text-sm text-gray-500 mb-6">请填写以下信息完成注册</p>

          {localError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {localError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">邮箱地址</label>
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

            {/* Get Verification Code Button */}
            <div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleOpenCaptchaModal}
                disabled={countdown > 0}
              >
                {countdown > 0 ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {countdown} 秒后可重新获取
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    获取邮箱验证码
                  </>
                )}
              </Button>
            </div>

            {/* Email Code Verification Status */}
            {codeVerified && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                验证码验证成功
              </div>
            )}

            {/* Email Code Input */}
            {!codeVerified && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">邮箱验证码</label>
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
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleVerifyCode}
                    disabled={isLoading || code.length !== 6}
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : '验证'}
                  </Button>
                </div>
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
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

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
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

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">确认密码</label>
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

          <p className="mt-6 text-center text-sm text-gray-600">
            已有账号？{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">
              登录
            </Link>
          </p>
        </div>
      </div>
    </>
  );
};

export default Register;
