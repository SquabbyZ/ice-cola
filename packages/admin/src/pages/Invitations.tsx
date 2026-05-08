import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Clock, AlertCircle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Spinner } from '../components/ui/spinner';
import { Card, CardContent } from '../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import api from '../services/api';

interface Invitation {
  id: string;
  email: string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  createdAt: string;
  expiresAt: string;
}

const StatusBadge: React.FC<{ status: Invitation['status'] }> = ({ status }) => {
  const config = {
    PENDING: { class: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: Clock, label: 'Pending' },
    ACCEPTED: { class: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: CheckCircle, label: 'Accepted' },
    EXPIRED: { class: 'bg-muted text-muted-foreground border-muted', icon: XCircle, label: 'Expired' },
    REVOKED: { class: 'bg-rose-500/10 text-rose-600 border-rose-500/20', icon: XCircle, label: 'Revoked' },
  };

  const { class: className, icon: Icon, label } = config[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${className}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
};

const Invitations: React.FC = () => {
  const { t } = useTranslation();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchInvitations = async () => {
    try {
      const response = await api.get('/admin/auth/invitations');
      const allInvitations = response.data.data || [];
      setInvitations(allInvitations.filter((inv: Invitation) => inv.status === 'PENDING'));
    } catch (error: any) {
      setError(error.response?.data?.message || t('invitations.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!confirm(t('invitations.confirmRevoke'))) {
      return;
    }
    setRevokingId(invitationId);
    try {
      await api.delete(`/admin/auth/invitations/${invitationId}`);
      fetchInvitations();
    } catch (error: any) {
      alert(error.response?.data?.message || t('invitations.revokeFailed'));
    } finally {
      setRevokingId(null);
    }
  };

  const pendingCount = invitations.length;
  const expiredCount = 0;

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
            {t('invitations.title')}
          </h2>
          <p className="text-muted-foreground mt-2">
            {t('invitations.subtitle')}
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={fetchInvitations}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-foreground font-medium text-sm hover:bg-muted transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </motion.button>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-card border border-border/50 p-5 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('invitations.pending')}
              </p>
              <p className="text-2xl font-bold tracking-tight text-foreground mt-1">
                {pendingCount}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl bg-card border border-border/50 p-5 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('invitations.accepted')}
              </p>
              <p className="text-2xl font-bold tracking-tight text-foreground mt-1">
                0
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl bg-card border border-border/50 p-5 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-muted to-transparent" />
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t('invitations.expired')}
              </p>
              <p className="text-2xl font-bold tracking-tight text-foreground mt-1">
                {expiredCount}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Invitations List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Card className="border-border/50 bg-card overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Spinner className="size-8" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                </div>
                <p className="text-lg font-medium text-destructive">{error}</p>
                <Button variant="outline" className="mt-4" onClick={fetchInvitations}>
                  Try Again
                </Button>
              </div>
            ) : invitations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <Mail className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-lg font-medium text-foreground">{t('invitations.noInvitations')}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('invitations.goToUsers')}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/50 hover:bg-transparent">
                    <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground py-4 px-6">
                      {t('invitations.email')}
                    </TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground py-4 px-6">
                      {t('invitations.status')}
                    </TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground py-4 px-6">
                      {t('invitations.sentDate')}
                    </TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground py-4 px-6">
                      {t('invitations.expiresAt')}
                    </TableHead>
                    <TableHead className="text-right text-xs font-medium uppercase tracking-wider text-muted-foreground py-4 px-6">
                      {t('invitations.actions')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {invitations.map((invitation, index) => (
                      <motion.tr
                        key={invitation.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: index * 0.05 }}
                        className="group border-b border-border/30 hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center shrink-0">
                              <Mail className="h-5 w-5 text-primary-foreground" />
                            </div>
                            <span className="text-sm font-medium text-foreground">
                              {invitation.email}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          <StatusBadge status={invitation.status} />
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          <span className="text-sm text-muted-foreground">
                            {new Date(invitation.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          <span className="text-sm text-muted-foreground">
                            {new Date(invitation.expiresAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </TableCell>
                        <TableCell className="py-4 px-6 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevokeInvitation(invitation.id)}
                            disabled={revokingId === invitation.id}
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                          >
                            {revokingId === invitation.id ? (
                              <>
                                <Spinner className="size-4 mr-1" />
                                {t('invitations.revoking')}
                              </>
                            ) : (
                              <>
                                <XCircle className="size-4 mr-1" />
                                {t('invitations.revoke')}
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Invitations;