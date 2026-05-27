import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Loader2, Package, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useExtensionStore } from '@/stores/extensions';
import { useDropdownPosition, getDropdownClasses } from '@/hooks/useDropdownPosition';

interface ExtensionSelectorProps {
  selectedExtensionIds: string[];
  onSelectionChange: (extensionIds: string[]) => void;
}

export function ExtensionSelector({ selectedExtensionIds, onSelectionChange }: ExtensionSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { installedExtensions, isLoading, loadInstalledExtensions } = useExtensionStore();
  const dropdownPosition = useDropdownPosition(triggerRef, 'up');

  const availableExtensions = useMemo(
    () => installedExtensions.filter((extension) => extension.enabled),
    [installedExtensions],
  );
  const selectedExtensions = availableExtensions.filter((extension) => selectedExtensionIds.includes(extension.id));

  useEffect(() => {
    if (isOpen && installedExtensions.length === 0) {
      loadInstalledExtensions();
    }
  }, [isOpen, installedExtensions.length, loadInstalledExtensions]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (extensionId: string) => {
    if (selectedExtensionIds.includes(extensionId)) {
      onSelectionChange(selectedExtensionIds.filter((id) => id !== extensionId));
      return;
    }
    onSelectionChange([...selectedExtensionIds, extensionId]);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        data-chat-selector-trigger="plugins"
        className="min-w-[160px] gap-2"
        onClick={() => setIsOpen((open) => !open)}
      >
        <Package className="h-4 w-4" />
        {selectedExtensions.length > 0 ? (
          <>
            <span className="truncate">已选 {selectedExtensions.length} 个插件</span>
            <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
              {selectedExtensions.length}
            </Badge>
          </>
        ) : (
          <span>选择插件</span>
        )}
        <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <div className={`absolute left-0 z-50 flex w-80 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg ${getDropdownClasses(dropdownPosition.direction)}`} style={{ maxHeight: dropdownPosition.maxHeight }}>
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
            <span className="text-sm font-medium text-gray-700">插件</span>
            <span className="text-xs text-gray-400">{availableExtensions.length} 可用</span>
          </div>

          <div className="flex-1 overflow-y-auto py-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : availableExtensions.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">
                <p>暂无可用插件</p>
                <p className="mt-1 text-xs text-gray-400">请先在插件页安装并启用</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-1.5">
                  <button className="text-xs text-primary hover:underline" onClick={() => onSelectionChange(availableExtensions.map((extension) => extension.id))}>
                    全选
                  </button>
                  <span className="text-gray-200">|</span>
                  <button className="text-xs text-gray-500 hover:underline" onClick={() => onSelectionChange([])}>
                    清空
                  </button>
                </div>

                {availableExtensions.map((extension) => {
                  const isSelected = selectedExtensionIds.includes(extension.id);
                  return (
                    <button
                      key={extension.id}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
                      onClick={() => handleToggle(extension.id)}
                    >
                      <span className="flex-shrink-0 text-lg">{extension.icon || '🔌'}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{extension.name}</div>
                        <div className="truncate text-xs text-gray-400">{extension.description || extension.category || '无描述'}</div>
                      </div>
                      <div className="flex-shrink-0">
                        {isSelected ? <Check className="h-4 w-4 text-primary" /> : <div className="h-4 w-4 rounded border-2 border-gray-300" />}
                      </div>
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {selectedExtensionIds.length > 0 && (
            <div className="border-t border-gray-100 bg-gray-50 px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                {selectedExtensions.map((extension) => (
                  <Badge key={extension.id} variant="secondary" className="gap-1 py-1 pl-2 pr-1.5">
                    <span>{extension.icon || '🔌'}</span>
                    <span className="text-xs">{extension.name}</span>
                    <button
                      className="ml-0.5 rounded p-0.5 hover:bg-gray-200"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleToggle(extension.id);
                      }}
                    >
                      <X className="h-3 w-3" />
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
