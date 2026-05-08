import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Globe, Shield, Mail, Lock, Check, Languages } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Spinner } from '../components/ui/spinner';
import { Input } from '../components/ui/input';
import { PasswordInput } from '../components/ui/password-input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { useConfig, useUpdateConfig } from '../hooks/useConfig';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

const resendConfigSchema = z.object({
  resendApiKey: z.string().min(1, 'settings.apiKeyRequired'),
  resendFromEmail: z.string().email('settings.invalidEmail').or(z.string().length(0)),
});

const captchaConfigSchema = z.object({
  captchaSiteKey: z.string().min(1, 'settings.captchaSiteKeyRequired'),
  captchaSecretKey: z.string().min(1, 'settings.captchaSecretKeyRequired'),
});

const urlConfigSchema = z.object({
  clientUrl: z.string().url('settings.invalidUrl').or(z.string().length(0)),
  adminUrl: z.string().url('settings.invalidUrl').or(z.string().length(0)),
});

const verificationConfigSchema = z.object({
  verificationCodeExpiry: z.string().min(1, 'settings.expiryRequired'),
  verificationCodeLength: z.string().min(1, 'settings.lengthRequired'),
});

type ResendConfigForm = z.infer<typeof resendConfigSchema>;
type CaptchaConfigForm = z.infer<typeof captchaConfigSchema>;
type UrlConfigForm = z.infer<typeof urlConfigSchema>;
type VerificationConfigForm = z.infer<typeof verificationConfigSchema>;

interface SettingsCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  color: 'blue' | 'emerald' | 'purple' | 'amber';
  children: React.ReactNode;
  delay?: number;
}

