import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Activity, Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/authStore';

const Login: React.FC = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      // Error is handled by store
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50/50 p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-zinc-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-zinc-300/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8 animate-fade-in-up">
          <div className="w-14 h-14 bg-zinc-900 rounded-2xl flex items-center justify-center shadow-lg">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">{t('login.appName')}</h1>
            <p className="text-sm text-zinc-500">{t('login.appSubtitle')}</p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bento-tile p-8 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <h2 className="text-xl font-semibold text-zinc-900 mb-6">{t('login.title')}</h2>

          {error && (
            <div className="mb-4 p-4 bg-red-50/50 border border-red-200/50 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-700">
                {t('login.email')}
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                  <Mail className="w-5 h-5" />
                </div>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="pl-12 h-12 bg-zinc-50/50 border-zinc-200/50 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-700">
                {t('login.password')}
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                  <Lock className="w-5 h-5" />
                </div>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('login.enterPassword')}
                  required
                  className="pl-12 pr-12 h-12 bg-zinc-50/50 border-zinc-200/50 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Link to="/forgot-password" className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors">
                {t('login.forgotPassword')}
              </Link>
            </div>

            <Button type="submit" className="w-full btn-ice h-12 text-base rounded-xl" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {t('login.loggingIn')}
                </>
              ) : (
                t('login.loginBtn')
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            {t('login.noAccount')}{' '}
            <Link to="/register" className="text-zinc-900 hover:underline font-medium">
              {t('login.register')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
