import type React from 'react';
import { useTranslation } from 'react-i18next';
import ChatMessageItem from '@/components/ChatMessageItem';
import type { ChatMessage } from '@/stores/chat';

interface ChatMessagesProps {
  messages: ChatMessage[];
  isLoading?: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onRegenerate: () => void;
}

function isLastCompleteAssistant(messages: ChatMessage[], index: number): boolean {
  const message = messages[index];
  if (message.role !== 'assistant' || message.status !== 'complete') {
    return false;
  }

  return messages.slice(index + 1).every((nextMessage) => (
    nextMessage.role !== 'assistant' || nextMessage.status !== 'complete'
  ));
}

function ChatMessages({
  messages,
  isLoading = false,
  messagesEndRef,
  onEdit,
  onDelete,
  onRegenerate,
}: ChatMessagesProps) {
  const { t } = useTranslation();

  return (
    <div
      aria-label={t('chat.messagesRegion')}
      aria-live="polite"
      aria-relevant="additions text"
      className="h-full overflow-y-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      role="log"
      tabIndex={0}
    >
      <div className="mx-auto max-w-4xl space-y-4 px-3 py-4 sm:px-5 sm:py-6">
      {messages.map((message, index) => (
        <ChatMessageItem
          key={message.id}
          message={message}
          onEdit={message.role === 'user' ? onEdit : undefined}
          onDelete={message.role === 'user' ? onDelete : undefined}
          onRegenerate={isLastCompleteAssistant(messages, index) ? onRegenerate : undefined}
        />
      ))}

        {isLoading && <div className="text-sm text-zinc-400">...</div>}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

export { ChatMessages };
