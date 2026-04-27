import React from 'react';
import { Bot, User, Copy, ThumbsUp, ThumbsDown } from 'lucide-react';
import type { ChatMessage } from '@/stores/chat';
import MarkdownContent from './MarkdownContent';

interface ChatMessageItemProps {
  message: ChatMessage;
}

const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isStreaming = message.status === 'streaming';
  const isError = message.status === 'error';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} group`}>
      {/* Avatar */}
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
          isUser 
            ? 'bg-gradient-to-br from-primary to-primary/80 text-white' 
            : 'bg-gradient-to-br from-gray-100 to-gray-200'
        }`}
      >
        {isUser ? (
          <User className="w-4.5 h-4.5" />
        ) : (
          <Bot className="w-4.5 h-4.5 text-gray-600" />
        )}
      </div>

      {/* Message Content */}
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
            // 用户消息：纯文本
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            // 助手消息：Markdown 渲染
            <div className="markdown-wrapper text-[15px] leading-relaxed">
              <MarkdownContent content={message.content} />
              {isStreaming && (
                <span className="inline-block ml-1 w-2 h-4 bg-primary/40 animate-pulse rounded-full" />
              )}
            </div>
          )}
        </div>

        {/* Message Actions (only for assistant) */}
        {!isUser && message.status === 'complete' && (
          <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button 
              className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
              onClick={() => navigator.clipboard.writeText(message.content)}
              title="复制消息"
            >
              <Copy className="w-3.5 h-3.5 text-gray-500" />
            </button>
            <button className="p-1.5 hover:bg-gray-100 rounded-md transition-colors" title="有用">
              <ThumbsUp className="w-3.5 h-3.5 text-gray-500" />
            </button>
            <button className="p-1.5 hover:bg-gray-100 rounded-md transition-colors" title="无用">
              <ThumbsDown className="w-3.5 h-3.5 text-gray-500" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessageItem;
