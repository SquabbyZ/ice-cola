import { Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { LingqiStatus } from '@/services/lingqi-service';

interface LingqiStatusCardProps {
  status: LingqiStatus | null;
  isCollapsed?: boolean;
  onOpen: () => void;
}

function formatLingqiAmount(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value);
}

function getRealmName(status: LingqiStatus): string {
  return status.cultivationRealm?.displayName ?? '凡人';
}

function getNextRealmText(status: LingqiStatus): string {
  if (!status.nextCultivationRealm) {
    return '已臻当前巅峰';
  }

  return `下境：${status.nextCultivationRealm.displayName}`;
}

export function LingqiStatusCard({
  status,
  isCollapsed = false,
  onOpen,
}: LingqiStatusCardProps) {
  if (isCollapsed) {
    return (
      <button
        type="button"
        onClick={onOpen}
        title="打开灵气阁"
        aria-label="打开灵气阁"
        className="flex h-10 w-full items-center justify-center rounded-xl bg-amber-50 text-teal-700 shadow-sm shadow-teal-100/60 transition-all duration-200 hover:bg-teal-100 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 focus-visible:ring-offset-2"
      >
        <Sparkles className="h-4 w-4" strokeWidth={2.2} />
      </button>
    );
  }

  if (!status) {
    return (
      <button
        type="button"
        onClick={onOpen}
        title="进入灵气阁查看余额与模型"
        aria-label="进入灵气阁查看余额与模型"
        className="flex w-full items-center gap-3 rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50 to-white px-3 py-3 text-left shadow-sm shadow-teal-100/70 transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 focus-visible:ring-offset-2"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm shadow-teal-200">
          <Sparkles className="h-4 w-4" strokeWidth={2.2} />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-zinc-900">灵气阁</span>
          <span className="block truncate text-xs text-zinc-500">查看余额、境界与可用模型</span>
        </span>
      </button>
    );
  }

  const progressValue = Math.min(Math.max(status.realmProgress.percentage, 0), 100);

  return (
    <button
      type="button"
      onClick={onOpen}
      title="打开灵气阁"
      aria-label={`打开灵气阁，当前余额 ${status.balance} 灵气`}
      className="w-full rounded-2xl border border-teal-100 bg-gradient-to-br from-white via-teal-50/70 to-lime-50 p-3 text-left shadow-sm shadow-teal-100/70 transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 focus-visible:ring-offset-2"
    >
      <span className="mb-3 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm shadow-teal-200">
            <Sparkles className="h-4 w-4" strokeWidth={2.2} />
          </span>
          灵气阁
        </span>
        <span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-medium text-teal-700">
          {status.subscription.displayName}
        </span>
      </span>

      <span className="mb-2 block text-2xl font-bold tracking-tight text-zinc-950">
        {formatLingqiAmount(status.balance)}
        <span className="ml-1 text-xs font-medium text-zinc-500">灵气</span>
      </span>

      <span className="mb-2 flex items-center justify-between text-xs">
        <span className="font-medium text-zinc-700">{getRealmName(status)}</span>
        <span className="text-zinc-500">{getNextRealmText(status)}</span>
      </span>
      <Progress
        value={progressValue}
        className="h-2 bg-teal-100"
        aria-label={`突破进度 ${progressValue.toFixed(0)}%，修为 ${status.realmProgress.current} / ${status.realmProgress.required}`}
      />
      <span className="mt-1 block text-[10px] text-zinc-500">
        修为 {formatLingqiAmount(status.realmProgress.current)} / {formatLingqiAmount(status.realmProgress.required)}
      </span>
    </button>
  );
}
