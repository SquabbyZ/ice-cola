import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Users, Mail, Activity, TrendingUp, Clock, Zap } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Spinner } from '../components/ui/spinner';
import { useDashboardStats } from '../hooks/useDashboardStats';

const MotionCard = motion(Card);

const MetricCard: React.FC<{
  title: string;
  value: number | string;
  description: string;
  icon: React.ElementType;
  trend?: { value: number; label: string };
  delay?: number;
  isLoading?: boolean;
  hasError?: boolean;
}> = ({ title, value, description, icon: Icon, trend, delay = 0, isLoading, hasError }) => {
  return (
    <MotionCard
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden border-border/50 bg-card"
    >
      {/* Subtle gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      {/* Breathing background animation */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent pointer-events-none" />

      <CardContent className="p-6 relative">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Label outside card - Bento style */}
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
              {title}
            </p>

            {isLoading ? (
              <div className="flex items-center gap-2">
                <Spinner className="size-6" />
                <span className="text-3xl font-bold tracking-tight">-</span>
              </div>
            ) : hasError ? (
              <p className="text-3xl font-bold tracking-tight text-destructive">-</p>
            ) : (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-4xl font-bold tracking-tight text-foreground"
              >
                {typeof value === 'number' ? value.toLocaleString() : value}
              </motion.p>
            )}

            <p className="text-sm text-muted-foreground mt-2">{description}</p>

            {trend && !isLoading && !hasError && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: delay + 0.2 }}
                className="flex items-center gap-1.5 mt-3"
              >
                <span className={`
                  inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                  ${trend.value >= 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}
                `}>
                  <TrendingUp className={`h-3 w-3 ${trend.value < 0 ? 'rotate-180' : ''}`} />
                  {Math.abs(trend.value)}%
                </span>
                <span className="text-xs text-muted-foreground">{trend.label}</span>
              </motion.div>
            )}
          </div>

          {/* Icon container with hover effect */}
          <motion.div
            whileHover={{ scale: 1.05, rotate: 3 }}
            whileTap={{ scale: 0.95 }}
            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center shrink-0 border border-primary/10"
          >
            <Icon className="h-6 w-6 text-primary" />
          </motion.div>
        </div>

        {/* Animated border glow on hover */}
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <div className="absolute inset-0 rounded-2xl border-2 border-primary/20" />
        </motion.div>
      </CardContent>
    </MotionCard>
  );
};

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { data: stats, isLoading, error } = useDashboardStats();

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-8">
      {/* Page Header - Left aligned, asymmetric */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4"
      >
        <div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            {t('dashboard.title')}
          </h2>
          <p className="text-muted-foreground mt-2 max-w-[500px]">
            {t('dashboard.subtitle')}
          </p>
        </div>

        {/* Quick action button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="self-start md:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-shadow"
        >
          <Zap className="h-4 w-4" />
          {t('dashboard.quickAction')}
        </motion.button>
      </motion.div>

      {/* Bento Grid - Asymmetric layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Main stat cards */}
        <MetricCard
          title={t('dashboard.totalUsers')}
          value={stats?.totalUsers ?? 0}
          description={t('dashboard.totalUsersDesc')}
          icon={Users}
          delay={0}
          isLoading={isLoading}
          hasError={!!error}
        />

        <MetricCard
          title={t('dashboard.pendingInvitations')}
          value={stats?.pendingInvitations ?? 0}
          description={t('dashboard.pendingInvitationsDesc')}
          icon={Mail}
          delay={0.1}
          isLoading={isLoading}
          hasError={!!error}
        />

        <MetricCard
          title={t('dashboard.activeSessions')}
          value={stats?.activeSessions ?? 0}
          description={t('dashboard.activeSessionsDesc')}
          icon={Activity}
          delay={0.2}
          isLoading={isLoading}
          hasError={!!error}
          trend={{ value: 12, label: t('dashboard.thisWeek') }}
        />

        {/* Wide card - Activity timeline */}
        <MotionCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="md:col-span-2 lg:col-span-3 relative overflow-hidden border-border/50 bg-card"
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                  {t('dashboard.recentActivity')}
                </p>
                <h3 className="text-lg font-semibold text-foreground">{t('dashboard.activityTitle')}</h3>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {t('dashboard.lastUpdated')}
              </div>
            </div>

            {/* Activity timeline */}
            <div className="space-y-4">
              {[
                { time: '2 min ago', action: 'New user registered', user: 'Mia Hoffmann' },
                { time: '15 min ago', action: 'Invitation sent', user: 'chenwei@techcorp.cn' },
                { time: '1 hour ago', action: 'Settings updated', user: 'Admin' },
                { time: '3 hours ago', action: 'New marketplace listing', user: 'Elena Rodriguez' },
              ].map((activity, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="flex items-center gap-4"
                >
                  {/* Timeline dot */}
                  <div className="relative">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-2.5 h-2.5 rounded-full bg-primary"
                    />
                    {index < 3 && (
                      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-px h-8 bg-border" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex items-center justify-between gap-4 py-2 px-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{activity.action}</p>
                      <p className="text-xs text-muted-foreground truncate">{activity.user}</p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{activity.time}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </MotionCard>

        {/* Quick stats - smaller cards */}
        <MotionCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden border-border/50 bg-card"
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
          <CardContent className="p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
              {t('dashboard.conversionRate')}
            </p>
            {isLoading ? (
              <Spinner className="size-6" />
            ) : (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-3xl font-bold tracking-tight text-foreground"
              >
                47.2%
              </motion.p>
            )}
            <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '47.2%' }}
                transition={{ delay: 0.6, duration: 1, ease: [0.16, 1, 0.3, 1] }}
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
              />
            </div>
          </CardContent>
        </MotionCard>

        <MotionCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden border-border/50 bg-card"
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-rose-500/30 to-transparent" />
          <CardContent className="p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
              {t('dashboard.pendingApprovals')}
            </p>
            {isLoading ? (
              <Spinner className="size-6" />
            ) : (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-3xl font-bold tracking-tight text-foreground"
              >
                8
              </motion.p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              {t('dashboard.awaitingReview')}
            </p>
          </CardContent>
        </MotionCard>

        <MotionCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden border-border/50 bg-card"
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
          <CardContent className="p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
              {t('dashboard.responseTime')}
            </p>
            {isLoading ? (
              <Spinner className="size-6" />
            ) : (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-3xl font-bold tracking-tight text-foreground"
              >
                2.4s
              </motion.p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              {t('dashboard.avgResolution')}
            </p>
          </CardContent>
        </MotionCard>
      </div>
    </div>
  );
};

export default Dashboard;