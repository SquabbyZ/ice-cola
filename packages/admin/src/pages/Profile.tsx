import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../stores/authStore';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { useUpdateProfile, useChangePassword } from '../hooks/useProfile';

const profileSchema = z.object({
  name: z.string().min(2, 'profile.nameMinLength'),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'profile.currentPasswordRequired'),
  newPassword: z.string()
    .min(8, 'profile.passwordMinLength')
    .regex(/[A-Z]/, 'profile.passwordUppercase')
    .regex(/[a-z]/, 'profile.passwordLowercase')
    .regex(/[0-9]/, 'profile.passwordNumber'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'profile.passwordsNotMatch',
  path: ['confirmPassword'],
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

const Profile: React.FC = () => {
  const { t } = useTranslation();
  const { user, setAuth } = useAuthStore();
  const [profileSuccess, setProfileSuccess] = useState('');

  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
    },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  const handleProfileUpdate = async (data: ProfileForm) => {
    setProfileSuccess('');
    try {
      await updateProfile.mutateAsync({ name: data.name });
      // Update local auth state
      if (user) {
        setAuth({ ...user, name: data.name }, localStorage.getItem('adminToken') || '');
      }
      setProfileSuccess(t('profile.updateSuccess'));
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || t('profile.updateFailed'));
    }
  };

  const handlePasswordChange = async (data: PasswordForm) => {
    try {
      await changePassword.mutateAsync({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      passwordForm.reset();
      alert(t('profile.passwordChangeSuccess'));
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || t('profile.passwordChangeFailed'));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">{t('profile.title')}</h2>
        <p className="text-gray-600">{t('profile.subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('profile.basicInfo')}</CardTitle>
          <CardDescription>{t('profile.basicInfoDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={profileForm.handleSubmit(handleProfileUpdate)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('profile.email')}</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500">{t('profile.emailHint')}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">{t('profile.name')}</Label>
              <Input
                id="name"
                type="text"
                placeholder={t('profile.namePlaceholder')}
                {...profileForm.register('name')}
              />
              {profileForm.formState.errors.name && (
                <p className="text-sm text-red-500">
                  {t('profile.nameMinLength')}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t('profile.role')}</Label>
              <Input
                value={user?.role || ''}
                disabled
                className="bg-gray-50"
              />
            </div>
            {profileSuccess && (
              <p className="text-sm text-green-600">{profileSuccess}</p>
            )}
            <Button type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? t('profile.saving') : t('profile.saveProfile')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('profile.changePassword')}</CardTitle>
          <CardDescription>{t('profile.changePasswordDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={passwordForm.handleSubmit(handlePasswordChange)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">{t('profile.currentPassword')}</Label>
              <Input
                id="currentPassword"
                type="password"
                placeholder={t('profile.currentPasswordPlaceholder')}
                {...passwordForm.register('currentPassword')}
              />
              {passwordForm.formState.errors.currentPassword && (
                <p className="text-sm text-red-500">{t('profile.currentPasswordRequired')}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">{t('profile.newPassword')}</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder={t('profile.newPasswordPlaceholder')}
                {...passwordForm.register('newPassword')}
              />
              {passwordForm.formState.errors.newPassword && (
                <p className="text-sm text-red-500">{t('profile.passwordRequirements')}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('profile.confirmPassword')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder={t('profile.confirmPasswordPlaceholder')}
                {...passwordForm.register('confirmPassword')}
              />
              {passwordForm.formState.errors.confirmPassword && (
                <p className="text-sm text-red-500">{t('profile.passwordsNotMatch')}</p>
              )}
            </div>
            <Button type="submit" disabled={changePassword.isPending}>
              {changePassword.isPending ? t('profile.saving') : t('profile.changePasswordBtn')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;