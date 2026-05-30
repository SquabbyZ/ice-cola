import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, Sparkles } from 'lucide-react';
import { useGatewayStore } from '@/stores/gateway';
import { useLingqiStore } from '@/stores/lingqi';
import { useAuthStore } from '@/stores/authStore';
import { getTeamId } from '@/lib/team';
import { formatLingqiAmount } from '@/lib/lingqi';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const TopBar: React.FC = () => {
  const { t } = useTranslation();
  const { isRunning, isConnected } = useGatewayStore();
  const { status: lingqiStatus, loadLingqi } = useLingqiStore();
  const user = useAuthStore((state) => state.user);
  const teamId = getTeamId(user);

  useEffect(() => {
    if (teamId) loadLingqi(teamId).catch(() => undefined);
  }, [teamId, loadLingqi]);

  const totalGranted = lingqiStatus?.totalGranted ?? 0;
  const totalConsumed = lingqiStatus?.totalConsumed ?? 0;
  const usagePercentage = totalGranted > 0 ? (totalConsumed / totalGranted) * 100 : 0;
  const isOnline = isRunning && isConnected;

  return (
    <header className="h-14 border-b pavilion-shell backdrop-blur-xl flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-xl pavilion-orb text-amber-50">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-semibold tracking-tight leading-none pavilion-text-gradient">
              {t('login.appName')}
            </h1>
            <p className="text-[10px] text-stone-500 mt-0.5">
              {t('login.appSubtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Gateway Status */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50/70 hover:bg-amber-100/70 transition-colors cursor-default">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isOnline
                      ? 'bg-gradient-mint animate-pulse shadow-sm shadow-[hsl(165,55%,45%)/50%]'
                      : 'bg-red-500'
                  }`}
                />
                <span className="text-[11px] font-medium text-stone-600 hidden sm:block">
                  {isOnline ? t('common.online') : t('common.offline')}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <p>{isOnline ? t('common.gatewayRunning') : t('common.gatewayOffline')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Quota indicator - Lingqi balance */}
        {lingqiStatus && (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50/70 cursor-default">
                  <span className="text-[11px] text-stone-500 font-medium">{t('common.quota')}</span>
                  <div className="w-20 h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[hsl(350,85%,65%)] to-[hsl(165,55%,45%)] rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-stone-600">
                    {formatLingqiAmount(lingqiStatus.balance)}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <p>{t('chat.capabilities.balance', { amount: formatLingqiAmount(lingqiStatus.balance) })}</p>
                <p className="text-zinc-400">{formatLingqiAmount(totalConsumed)} / {formatLingqiAmount(totalGranted)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Notification Bell */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-stone-500 hover:text-stone-900 hover:bg-zinc-100"
        >
          <Bell className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
};

export default TopBar;