import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Globe } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';

const loginSchema = z.object({
  email: z.string().email('invalidEmail'),
  password: z.string().min(6, 'passwordMinLength'),
});

type LoginForm = z.infer<typeof loginSchema>;

const languages = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'English' },
];

const Login: React.FC = () => {
  const { t, i18n } = useTranslation();
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

  const currentLang = languages.find((l) => l.code === i18n.language) || languages[0];

  const onSubmit = async (data: LoginForm) => {
    try {
      const response = await api.post('/admin/auth/login', data);
      const { user, accessToken } = response.data.data;
      setAuth(user, accessToken);
      navigate('/');
    } catch (error: any) {
      const message = error.response?.data?.message || t('login.loginFailed');
      setError('email', { message });
      setError('password', { message });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('login.title')}</CardTitle>
              <CardDescription>{t('login.subtitle')}</CardDescription>
            </div>
            <div className="relative group">
              <Button variant="ghost" size="icon">
                <Globe className="h-5 w-5" />
              </Button>
              <div className="absolute right-0 top-full mt-1 bg-white rounded-md shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-[100px]">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => i18n.changeLanguage(lang.code)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 first:rounded-t-md last:rounded-b-md ${
                      currentLang.code === lang.code ? 'bg-gray-50 font-medium' : ''
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('login.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('login.emailPlaceholder')}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{t(errors.email.message as string)}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('login.password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t('login.passwordPlaceholder')}
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{t(errors.password.message as string)}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? t('login.signingIn') : t('login.signIn')}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <Button
              type="button"
              variant="link"
              className="text-primary"
              onClick={() => navigate('/forgot-password')}
            >
              {t('login.forgotPassword')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;