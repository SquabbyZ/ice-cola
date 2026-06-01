import { Bot, Copy, Pencil, RefreshCw, ThumbsDown, ThumbsUp, Trash2, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { HermesExecutionBlock } from '@/components/chat/HermesExecutionBlock';
import { Button } from '@/components/ui/button';
import type { ChatMessage } from '@/stores/chat';
import MarkdownContent from './MarkdownContent';

interface ChatMessageItemProps {
  message: ChatMessage;
  onEdit?: (id: string, content: string) => void;
  onDelete?: (id: string) => void;
  onRegenerate?: () => void;
}

function ChatMessageItem({ message, onEdit, onDelete, onRegenerate }: ChatMessageItemProps) {
  const { t } = useTranslation();
  const isUser = message.role === 'user';
  const isStreaming = message.status === 'streaming';
  const isError = message.status === 'error';
  const attachmentOnlyContent = t('chat.message.attachmentOnly');
  const shouldShowContent = message.content && message.content !== attachmentOnlyContent;

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} group`}>
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
          isUser
            ? 'bg-gradient-to-br from-primary to-primary/80 text-white'
            : 'bg-gray-200'
        }`}
      >
        {isUser ? (
          <User className="w-4.5 h-4.5" />
        ) : (
          <Bot className="w-4.5 h-4.5 text-gray-500" />
        )}
      </div>

      <div className={`flex-1 max-w-[80%] ${isUser ? 'text-right' : ''}`}>
        <div
          className={`inline-block rounded-2xl px-5 py-3.5 shadow-sm ${
            isUser
              ? 'bg-primary text-white rounded-tr-sm'
              : isError
              ? 'bg-red-50 text-red-700 rounded-tl-sm border border-red-200'
              : 'bg-gray-50 text-gray-900 rounded-tl-sm border border-gray-100'
          }`}
        >
          {isUser ? (
            <div>
              {message.attachments && message.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {message.attachments.map((attachment) => (
                    attachment.type === 'image' ? (
                      <img key={attachment.id} src={attachment.url} alt={attachment.name} className="max-w-[200px] max-h-[200px] rounded-lg object-cover" />
                    ) : (
                      <div key={attachment.id} className="flex items-center gap-1.5 bg-white/20 rounded-lg px-2 py-1.5 text-xs">
                        <Copy className="w-3 h-3" />
                        <span>{attachment.name}</span>
                      </div>
                    )
                  ))}
                </div>
              )}
              {shouldShowContent && (
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
              )}
            </div>
          ) : (
            <div className="markdown-wrapper text-[15px] leading-relaxed">
              {message.toolCalls && message.toolCalls.length > 0 && (
                <div className="space-y-2 mb-3">
                  {message.toolCalls.map((toolCall) => (
                    <HermesExecutionBlock
                      key={toolCall.toolCallId}
                      toolName={toolCall.toolName}
                      status={toolCall.status}
                      output={toolCall.output}
                      imageUrl={toolCall.imageUrl}
                    />
                  ))}
                </div>
              )}
              <MarkdownContent content={message.content} displayLength={message.displayLength} />
              {isStreaming && (
                <span className="inline-block ml-1 w-2 h-4 bg-primary/40 animate-pulse rounded-full" />
              )}
            </div>
          )}
        </div>

        <div className={`flex items-center gap-1 mt-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100 ${isUser ? 'justify-end' : ''}`}>
          {isUser && onEdit && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md text-gray-500 hover:bg-gray-100"
              onClick={() => onEdit(message.id, message.content)}
              title={t('chat.messageActions.edit')}
              aria-label={t('chat.messageActions.edit')}
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          )}
          {isUser && onDelete && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md text-gray-500 hover:bg-gray-100"
              onClick={() => onDelete(message.id)}
              title={t('chat.messageActions.delete')}
              aria-label={t('chat.messageActions.delete')}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
          {!isUser && message.status === 'complete' && (
            <>
              {onRegenerate && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md text-gray-500 hover:bg-gray-100"
                  onClick={onRegenerate}
                  title={t('chat.messageActions.regenerate')}
                  aria-label={t('chat.messageActions.regenerate')}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md text-gray-500 hover:bg-gray-100"
                onClick={() => navigator.clipboard.writeText(message.content)}
                title={t('chat.messageActions.copy')}
                aria-label={t('chat.messageActions.copy')}
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md text-gray-500 hover:bg-gray-100"
                title={t('chat.messageActions.helpful')}
                aria-label={t('chat.messageActions.helpful')}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md text-gray-500 hover:bg-gray-100"
                title={t('chat.messageActions.unhelpful')}
                aria-label={t('chat.messageActions.unhelpful')}
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatMessageItem;
