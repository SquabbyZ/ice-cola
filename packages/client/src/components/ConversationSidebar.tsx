import React, { useState, useEffect } from 'react';
import { MessageSquare, Plus, Trash2, Edit2, Check, X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useConversationStore } from '@/stores/conversations';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface ConversationSidebarProps {
  teamId: string;
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  teamId,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { conversations, isLoading, deleteConversation, renameConversation } = useConversationStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  
  // 检测窗口宽度，自动调整折叠状态
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1000 && !isCollapsed && onToggleCollapse) {
        // 在小屏幕上自动折叠
        onToggleCollapse();
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isCollapsed, onToggleCollapse]);

  const handleDelete = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPendingDeleteId(conversationId);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;

    setDeletingId(pendingDeleteId);
    try {
      await deleteConversation(teamId, pendingDeleteId);
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    } finally {
      setDeletingId(null);
      setPendingDeleteId(null);
    }
  };

  const startEditing = (conversationId: string, currentTitle: string | null, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conversationId);
    setEditingTitle(currentTitle || '未命名对话');
  };

  const saveTitle = async (conversationId: string) => {
    if (!editingTitle.trim()) {
      setEditingId(null);
      return;
    }
    
    try {
      await renameConversation(teamId, conversationId, editingTitle.trim());
      setEditingId(null);
    } catch (error) {
      console.error('Failed to rename conversation:', error);
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, conversationId: string) => {
    if (e.key === 'Enter') {
      saveTitle(conversationId);
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  const formatTime = (date: Date | null) => {
    if (!date) return '';
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: zhCN });
    } catch {
      return '';
    }
  };

  return (
    <aside 
      className={`
        relative flex flex-col h-full transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)
        ${isCollapsed ? 'w-[68px]' : 'w-[260px]'}
        bg-gradient-to-b from-slate-50/80 via-white to-slate-50/60
        border-r border-slate-200/50
        backdrop-blur-xl
        shadow-[4px_0_24px_rgba(0,0,0,0.02)]
      `}
    >
      {/* Collapse Toggle Button - Floating Design */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="absolute -right-3 top-8 z-20 w-7 h-7 rounded-full 
            bg-white/90 backdrop-blur-md border border-slate-200/60 
            shadow-[0_2px_12px_rgba(0,0,0,0.08)] 
            hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:border-primary/30 
            hover:scale-110 active:scale-95
            transition-all duration-300 cubic-bezier(0.34, 1.56, 0.64, 1)
            flex items-center justify-center group"
          title={isCollapsed ? '展开侧边栏 (Cmd+B)' : '折叠侧边栏 (Cmd+B)'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-primary transition-colors" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-slate-500 group-hover:text-primary transition-colors" />
          )}
        </button>
      )}

      {/* Header with Gradient Accent */}
      <div className={`p-3 border-b border-slate-200/40 ${isCollapsed ? 'flex justify-center' : ''}`}>
        {isCollapsed ? (
          <Button
            onClick={onNewConversation}
            className="w-11 h-11 p-0 rounded-2xl 
              bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 
              hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600
              text-white shadow-[0_4px_16px_rgba(99,102,241,0.3)] 
              hover:shadow-[0_6px_24px_rgba(99,102,241,0.4)]
              hover:scale-105 active:scale-95
              transition-all duration-300 cubic-bezier(0.34, 1.56, 0.64, 1)"
            size="icon"
            title="新建对话"
          >
            <Plus className="w-5 h-5" />
          </Button>
        ) : (
          <>
            {/* Branding */}
            <div className="mb-3 px-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  对话历史
                </span>
              </div>
            </div>
            
            {/* New Chat Button */}
            <Button
              onClick={onNewConversation}
              className="w-full gap-2 
                bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 
                hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600
                text-white 
                shadow-[0_4px_16px_rgba(99,102,241,0.3)] 
                hover:shadow-[0_6px_24px_rgba(99,102,241,0.4)]
                hover:scale-[1.02] active:scale-[0.98]
                transition-all duration-300 cubic-bezier(0.34, 1.56, 0.64, 1)
                rounded-xl font-semibold text-sm"
              size="sm"
            >
              <Plus className="w-4 h-4" />
              <span>新建对话</span>
            </Button>
          </>
        )}
      </div>

      {/* Conversation List with Custom Scrollbar */}
      <div className="flex-1 overflow-y-auto 
        scrollbar-thin scrollbar-thumb-slate-300/60 scrollbar-track-transparent 
        hover:scrollbar-thumb-slate-400/60
        pr-1.5">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-11 bg-gradient-to-r from-slate-200/60 to-slate-100/60 rounded-xl w-full mb-1"></div>
                <div className="h-3 bg-slate-200/40 rounded-lg w-2/3"></div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className={`p-6 text-center ${isCollapsed ? 'hidden' : ''}`}>
            <div className="w-20 h-20 mx-auto mb-4 rounded-3xl 
              bg-gradient-to-br from-slate-100 via-white to-slate-50 
              border border-slate-200/60
              flex items-center justify-center
              shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
              <MessageSquare className="w-9 h-9 text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-600">暂无对话</p>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">点击“新建对话”开始聊天</p>
          </div>
        ) : (
          <div className="p-2.5 space-y-2">
            {conversations.map((conv, index) => {
              const isActive = conv.id === currentConversationId;
              const isEditing = editingId === conv.id;
              const isDeleting = deletingId === conv.id;
              const isHovered = hoveredId === conv.id;

              return (
                <div
                  key={conv.id}
                  onMouseEnter={() => setHoveredId(conv.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{ animationDelay: `${index * 50}ms` }}
                  className={`
                    group relative rounded-2xl transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1)
                    animate-in fade-in slide-in-from-bottom-2
                    ${isCollapsed ? 'flex justify-center' : ''}
                    ${isActive
                      ? 'bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)] border-2 border-indigo-200/60'
                      : isHovered
                        ? 'bg-slate-50/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-200/40'
                        : 'hover:bg-slate-50/50 border border-transparent'
                    }
                  `}
                >
                  {isCollapsed ? (
                    <button
                      onClick={() => onSelectConversation(conv.id)}
                      disabled={isDeleting}
                      className="w-11 h-11 flex items-center justify-center rounded-2xl transition-all duration-300"
                      title={conv.title || '未命名对话'}
                    >
                      <div className={`
                        w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300
                        ${isActive 
                          ? 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20 shadow-inner' 
                          : 'group-hover:bg-slate-100'
                        }
                      `}>
                        <MessageSquare
                          className={`w-5 h-5 transition-all duration-300 ${
                            isActive ? 'text-indigo-600 scale-110' : 'text-slate-400 group-hover:text-slate-600'
                          }`}
                        />
                      </div>
                    </button>
                  ) : (
                    <button
                      onClick={() => onSelectConversation(conv.id)}
                      disabled={isDeleting}
                      className="w-full px-3.5 py-3 text-left"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`
                          w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300
                          ${isActive 
                            ? 'bg-gradient-to-br from-indigo-500/15 via-purple-500/15 to-pink-500/15 shadow-[0_2px_8px_rgba(99,102,241,0.15)]' 
                            : 'bg-slate-100/60 group-hover:bg-slate-200/60'
                          }
                        `}>
                          <MessageSquare
                            className={`w-[18px] h-[18px] transition-all duration-300 ${
                              isActive ? 'text-indigo-600 scale-110' : 'text-slate-400'
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                              <input
                                type="text"
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, conv.id)}
                                onBlur={() => saveTitle(conv.id)}
                                autoFocus
                                className="flex-1 px-3 py-2 text-sm border-2 border-indigo-300/50 rounded-xl 
                                  focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 
                                  bg-white shadow-sm transition-all duration-200"
                                onClick={(e) => e.stopPropagation()}
                                placeholder="输入标题..."
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  saveTitle(conv.id);
                                }}
                                className="p-2 hover:bg-emerald-50 rounded-xl transition-all duration-200 group/btn hover:scale-110"
                                title="保存"
                              >
                                <Check className="w-4 h-4 text-emerald-600" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cancelEditing();
                                }}
                                className="p-2 hover:bg-red-50 rounded-xl transition-all duration-200 group/btn hover:scale-110"
                                title="取消"
                              >
                                <X className="w-4 h-4 text-red-600" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <p
                                className={`text-sm font-semibold truncate transition-all duration-200 ${
                                  isActive ? 'text-indigo-700' : 'text-slate-700 group-hover:text-slate-900'
                                }`}
                              >
                                {conv.title || '未命名对话'}
                              </p>
                              <p className="text-xs text-slate-400 mt-1.5 font-medium flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                {formatTime(conv.lastMessageAt)}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  )}

                  {/* Action Buttons - Elegant Hover Reveal */}
                  {!isEditing && !isCollapsed && (
                    <div
                      className={`
                        absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5
                        transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1)
                        ${isHovered || isActive ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-3'}
                      `}
                    >
                      <button
                        onClick={(e) => startEditing(conv.id, conv.title, e)}
                        className="p-2 hover:bg-slate-200/60 rounded-xl transition-all duration-200 group/btn hover:scale-110"
                        title="重命名"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-500 group-hover/btn:text-indigo-600 transition-colors" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(conv.id, e)}
                        disabled={isDeleting}
                        className="p-2 hover:bg-red-50/80 rounded-xl transition-all duration-200 group/btn hover:scale-110"
                        title="删除"
                      >
                        <Trash2
                          className={`w-3.5 h-3.5 transition-all ${
                            isDeleting 
                              ? 'text-slate-400' 
                              : 'text-slate-500 group-hover/btn:text-red-600'
                          }`}
                        />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer with Stats */}
      {!isCollapsed && (
        <div className="p-3 border-t border-slate-200/40">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse"></div>
              <p className="text-xs font-semibold text-slate-500">
                {conversations.length} 个对话
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"></span>
              <span>在线</span>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          setDeleteConfirmOpen(open);
          if (!open) setPendingDeleteId(null);
        }}
        title="确认删除"
        description="确定要删除这个对话吗？此操作不可恢复。"
        confirmText="删除"
        cancelText="取消"
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </aside>
  );
};
