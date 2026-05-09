/**
 * Expert Selector Component
 *
 * Dropdown selector allowing users to quickly switch between expert personas
 * Features glass morphism dropdown, animated transitions, and visual feedback
 */

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Check, ChevronDown, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ExpertPrompt } from '@/stores/experts';

interface ExpertSelectorProps {
  experts: ExpertPrompt[];
  activeExpertId: string | null;
  onSelectExpert: (id: string | null) => void;
}

export function ExpertSelector({ experts, activeExpertId, onSelectExpert }: ExpertSelectorProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeExpert = experts.find(e => e.id === activeExpertId);

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        className={`gap-2 min-w-[160px] transition-all duration-200 ${
          isOpen
            ? 'border-zinc-400 bg-zinc-50/80 shadow-md'
            : 'border-zinc-200/60 hover:border-zinc-300/80'
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {activeExpert ? (
          <>
            <span className="text-lg">{activeExpert.icon}</span>
            <span className="flex-1 truncate text-sm font-medium">{activeExpert.name}</span>
          </>
        ) : (
          <>
            <Bot className="w-4 h-4 text-zinc-400" />
            <span className="flex-1 text-sm text-zinc-500">{t('experts.selectExpert', '选择专家')}</span>
          </>
        )}
        <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white/95 backdrop-blur-xl rounded-xl border border-zinc-200/50 shadow-xl shadow-zinc-200/30 z-50 overflow-hidden animate-fade-in-up">
          {/* Header */}
          <div className="px-4 py-3 border-b border-zinc-100/50 bg-gradient-to-r from-zinc-50/80 via-zinc-50/50 to-zinc-50/80">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              {t('experts.expertSelector', '专家选择')}
            </p>
          </div>

          {/* Default option */}
          <button
            className={`w-full px-4 py-3 text-left hover:bg-zinc-50/80 flex items-center gap-3 transition-colors border-b border-zinc-100/30 ${
              !activeExpertId ? 'bg-zinc-50/50' : ''
            }`}
            onClick={() => {
              onSelectExpert(null);
              setIsOpen(false);
            }}
          >
            <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center shadow-sm">
              <Bot className="w-5 h-5 text-zinc-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-700">{t('experts.defaultAssistant', '通用助手')}</p>
              <p className="text-xs text-zinc-400 truncate">{t('experts.defaultAssistantDesc', '默认AI助手，无特殊角色')}</p>
            </div>
            {!activeExpertId && (
              <Check className="w-4 h-4 text-primary flex-shrink-0" />
            )}
          </button>

          {/* Expert list */}
          <div className="py-1 max-h-[280px] overflow-y-auto">
            {experts.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <Sparkles className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                <p className="text-sm text-zinc-400">{t('experts.noExperts', '暂无专家')}</p>
              </div>
            ) : (
              experts.map((expert) => (
                <button
                  key={expert.id}
                  className={`w-full px-4 py-2.5 text-left hover:bg-zinc-50/80 flex items-center gap-3 transition-colors ${
                    activeExpertId === expert.id ? 'bg-zinc-50/50' : ''
                  }`}
                  onClick={() => {
                    onSelectExpert(expert.id);
                    setIsOpen(false);
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xl flex-shrink-0 shadow-sm"
                    style={{
                      background: expert.color
                        ? `${expert.color}20`
                        : '#f3f4f6',
                    }}
                  >
                    {expert.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800 truncate">{expert.name}</p>
                    {expert.description && (
                      <p className="text-xs text-zinc-400 truncate">{expert.description}</p>
                    )}
                  </div>
                  {activeExpertId === expert.id && (
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer hint */}
          <div className="px-4 py-2 border-t border-zinc-100/50 bg-zinc-50/30">
            <p className="text-[10px] text-zinc-400 text-center">
              {t('experts.expertSelectorHint', '专家可自定义AI助手的角色和行为')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
