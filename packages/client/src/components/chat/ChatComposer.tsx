import type React from 'react';
import { Paperclip, Send, Square, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { Attachment } from '@/stores/chat';

interface ChatComposerProps {
  value: string;
  isEditing: boolean;
  isSending: boolean;
  gatewayConnected: boolean;
  canSend: boolean;
  attachments: Attachment[];
  onChange: (value: string) => void;
  onSend: () => void | Promise<unknown>;
  onStop: () => void | Promise<unknown>;
  onCancelEdit: () => void;
  onAttachClick: () => void;
}

function ChatComposer({
  value,
  isEditing,
  isSending,
  gatewayConnected,
  canSend,
  attachments,
  onChange,
  onSend,
  onStop,
  onCancelEdit,
  onAttachClick,
}: ChatComposerProps) {
  const { t } = useTranslation();
  const hasSendableContent = value.trim().length > 0 || attachments.length > 0;
  const sendDisabled = !gatewayConnected || !canSend || !hasSendableContent || isSending;
  const placeholder = !gatewayConnected
    ? t('chat.composer.placeholderConnecting')
    : isEditing
      ? t('chat.composer.placeholderEditing')
      : t('chat.composer.placeholderReady');

  const handleSend = () => {
    Promise.resolve(onSend()).catch(() => undefined);
  };

  const handleStop = () => {
    Promise.resolve(onStop()).catch(() => undefined);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isComposing = event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229;
    if (event.key !== 'Enter' || event.shiftKey || isComposing) {
      return;
    }

    event.preventDefault();
    if (!sendDisabled) {
      handleSend();
    }
  };

  const handleKeyUp = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape' && isEditing) {
      event.preventDefault();
      onCancelEdit();
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-lg shadow-zinc-200/70">
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2 text-xs text-zinc-500">
          {attachments.map((attachment) => (
            <span key={attachment.id} className="rounded-full bg-zinc-100 px-2 py-1">
              {attachment.name}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onAttachClick}
          aria-label={t('chat.composer.attach')}
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        <Textarea
          value={value}
          rows={1}
          data-max-rows="3"
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          placeholder={placeholder}
          disabled={!gatewayConnected || isSending}
          className="max-h-[84px] min-h-[36px] flex-1 resize-none border-0 bg-transparent px-1 py-2 shadow-none focus-visible:ring-0"
        />

        {isSending ? (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={handleStop}
            aria-label={t('chat.composer.stop')}
          >
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            size="icon"
            onClick={handleSend}
            disabled={sendDisabled}
            aria-label={t('chat.composer.send')}
          >
            <Send className="h-4 w-4" />
          </Button>
        )}

        {isEditing && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onCancelEdit}
            aria-label={t('chat.composer.cancelEdit')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <p className="mt-2 text-xs text-zinc-400">{t('chat.composer.enterToSend')}</p>
    </div>
  );
}

export { ChatComposer };
export type { ChatComposerProps };
