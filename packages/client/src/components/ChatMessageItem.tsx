import React from 'react';
import { Bot, User, Copy, ThumbsUp, ThumbsDown, Pencil, Trash2, RefreshCw, Wrench, Search, Code, Image as ImageIcon, AlertCircle, Loader2 } from 'lucide-react';
import type { ChatMessage, ToolCallResult } from '@/stores/chat';
import MarkdownContent from './MarkdownContent';

const toolIcons: Record<string, React.FC<any>> = {
  web_search: Search,
  web_extract: Search,
  execute_code: Code,
  code_execution: Code,
  image_generate: ImageIcon,
  vision_analyze: ImageIcon,
  read_file: Code,
  write_file: Code,
};

function getToolLabel(name: string): string {
  const labels: Record<string, string> = {
    web_search: '搜索网络',
    web_extract: '提取网页内容',
    execute_code: '执行代码',
    code_execution: '执行代码',
    image_generate: '生成图片',
    vision_analyze: '分析图片',
    read_file: '读取文件',
    write_file: '写入文件',
    terminal: '执行命令',
    browser_navigate: '浏览网页',
  };
  return labels[name] || name;
}

interface ToolCallCardProps {
  toolCall: ToolCallResult;
}

const ToolCallCard: React.FC<ToolCallCardProps> = ({ toolCall }) => {
  const Icon = toolIcons[toolCall.toolName] || Wrench;
  const label = getToolLabel(toolCall.toolName);

  if (toolCall.status === 'error') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span>{label} 失败: {toolCall.output || '未知错误'}</span>
      </div>
    );
  }

  if (toolCall.status === 'running') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
        <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" />
        <span>正在{label}...</span>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
        <Icon className="w-4 h-4 text-gray-500 flex-shrink-0" />
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      {toolCall.output && (
        <div className="px-3 py-2 text-sm text-gray-600 max-h-[300px] overflow-auto">
          <pre className="whitespace-pre-wrap break-words text-xs">{toolCall.output}</pre>
        </div>
      )}
      {toolCall.imageUrl && (
        <div className="p-2">
          <img src={toolCall.imageUrl} alt={label} className="max-w-full rounded" />
        </div>
      )}
    </div>
  );
};

interface ChatMessageItemProps {
  message: ChatMessage;
  onEdit?: (id: string, content: string) => void;
  onDelete?: (id: string) => void;
  onRegenerate?: () => void;
}

const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ message, onEdit, onDelete, onRegenerate }) => {
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
            : 'bg-gray-200'
        }`}
      >
        {isUser ? (
          <User className="w-4.5 h-4.5" />
        ) : (
          <Bot className="w-4.5 h-4.5 text-gray-500" />
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
            // 用户消息：纯文本 + 附件
            <div>
              {message.attachments && message.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {message.attachments.map(att => (
                    att.type === 'image' ? (
                      <img key={att.id} src={att.url} alt={att.name} className="max-w-[200px] max-h-[200px] rounded-lg object-cover" />
                    ) : (
                      <div key={att.id} className="flex items-center gap-1.5 bg-white/20 rounded-lg px-2 py-1.5 text-xs">
                        <Copy className="w-3 h-3" />
                        <span>{att.name}</span>
                      </div>
                    )
                  ))}
                </div>
              )}
              {message.content && message.content !== '[附件]' && (
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
              )}
            </div>
          ) : (
            // 助手消息：Markdown 渲染
            <div className="markdown-wrapper text-[15px] leading-relaxed">
              {message.toolCalls && message.toolCalls.length > 0 && (
                <div className="space-y-2 mb-3">
                  {message.toolCalls.map((tc) => (
                    <ToolCallCard key={tc.toolCallId} toolCall={tc} />
                  ))}
                </div>
              )}
              <MarkdownContent content={message.content} />
              {isStreaming && (
                <span className="inline-block ml-1 w-2 h-4 bg-primary/40 animate-pulse rounded-full" />
              )}
            </div>
          )}
        </div>

        {/* Message Actions */}
        <div className={`flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${isUser ? 'justify-end' : ''}`}>
          {isUser && onEdit && (
            <button
              className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
              onClick={() => onEdit(message.id, message.content)}
              title="编辑消息"
              aria-label="编辑消息"
            >
              <Pencil className="w-3.5 h-3.5 text-gray-500" />
            </button>
          )}
          {isUser && onDelete && (
            <button
              className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
              onClick={() => onDelete(message.id)}
              title="删除消息"
              aria-label="删除消息"
            >
              <Trash2 className="w-3.5 h-3.5 text-gray-500" />
            </button>
          )}
          {!isUser && message.status === 'complete' && (
            <>
              {onRegenerate && (
                <button
                  className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
                  onClick={onRegenerate}
                  title="重新生成"
                  aria-label="重新生成"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
                </button>
              )}
              <button
                className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
                onClick={() => navigator.clipboard.writeText(message.content)}
                title="复制消息"
                aria-label="复制消息"
              >
                <Copy className="w-3.5 h-3.5 text-gray-500" />
              </button>
              <button className="p-1.5 hover:bg-gray-100 rounded-md transition-colors" title="有用" aria-label="有用">
                <ThumbsUp className="w-3.5 h-3.5 text-gray-500" />
              </button>
              <button className="p-1.5 hover:bg-gray-100 rounded-md transition-colors" title="无用" aria-label="无用">
                <ThumbsDown className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessageItem;
