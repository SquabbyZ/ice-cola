import { formatLingqiAmount } from '@/lib/lingqi';
import type { LingqiEstimate } from '@/services/lingqi-service';

interface LingqiCostPreviewProps {
  estimate: LingqiEstimate | null;
}

export function LingqiCostPreview({ estimate }: LingqiCostPreviewProps) {
  if (!estimate) {
    return null;
  }

  if (!estimate.canAfford) {
    return (
      <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
        灵气不足，预计消耗 {formatLingqiAmount(estimate.estimatedCost)} 灵气，请先兑换或升级套餐。
      </p>
    );
  }

  return (
    <p role="status" className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
      本次预计消耗 {formatLingqiAmount(estimate.estimatedCost)} 灵气
      {typeof estimate.balanceAfterEstimate === 'number'
        ? `，完成后剩余 ${formatLingqiAmount(estimate.balanceAfterEstimate)} 灵气。`
        : '。'}
    </p>
  );
}
