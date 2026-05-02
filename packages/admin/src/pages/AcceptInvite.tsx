import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import api from '../services/api';

const registerSchema = z.object({
  name: z.string().min(2, 'acceptInvite.nameMinLength'),
  password: z.string().min(6, 'acceptInvite.passwordMinLength'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'acceptInvite.passwordsNotMatch',
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

interface InvitationInfo {
  email: string;
  expiresAt: string;
}

const AcceptInvite: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [invitationInfo, setInvitationInfo] = useState<InvitationInfo | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setIsValidToken(false);
        setIsLoading(false);
        return;
      }

      try {
        const response = await api.get('/admin/auth/invitations');
        const invitations = response.data.data || [];
        const invitation = invitations.find(
          (inv: any) => inv.token === token && inv.status === 'pending'
        );

        if (invitation) {
          setIsValidToken(true);
          setInvitationInfo({
            email: invitation.email,
            expiresAt: invitation.expiresAt,
          });
        } else {
          setIsValidToken(false);
        }
      } catch (error) {
        setIsValidToken(true);
      } finally {
        setIsLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const onSubmit = async (data: RegisterForm) => {
    if (!token) return;

    setIsRegistering(true);
    try {
      await api.post('/admin/auth/invitations/accept', {
        token,
        name: data.name,
        password: data.password,
      });
      setRegisterSuccess(true);
    } catch (error: any) {
      alert(error.response?.data?.message || t('acceptInvite.acceptFailed'));
    } finally {
      setIsRegistering(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-500">{t('acceptInvite.verifying')}</p>
      </div>
    );
  }

  if (!token || isValidToken === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t('acceptInvite.invalidTitle')}</CardTitle>
            <CardDescription>
              {t('acceptInvite.invalidDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              {t('acceptInvite.contactAdmin')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (registerSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t('acceptInvite.successTitle')}</CardTitle>
            <CardDescription>
              {t('acceptInvite.successDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              {t('acceptInvite.goToLogin')}
            </p>
            <Button onClick={() => (window.location.href = '/login')} className="w-full">
              {t('acceptInvite.goToLogin')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('acceptInvite.title')}</CardTitle>
          <CardDescription>
            {t('acceptInvite.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invitationInfo && (
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">
                {t('acceptInvite.invitationSentTo')}: <strong>{invitationInfo.email}</strong>
              </p>
              <p className="text-xs text-gray-400">
                {t('acceptInvite.expiresAt')}: {new Date(invitationInfo.expiresAt).toLocaleDateString()}
              </p>
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('acceptInvite.nameLabel')}</Label>
              <Input
                id="name"
                type="text"
                placeholder={t('acceptInvite.namePlaceholder')}
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{t('acceptInvite.nameMinLength')}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('acceptInvite.passwordLabel')}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t('acceptInvite.passwordPlaceholder')}
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{t('acceptInvite.passwordMinLength')}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('acceptInvite.confirmPasswordLabel')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder={t('acceptInvite.confirmPasswordPlaceholder')}
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">{t('acceptInvite.passwordsNotMatch')}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isRegistering}>
              {isRegistering ? t('acceptInvite.accepting') : t('acceptInvite.acceptInvite')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvite;