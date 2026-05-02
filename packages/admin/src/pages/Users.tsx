import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Trash2, UserPlus, Settings2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import api from '../services/api';

const inviteSchema = z.object({
  email: z.string().email('users.invalidEmail'),
  role: z.enum(['ADMIN', 'MEMBER']),
});

type InviteForm = z.infer<typeof inviteSchema>;

interface User {
  id: string;
  email: string;
  name: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  createdAt: string;
}

const InviteUserDialog: React.FC<{ onSuccess?: () => void }> = ({ onSuccess }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      role: 'MEMBER',
    },
  });

  const onSubmit = async (data: InviteForm) => {
    setIsSubmitting(true);
    setSuccessMessage('');
    try {
      await api.post('/admin/auth/invitations', { email: data.email, role: data.role });
      setSuccessMessage(t('users.invitationSent'));
      reset();
      setTimeout(() => {
        setOpen(false);
        setSuccessMessage('');
        onSuccess?.();
      }, 1500);
    } catch (error: any) {
      const message = error.response?.data?.message || t('users.invitationSentFailed');
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          {t('users.sendInvitation')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('users.inviteTitle')}</DialogTitle>
          <DialogDescription>
            {t('users.inviteDesc')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t('users.emailLabel')}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t('users.emailPlaceholder')}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{t('users.invalidEmail')}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">{t('users.roleLabel')}</Label>
            <select
              id="role"
              {...register('role')}
              className="w-full px-3 py-2 border rounded-md bg-white"
            >
              <option value="ADMIN">{t('users.roleAdmin')}</option>
              <option value="MEMBER">{t('users.roleMember')}</option>
            </select>
            {errors.role && (
              <p className="text-sm text-red-500">{t('users.roleRequired')}</p>
            )}
          </div>
          {successMessage && (
            <p className="text-sm text-green-600">{successMessage}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('users.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('users.sending') : t('users.sendInvitationBtn')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const RoleChangeDialog: React.FC<{
  user: User;
  onSuccess?: () => void;
}> = ({ user, onSuccess }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRoleChange = async (newRole: 'ADMIN' | 'MEMBER') => {
    setIsSubmitting(true);
    try {
      await api.put(`/admin/auth/users/${user.id}/role`, { role: newRole });
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      alert(error.response?.data?.message || t('users.roleChangeFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings2 className="h-4 w-4 text-gray-500" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('users.changeRoleTitle')}</DialogTitle>
          <DialogDescription>
            {t('users.changeRoleDesc', { name: user.name || user.email })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Button
            variant={user.role === 'ADMIN' ? 'default' : 'outline'}
            className="w-full justify-start"
            disabled={isSubmitting || user.role === 'ADMIN'}
            onClick={() => handleRoleChange('ADMIN')}
          >
            {t('users.roleAdmin')}
          </Button>
          <Button
            variant={user.role === 'MEMBER' ? 'default' : 'outline'}
            className="w-full justify-start"
            disabled={isSubmitting || user.role === 'MEMBER'}
            onClick={() => handleRoleChange('MEMBER')}
          >
            {t('users.roleMember')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Users: React.FC = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/auth/users');
      setUsers(response.data.data || []);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || t('users.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [t]);

  const handleRemoveUser = async (userId: string, userRole: string) => {
    if (userRole === 'OWNER') {
      alert(t('users.cannotRemoveOwner'));
      return;
    }
    if (!confirm(t('users.confirmRemove'))) {
      return;
    }
    try {
      await api.delete(`/admin/auth/users/${userId}`);
      fetchUsers();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || t('users.removeFailed'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{t('users.title')}</h2>
          <p className="text-gray-600">{t('users.subtitle')}</p>
        </div>
        <InviteUserDialog onSuccess={fetchUsers} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('users.allUsers')}</CardTitle>
          <CardDescription>{t('users.allUsersDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-gray-500">{t('users.loading')}</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : users.length === 0 ? (
            <p className="text-gray-500">{t('users.noUsers')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('users.name')}</TableHead>
                  <TableHead>{t('users.email')}</TableHead>
                  <TableHead>{t('users.role')}</TableHead>
                  <TableHead>{t('users.createdAt')}</TableHead>
                  <TableHead className="text-right">{t('users.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name || '-'}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          user.role === 'OWNER'
                            ? 'bg-purple-100 text-purple-800'
                            : user.role === 'ADMIN'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {user.role === 'OWNER' ? t('users.roleOwner') :
                         user.role === 'ADMIN' ? t('users.roleAdmin') :
                         t('users.roleMember')}
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {user.role !== 'OWNER' && (
                          <>
                            <RoleChangeDialog user={user} onSuccess={fetchUsers} />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveUser(user.id, user.role)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Users;