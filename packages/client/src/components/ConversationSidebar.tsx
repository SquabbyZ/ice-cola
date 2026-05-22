import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import { Check, ChevronLeft, ChevronRight, Edit2, MessageSquare, Plus, Search, Sparkles, Trash2, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { enUS, zhCN } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useConversationStore } from '@/stores/conversations';

interface ConversationSidebarProps {
  teamId: string;
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

function ConversationSidebar({
  teamId,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  isCollapsed = false,
  onToggleCollapse,
}: ConversationSidebarProps) {
  const { t, i18n } = useTranslation();
  const { conversations, isLoading, deleteConversation, renameConversation,
    searchQuery, setSearchQuery, filteredConversations } = useConversationStore();
  const displayConversations = filteredConversations();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const skipBlurSaveIdRef = useRef<string | null>(null);
  const dateLocale = i18n.language.startsWith('zh') ? zhCN : enUS;
  const untitledConversation = t('chat.sidebar.untitledConversation');

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1000 && !isCollapsed && onToggleCollapse) {
        onToggleCollapse();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isCollapsed, onToggleCollapse]);

  const handleDelete = (conversationId: string, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setPendingDeleteId(conversationId);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId || !teamId) return;

    setDeletingId(pendingDeleteId);
    try {
      await deleteConversation(teamId, pendingDeleteId);
    } catch {
      // delete failed
    } finally {
      setDeletingId(null);
      setPendingDeleteId(null);
    }
  };

  const startEditing = (conversationId: string, currentTitle: string | null, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setEditingId(conversationId);
    setEditingTitle(currentTitle || untitledConversation);
  };

  const saveTitle = async (conversationId: string) => {
    if (!editingTitle.trim() || !teamId) {
      setEditingId(null);
      return;
    }

    try {
      await renameConversation(teamId, conversationId, editingTitle.trim());
      setEditingId(null);
    } catch {
      // rename failed
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const handleTitleBlur = (conversationId: string) => {
    if (skipBlurSaveIdRef.current === conversationId) {
      skipBlurSaveIdRef.current = null;
      return;
    }
    saveTitle(conversationId);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>, conversationId: string) => {
    if (event.key === 'Enter') {
      event.currentTarget.blur();
    } else if (event.key === 'Escape') {
      skipBlurSaveIdRef.current = conversationId;
      cancelEditing();
    }
  };

  const formatTime = (date: Date | null) => {
    if (!date) return '';
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: dateLocale });
    } catch {
      return '';
    }
  };

  return (
    <aside
      className={`
        relative flex flex-col h-full transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)
        ${isCollapsed ? 'w-[68px]' : 'w-[260px]'}
        pavilion-shell
        border-r
        backdrop-blur-xl
        shadow-[4px_0_28px_rgba(70,42,18,0.06)]
      `}
    >
      {onToggleCollapse && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onToggleCollapse}
          className="absolute -right-3 top-8 z-20 h-7 w-7 rounded-full border-amber-200/70 bg-amber-50/95 p-0 shadow-[0_2px_12px_rgba(120,78,28,0.12)] backdrop-blur-md transition-all duration-300 hover:scale-110 hover:border-teal-300/60 hover:shadow-[0_4px_16px_rgba(120,78,28,0.16)] active:scale-95"
          title={isCollapsed ? t('chat.sidebar.expandShortcut') : t('chat.sidebar.collapseShortcut')}
          aria-label={isCollapsed ? t('chat.sidebar.expandShortcut') : t('chat.sidebar.collapseShortcut')}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-stone-500 transition-colors hover:text-teal-700" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-stone-500 transition-colors hover:text-teal-700" />
          )}
        </Button>
      )}

      <div className={`p-3 border-b border-amber-200/50 ${isCollapsed ? 'flex justify-center' : ''}`}>
        {isCollapsed ? (
          <Button
            type="button"
            onClick={onNewConversation}
            className="h-11 w-11 rounded-2xl btn-ice p-0 transition-all duration-300 hover:scale-105 active:scale-95"
            size="icon"
            title={t('chat.sidebar.newConversation')}
            aria-label={t('chat.sidebar.newConversation')}
          >
            <Plus className="w-5 h-5" />
          </Button>
        ) : (
          <>
            <div className="mb-3 px-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl pavilion-orb flex items-center justify-center shadow-lg">
                  <Sparkles className="w-4 h-4 text-amber-50" />
                </div>
                <span className="text-sm font-bold pavilion-text-gradient">
                  {t('chat.sidebar.history')}
                </span>
              </div>
            </div>

            <Button
              type="button"
              onClick={onNewConversation}
              className="w-full gap-2 rounded-xl btn-ice text-sm font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              size="sm"
            >
              <Plus className="w-4 h-4" />
              <span>{t('chat.sidebar.newConversation')}</span>
            </Button>
          </>
        )}
      </div>

      {!isCollapsed && (
        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t('chat.sidebar.searchPlaceholder')}
              className="h-9 rounded-xl border-amber-200/60 bg-amber-50/70 pl-9 pr-8 text-stone-700 placeholder:text-stone-400 focus-visible:border-teal-300 focus-visible:ring-teal-500/20 focus-visible:ring-offset-0"
            />
            {searchQuery && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setSearchQuery('')}
                className="absolute right-1.5 top-1/2 h-7 w-7 -translate-y-1/2 rounded-md p-0 text-stone-400 hover:bg-stone-200/60"
                aria-label={t('chat.sidebar.clearSearch')}
                title={t('chat.sidebar.clearSearch')}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-stone-300/60 scrollbar-track-transparent hover:scrollbar-thumb-stone-400/60 pr-1.5">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="h-11 bg-gradient-to-r from-stone-200/60 to-stone-100/60 rounded-xl w-full mb-1" />
                <div className="h-3 bg-stone-200/40 rounded-lg w-2/3" />
              </div>
            ))}
          </div>
        ) : displayConversations.length === 0 ? (
          <div className={`p-6 text-center ${isCollapsed ? 'hidden' : ''}`}>
            <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-stone-100 via-white to-stone-50 border border-stone-200/60 flex items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
              <MessageSquare className="w-9 h-9 text-stone-300" />
            </div>
            <p className="text-sm font-semibold text-stone-600">
              {searchQuery ? t('chat.sidebar.noSearchResults') : t('chat.sidebar.noConversations')}
            </p>
            <p className="text-xs text-stone-400 mt-1.5 leading-relaxed">
              {searchQuery ? t('chat.sidebar.tryOtherKeywords') : t('chat.sidebar.startWithNewConversation')}
            </p>
          </div>
        ) : (
          <div className="p-2.5 space-y-2">
            {displayConversations.map((conversation, index) => {
              const isActive = conversation.id === currentConversationId;
              const isEditing = editingId === conversation.id;
              const isDeleting = deletingId === conversation.id;
              const isHovered = hoveredId === conversation.id;
              const displayTitle = conversation.title || untitledConversation;

              return (
                <div
                  key={conversation.id}
                  onMouseEnter={() => setHoveredId(conversation.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{ animationDelay: `${index * 50}ms` }}
                  className={`
                    group relative rounded-2xl transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1)
                    animate-in fade-in slide-in-from-bottom-2
                    ${isCollapsed ? 'flex justify-center' : ''}
                    ${isActive
                      ? 'bg-amber-50/90 shadow-[0_4px_16px_rgba(120,78,28,0.12)] border-2 border-amber-200/80'
                      : isHovered
                        ? 'bg-amber-50/60 shadow-[0_2px_8px_rgba(120,78,28,0.08)] border border-amber-200/50'
                        : 'hover:bg-amber-50/50 border border-transparent'
                    }
                  `}
                >
                  {isCollapsed ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onSelectConversation(conversation.id)}
                      disabled={isDeleting}
                      className="h-11 w-11 rounded-2xl p-0 transition-all duration-300 hover:bg-transparent"
                      title={displayTitle}
                      aria-label={displayTitle}
                    >
                      <div className={`
                        w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300
                        ${isActive
                          ? 'bg-gradient-to-br from-teal-500/20 to-amber-500/20 shadow-inner'
                          : 'group-hover:bg-amber-100/70'
                        }
                      `}>
                        <MessageSquare
                          className={`w-5 h-5 transition-all duration-300 ${
                            isActive ? 'text-teal-700 scale-110' : 'text-stone-400 group-hover:text-stone-600'
                          }`}
                        />
                      </div>
                    </Button>
                  ) : isEditing ? (
                    <div className="px-3.5 py-3">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-teal-500/15 via-amber-500/15 to-lime-500/15 shadow-[0_2px_8px_rgba(120,78,28,0.12)]">
                          <MessageSquare className="w-[18px] h-[18px] text-teal-700" />
                        </div>
                        <div className="flex min-w-0 flex-1 items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                          <Input
                            type="text"
                            value={editingTitle}
                            onChange={(event) => setEditingTitle(event.target.value)}
                            onKeyDown={(event) => handleKeyDown(event, conversation.id)}
                            onBlur={() => handleTitleBlur(conversation.id)}
                            autoFocus
                            className="h-9 flex-1 rounded-xl border-2 border-amber-300/60 bg-white px-3 py-2 text-sm shadow-sm transition-all duration-200 focus-visible:border-teal-500 focus-visible:ring-4 focus-visible:ring-teal-500/10 focus-visible:ring-offset-0"
                            onClick={(event) => event.stopPropagation()}
                            placeholder={t('chat.sidebar.titlePlaceholder')}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={(event) => {
                              event.stopPropagation();
                              saveTitle(conversation.id);
                            }}
                            className="h-9 w-9 rounded-xl text-teal-600 transition-all duration-200 hover:scale-110 hover:bg-teal-50"
                            title={t('common.save')}
                            aria-label={t('common.save')}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={(event) => {
                              event.stopPropagation();
                              cancelEditing();
                            }}
                            className="h-9 w-9 rounded-xl text-red-600 transition-all duration-200 hover:scale-110 hover:bg-red-50"
                            title={t('common.cancel')}
                            aria-label={t('common.cancel')}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => onSelectConversation(conversation.id)}
                      disabled={isDeleting}
                      className="h-auto w-full justify-start rounded-2xl px-3.5 py-3 text-left hover:bg-transparent"
                    >
                      <div className="flex w-full items-start gap-3">
                        <div className={`
                          w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300
                          ${isActive
                            ? 'bg-gradient-to-br from-teal-500/15 via-amber-500/15 to-lime-500/15 shadow-[0_2px_8px_rgba(120,78,28,0.12)]'
                            : 'bg-amber-50/70 group-hover:bg-amber-100/70'
                          }
                        `}>
                          <MessageSquare
                            className={`w-[18px] h-[18px] transition-all duration-300 ${
                              isActive ? 'text-teal-700 scale-110' : 'text-stone-400'
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0 pr-14">
                          <p
                            className={`text-sm font-semibold truncate transition-all duration-200 ${
                              isActive ? 'text-teal-800' : 'text-stone-700 group-hover:text-stone-900'
                            }`}
                          >
                            {displayTitle}
                          </p>
                          <p className="text-xs text-stone-400 mt-1.5 font-medium flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-stone-300" />
                            {formatTime(conversation.lastMessageAt)}
                          </p>
                        </div>
                      </div>
                    </Button>
                  )}

                  {!isEditing && !isCollapsed && (
                    <div
                      className={`
                        absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5
                        transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1)
                        ${isHovered || isActive ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-3 group-focus-within:opacity-100 group-focus-within:translate-x-0'}
                      `}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={(event) => startEditing(conversation.id, conversation.title, event)}
                        className="h-8 w-8 rounded-xl text-stone-500 transition-all duration-200 hover:scale-110 hover:bg-stone-200/60 hover:text-teal-700"
                        title={t('chat.sidebar.rename')}
                        aria-label={t('chat.sidebar.rename')}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={(event) => handleDelete(conversation.id, event)}
                        disabled={isDeleting}
                        className="h-8 w-8 rounded-xl text-stone-500 transition-all duration-200 hover:scale-110 hover:bg-red-50/80 hover:text-red-600"
                        title={t('common.delete')}
                        aria-label={t('common.delete')}
                      >
                        <Trash2 className={`w-3.5 h-3.5 transition-all ${isDeleting ? 'text-stone-400' : ''}`} />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!isCollapsed && (
        <div className="p-3 border-t border-stone-200/40">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-teal-500 to-amber-500 animate-pulse" />
              <p className="text-xs font-semibold text-stone-500">
                {searchQuery
                  ? t('chat.sidebar.filteredCount', { filtered: displayConversations.length, total: conversations.length })
                  : t('chat.sidebar.conversationCount', { count: conversations.length })}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-stone-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
              <span>{t('common.online')}</span>
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
        title={t('chat.sidebar.confirmDeleteTitle')}
        description={t('chat.sidebar.confirmDeleteDescription')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </aside>
  );
}

export { ConversationSidebar };
