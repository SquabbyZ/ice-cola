import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, UserPlus, Settings2, Crown, Search, Filter, Shield, User } from 'lucide-react';
import { Spinner } from '../components/ui/spinner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';

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
    control,
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
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm shadow-lg shadow-primary/20"
        >
          <UserPlus className="h-4 w-4" />
          {t('users.sendInvitation')}
        </motion.button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('users.inviteTitle')}</DialogTitle>
          <DialogDescription>
            {t('users.inviteDesc')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">{t('users.emailLabel')}</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@company.com"
              {...register('email')}
              className="h-11"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{t('users.invalidEmail')}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">{t('users.roleLabel')}</Label>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full h-11">
                    <SelectValue placeholder={t('users.roleLabel')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        {t('users.roleAdmin')}
                      </div>
                    </SelectItem>
                    <SelectItem value="MEMBER">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {t('users.roleMember')}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.role && (
              <p className="text-sm text-destructive">{t('users.roleRequired')}</p>
            )}
          </div>
          {successMessage && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-emerald-600"
            >
              {successMessage}
            </motion.p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('users.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner className="mr-2" />}
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
  canChange: boolean;
  children?: React.ReactNode;
}> = ({ user, onSuccess, canChange, children }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!canChange) return null;

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
        {children || (
          <Button variant="ghost" size="icon" className="hover:bg-muted">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('users.changeRoleTitle')}</DialogTitle>
          <DialogDescription>
            {t('users.changeRoleDesc', { name: user.name || user.email })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-4">
          <Button
            variant={user.role === 'ADMIN' ? 'default' : 'outline'}
            className="w-full justify-start h-12"
            disabled={isSubmitting || user.role === 'ADMIN'}
            onClick={() => handleRoleChange('ADMIN')}
          >
            <Shield className="mr-3 h-5 w-5" />
            {t('users.roleAdmin')}
          </Button>
          <Button
            variant={user.role === 'MEMBER' ? 'default' : 'outline'}
            className="w-full justify-start h-12"
            disabled={isSubmitting || user.role === 'MEMBER'}
            onClick={() => handleRoleChange('MEMBER')}
          >
            <User className="mr-3 h-5 w-5" />
            {t('users.roleMember')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const TransferOwnerDialog: React.FC<{
  user: User;
  onSuccess?: () => void;
  children?: React.ReactNode;
}> = ({ user, onSuccess, children }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTransfer = async () => {
    setIsSubmitting(true);
    try {
      await api.put(`/admin/auth/users/${user.id}/transfer-owner`);
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      alert(error.response?.data?.message || t('users.transferFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon" className="hover:bg-amber-500/10">
            <Crown className="h-4 w-4 text-amber-500" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('users.transferOwnerTitle')}</DialogTitle>
          <DialogDescription>
            {t('users.transferOwnerDesc', { name: user.name || user.email })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t('users.cancel')}
          </Button>
          <Button variant="default" onClick={handleTransfer} disabled={isSubmitting}>
            {t('users.confirmTransfer')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Users: React.FC = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; userId?: string; userRole?: string }>({ open: false });
  const currentUser = useAuthStore((state) => state.user);
  const isOwner = currentUser?.role === 'OWNER';
  const isAdmin = currentUser?.role === 'ADMIN' || isOwner;

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
    setConfirmDelete({ open: true, userId, userRole });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete.userId) return;
    try {
      await api.delete(`/admin/auth/users/${confirmDelete.userId}`);
      setConfirmDelete({ open: false });
      fetchUsers();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || t('users.removeFailed'));
      setConfirmDelete({ open: false });
    }
  };

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.name?.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    );
  });

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
            {t('users.title')}
          </h2>
          <p className="text-muted-foreground mt-2">
            {t('users.subtitle')}
          </p>
        </div>
        {isAdmin && <InviteUserDialog onSuccess={fetchUsers} />}
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 rounded-xl bg-card border-border"
          />
        </div>
        <Button variant="outline" className="h-12 px-4 rounded-xl gap-2">
          <Filter className="h-4 w-4" />
          Filters
        </Button>
      </motion.div>

      {/* Users List */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col gap-2"
      >
        <AnimatePresence mode="popLayout">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner className="size-8" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-destructive">{error}</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mb-4">
                <User className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-lg font-semibold text-foreground">{t('users.noUsers')}</p>
              <p className="text-sm text-muted-foreground mt-1">{t('users.noUsersDesc')}</p>
            </div>
          ) : (
            filteredUsers.map((user, index) => (
              <motion.div
                key={user.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.03 }}
                className="group relative"
              >
                <Card className="h-14 border-border/40 bg-card hover:bg-card/80 overflow-hidden transition-all duration-150">
                  <CardContent className="p-0 h-full">
                    <div className="flex items-center h-full px-4 relative">
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        user.role === 'OWNER' ? 'bg-amber-100 text-amber-700' :
                        user.role === 'ADMIN' ? 'bg-violet-100 text-violet-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        <span className="text-sm font-bold">
                          {(user.name || user.email)[0].toUpperCase()}
                        </span>
                      </div>

                      {/* Name & Email */}
                      <div className="ml-4 flex-1 min-w-0 flex items-center">
                        <div>
                          <p className="text-sm font-medium text-foreground truncate">
                            {user.name || 'Unnamed'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>

                      {/* Role as large background watermark */}
                      <div className={`absolute right-4 top-1/2 -translate-y-1/2 opacity-10 ${
                        user.role === 'OWNER' ? 'text-amber-500' :
                        user.role === 'ADMIN' ? 'text-violet-500' :
                        'text-slate-500'
                      }`}>
                        <div className="flex items-center gap-2">
                          {user.role === 'OWNER' ? <Crown className="w-14 h-14" strokeWidth={1.5} /> :
                           user.role === 'ADMIN' ? <Shield className="w-14 h-14" strokeWidth={1.5} /> :
                           <User className="w-14 h-14" strokeWidth={1.5} />}
                          <span className="text-2xl font-bold tracking-wider">
                            {t(user.role === 'OWNER' ? 'users.roleOwner' : user.role === 'ADMIN' ? 'users.roleAdmin' : 'users.roleMember')}
                          </span>
                        </div>
                      </div>

                      {/* Actions - right side, shown on hover */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0 z-10">
                        {user.role !== 'OWNER' && isAdmin && (
                          <>
                            <RoleChangeDialog user={user} onSuccess={fetchUsers} canChange={isAdmin}>
                              <Button variant="ghost" size="icon" className="hover:bg-muted" title={t('users.changeRole')}>
                                <Settings2 className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </RoleChangeDialog>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveUser(user.id, user.role)}
                              className="hover:bg-red-50 hover:text-red-500 h-8 w-8"
                              title={t('users.remove')}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                            {isOwner && (
                              <TransferOwnerDialog user={user} onSuccess={fetchUsers}>
                                <Button variant="ghost" size="icon" className="hover:bg-amber-500/10" title={t('users.transferOwner')}>
                                  <Crown className="h-4 w-4 text-amber-500" />
                                </Button>
                              </TransferOwnerDialog>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={confirmDelete.open} onOpenChange={(open) => setConfirmDelete({ open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('users.remove')}</DialogTitle>
            <DialogDescription>
              {t('users.confirmRemove')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete({ open: false })}>
              {t('users.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              {t('users.remove')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Users;
