import { Lock, Sparkles } from 'lucide-react';
import type { LingqiModel } from '@/services/lingqi-service';

interface LingqiModelSelectorProps {
  models: LingqiModel[];
  selectedModelId?: string;
  onSelect: (modelId: string) => void;
}

function getModelAvailabilityText(model: LingqiModel): string {
  return model.isAvailable ? '可启用' : '需更高套餐';
}

export function LingqiModelSelector({
  models,
  selectedModelId,
  onSelect,
}: LingqiModelSelectorProps) {
  if (models.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3 text-sm text-stone-500">
        暂无可用模型，请稍后刷新灵气阁。
      </div>
    );
  }

  return (
    <div role="radiogroup" aria-label="选择灵气模型" className="grid gap-2">
      {models.map((model) => {
        const isSelected = model.id === selectedModelId;
        return (
          <button
            key={model.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={!model.isAvailable}
            onClick={() => onSelect(model.id)}
            className={`group rounded-2xl border px-4 py-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 ${
              isSelected
                ? 'border-amber-300 bg-gradient-to-br from-amber-50 via-white to-teal-50 shadow-md shadow-amber-100/70'
                : 'border-stone-200/70 bg-white/70 hover:-translate-y-0.5 hover:border-teal-200 hover:bg-amber-50/50 hover:shadow-sm'
            }`}
          >
            <span className="flex items-start justify-between gap-3">
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-sm font-semibold text-stone-900">
                  <Sparkles className="h-4 w-4 text-amber-600" />
                  {model.displayName}
                </span>
                <span className="mt-1 block truncate text-xs text-stone-500">{model.modelName}</span>
              </span>
              <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium ${
                  model.isAvailable ? 'bg-teal-50 text-teal-700' : 'bg-stone-100 text-stone-500'
                }`}
              >
                {!model.isAvailable && <Lock className="h-3 w-3" />}
                {getModelAvailabilityText(model)}
              </span>
            </span>
            <span className="mt-2 flex items-center justify-between text-xs text-stone-500">
              <span>阶位 Rank {model.rank}</span>
              <span>消耗倍率 ×{model.costMultiplier}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