const SettingsCard: React.FC<SettingsCardProps> = ({
  title,
  description,
  icon: Icon,
  color,
  children,
  delay = 0,
}) => {
  const colorClasses = {
    blue: 'via-blue-500/30',
    emerald: 'via-emerald-500/30',
    purple: 'via-purple-500/30',
    amber: 'via-amber-500/30',
  };

  const iconBgClasses = {
    blue: 'bg-blue-500/10 text-blue-600',
    emerald: 'bg-emerald-500/10 text-emerald-600',
    purple: 'bg-purple-500/10 text-purple-600',
    amber: 'bg-amber-500/10 text-amber-600',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="relative"
    >
      <Card className="border-border/50 bg-card overflow-hidden h-full">
        <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent ${colorClasses[color]} to-transparent`} />
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className={`w-12 h-12 rounded-2xl ${iconBgClasses[color]} flex items-center justify-center`}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            </div>
          </div>
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
};

const ResendConfigForm: React.FC = () => {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [currentKey, setCurrentKey] = useState('');
  const { data: config } = useConfig();
  const updateConfig = useUpdateConfig();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ResendConfigForm>({
    resolver: zodResolver(resendConfigSchema),
  });

  useEffect(() => {
    if (config) {
      setValue('resendApiKey', config.resend_api_key || '');
      setValue('resendFromEmail', config.resend_from_email || '');
      setCurrentKey(config.resend_api_key || '');
    }
  }, [config, setValue]);

  const onSubmit = async (data: ResendConfigForm) => {
    setIsSubmitting(true);
    setSuccessMessage('');
    try {
      await updateConfig.mutateAsync({ key: 'resend_api_key', value: data.resendApiKey });
      if (data.resendFromEmail) {
        await updateConfig.mutateAsync({ key: 'resend_from_email', value: data.resendFromEmail });
      }
      setSuccessMessage(t('settings.resendKeySuccess'));
      setCurrentKey(data.resendApiKey);
    } catch (error: any) {
      alert(error.response?.data?.message || t('settings.updateFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="resendApiKey">{t('settings.resendApiKey')}</Label>
        <PasswordInput
          id="resendApiKey"
          placeholder={t('settings.resendApiKeyPlaceholder')}
          {...register('resendApiKey')}
          className="h-11"
        />
        {errors.resendApiKey && (
          <p className="text-sm text-destructive">{t('settings.apiKeyRequired')}</p>
        )}
        {currentKey && (
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Check className="h-3 w-3 text-emerald-500" />
            {t('settings.currentKeySet')}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="resendFromEmail">{t('settings.resendFromEmail')}</Label>
        <Input
          id="resendFromEmail"
          type="email"
          placeholder={t('settings.resendFromEmailPlaceholder')}
          {...register('resendFromEmail')}
          className="h-11"
        />
        {errors.resendFromEmail && (
          <p className="text-sm text-destructive">{t('settings.invalidEmail')}</p>
        )}
      </div>
      {successMessage && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-emerald-600 flex items-center gap-1"
        >
          <Check className="h-3 w-3" />
          {successMessage}
        </motion.p>
      )}
      <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
        {isSubmitting && <Spinner className="mr-2" />}
        {isSubmitting ? t('settings.saving') : t('settings.saveResendKey')}
      </Button>
    </form>
  );
};

const CaptchaConfigForm: React.FC = () => {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [currentSiteKey, setCurrentSiteKey] = useState('');
  const [currentSecretKey, setCurrentSecretKey] = useState('');
  const { data: config } = useConfig();
  const updateConfig = useUpdateConfig();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CaptchaConfigForm>({
    resolver: zodResolver(captchaConfigSchema),
  });

  useEffect(() => {
    if (config) {
      setValue('captchaSiteKey', config.captcha_site_key || '');
      setValue('captchaSecretKey', config.captcha_secret_key || '');
      setCurrentSiteKey(config.captcha_site_key || '');
      setCurrentSecretKey(config.captcha_secret_key || '');
    }
  }, [config, setValue]);

  const onSubmit = async (data: CaptchaConfigForm) => {
    setIsSubmitting(true);
    setSuccessMessage('');
    try {
      await updateConfig.mutateAsync({ key: 'captcha_site_key', value: data.captchaSiteKey });
      await updateConfig.mutateAsync({ key: 'captcha_secret_key', value: data.captchaSecretKey });
      setSuccessMessage(t('settings.captchaSuccess'));
      setCurrentSiteKey(data.captchaSiteKey);
      setCurrentSecretKey(data.captchaSecretKey);
    } catch (error: any) {
      alert(error.response?.data?.message || t('settings.updateFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="captchaSiteKey">{t('settings.captchaSiteKey')}</Label>
        <Input
          id="captchaSiteKey"
          type="text"
          placeholder={t('settings.captchaSiteKeyPlaceholder')}
          {...register('captchaSiteKey')}
          className="h-11"
        />
        {errors.captchaSiteKey && (
          <p className="text-sm text-destructive">{t('settings.captchaSiteKeyRequired')}</p>
        )}
        {currentSiteKey && (
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Check className="h-3 w-3 text-emerald-500" />
            {t('settings.currentKeySet')}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="captchaSecretKey">{t('settings.captchaSecretKey')}</Label>
        <PasswordInput
          id="captchaSecretKey"
          placeholder={t('settings.captchaSecretKeyPlaceholder')}
          {...register('captchaSecretKey')}
          className="h-11"
        />
        {errors.captchaSecretKey && (
          <p className="text-sm text-destructive">{t('settings.captchaSecretKeyRequired')}</p>
        )}
        {currentSecretKey && (
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Check className="h-3 w-3 text-emerald-500" />
            {t('settings.currentKeySet')}
          </p>
        )}
      </div>
      {successMessage && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-emerald-600 flex items-center gap-1"
        >
          <Check className="h-3 w-3" />
          {successMessage}
        </motion.p>
      )}
      <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
        {isSubmitting && <Spinner className="mr-2" />}
        {isSubmitting ? t('settings.saving') : t('settings.saveCaptcha')}
      </Button>
    </form>
  );
};

const UrlConfigForm: React.FC = () => {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const { data: config } = useConfig();
  const updateConfig = useUpdateConfig();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<UrlConfigForm>({
    resolver: zodResolver(urlConfigSchema),
  });

  useEffect(() => {
    if (config) {
      setValue('clientUrl', config.client_url || '');
      setValue('adminUrl', config.admin_url || '');
    }
  }, [config, setValue]);

  const onSubmit = async (data: UrlConfigForm) => {
    setIsSubmitting(true);
    setSuccessMessage('');
    try {
      if (data.clientUrl) {
        await updateConfig.mutateAsync({ key: 'client_url', value: data.clientUrl });
      }
      if (data.adminUrl) {
        await updateConfig.mutateAsync({ key: 'admin_url', value: data.adminUrl });
      }
      setSuccessMessage(t('settings.urlSuccess'));
    } catch (error: any) {
      alert(error.response?.data?.message || t('settings.updateFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="clientUrl">{t('settings.clientUrl')}</Label>
        <Input
          id="clientUrl"
          type="url"
          placeholder={t('settings.clientUrlPlaceholder')}
          {...register('clientUrl')}
          className="h-11"
        />
        {errors.clientUrl && (
          <p className="text-sm text-destructive">{t('settings.invalidUrl')}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="adminUrl">{t('settings.adminUrl')}</Label>
        <Input
          id="adminUrl"
          type="url"
          placeholder={t('settings.adminUrlPlaceholder')}
          {...register('adminUrl')}
          className="h-11"
        />
        {errors.adminUrl && (
          <p className="text-sm text-destructive">{t('settings.invalidUrl')}</p>
        )}
      </div>
      {successMessage && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-emerald-600 flex items-center gap-1"
        >
          <Check className="h-3 w-3" />
          {successMessage}
        </motion.p>
      )}
      <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
        {isSubmitting && <Spinner className="mr-2" />}
        {isSubmitting ? t('settings.saving') : t('settings.saveUrl')}
      </Button>
    </form>
  );
};

const VerificationConfigForm: React.FC = () => {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const { data: config } = useConfig();
  const updateConfig = useUpdateConfig();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<VerificationConfigForm>({
    resolver: zodResolver(verificationConfigSchema),
  });

  useEffect(() => {
    if (config) {
      setValue('verificationCodeExpiry', config.verification_code_expiry || '');
      setValue('verificationCodeLength', config.verification_code_length || '');
    }
  }, [config, setValue]);

  const onSubmit = async (data: VerificationConfigForm) => {
    setIsSubmitting(true);
    setSuccessMessage('');
    try {
      await updateConfig.mutateAsync({ key: 'verification_code_expiry', value: data.verificationCodeExpiry });
      await updateConfig.mutateAsync({ key: 'verification_code_length', value: data.verificationCodeLength });
      setSuccessMessage(t('settings.verificationSuccess'));
    } catch (error: any) {
      alert(error.response?.data?.message || t('settings.updateFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="verificationCodeExpiry">{t('settings.expiryLabel')}</Label>
        <Input
          id="verificationCodeExpiry"
          type="text"
          placeholder={t('settings.expiryPlaceholder')}
          {...register('verificationCodeExpiry')}
          className="h-11"
        />
        {errors.verificationCodeExpiry && (
          <p className="text-sm text-destructive">{t('settings.expiryRequired')}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="verificationCodeLength">{t('settings.lengthLabel')}</Label>
        <Input
          id="verificationCodeLength"
          type="text"
          placeholder={t('settings.lengthPlaceholder')}
          {...register('verificationCodeLength')}
          className="h-11"
        />
        {errors.verificationCodeLength && (
          <p className="text-sm text-destructive">{t('settings.lengthRequired')}</p>
        )}
      </div>
      {successMessage && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-emerald-600 flex items-center gap-1"
        >
          <Check className="h-3 w-3" />
          {successMessage}
        </motion.p>
      )}
      <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
        {isSubmitting && <Spinner className="mr-2" />}
        {isSubmitting ? t('settings.saving') : t('settings.saveVerification')}
      </Button>
    </form>
  );
};

const LanguageSelector: React.FC = () => {
  const { t, i18n } = useTranslation();

  const languages = [
    { code: 'zh', label: '中文' },
    { code: 'en', label: 'English' },
  ];

  const currentLang = languages.find((l) => l.code === i18n.language) || languages[0];

  return (
    <div className="space-y-2">
      <Label>{t('settings.currentLanguage')}</Label>
      <Select value={i18n.language} onValueChange={(value) => i18n.changeLanguage(value)}>
        <SelectTrigger className="w-full h-11">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          {languages.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              {lang.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-sm text-muted-foreground">
        {t('settings.currentLanguage')}: {currentLang.label}
      </p>
    </div>
  );
};

const Settings: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-8">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4"
      >
        <div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            {t('settings.title')}
          </h2>
          <p className="text-muted-foreground mt-2">
            {t('settings.subtitle')}
          </p>
        </div>
      </motion.div>

      {/* Bento Grid - 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SettingsCard
          title={t('settings.emailProvider')}
          description={t('settings.emailProviderDesc')}
          icon={Mail}
          color="blue"
          delay={0}
        >
          <ResendConfigForm />
        </SettingsCard>

        <SettingsCard
          title={t('settings.captchaProvider')}
          description={t('settings.captchaProviderDesc')}
          icon={Shield}
          color="emerald"
          delay={0.1}
        >
          <CaptchaConfigForm />
        </SettingsCard>

        <SettingsCard
          title={t('settings.urlSettings')}
          description={t('settings.urlSettingsDesc')}
          icon={Globe}
          color="purple"
          delay={0.2}
        >
          <UrlConfigForm />
        </SettingsCard>

        <SettingsCard
          title={t('settings.verificationSettings')}
          description={t('settings.verificationSettingsDesc')}
          icon={Lock}
          color="amber"
          delay={0.3}
        >
          <VerificationConfigForm />
        </SettingsCard>

        <SettingsCard
          title={t('settings.language')}
          description={t('settings.languageDesc')}
          icon={Languages}
          color="blue"
          delay={0.4}
        >
          <LanguageSelector />
        </SettingsCard>
      </div>
    </div>
  );
};

export default Settings;