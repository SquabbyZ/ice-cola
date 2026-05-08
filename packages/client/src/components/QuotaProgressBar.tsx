/**
 * 配额进度条组件
 *
 * 显示月度配额使用情况,包含警告和超限提示
 * 可展开显示今日/本周/本月的详细用量
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Progress } from '@/components/ui/progress';
import { useQuotaStore } from '@/stores/quota';
import { useUsageStore } from '@/stores/usage';
import { AlertCircle, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';

export function QuotaProgressBar() {
  const { t } = useTranslation();
  const [showDetails, setShowDetails] = useState(false);
  const { status, config } = useQuotaStore();
  const { stats } = useUsageStore();

  // 计算实际值，即使 status 为 null 也显示 0
  const currentCost = status?.currentCost ?? 0;
  const budget = status?.budget ?? config?.monthlyBudget ?? 200;
  const utilization = status?.utilization ?? 0;

  if (!config) {
    return (
      <div className="bento-tile p-4 animate-fade-in-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <span className="text-sm font-medium text-zinc-500">{t('dashboard.stats.activeSessions')}</span>
        </div>
        <div className="animate-pulse space-y-2">
          <div className="h-3 bg-zinc-200 rounded-full w-full"></div>
          <div className="h-3 bg-zinc-200 rounded-full w-3/4"></div>
        </div>
      </div>
    );
  }

  // 根据用量百分比获取颜色级别
  // 0%: 绿色（正常）
  // 1-49%: 绿色（正常）
  // 50-84%: 黄色（警告）
  // 85-99%: 红色（危险）
  // 100%: 灰色（额度用完）
  const getUtilizationLevel = () => {
    if (utilization >= 1) return 'exhausted'; // 100% 额度用完
    if (utilization >= 0.85) return 'danger'; // 85-99% 危险
    if (utilization >= 0.50) return 'warning'; // 50-84% 警告
    return 'normal'; // 0-49% 正常（含0%）
  };

  const level = getUtilizationLevel();

  const getColor = () => {
    if (level === 'exhausted') return 'bg-zinc-400';
    if (level === 'danger') return 'bg-red-500';
    if (level === 'warning') return 'bg-yellow-500';
    return 'bg-gradient-to-r from-green-500 to-emerald-500';
  };

  return (
    <div className="bento-tile p-4 animate-fade-in-up relative overflow-hidden" style={{ animationDelay: '600ms' }}>
      {/* Background gradient */}
      <div className={`absolute inset-0 transition-opacity duration-500 ${
        level === 'exhausted' ? 'bg-gradient-to-r from-zinc-500/5 to-zinc-600/5' :
        level === 'danger' ? 'bg-gradient-to-r from-red-500/5 to-orange-500/5' :
        level === 'warning' ? 'bg-gradient-to-r from-yellow-500/5 to-amber-500/5' :
        'bg-gradient-to-r from-green-500/5 to-emerald-500/5'
      }`} />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
              level === 'exhausted' ? 'bg-gradient-to-br from-zinc-500 to-zinc-600' :
              level === 'danger' ? 'bg-gradient-to-br from-red-500 to-red-600' :
              level === 'warning' ? 'bg-gradient-to-br from-yellow-500 to-amber-500' :
              'bg-gradient-to-br from-green-500 to-emerald-500'
            }`}>
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">{t('settings.quota')}</h3>
              <p className="text-xs text-zinc-500">{t('settings.currentUsage')}</p>
            </div>
          </div>

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            {showDetails ? (
              <>
                {t('common.back')}
                <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                {t('common.all')}
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>

        {/* Usage info - single line */}
        <div className="flex items-baseline justify-between mb-3">
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-zinc-900 font-mono">${currentCost.toFixed(2)}</span>
            <span className="text-xs text-zinc-400">/ ${budget.toFixed(2)}</span>
          </div>
          <span className={`text-sm font-semibold ${
            level === 'exhausted' ? 'text-zinc-500' :
            level === 'danger' ? 'text-red-600' :
            level === 'warning' ? 'text-yellow-600' :
            'text-green-600'
          }`}>
            {(utilization * 100).toFixed(0)}%
          </span>
        </div>

        {/* Progress bar */}
        <Progress
          value={utilization * 100}
          className={`h-2 ${getColor()}`}
        />

        {/* Warning/Danger alert - 当用量 >= 50% 时显示 */}
        {(level === 'warning' || level === 'danger' || level === 'exhausted') && (
          <div className={`mt-3 flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${
            level === 'exhausted' ? 'bg-zinc-100 text-zinc-500' :
            level === 'danger' ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-600'
          }`}>
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>
              {level === 'exhausted'
                ? t('settings.hardLimitDesc')
                : level === 'danger'
                ? `${t('settings.dangerThreshold')}: ${(utilization * 100).toFixed(0)}%`
                : `${t('settings.warningThreshold')}: ${(utilization * 100).toFixed(0)}%`}
            </span>
          </div>
        )}

        {/* Expanded details */}
        {showDetails && (
          <div className="mt-4 pt-4 border-t border-zinc-200/50 grid grid-cols-3 gap-3">
            {/* Today */}
            <div className="bg-zinc-50/80 rounded-lg p-3">
              <div className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-2">{t('settings.todayLabel')}</div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] text-zinc-500">{t('settings.cost')}</span>
                  <span className="text-sm font-bold text-zinc-900 font-mono">${stats.today.totalCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] text-zinc-500">{t('settings.tokens')}</span>
                  <span className="text-xs font-medium text-zinc-700">
                    {(stats.today.totalInputTokens + stats.today.totalOutputTokens).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] text-zinc-500">{t('settings.requests')}</span>
                  <span className="text-xs font-medium text-zinc-700">{stats.today.requestCount}</span>
                </div>
              </div>
            </div>

            {/* This week */}
            <div className="bg-zinc-50/80 rounded-lg p-3">
              <div className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-2">{t('settings.weekLabel')}</div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] text-zinc-500">{t('settings.cost')}</span>
                  <span className="text-sm font-bold text-zinc-900 font-mono">${stats.week.totalCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] text-zinc-500">{t('settings.tokens')}</span>
                  <span className="text-xs font-medium text-zinc-700">
                    {(stats.week.totalInputTokens + stats.week.totalOutputTokens).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] text-zinc-500">{t('settings.requests')}</span>
                  <span className="text-xs font-medium text-zinc-700">{stats.week.requestCount}</span>
                </div>
              </div>
            </div>

            {/* This month */}
            <div className="bg-zinc-50/80 rounded-lg p-3">
              <div className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-2">{t('settings.monthLabel')}</div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] text-zinc-500">{t('settings.cost')}</span>
                  <span className="text-sm font-bold text-zinc-900 font-mono">${stats.month.totalCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] text-zinc-500">{t('settings.tokens')}</span>
                  <span className="text-xs font-medium text-zinc-700">
                    {(stats.month.totalInputTokens + stats.month.totalOutputTokens).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] text-zinc-500">{t('settings.requests')}</span>
                  <span className="text-xs font-medium text-zinc-700">{stats.month.requestCount}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}