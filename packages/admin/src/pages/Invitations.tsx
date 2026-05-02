import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">{t('invitations.title')}</h2>
        <p className="text-gray-600">{t('invitations.subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('invitations.pendingInvitations')}</CardTitle>
          <CardDescription>
            {t('invitations.pendingDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-gray-500">{t('invitations.loading')}</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : invitations.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">{t('invitations.noInvitations')}</p>
              <p className="text-sm text-gray-400 mt-1">
                {t('invitations.goToUsers')}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('invitations.email')}</TableHead>
                  <TableHead>{t('invitations.status')}</TableHead>
                  <TableHead>{t('invitations.sentDate')}</TableHead>
                  <TableHead>{t('invitations.expiresAt')}</TableHead>
                  <TableHead className="text-right">{t('invitations.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell className="font-medium">{invitation.email}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">
                        {invitation.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(invitation.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {new Date(invitation.expiresAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeInvitation(invitation.id)}
                        disabled={revokingId === invitation.id}
                      >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        {revokingId === invitation.id ? t('invitations.revoking') : t('invitations.revoke')}
                      </Button>
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

export default Invitations;