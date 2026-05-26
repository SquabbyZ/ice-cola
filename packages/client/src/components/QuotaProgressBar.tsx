import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Progress } from '@/components/ui/progress';
import { useLingqiStore } from '@/stores/lingqi';
import { formatLingqiAmount } from '@/lib/lingqi';
import { AlertCircle, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';

export function QuotaProgressBar() {
  const { t } = useTranslation();
  const [showDetails, setShowDetails] = useState(false);
  const { status: lingqiStatus } = useLingqiStore();

  const balance = lingqiStatus?.balance ?? 0;
  const totalGranted = lingqiStatus?.totalGranted ?? 0;
  const totalConsumed = lingqiStatus?.totalConsumed ?? 0;
  const utilization = totalGranted > 0 ? totalConsumed / totalGranted : 0;

  if (!lingqiStatus) {
    return (
      <div className="bento-tile p-4 animate-fade-in-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <span className="text-sm font-medium text-zinc-500">{t('settings.quota')}</span>
        </div>
        <div className="animate-pulse space-y-2">
          <div className="h-3 bg-zinc-200 rounded-full w-full"></div>
          <div className="h-3 bg-zinc-200 rounded-full w-3/4"></div>
        </div>
      </div>
    );
  }

  const getUtilizationLevel = () => {
    if (utilization >= 1) return 'exhausted';
    if (utilization >= 0.85) return 'danger';
    if (utilization >= 0.50) return 'warning';
    return 'normal';
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

        {/* Usage info */}
        <div className="flex items-baseline justify-between mb-3">
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-zinc-900 font-mono">{formatLingqiAmount(balance)}</span>
            <span className="text-xs text-zinc-400">/ {formatLingqiAmount(totalGranted)}</span>
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

        {/* Warning/Danger alert */}
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
            <div className="bg-zinc-50/80 rounded-lg p-3">
              <div className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-2">{t('common.quota')}</div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] text-zinc-500">{t('chat.capabilities.balance', { amount: '' }).split('：')[0] || 'Balance'}</span>
                  <span className="text-sm font-bold text-zinc-900 font-mono">{formatLingqiAmount(balance)}</span>
                </div>
              </div>
            </div>

            <div className="bg-zinc-50/80 rounded-lg p-3">
              <div className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-2">{t('settings.monthLabel')}</div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] text-zinc-500">{t('settings.cost')}</span>
                  <span className="text-sm font-bold text-zinc-900 font-mono">{formatLingqiAmount(totalConsumed)}</span>
                </div>
              </div>
            </div>

            <div className="bg-zinc-50/80 rounded-lg p-3">
              <div className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-2">{t('settings.monthLabel')}</div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px] text-zinc-500">Total</span>
                  <span className="text-sm font-bold text-zinc-900 font-mono">{formatLingqiAmount(totalGranted)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
