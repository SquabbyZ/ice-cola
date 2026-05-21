/**
 * MCP 服务器选择器组件
 *
 * 下拉菜单形式，允许用户选择当前对话启用的 MCP 服务器
 */

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bot, Check, ChevronDown, Loader2, X } from 'lucide-react';
import { useMCPStore } from '@/stores/mcpStore';
import { Badge } from '@/components/ui/badge';

interface MCPSelectorProps {
  conversationId: string | null;
  selectedServerIds: string[];
  onSelectionChange: (serverIds: string[]) => void;
}

export function MCPSelector({ selectedServerIds, onSelectionChange }: MCPSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { connectedServers, loadConnectedServers, isLoading: storeLoading } = useMCPStore();

  useEffect(() => {
    if (isOpen && connectedServers.length === 0) {
      loadConnectedServers();
    }
  }, [isOpen, connectedServers.length, loadConnectedServers]);

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

  const selectedServers = connectedServers.filter(s => selectedServerIds.includes(s.id));

  const handleToggleServer = (serverId: string) => {
    if (selectedServerIds.includes(serverId)) {
      onSelectionChange(selectedServerIds.filter(id => id !== serverId));
    } else {
      onSelectionChange([...selectedServerIds, serverId]);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        className="gap-2 min-w-[160px]"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && connectedServers.length === 0) {
            loadConnectedServers();
          }
        }}
      >
        <Bot className="w-4 h-4" />
        {selectedServers.length > 0 ? (
          <>
            <span className="truncate">已选 {selectedServers.length} 个</span>
            <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
              {selectedServers.length}
            </Badge>
          </>
        ) : (
          <span>选择法宝</span>
        )}
        <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-lg border border-gray-200 shadow-lg z-50 max-h-80 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">法宝</span>
            <span className="text-xs text-gray-400">{connectedServers.length} 已连接</span>
          </div>

          {/* Server List */}
          <div className="flex-1 overflow-y-auto py-1">
            {storeLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : connectedServers.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">
                <p>暂无可用法宝</p>
                <p className="text-xs text-gray-400 mt-1">请先在法宝阁连接法宝</p>
              </div>
            ) : (
              <>
                {/* Select All / Clear All */}
                <div className="px-3 py-1.5 flex items-center gap-2 border-b border-gray-100">
                  <button
                    className="text-xs text-primary hover:underline"
                    onClick={() => onSelectionChange(connectedServers.map(s => s.id))}
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

                {/* Server Items */}
                {connectedServers.map((server) => {
                  const isSelected = selectedServerIds.includes(server.id);
                  return (
                    <button
                      key={server.id}
                      className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 transition-colors ${
                        isSelected ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => handleToggleServer(server.id)}
                    >
                      <span className="text-lg flex-shrink-0">{server.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{server.name}</div>
                        <div className="text-xs text-gray-400 truncate">{server.description}</div>
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

          {/* Footer */}
          {selectedServerIds.length > 0 && (
            <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2 flex-wrap">
                {selectedServers.map(server => (
                  <Badge
                    key={server.id}
                    variant="secondary"
                    className="gap-1 pr-1.5 pl-2 py-1"
                  >
                    <span>{server.icon}</span>
                    <span className="text-xs">{server.name}</span>
                    <button
                      className="ml-0.5 p-0.5 hover:bg-gray-200 rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleServer(server.id);
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
