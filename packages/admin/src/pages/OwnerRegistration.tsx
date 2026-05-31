import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Globe, Mail, Lock, User, ArrowRight, Shield } from 'lucide-react';
import { Spinner } from '../components/ui/spinner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { PasswordInput } from '../components/ui/password-input';
import { Label } from '../components/ui/label';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../components/ui/dropdown-menu';
import { useAuthStore } from '../stores/authStore';
import { useToast } from '../components/ui/toast';
import api from '../services/api';
import FloatingLines from '../components/FloatingLines';

const registerSchema = z.object({
  email: z.string().email('invalidEmail'),
  password: z.string().min(8, 'passwordMinLength')
    .regex(/[A-Z]/, 'passwordUppercase')
    .regex(/[a-z]/, 'passwordLowercase')
    .regex(/[0-9]/, 'passwordNumber'),
  name: z.string().min(1, 'nameRequired'),
});

type RegisterForm = z.infer<typeof registerSchema>;

const languages = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'English' },
];

const OwnerRegistration: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const currentLang = languages.find((l) => l.code === i18n.language) || languages[0];

  const onSubmit = async (data: RegisterForm) => {
    try {
      const response = await api.post('/admin/auth/register', data);
      const { user, accessToken } = response.data.data;
      setAuth(user, accessToken);
      toast(t('register.success'), 'success');
      navigate('/');
    } catch (error: any) {
      const message = error.response?.data?.message || t('register.failed');
      toast(message, 'error');
    }
  };

  return (
    <div className="min-h-[100dvh] relative">
      {/* Full page FloatingLines background */}
      <div className="absolute inset-0 z-0">
        <FloatingLines
          enabledWaves={['top', 'middle', 'bottom']}
          lineCount={[8, 12, 16]}
          lineDistance={[10, 8, 6]}
          animationSpeed={0.6}
          mouseDamping={0.04}
          interactive={true}
          parallax={true}
          parallaxStrength={0.15}
          linesGradient={['#1e3a5f', '#4c1d95', '#831843', '#164e63']}
        />
      </div>

      {/* Page content */}
      <div className="relative z-10 min-h-[100dvh] flex">
        {/* Left side - Branding (hidden on mobile) */}
        <div className="hidden lg:flex lg:w-1/2 xl:w-[45%] relative">
          <div className="flex flex-col justify-center px-16 xl:px-24">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-center gap-4 mb-12">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20 backdrop-blur-sm">
                  <span className="text-primary-foreground font-bold text-xl">IC</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-white">Ice Cola</h1>
                  <p className="text-sm text-white/60">Admin Console</p>
                </div>
              </div>

              <h2 className="text-4xl xl:text-5xl font-bold tracking-tight text-white leading-[1.1] mb-6">
                {t('register.brandingTitle')}
              </h2>

              <p className="text-lg text-white/70 max-w-md leading-relaxed">
                {t('register.brandingSubtitle')}
              </p>

              <div className="mt-12 space-y-4">
                {[
                  t('login.featureUserManagement'),
                  t('login.featureAccessControl'),
                  t('login.featureAIConfig'),
                  t('login.featureMarketplace'),
                ].map((feature, index) => (
                  <motion.div
                    key={feature}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <Shield className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span className="text-sm text-white/80">{feature}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Right side - Registration form */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md"
          >
            <div className="backdrop-blur-2xl bg-background/30 border border-white/20 rounded-3xl shadow-2xl shadow-primary/5 p-8 sm:p-10">
              {/* Mobile logo */}
              <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">IC</span>
                </div>
                <span className="text-lg font-semibold text-foreground">Ice Cola</span>
              </div>

              {/* Header */}
              <div className="text-center lg:text-left mb-8">
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  {t('register.title')}
                </h2>
                <p className="text-white/60 mt-2">
                  {t('register.subtitle')}
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-white/90">{t('register.name')}</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50" />
                    <Input
                      id="name"
                      type="text"
                      placeholder={t('register.namePlaceholder')}
                      {...register('name')}
                      className="pl-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder:text-white/40"
                    />
                  </div>
                  {errors.name && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-destructive"
                    >
                      {t(errors.name.message as string)}
                    </motion.p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white/90">{t('login.email')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50" />
                    <Input
                      id="email"
                      type="email"
                      placeholder={t('login.emailPlaceholder')}
                      {...register('email')}
                      className="pl-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder:text-white/40"
                    />
                  </div>
                  {errors.email && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-destructive"
                    >
                      {t(errors.email.message as string)}
                    </motion.p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white/90">{t('login.password')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50" />
                    <PasswordInput
                      id="password"
                      placeholder={t('register.passwordPlaceholder')}
                      {...register('password')}
                      className="pl-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder:text-white/40"
                    />
                  </div>
                  {errors.password && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-destructive"
                    >
                      {t(errors.password.message as string)}
                    </motion.p>
                  )}
                </div>

                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <Button
                    type="submit"
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-medium shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-shadow"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Spinner className="mr-2" />
                        {t('register.creating')}
                      </>
                    ) : (
                      <>
                        {t('register.createOwner')}
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </motion.div>
              </form>

              {/* Language selector */}
              <div className="mt-8 flex items-center justify-between">
                <div className="text-sm text-white/50">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-2 text-white/60 hover:text-white">
                        <Globe className="h-4 w-4" />
                        {currentLang.label}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="min-w-[100px] bg-background/80 backdrop-blur-sm border border-white/20">
                      {languages.map((lang) => (
                        <DropdownMenuItem
                          key={lang.code}
                          onClick={() => i18n.changeLanguage(lang.code)}
                          className={
                            currentLang.code === lang.code
                              ? 'bg-white/10 font-medium text-white'
                              : 'text-white/70'
                          }
                        >
                          {lang.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <p className="text-xs text-white/40">
                  {t('login.termsAgree')}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default OwnerRegistration;
