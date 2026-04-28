import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import api from '../services/api';

const resendConfigSchema = z.object({
  resendApiKey: z.string().min(1, 'API Key is required'),
});

const verificationConfigSchema = z.object({
  verificationCodeExpiry: z.string().min(1, 'Expiry time is required'),
  verificationCodeLength: z.string().min(1, 'Code length is required'),
});

type ResendConfigForm = z.infer<typeof resendConfigSchema>;
type VerificationConfigForm = z.infer<typeof verificationConfigSchema>;

interface Config {
  RESEND_API_KEY?: string;
  VERIFICATION_CODE_EXPIRY?: string;
  VERIFICATION_CODE_LENGTH?: string;
}

const ResendConfigForm: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [currentKey, setCurrentKey] = useState('');
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ResendConfigForm>({
    resolver: zodResolver(resendConfigSchema),
  });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await api.get('/admin/config');
        const config: Config = response.data.data || {};
        if (config.RESEND_API_KEY) {
          setCurrentKey(config.RESEND_API_KEY);
          setValue('resendApiKey', config.RESEND_API_KEY);
        }
      } catch (error) {
        console.error('Failed to load config:', error);
      }
    };
    fetchConfig();
  }, [setValue]);

  const onSubmit = async (data: ResendConfigForm) => {
    setIsSubmitting(true);
    setSuccessMessage('');
    try {
      await api.put('/admin/config/RESEND_API_KEY', { value: data.resendApiKey });
      setSuccessMessage('Resend API Key updated successfully!');
      setCurrentKey(data.resendApiKey);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update Resend API Key');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="resendApiKey">Resend API Key</Label>
        <Input
          id="resendApiKey"
          type="password"
          placeholder="re_xxxxxx"
          {...register('resendApiKey')}
        />
        {errors.resendApiKey && (
          <p className="text-sm text-red-500">{errors.resendApiKey.message}</p>
        )}
        {currentKey && (
          <p className="text-sm text-gray-500">Current key is set</p>
        )}
      </div>
      {successMessage && (
        <p className="text-sm text-green-600">{successMessage}</p>
      )}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Save Resend API Key'}
      </Button>
    </form>
  );
};

const VerificationConfigForm: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerificationConfigForm>({
    resolver: zodResolver(verificationConfigSchema),
  });

  const onSubmit = async (data: VerificationConfigForm) => {
    setIsSubmitting(true);
    setSuccessMessage('');
    try {
      await api.put('/admin/config/VERIFICATION_CODE_EXPIRY', { value: data.verificationCodeExpiry });
      await api.put('/admin/config/VERIFICATION_CODE_LENGTH', { value: data.verificationCodeLength });
      setSuccessMessage('Verification settings updated successfully!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update verification settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="verificationCodeExpiry">Verification Code Expiry (seconds)</Label>
        <Input
          id="verificationCodeExpiry"
          type="text"
          placeholder="300"
          {...register('verificationCodeExpiry')}
        />
        {errors.verificationCodeExpiry && (
          <p className="text-sm text-red-500">{errors.verificationCodeExpiry.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="verificationCodeLength">Verification Code Length</Label>
        <Input
          id="verificationCodeLength"
          type="text"
          placeholder="6"
          {...register('verificationCodeLength')}
        />
        {errors.verificationCodeLength && (
          <p className="text-sm text-red-500">{errors.verificationCodeLength.message}</p>
        )}
      </div>
      {successMessage && (
        <p className="text-sm text-green-600">{successMessage}</p>
      )}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Save Verification Settings'}
      </Button>
    </form>
  );
};

const Settings: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Settings</h2>
        <p className="text-gray-600">Application settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email Provider</CardTitle>
          <CardDescription>
            Configure the Resend API for sending emails
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResendConfigForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Verification Code Settings</CardTitle>
          <CardDescription>
            Configure verification code generation parameters
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