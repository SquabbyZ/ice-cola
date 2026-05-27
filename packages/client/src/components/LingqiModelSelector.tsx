import type React from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDropdownPosition, getDropdownClasses } from '@/hooks/useDropdownPosition';
import type { LingqiModel } from '@/services/lingqi-service';

interface LingqiModelSelectorProps {
  models: LingqiModel[];
  selectedModelId?: string;
  onSelect: (modelId: string) => void;
}

export function LingqiModelSelector({
  models,
  selectedModelId,
  onSelect,
}: LingqiModelSelectorProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedModel = models.find((model) => model.id === selectedModelId);
  const enabledOptionIndexes = models.flatMap((model, index) => (model.isAvailable ? [index] : []));
  const listboxId = useId();
  const dropdownPosition = useDropdownPosition(triggerRef, 'up');

  const focusOption = (optionIndex: number) => {
    optionRefs.current[optionIndex]?.focus();
  };

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (enabledOptionIndexes.length === 0) return;
    const currentOptionIndex = optionRefs.current.findIndex((option) => option === document.activeElement);
    const currentEnabledIndex = Math.max(0, enabledOptionIndexes.indexOf(currentOptionIndex));

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusOption(enabledOptionIndexes[(currentEnabledIndex + 1) % enabledOptionIndexes.length]);
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusOption(enabledOptionIndexes[(currentEnabledIndex - 1 + enabledOptionIndexes.length) % enabledOptionIndexes.length]);
    }
    if (event.key === 'Home') {
      event.preventDefault();
      focusOption(enabledOptionIndexes[0]);
    }
    if (event.key === 'End') {
      event.preventDefault();
      focusOption(enabledOptionIndexes[enabledOptionIndexes.length - 1]);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setIsOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        data-chat-selector-trigger="model"
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={`min-w-[180px] gap-2 transition-all duration-200 ${
          isOpen ? 'border-amber-300 bg-amber-50/80 shadow-md' : 'border-zinc-200/60 hover:border-amber-200'
        }`}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
          event.preventDefault();
          setIsOpen(true);
          window.requestAnimationFrame(() => {
            focusOption(enabledOptionIndexes[0]);
          });
        }}
      >
        <Sparkles className="h-4 w-4 text-amber-600" />
        <span className={`flex-1 truncate text-sm ${selectedModel ? 'font-medium text-zinc-700' : 'text-zinc-500'}`}>
          {selectedModel?.displayName || t('chat.lingqiModel.select')}
        </span>
        <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <div className={`absolute left-0 z-50 flex w-72 flex-col overflow-hidden rounded-xl border border-zinc-200/50 bg-white/95 shadow-xl shadow-zinc-200/30 backdrop-blur-xl animate-fade-in-down ${getDropdownClasses(dropdownPosition.direction)}`} style={{ maxHeight: dropdownPosition.maxHeight }}>
          <div className="border-b border-zinc-100/50 bg-gradient-to-r from-amber-50/80 via-zinc-50/50 to-emerald-50/80 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{t('chat.lingqiModel.title')}</p>
          </div>

          <div id={listboxId} aria-label={t('chat.lingqiModel.title')} className="overflow-y-auto py-1" role="menu" onKeyDown={handleMenuKeyDown}>
            {models.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <Sparkles className="mx-auto mb-2 h-8 w-8 text-zinc-300" />
                <p className="text-sm text-zinc-400">{t('chat.lingqiModel.empty')}</p>
              </div>
            ) : (
              models.map((model, index) => {
                const isSelected = model.id === selectedModelId;
                return (
                  <button
                    key={model.id}
                    ref={(element) => {
                      optionRefs.current[index] = element;
                    }}
                    type="button"
                    aria-checked={isSelected}
                    disabled={!model.isAvailable}
                    role="menuitemradio"
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-amber-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60 ${
                      isSelected ? 'bg-amber-50/70' : ''
                    }`}
                    onClick={() => {
                      onSelect(model.id);
                      setIsOpen(false);
                      triggerRef.current?.focus();
                    }}
                  >
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 shadow-sm">
                      {model.isAvailable ? <Sparkles className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-800">{model.displayName}</p>
                      <p className="truncate text-xs text-zinc-400">
                        {model.modelName} · {t('chat.lingqiModel.rank', { rank: model.rank })} · {t('chat.lingqiModel.costMultiplier', { multiplier: model.costMultiplier })}
                      </p>
                    </div>
                    {isSelected && <Check className="h-4 w-4 flex-shrink-0 text-primary" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
