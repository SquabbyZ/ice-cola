import type React from 'react';
import { FileText, PanelLeftClose, PanelLeftOpen, Sparkles, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ChatComposer } from '@/components/chat/ChatComposer';
import { ChatEmptyState } from '@/components/chat/ChatEmptyState';
import { ChatMessages } from '@/components/chat/ChatMessages';
import { HermesCapabilityBar } from '@/components/chat/HermesCapabilityBar';
import { ExpertSelector } from '@/components/ExpertSelector';
import { MCPSelector } from '@/components/MCPSelector';
import { ConversationSidebar } from '@/components/ConversationSidebar';
import { LingqiModelSelector } from '@/components/LingqiModelSelector';
import type { Attachment, ChatMessage } from '@/stores/chat';
import type { Conversation } from '@/services/conversation-service';
import type { ExpertPrompt } from '@/stores/experts';
import type { LingqiModel } from '@/services/lingqi-service';

interface ChatWorkspaceProps {
  teamId?: string | null;
  hasTeamAccess: boolean;
  currentConversationId: string | null;
  currentConversation?: Conversation;
  messages: ChatMessage[];
  messagesEndRef: React.RefObject<HTMLDivElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  isCompactLayout: boolean;
  isSidebarOpen: boolean;
  isSidebarCollapsed: boolean;
  isLoadingHistory: boolean;
  gatewayConnected: boolean;
  message: string;
  editingMessageId: string | null;
  isSending: boolean;
  attachments: Attachment[];
  canSendMessage: boolean;
  lingqiModels: LingqiModel[];
  selectedModelId?: string;
  lingqiError: string | null;
  expertPrompts: ExpertPrompt[];
  expertId?: string;
  selectedMCPServerIds: string[];
  selectedModelName?: string;
  lingqiBalance?: string;
  lingqiEstimateText?: string;
  selectedExpertName?: string;
  onToggleSidebar: () => void;
  onCloseSidebar: () => void;
  onToggleSidebarCollapse: () => void;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  onEditMessage: (id: string, content: string) => void;
  onDeleteMessage: (id: string) => void;
  onRegenerate: () => void;
  onPromptSelect: (prompt: string) => void;
  onCancelEdit: () => void;
  onModelSelect: (modelId: string) => void;
  onSelectExpert: (id: string | null) => void;
  onMCPSelectionChange: (serverIds: string[]) => void;
  onCapabilityClick: (target: 'model' | 'selectors' | 'skills' | 'plugins' | 'attach') => void;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onRemoveAttachment: (id: string) => void;
  onMessageChange: (value: string) => void;
  onSend: () => Promise<unknown>;
  onStopGeneration: () => Promise<unknown>;
}

