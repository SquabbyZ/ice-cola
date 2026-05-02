import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { useConfig, useUpdateConfig } from '../hooks/useConfig';

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
        <Input
          id="resendApiKey"
          type="password"
          placeholder={t('settings.resendApiKeyPlaceholder')}
          {...register('resendApiKey')}
        />
        {errors.resendApiKey && (
          <p className="text-sm text-red-500">{t('settings.apiKeyRequired')}</p>
        )}
        {currentKey && (
          <p className="text-sm text-gray-500">{t('settings.currentKeySet')}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="resendFromEmail">{t('settings.resendFromEmail')}</Label>
        <Input
          id="resendFromEmail"
          type="email"
          placeholder={t('settings.resendFromEmailPlaceholder')}
          {...register('resendFromEmail')}
        />
        {errors.resendFromEmail && (
          <p className="text-sm text-red-500">{t('settings.invalidEmail')}</p>
        )}
      </div>
      {successMessage && (
        <p className="text-sm text-green-600">{successMessage}</p>
      )}
      <Button type="submit" disabled={isSubmitting}>
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
        />
        {errors.captchaSiteKey && (
          <p className="text-sm text-red-500">{t('settings.captchaSiteKeyRequired')}</p>
        )}
        {currentSiteKey && (
          <p className="text-sm text-gray-500">{t('settings.currentKeySet')}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="captchaSecretKey">{t('settings.captchaSecretKey')}</Label>
        <Input
          id="captchaSecretKey"
          type="password"
          placeholder={t('settings.captchaSecretKeyPlaceholder')}
          {...register('captchaSecretKey')}
        />
        {errors.captchaSecretKey && (
          <p className="text-sm text-red-500">{t('settings.captchaSecretKeyRequired')}</p>
        )}
        {currentSecretKey && (
          <p className="text-sm text-gray-500">{t('settings.currentKeySet')}</p>
        )}
      </div>
      {successMessage && (
        <p className="text-sm text-green-600">{successMessage}</p>
      )}
      <Button type="submit" disabled={isSubmitting}>
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
        />
        {errors.clientUrl && (
          <p className="text-sm text-red-500">{t('settings.invalidUrl')}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="adminUrl">{t('settings.adminUrl')}</Label>
        <Input
          id="adminUrl"
          type="url"
          placeholder={t('settings.adminUrlPlaceholder')}
          {...register('adminUrl')}
        />
        {errors.adminUrl && (
          <p className="text-sm text-red-500">{t('settings.invalidUrl')}</p>
        )}
      </div>
      {successMessage && (
        <p className="text-sm text-green-600">{successMessage}</p>
      )}
      <Button type="submit" disabled={isSubmitting}>
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
        />
        {errors.verificationCodeExpiry && (
          <p className="text-sm text-red-500">{t('settings.expiryRequired')}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="verificationCodeLength">{t('settings.lengthLabel')}</Label>
        <Input
          id="verificationCodeLength"
          type="text"
          placeholder={t('settings.lengthPlaceholder')}
          {...register('verificationCodeLength')}
        />
        {errors.verificationCodeLength && (
          <p className="text-sm text-red-500">{t('settings.lengthRequired')}</p>
        )}
      </div>
      {successMessage && (
        <p className="text-sm text-green-600">{successMessage}</p>
      )}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? t('settings.saving') : t('settings.saveVerification')}
      </Button>
    </form>
  );
};

const Settings: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">{t('settings.title')}</h2>
        <p className="text-gray-600">{t('settings.subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.emailProvider')}</CardTitle>
          <CardDescription>
            {t('settings.emailProviderDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResendConfigForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.captchaProvider')}</CardTitle>
          <CardDescription>
            {t('settings.captchaProviderDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CaptchaConfigForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.urlSettings')}</CardTitle>
          <CardDescription>
            {t('settings.urlSettingsDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UrlConfigForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.verificationSettings')}</CardTitle>
          <CardDescription>
            {t('settings.verificationSettingsDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VerificationConfigForm />
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;