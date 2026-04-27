/**
 * 专家选择器组件
 * 
 * 下拉菜单形式,允许用户快速切换专家角色
 */

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Check } from 'lucide-react';
import type { ExpertPrompt } from '@/stores/experts';

interface ExpertSelectorProps {
  experts: ExpertPrompt[];
  activeExpertId: string | null;
  onSelectExpert: (id: string | null) => void;
}

export function ExpertSelector({ experts, activeExpertId, onSelectExpert }: ExpertSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉菜单
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
        className="gap-2 min-w-[140px]"
        onClick={() => setIsOpen(!isOpen)}
      >
        {activeExpert ? (
          <>
            <span>{activeExpert.icon}</span>
            <span className="truncate">{activeExpert.name}</span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            <span>选择专家</span>
          </>
        )}
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg border border-gray-200 shadow-lg z-50 py-1">
          {/* 通用助手选项 */}
          <button
            className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 transition-colors"
            onClick={() => {
              onSelectExpert(null);
              setIsOpen(false);
            }}
          >
            <span className="text-lg">🤖</span>
            <span className="flex-1 text-sm">通用助手</span>
            {!activeExpertId && <Check className="w-4 h-4 text-primary" />}
          </button>

          <div className="border-t border-gray-100 my-1"></div>

          {/* 自定义专家列表 */}
          {experts.map((expert) => (
            <button
              key={expert.id}
              className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 transition-colors ${
                activeExpertId === expert.id ? 'bg-blue-50' : ''
              }`}
              onClick={() => {
                onSelectExpert(expert.id);
                setIsOpen(false);
              }}
            >
              <span className="text-lg">{expert.icon}</span>
              <span className="flex-1 text-sm truncate">{expert.name}</span>
              {activeExpertId === expert.id && <Check className="w-4 h-4 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
