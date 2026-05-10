import React from 'react';
import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react';
import { useGatewayStore } from '@/stores/gateway';
import { useTeamStore } from '@/stores/team';
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
  const { totalQuota, usedQuota } = useTeamStore();

  const usagePercentage = totalQuota > 0 ? (usedQuota / totalQuota) * 100 : 0;
  const isOnline = isRunning && isConnected;

  return (
    <header className="h-14 bg-white/80 backdrop-blur-xl border-b border-zinc-200/60 flex items-center justify-between px-4 lg:px-6">
      {/* Left: Logo */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="relative w-8 h-8">
            <svg viewBox="0 0 32 32" className="w-full h-full" fill="none">
              <defs>
                <linearGradient id="clawGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="hsl(220 15% 55%)"/>
                  <stop offset="100%" stopColor="hsl(220 12% 40%)"/>
                </linearGradient>
              </defs>

              {/* 恐龙爪痕 - 三个爪印 */}
              {/* 大爪 - 中间 */}
              <path
                d="M 11 8
                   L 11 20
                   C 11 22 12 23 14 23
                   L 14 21
                   C 13 21 12.5 20 12.5 19
                   L 12.5 11
                   C 12.5 10 12 9 11 9"
                fill="url(#clawGrad)"
              />

              {/* 小爪 - 上 */}
              <path
                d="M 18 5
                   L 18 13
                   C 18 14.5 18.8 15.5 20 15.5
                   L 20 14
                   C 19.3 14 19 13.5 19 13
                   L 19 7.5
                   C 19 6.5 18.5 6 18 6"
                fill="url(#clawGrad)"
              />

              {/* 小爪 - 下 */}
              <path
                d="M 22 12
                   L 22 22
                   C 22 23.5 22.8 24.5 24 24.5
                   L 24 23
                   C 23.3 23 23 22.5 23 22
                   L 23 14.5
                   C 23 13.5 22.5 13 22 13"
                fill="url(#clawGrad)"
              />

              {/* 高光 */}
              <circle cx="12" cy="10" r="0.8" fill="hsl(0 0% 100% / 0.3)"/>
            </svg>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-semibold text-zinc-900 tracking-tight leading-none">
              IceCola
            </h1>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              AI Copilot
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
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-50/80 hover:bg-zinc-100/80 transition-colors cursor-default">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isOnline
                      ? 'bg-gradient-mint animate-pulse shadow-sm shadow-[hsl(165,55%,45%)/50%]'
                      : 'bg-red-500'
                  }`}
                />
                <span className="text-[11px] font-medium text-zinc-600 hidden sm:block">
                  {isOnline ? t('common.online') : t('common.offline')}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <p>{isOnline ? t('common.gatewayRunning') : t('common.gatewayOffline')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Quota indicator */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-50/80">
          <span className="text-[11px] text-zinc-500 font-medium">{t('common.quota')}</span>
          <div className="w-20 h-1.5 bg-zinc-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[hsl(350,85%,65%)] to-[hsl(165,55%,45%)] rounded-full transition-all duration-500"
              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
            />
          </div>
          <span className="text-[11px] font-mono text-zinc-600">
            {Math.round(usagePercentage)}%
          </span>
        </div>

        {/* Notification Bell */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
        >
          <Bell className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
};

export default TopBar;