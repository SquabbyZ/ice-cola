import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Check, ChevronDown, Loader2, Sparkles, X } from 'lucide-react';
import { useSkillsStore, type Skill } from '@/stores/skillsStore';
import { useAuthStore } from '@/stores/authStore';
import { Badge } from '@/components/ui/badge';
import { useDropdownPosition, getDropdownClasses } from '@/hooks/useDropdownPosition';

interface SkillSelectorProps {
  conversationId: string | null;
  selectedSkillIds: string[];
  onSelectionChange: (skillIds: string[]) => void;
}

export function SkillSelector({ selectedSkillIds, onSelectionChange }: SkillSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownPosition = useDropdownPosition(triggerRef, 'up');

  const { personalSkills, teamSkills, loadPersonalSkills, loadTeamSkills, isLoading } = useSkillsStore();
  const user = useAuthStore((state) => state.user);
  const teamId = user?.team?.id;

  const availableSkills: Skill[] = [
    ...personalSkills,
    ...teamSkills.filter((s) => s.status === 'team' || s.status === 'marketplace'),
  ];

  useEffect(() => {
    if (isOpen && availableSkills.length === 0) {
      loadPersonalSkills();
      if (teamId) loadTeamSkills(teamId);
    }
  }, [availableSkills.length, isOpen, loadPersonalSkills, loadTeamSkills, teamId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedSkills = availableSkills.filter((s) => selectedSkillIds.includes(s.id));

  const handleToggle = (skillId: string) => {
    if (selectedSkillIds.includes(skillId)) {
      onSelectionChange(selectedSkillIds.filter((id) => id !== skillId));
    } else {
      onSelectionChange([...selectedSkillIds, skillId]);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        data-chat-selector-trigger="skills"
        className="gap-2 min-w-[160px]"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && availableSkills.length === 0) {
            loadPersonalSkills();
            if (teamId) loadTeamSkills(teamId);
          }
        }}
      >
        <Sparkles className="w-4 h-4" />
        {selectedSkills.length > 0 ? (
          <>
            <span className="truncate">已选 {selectedSkills.length} 个技能</span>
            <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
              {selectedSkills.length}
            </Badge>
          </>
        ) : (
          <span>选择技能</span>
        )}
        <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <div className={`absolute left-0 w-80 bg-white rounded-lg border border-gray-200 shadow-lg z-50 overflow-hidden flex flex-col ${getDropdownClasses(dropdownPosition.direction)}`} style={{ maxHeight: dropdownPosition.maxHeight }}>
          <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">技能</span>
            <span className="text-xs text-gray-400">{availableSkills.length} 可用</span>
          </div>

          <div className="flex-1 overflow-y-auto py-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : availableSkills.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">
                <p>暂无可用技能</p>
                <p className="text-xs text-gray-400 mt-1">请先在技能页创建或安装</p>
              </div>
            ) : (
              <>
                <div className="px-3 py-1.5 flex items-center gap-2 border-b border-gray-100">
                  <button
                    className="text-xs text-primary hover:underline"
                    onClick={() => onSelectionChange(availableSkills.map((s) => s.id))}
                  >
                    全选
                  </button>
                  <span className="text-gray-200">|</span>
                  <button
                    className="text-xs text-gray-500 hover:underline"
                    onClick={() => onSelectionChange([])}
                  >
                    清空
                  </button>
                </div>

                {availableSkills.map((skill) => {
                  const isSelected = selectedSkillIds.includes(skill.id);
                  return (
                    <button
                      key={skill.id}
                      className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 transition-colors ${
                        isSelected ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => handleToggle(skill.id)}
                    >
                      <span className="text-lg flex-shrink-0">{skill.icon || '✨'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{skill.name}</div>
                        <div className="text-xs text-gray-400 truncate">
                          {skill.description || skill.category || '无描述'}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {isSelected ? (
                          <Check className="w-4 h-4 text-primary" />
                        ) : (
                          <div className="w-4 h-4 border-2 border-gray-300 rounded" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {selectedSkillIds.length > 0 && (
            <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2 flex-wrap">
                {selectedSkills.map((skill) => (
                  <Badge key={skill.id} variant="secondary" className="gap-1 pr-1.5 pl-2 py-1">
                    <span>{skill.icon || '✨'}</span>
                    <span className="text-xs">{skill.name}</span>
                    <button
                      className="ml-0.5 p-0.5 hover:bg-gray-200 rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggle(skill.id);
                      }}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
