import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileText,
  BarChart3,
  Mail,
  Calendar,
  ArrowUpRight,
  Sparkles,
  Puzzle,
  Zap,
  Clock,
  MessageSquare,
} from 'lucide-react';
import { useGateway } from '@/hooks/useGateway';
import { useUsageStore } from '@/stores/usage';
import { useQuotaStore } from '@/stores/quota';
import { useExpertStore } from '@/stores/experts';
import { QuotaProgressBar } from '@/components/QuotaProgressBar';

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  useGateway({ autoConnect: true });

  const { stats, refreshAllStats } = useUsageStore();
  const { loadConfig, refreshStatus } = useQuotaStore();
  const { prompts: experts, loadPrompts } = useExpertStore();

  const [isLoading, setIsLoading] = useState(true);

  const activeSessions = isLoading ? 0 : stats.month.requestCount;
  const skillCount = isLoading ? 0 : experts.length;

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          refreshAllStats(),
          loadConfig(),
          refreshStatus(),
          loadPrompts(),
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const workspaceActions = [
    {
      title: t('dashboard.workspace.docProcessing'),
      desc: t('dashboard.workspace.docProcessingDesc'),
      icon: FileText,
      action: t('dashboard.workspace.launchTool'),
    },
    {
      title: t('dashboard.workspace.dataAnalysis'),
      desc: t('dashboard.workspace.dataAnalysisDesc'),
      icon: BarChart3,
      action: t('dashboard.workspace.launchTool'),
    },
    {
      title: t('dashboard.workspace.emailAssistant'),
      desc: t('dashboard.workspace.emailAssistantDesc'),
      icon: Mail,
      action: t('dashboard.workspace.launchTool'),
    },
    {
      title: t('dashboard.workspace.scheduleManagement'),
      desc: t('dashboard.workspace.scheduleManagementDesc'),
      icon: Calendar,
      action: t('dashboard.workspace.launchTool'),
    },
  ];

  return (
    <div className="flex-1 bg-gradient-to-br from-zinc-50 via-zinc-50/80 to-zinc-100/50 overflow-y-auto">
      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
        {/* Welcome Section - Bento Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-8">
          {/* Welcome Banner - Large Tile with refined design */}
          <div className="lg:col-span-3 bento-tile p-5 lg:p-6 relative overflow-hidden animate-fade-in-up">
            {/* Background with subtle gradient mesh */}
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-900/5 via-zinc-900/2 to-transparent" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-mint/5 rounded-full blur-[60px] -translate-y-1/4 translate-x-1/4" />

            <div className="relative flex flex-col h-full">
              {/* Hero typography - single line title */}
              <div className="mb-auto">
                {isLoading ? (
                  <>
                    <Skeleton className="h-10 w-64 mb-2 rounded" />
                    <Skeleton className="h-6 w-48 rounded" />
                  </>
                ) : (
                  <>
                    <h1 className="text-3xl lg:text-[2rem] font-bold tracking-tight leading-tight mb-2">
                      <span className="text-zinc-900">{t('dashboard.welcomeTitle')}</span>
                      <span className="text-gradient bg-gradient-to-r from-zinc-600 via-zinc-500 to-zinc-400 bg-clip-text">
                        {t('dashboard.welcomeTitleGradient')}
                      </span>
                    </h1>

                    <p className="text-sm text-zinc-500 leading-relaxed">
                      {t('dashboard.welcomeSubtitle')}
                    </p>
                  </>
                )}
              </div>

              {/* Action buttons - fixed at bottom */}
              {isLoading ? (
                <div className="flex items-center gap-3 mt-6">
                  <Skeleton className="h-9 w-32 rounded-xl" />
                  <Skeleton className="h-9 w-28 rounded-xl" />
                </div>
              ) : (
                <div className="flex items-center gap-3 mt-6">
                  <Button className="btn-ice gap-2 h-9 px-4 text-sm shadow-lg shadow-zinc-900/10">
                    <Zap className="w-3.5 h-3.5" />
                    {t('dashboard.startDeepWork')}
                  </Button>
                  <Button variant="outline" className="h-9 px-4 text-sm bg-white/70 backdrop-blur-sm border-zinc-200/60 hover:bg-white/90 text-zinc-600">
                    {t('dashboard.viewTutorial')}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Stats Overview Card - Right Tile */}
          <div className="lg:col-span-2 bento-tile p-4 animate-fade-in-up relative overflow-hidden" style={{ animationDelay: '100ms' }}>
            {/* Subtle background */}
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-100/60 via-zinc-50/40 to-transparent" />

            <div className="relative">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">{t('dashboard.statistics')}</h3>
                <Sparkles className="w-4 h-4 text-zinc-300" />
              </div>

              {/* Stats grid - icon as top-right watermark, more compact */}
              <div className="grid grid-cols-2 gap-2">
                {/* Stat 1: Active Sessions */}
                <div className="bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2.5 border border-zinc-200/50 group hover:shadow-md hover:shadow-zinc-200/30 transition-all duration-300 cursor-pointer relative overflow-hidden">
                  <div className="absolute top-1 right-1 w-8 h-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <MessageSquare className="w-full h-full text-blue-600" />
                  </div>
                  <div className="relative">
                    {isLoading ? (
                      <Skeleton className="h-7 w-12 rounded" />
                    ) : (
                      <div className="text-xl font-bold text-zinc-900 font-mono tracking-tight leading-none">{activeSessions}</div>
                    )}
                    <div className="text-[10px] text-zinc-500 mt-0.5 leading-tight">{t('dashboard.todayConversations')}</div>
                  </div>
                </div>

                {/* Stat 2: Skills */}
                <div className="bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2.5 border border-zinc-200/50 group hover:shadow-md hover:shadow-zinc-200/30 transition-all duration-300 cursor-pointer relative overflow-hidden">
                  <div className="absolute top-1 right-1 w-8 h-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Puzzle className="w-full h-full text-purple-600" />
                  </div>
                  <div className="relative">
                    {isLoading ? (
                      <Skeleton className="h-7 w-12 rounded" />
                    ) : (
                      <div className="text-xl font-bold text-zinc-900 font-mono tracking-tight leading-none">{skillCount}</div>
                    )}
                    <div className="text-[10px] text-zinc-500 mt-0.5 leading-tight">{t('dashboard.totalSkills')}</div>
                  </div>
                </div>

                {/* Stat 3: Experts */}
                <div className="bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2.5 border border-zinc-200/50 group hover:shadow-md hover:shadow-zinc-200/30 transition-all duration-300 cursor-pointer relative overflow-hidden">
                  <div className="absolute top-1 right-1 w-8 h-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Zap className="w-full h-full text-green-600" />
                  </div>
                  <div className="relative">
                    {isLoading ? (
                      <Skeleton className="h-7 w-12 rounded" />
                    ) : (
                      <div className="text-xl font-bold text-zinc-900 font-mono tracking-tight leading-none">{0}</div>
                    )}
                    <div className="text-[10px] text-zinc-500 mt-0.5 leading-tight">{t('dashboard.activeExperts')}</div>
                  </div>
                </div>

                {/* Stat 4: MCP */}
                <div className="bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2.5 border border-zinc-200/50 group hover:shadow-md hover:shadow-zinc-200/30 transition-all duration-300 cursor-pointer relative overflow-hidden">
                  <div className="absolute top-1 right-1 w-8 h-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Clock className="w-full h-full text-orange-600" />
                  </div>
                  <div className="relative">
                    {isLoading ? (
                      <Skeleton className="h-7 w-12 rounded" />
                    ) : (
                      <div className="text-xl font-bold text-zinc-900 font-mono tracking-tight leading-none">{0}</div>
                    )}
                    <div className="text-[10px] text-zinc-500 mt-0.5 leading-tight">{t('dashboard.stats.mcpServices')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quota Progress */}
        <div className="mb-8 animate-fade-in-up" style={{ animationDelay: '600ms' }}>
          {isLoading ? (
            <div className="bento-tile p-6">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-5 w-24 rounded" />
                <Skeleton className="h-5 w-16 rounded" />
              </div>
              <Skeleton className="h-4 w-full rounded" />
              <div className="flex justify-between mt-2">
                <Skeleton className="h-4 w-20 rounded" />
                <Skeleton className="h-4 w-20 rounded" />
              </div>
            </div>
          ) : (
            <QuotaProgressBar />
          )}
        </div>

        {/* Workspace Actions - Bento Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-5">
            {isLoading ? (
              <Skeleton className="h-6 w-32 rounded" />
            ) : (
              <h2 className="text-lg font-semibold text-zinc-900 tracking-tight">{t('dashboard.workspaceTools')}</h2>
            )}
            {isLoading ? (
              <Skeleton className="h-8 w-20 rounded" />
            ) : (
              <Button variant="ghost" size="sm" className="gap-1.5 text-zinc-500 hover:text-zinc-900">
                {t('dashboard.allTools')}
                <ArrowUpRight className="w-4 h-4" />
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {isLoading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="bento-tile p-5 animate-fade-in-up" style={{ animationDelay: `${(index + 6) * 100}ms` }}>
                    <div className="flex flex-col h-full">
                      <Skeleton className="h-5 w-3/4 mb-2 rounded" />
                      <Skeleton className="h-4 w-full mb-4 rounded" />
                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-zinc-100/50">
                        <Skeleton className="h-4 w-16 rounded" />
                        <Skeleton className="h-4 w-4 rounded" />
                      </div>
                    </div>
                  </div>
                ))
              : workspaceActions.map((action, index) => (
                  <div
                    key={action.title}
                    className="bento-tile p-5 group cursor-pointer hover-lift animate-fade-in-up relative overflow-hidden"
                    style={{ animationDelay: `${(index + 6) * 100}ms` }}
                  >
                    {/* Icon watermark in top-right */}
                    <div className="absolute top-3 right-3 w-14 h-14 opacity-10 group-hover:opacity-25 group-hover:scale-125 transition-all duration-300">
                      <action.icon className="w-full h-full text-blue-600" />
                    </div>

                    <div className="flex flex-col h-full relative">
                      <div className="flex-1">
                        <h3 className="font-semibold text-zinc-900 mb-2 group-hover:text-zinc-700 transition-colors">
                          {action.title}
                        </h3>
                        <p className="text-sm text-zinc-500 leading-relaxed line-clamp-2">
                          {action.desc}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-100/50">
                        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider group-hover:text-zinc-600 transition-colors">
                          {action.action}
                        </span>
                        <ArrowUpRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                      </div>
                    </div>
                  </div>
                ))}
          </div>
        </div>

        {/* Recent Operations */}
        <div className="animate-fade-in-up" style={{ animationDelay: '800ms' }}>
          <div className="flex items-center justify-between mb-5">
            {isLoading ? (
              <Skeleton className="h-6 w-28 rounded" />
            ) : (
              <h2 className="text-lg font-semibold text-zinc-900 tracking-tight">{t('dashboard.recentSessions')}</h2>
            )}
            {isLoading ? (
              <Skeleton className="h-8 w-20 rounded" />
            ) : (
              <Button variant="ghost" size="sm" className="gap-1.5 text-zinc-500 hover:text-zinc-900">
                {t('dashboard.viewAll')}
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="bento-tile p-8">
              <div className="flex flex-col items-center">
                <Skeleton className="w-16 h-16 rounded-2xl mb-4" />
                <Skeleton className="h-5 w-32 mb-2 rounded" />
                <Skeleton className="h-4 w-48 rounded" />
              </div>
            </div>
          ) : (
            <div className="bento-tile p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-zinc-100/80 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-zinc-300" />
              </div>
              <p className="text-sm font-medium text-zinc-500 mb-1">{t('dashboard.noSessions')}</p>
              <p className="text-xs text-zinc-400">{t('dashboard.startConversationHint')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
