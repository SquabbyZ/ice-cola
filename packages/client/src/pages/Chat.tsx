import React, { useState, useRef, useEffect } from 'react';
import { 
  Code, 
  MessageSquare, 
  FileText, 
  TrendingUp, 
  BarChart3, 
  Search, 
  FolderOpen, 
  Presentation, 
  Palette, 
  Mail,
  AtSign,
  Paperclip,
  Mic,
  Send,
  ChevronDown,
  Sparkles,
  FolderPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChatStore } from '@/stores/chat';
import { useExpertStore } from '@/stores/experts';
import { useGateway } from '@/hooks/useGateway';
import ChatMessageItem from '@/components/ChatMessageItem';
import { ExpertSelector } from '@/components/ExpertSelector';

type Mode = 'start' | 'code' | 'office' | 'task';

const Chat: React.FC = () => {
  const [activeMode, setActiveMode] = useState<Mode>('office');
  const [message, setMessage] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, addMessage, setMessages, setSending, isSending, sessionKey } = useChatStore();
  const { prompts: experts, activeExpertId, setActiveExpert, loadPrompts } = useExpertStore();

  // 使用新的 useGateway hook 管理连接
  const { isConnected: gatewayConnected, send, on } = useGateway({ autoConnect: true });

  // 保持 messages ref 更新
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // 监听器注册标记
  const chatListenerRegisteredRef = useRef(false);

  // 加载专家列表
  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  // 监听 Gateway chat 事件（流式响应和错误处理）
  useEffect(() => {
    if (chatListenerRegisteredRef.current) {
      return;
    }

    const handleChatEvent = (data: any) => {
      if (!data.runId) return;

      const currentMessages = messagesRef.current;

      if (data.state === 'error') {
        // 清除超时
        if (streamingTimeoutRef.current.has(data.runId)) {
          clearTimeout(streamingTimeoutRef.current.get(data.runId)!);
          streamingTimeoutRef.current.delete(data.runId);
        }

        const messageIndex = currentMessages.findIndex(msg => msg.runId === data.runId);
        const errorMessage = data.errorMessage || '消息发送失败，请稍后重试';

        if (messageIndex >= 0) {
          useChatStore.getState().updateMessage(currentMessages[messageIndex].id, {
            content: `❌ ${errorMessage}`,
            status: 'error',
          });
        } else {
          useChatStore.getState().addMessage({
            id: Date.now().toString(),
            role: 'assistant',
            content: `❌ ${errorMessage}`,
            timestamp: Date.now(),
            status: 'error',
          });
        }
        useChatStore.getState().setSending(false);
        return;
      }

      if (data.state === 'delta') {
        // 清除超时
        if (streamingTimeoutRef.current.has(data.runId)) {
          clearTimeout(streamingTimeoutRef.current.get(data.runId)!);
          streamingTimeoutRef.current.delete(data.runId);
        }

        // gateway sends message.content[0].text as accumulated text
        const text = data.message?.content?.[0]?.text || '';

        const messageIndex = currentMessages.findIndex(msg => msg.runId === data.runId);
        if (messageIndex >= 0) {
          useChatStore.getState().updateMessage(currentMessages[messageIndex].id, {
            content: text,
            status: 'streaming',
          });
        } else if (text) {
          // Create placeholder message for first delta
          useChatStore.getState().addMessage({
            id: data.runId,
            role: 'assistant',
            content: text,
            timestamp: Date.now(),
            status: 'streaming',
            runId: data.runId,
          });
        }
        return;
      }

      if (data.state === 'final') {
        // 清除超时
        if (streamingTimeoutRef.current.has(data.runId)) {
          clearTimeout(streamingTimeoutRef.current.get(data.runId)!);
          streamingTimeoutRef.current.delete(data.runId);
        }

        const text = data.message?.content?.[0]?.text || '';

        const messageIndex = currentMessages.findIndex(msg => msg.runId === data.runId);
        if (messageIndex >= 0) {
          useChatStore.getState().updateMessage(currentMessages[messageIndex].id, {
            content: text,
            status: 'complete',
          });
        } else if (text) {
          useChatStore.getState().addMessage({
            id: data.runId,
            role: 'assistant',
            content: text,
            timestamp: Date.now(),
            status: 'complete',
            runId: data.runId,
          });
        }
        useChatStore.getState().setSending(false);
      }
    };

    chatListenerRegisteredRef.current = true;
    const unsubscribe = on('chat', handleChatEvent);

    // 组件卸载时取消订阅
    return () => {
      unsubscribe();
      chatListenerRegisteredRef.current = false;
    };
  }, [on]);

  const modes: { id: Mode; icon: React.FC<any>; label: string }[] = [
    { id: 'start', icon: Sparkles, label: '开始' },
    { id: 'code', icon: Code, label: '代码开发' },
    { id: 'office', icon: MessageSquare, label: '日常办公' },
    { id: 'task', icon: FolderOpen, label: '任务' },
  ];

  const quickActions = [
    { icon: FileText, label: '文档处理' },
    { icon: TrendingUp, label: '金融服务' },
    { icon: BarChart3, label: '数据分析及可视化' },
    { icon: Search, label: '深度研究' },
    { icon: FolderOpen, label: '产品管理' },
    { icon: Presentation, label: '幻灯片' },
    { icon: Palette, label: '设计' },
    { icon: Mail, label: '邮件编辑' },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat history on mount
  useEffect(() => {
    const loadInitialHistory = async () => {
      if (gatewayConnected && messages.length === 0 && !isLoadingHistory) {
        setIsLoadingHistory(true);
        try {
          const history = await loadHistory(sessionKey);
          if (history && history.length > 0) {
            // Convert history to our message format
            const formattedMessages = history.map((msg: any) => ({
              id: msg.id || Date.now().toString() + Math.random(),
              role: msg.role || 'assistant',
              content: msg.content || msg.text || '',
              timestamp: msg.timestamp || Date.now(),
              runId: msg.runId,
              status: 'complete' as const,
            }));
            setMessages(formattedMessages);
          }
        } catch (error) {
          console.error('Failed to load history:', error);
        } finally {
          setIsLoadingHistory(false);
        }
      }
    };

    loadInitialHistory();
  }, [gatewayConnected, sessionKey, send]);

  // 加载历史记录
  const loadHistory = async (key: string = 'default') => {
    try {
      const history = await send('chat.history', { sessionKey: key });
      return history?.messages || [];
    } catch (error) {
      console.error('Failed to load chat history:', error);
      return [];
    }
  };

  // 跟踪 streaming 消息的超时定时器
  const streamingTimeoutRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const handleSend = async () => {
    if (!message.trim() || isSending) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: message.trim(),
      timestamp: Date.now(),
      status: 'complete' as const,
    };

    addMessage(userMessage);
    setMessage('');
    setSending(true);

    try {
      // Generate idempotency key for this message (also used as runId)
      const idempotencyKey = `${sessionKey}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

      // Send to gateway with correct parameter format
      const response = await send('chat.send', {
        sessionKey,
        message: userMessage.content,
        idempotencyKey,
      });

      // chat.send returns { runId, status: "started" } for streaming
      // Response comes via 'chat' events (delta/final/error)
      if (response?.runId) {
        // Add a placeholder message that will be updated by streaming events
        const assistantMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant' as const,
          content: '',
          timestamp: Date.now(),
          status: 'streaming' as const,
          runId: response.runId,
        };
        addMessage(assistantMessage);

        // 设置超时保护：如果 15 秒内没有收到任何响应，标记为错误
        const timeoutId = setTimeout(() => {
          console.warn(`⏱️ Streaming timeout for runId: ${response.runId}`);
          const currentMessages = messagesRef.current;
          const messageIndex = currentMessages.findIndex(msg => msg.runId === response.runId);
          if (messageIndex >= 0) {
            const msg = currentMessages[messageIndex];
            if (msg.status === 'streaming') {
              let errorMessage = '请求超时，未收到响应。';
              if (!gatewayConnected) {
                errorMessage = '连接已断开，消息发送失败。请检查网络连接后重试。';
              } else {
                errorMessage = 'API Key 可能无效或服务器响应超时，请检查配置后重试。';
              }
              useChatStore.getState().updateMessage(msg.id, {
                content: msg.content || `❌ ${errorMessage}`,
                status: 'error',
              });
              useChatStore.getState().setSending(false);
            }
          }
          streamingTimeoutRef.current.delete(response.runId);
        }, 15000);

        streamingTimeoutRef.current.set(response.runId, timeoutId);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: '抱歉，网关连接出现问题，请稍后重试。',
        timestamp: Date.now(),
        status: 'error' as const,
      };
      addMessage(errorMessage);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Main Content Area - Grows to fill available space */}
      {hasMessages ? (
        /* Conversation View */
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="max-w-4xl mx-auto px-8 py-6 space-y-6">
            {messages.map((msg) => (
              <ChatMessageItem key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
      ) : (
        /* Welcome View */
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-8 py-12">
            {/* Hero Section */}
            <div className="text-center mb-10">
              {/* Logo/Illustration */}
              <div className="mb-6">
                <div className="w-32 h-32 mx-auto bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                  <svg viewBox="0 0 200 200" className="w-28 h-28">
                    <circle cx="100" cy="100" r="90" fill="none" stroke="#3b82f6" strokeWidth="2"/>
                    <circle cx="75" cy="80" r="15" fill="#3b82f6"/>
                    <circle cx="125" cy="80" r="15" fill="#3b82f6"/>
                    <path d="M 60 120 Q 100 140 140 120" fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round"/>
                    <line x1="70" y1="50" x2="85" y2="30" stroke="#3b82f6" strokeWidth="2"/>
                    <line x1="130" y1="50" x2="115" y2="30" stroke="#3b82f6" strokeWidth="2"/>
                  </svg>
                </div>
              </div>
              
              <h1 className="text-3xl font-bold text-gray-900 mb-3">
                Claw Your Ideas Into Reality
              </h1>
              <p className="text-gray-500 flex items-center justify-center gap-1">
                Triggered Anywhere, Completed Locally
                <Sparkles className="w-4 h-4 text-primary" />
              </p>
            </div>

            {/* Mode Selector */}
            <div className="flex items-center justify-center gap-2 mb-8">
              {modes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setActiveMode(mode.id)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium transition-all ${
                    activeMode === mode.id
                      ? 'bg-gray-900 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <mode.icon className="w-4 h-4" />
                  {mode.label}
                </button>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700 transition-colors"
                >
                  <action.icon className="w-4 h-4" />
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input Area - Fixed at bottom, always visible */}
      <div className="border-t border-gray-200 bg-white p-4">
        <div className="max-w-4xl mx-auto">
          {/* 专家选择器 */}
          <div className="mb-3 flex items-center justify-between">
            <ExpertSelector
              experts={experts}
              activeExpertId={activeExpertId}
              onSelectExpert={setActiveExpert}
            />
            {activeExpertId && (
              <span className="text-xs text-gray-500">
                当前: {experts.find(e => e.id === activeExpertId)?.name || '通用助手'}
              </span>
            )}
          </div>

          <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200">
            {/* Input Toolbar */}
            <div className="flex items-center gap-2 mb-2">
              <button className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors">
                <AtSign className="w-4 h-4 text-gray-600" />
              </button>
              <button className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors">
                <Paperclip className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Textarea */}
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={gatewayConnected ? "输入消息..." : "正在连接网关..."}
              disabled={isSending || !gatewayConnected}
              className="w-full min-h-[80px] px-4 py-3 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none disabled:opacity-50"
            />

            {/* Bottom Toolbar */}
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1 h-8">
                  <FolderPlus className="w-4 h-4" />
                  Craft
                  <ChevronDown className="w-3 h-3" />
                </Button>
                <Button variant="outline" size="sm" className="gap-1 h-8">
                  <Sparkles className="w-4 h-4" />
                  Auto
                  <ChevronDown className="w-3 h-3" />
                </Button>
                <Button variant="outline" size="sm" className="gap-1 h-8">
                  <Sparkles className="w-4 h-4" />
                  Skills
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1 h-8">
                  <FolderOpen className="w-4 h-4" />
                  选择文件夹
                  <ChevronDown className="w-3 h-3" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <Mic className="w-4 h-4" />
                </Button>
                <Button 
                  size="icon" 
                  className="h-8 w-8 bg-primary hover:bg-primary/90"
                  onClick={handleSend}
                  disabled={!message.trim() || isSending || !gatewayConnected}
                >
                  {isSending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Connection Status */}
          {!gatewayConnected && (
            <div className="text-center mt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-50 text-yellow-700 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                正在连接到 OpenClaw Gateway...
              </span>
            </div>
          )}

          {/* Disclaimer */}
          <p className="text-center text-xs text-gray-400 mt-3">
            内容由 AI 生成，请核实重要信息。
          </p>
        </div>
      </div>
    </div>
  );
};

export default Chat;
