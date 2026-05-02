import React from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Mail, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useDashboardStats } from '../hooks/useDashboardStats';

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { data: stats, isLoading, error } = useDashboardStats();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">{t('dashboard.title')}</h2>
        <p className="text-gray-600">{t('dashboard.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.totalUsers')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-8 w-16 bg-gray-200 rounded"></div>
              </div>
            ) : error ? (
              <p className="text-3xl font-bold text-red-500">-</p>
            ) : (
              <p className="text-3xl font-bold">{stats?.totalUsers ?? 0}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {t('dashboard.totalUsersDesc')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.pendingInvitations')}</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-8 w-16 bg-gray-200 rounded"></div>
              </div>
            ) : error ? (
              <p className="text-3xl font-bold text-red-500">-</p>
            ) : (
              <p className="text-3xl font-bold">{stats?.pendingInvitations ?? 0}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {t('dashboard.pendingInvitationsDesc')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.activeSessions')}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-8 w-16 bg-gray-200 rounded"></div>
              </div>
            ) : error ? (
              <p className="text-3xl font-bold text-red-500">-</p>
            ) : (
              <p className="text-3xl font-bold">{stats?.activeSessions ?? 0}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {t('dashboard.activeSessionsDesc')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;