export function ChatWorkspace(props: ChatWorkspaceProps) {
  const { t } = useTranslation();
  const {
    teamId,
    hasTeamAccess,
    currentConversationId,
    currentConversation,
    messages,
    messagesEndRef,
    fileInputRef,
    isCompactLayout,
    isSidebarOpen,
    isSidebarCollapsed,
    isLoadingHistory,
    gatewayConnected,
    message,
    editingMessageId,
    isSending,
    attachments,
    canSendMessage,
    lingqiModels,
    selectedModelId,
    lingqiError,
    expertPrompts,
    expertId,
    selectedMCPServerIds,
    selectedModelName,
    lingqiBalance,
    lingqiEstimateText,
    selectedExpertName,
  } = props;
  const sidebarToggleLabel = isSidebarOpen ? t('chat.conversations') : t('chat.showSidebar');
  const hasMessages = messages.length > 0;
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    props.onFileSelect(event).catch(() => undefined);
  };

  return (
    <div className="relative flex h-[calc(100dvh-3.5rem)] min-h-0 overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(212,255,236,0.38),transparent_34%),linear-gradient(135deg,rgba(250,250,250,0.96),rgba(244,244,245,0.88))]">
      {isSidebarOpen && (
        <div className={`${isCompactLayout ? 'absolute inset-y-0 left-0 z-30 shadow-2xl shadow-zinc-900/15' : 'relative'} flex-shrink-0`}>
          <ConversationSidebar
            teamId={teamId ?? ''}
            currentConversationId={currentConversationId}
            onSelectConversation={props.onSelectConversation}
            onNewConversation={props.onNewConversation}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={props.onToggleSidebarCollapse}
          />
        </div>
      )}
      {isCompactLayout && isSidebarOpen && (
        <Button aria-label={t('chat.closeSidebar')} className="absolute inset-0 z-20 h-auto rounded-none bg-zinc-900/10 p-0 backdrop-blur-[1px] hover:bg-zinc-900/10" onClick={props.onCloseSidebar} />
      )}

      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-white/70 bg-white/75 px-3 backdrop-blur-xl sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Button variant="ghost" size="sm" className="h-9 w-9 rounded-xl p-0 text-zinc-600 hover:bg-zinc-100" aria-label={sidebarToggleLabel} title={sidebarToggleLabel} onClick={props.onToggleSidebar}>
              {isSidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
            </Button>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-zinc-900">{currentConversation?.title || t('chat.newChat')}</div>
              <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                <span className={`h-1.5 w-1.5 rounded-full ${gatewayConnected ? 'bg-emerald-400' : 'bg-zinc-300'}`} />
                <span className="truncate">{gatewayConnected ? t('chat.hermes.ready') : t('chat.hermes.connecting')}</span>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-9 rounded-xl px-3 text-xs text-zinc-600 hover:bg-zinc-100" onClick={props.onNewConversation}>
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            {t('chat.newChat')}
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden">
          {!hasTeamAccess ? (
            <div className="flex h-full items-center justify-center px-4 text-center text-sm text-zinc-500">{t('chat.hermes.teamRequired')}</div>
          ) : isLoadingHistory ? (
            <div className="flex h-full items-center justify-center px-4 text-sm text-zinc-400">{t('common.loading')}</div>
          ) : hasMessages ? (
            <ChatMessages messages={messages} messagesEndRef={messagesEndRef} onEdit={props.onEditMessage} onDelete={props.onDeleteMessage} onRegenerate={props.onRegenerate} />
          ) : (
            <div className="flex min-h-full items-center justify-center"><ChatEmptyState gatewayConnected={gatewayConnected} onPromptSelect={props.onPromptSelect} /></div>
          )}
        </div>

        <footer className="flex-shrink-0 border-t border-white/70 bg-white/78 px-3 py-2 backdrop-blur-xl sm:px-4">
          <div className="mx-auto max-w-4xl space-y-2">
            {editingMessageId && (
              <div className="flex items-center justify-between rounded-xl border border-zinc-200/70 bg-zinc-50/80 px-3 py-2">
                <span className="text-xs font-medium text-zinc-600">{t('chat.editingMessage')}</span>
                <Button variant="ghost" size="icon" onClick={props.onCancelEdit} className="h-7 w-7 rounded-lg" aria-label={t('common.cancel')}><X className="h-3.5 w-3.5 text-zinc-500" /></Button>
              </div>
            )}

            <div id="chat-selectors" className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200/70 bg-white/90 p-2 shadow-sm shadow-zinc-200/40">
              <LingqiModelSelector models={lingqiModels} selectedModelId={selectedModelId} onSelect={props.onModelSelect} />
              <ExpertSelector experts={expertPrompts} activeExpertId={expertId ?? null} onSelectExpert={props.onSelectExpert} />
              <MCPSelector conversationId={currentConversationId} selectedServerIds={selectedMCPServerIds} onSelectionChange={props.onMCPSelectionChange} />
              {lingqiError && <p role="alert" className="min-w-[180px] flex-1 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">{lingqiError}</p>}
            </div>

            <HermesCapabilityBar
              gatewayConnected={gatewayConnected}
              selectedModelName={selectedModelName}
              lingqiBalance={lingqiBalance}
              lingqiEstimate={lingqiEstimateText}
              selectedExpertName={selectedExpertName}
              selectedMcpCount={selectedMCPServerIds.length}
              attachmentCount={attachments.length}
              onModelClick={() => props.onCapabilityClick('model')}
              onExpertClick={() => props.onCapabilityClick('selectors')}
              onMcpClick={() => props.onCapabilityClick('selectors')}
              onSkillsClick={() => props.onCapabilityClick('skills')}
              onPluginsClick={() => props.onCapabilityClick('plugins')}
              onAttachClick={() => props.onCapabilityClick('attach')}
            />

            <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.txt,.csv,.json,.md" className="hidden" onChange={handleFileInputChange} />
            {attachments.length > 0 && <AttachmentTray attachments={attachments} onRemoveAttachment={props.onRemoveAttachment} />}
            <ChatComposer
              value={message}
              isEditing={!!editingMessageId}
              isSending={isSending}
              gatewayConnected={gatewayConnected}
              canSend={canSendMessage}
              attachments={attachments}
              onChange={props.onMessageChange}
              onSend={props.onSend}
              onStop={props.onStopGeneration}
              onCancelEdit={props.onCancelEdit}
              onAttachClick={() => props.onCapabilityClick('attach')}
            />
            <p className="text-center text-[10px] text-zinc-400 sm:text-[11px]">{t('chat.disclaimer')}</p>
          </div>
        </footer>
      </section>
    </div>
  );
}

interface AttachmentTrayProps {
  attachments: Attachment[];
  onRemoveAttachment: (id: string) => void;
}

function AttachmentTray({ attachments, onRemoveAttachment }: AttachmentTrayProps) {
  const { t } = useTranslation();
  return (
    <div className="flex max-h-16 flex-wrap gap-2 overflow-y-auto rounded-2xl border border-zinc-200/70 bg-white/90 p-2">
      {attachments.map((attachment) => (
        <div key={attachment.id} className="group flex items-center gap-2 rounded-xl border border-zinc-200/60 bg-zinc-50/80 px-2 py-1.5">
          {attachment.type === 'image' ? <img src={attachment.url} alt={attachment.name} className="h-8 w-8 rounded-lg object-cover" /> : <FileText className="h-4 w-4 text-zinc-400" />}
          <span className="max-w-[120px] truncate text-xs text-zinc-600">{attachment.name}</span>
          <Button type="button" variant="ghost" size="icon" onClick={() => onRemoveAttachment(attachment.id)} className="h-6 w-6 rounded-md opacity-70 hover:bg-zinc-200 group-hover:opacity-100" aria-label={t('common.remove')}>
            <X className="h-3 w-3 text-zinc-400" />
          </Button>
        </div>
      ))}
    </div>
  );
}
