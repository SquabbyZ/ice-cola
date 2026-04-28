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
  FolderPlus,
  Menu,
  X,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChatStore } from '@/stores/chat';
import { useExpertStore } from '@/stores/experts';
import { useConversationStore } from '@/stores/conversations';
import { useGateway } from '@/hooks/useGateway';
import ChatMessageItem from '@/components/ChatMessageItem';
import { ExpertSelector } from '@/components/ExpertSelector';
import { ConversationSidebar } from '@/components/ConversationSidebar';
import { TimeoutManager } from '@/lib/timeout-manager';
import { conversationService } from '@/services/conversation-service';

type Mode = 'start' | 'code' | 'office' | 'task';

const Chat: React.FC = () => {
  const [activeMode, setActiveMode] = useState<Mode>('office');
  const [message, setMessage] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  // 统一的超时管理器
  const timeoutManager = useRef(new TimeoutManager());

  const { messages, addMessage, setMessages, setSending, isSending, sessionKey,
          editingMessageId, setEditingMessageId, deleteMessage,
          addToPendingQueue, removeFromPendingQueue, getPendingMessages, clearPendingQueue } = useChatStore();
  const { prompts: experts, activeExpertId, setActiveExpert, loadPrompts } = useExpertStore();
  const {
    currentConversationId,
    setCurrentConversationId,
    loadConversations,
    createConversation,
  } = useConversationStore();

  // 使用新的 useGateway hook 管理连接
  const { isConnected: gatewayConnected, send, on } = useGateway({ autoConnect: true });
  
  // 调试：打印连接状态
  useEffect(() => {
    console.log('🔗 Chat page - Gateway connected:', gatewayConnected);
  }, [gatewayConnected]);

  // 保持 messages ref 更新
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // 监听器注册标记
  const chatListenerRegisteredRef = useRef(false);

  // 假设 teamId 为 'default'，实际应该从用户上下文获取
  const teamId = 'default';

  // 组件卸载时清理所有超时定时器
  useEffect(() => {
    return () => {
      console.log('🧹 Cleaning up timeout manager on unmount');
      timeoutManager.current.clearAll();
    };
  }, []);

  // 加载专家列表
  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  // 加载会话列表
  useEffect(() => {
    if (gatewayConnected) {
      loadConversations(teamId);
    }
  }, [gatewayConnected, teamId, loadConversations]);

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
        timeoutManager.current.clear(data.runId);

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
        timeoutManager.current.clear(data.runId);

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
        timeoutManager.current.clear(data.runId);

        const text = data.message?.content?.[0]?.text || '';

        const messageIndex = currentMessages.findIndex(msg => msg.runId === data.runId);
        if (messageIndex >= 0) {
          useChatStore.getState().updateMessage(currentMessages[messageIndex].id, {
            content: text,
            status: 'complete',
          });
          
          // 保存助手消息到数据库
          if (currentConversationId) {
            conversationService.addMessage(teamId, currentConversationId, {
              role: 'assistant',
              content: text,
            }).catch(err => console.error('Failed to save assistant message:', err));
          }
        } else if (text) {
          useChatStore.getState().addMessage({
            id: data.runId,
            role: 'assistant',
            content: text,
            timestamp: Date.now(),
            status: 'complete',
            runId: data.runId,
          });
          
          // 保存助手消息到数据库
          if (currentConversationId) {
            conversationService.addMessage(teamId, currentConversationId, {
              role: 'assistant',
              content: text,
            }).catch(err => console.error('Failed to save assistant message:', err));
          }
        }
        useChatStore.getState().setSending(false);
      }
    };

    // 监听 hermes.delta 事件（流式增量）
    const handleHermesDelta = (data: any) => {
      console.log('📨 Hermes delta received:', data);
      if (!data.runId) return;

      const currentMessages = messagesRef.current;
      const messageIndex = currentMessages.findIndex(msg => msg.runId === data.runId);
      
      if (messageIndex >= 0) {
        // Update existing message with accumulated text
        useChatStore.getState().updateMessage(currentMessages[messageIndex].id, {
          content: data.accumulated || '',
          status: 'streaming',
        });
      } else if (data.accumulated) {
        // Create new streaming message
        useChatStore.getState().addMessage({
          id: data.runId,
          role: 'assistant',
          content: data.accumulated,
          timestamp: Date.now(),
          status: 'streaming',
          runId: data.runId,
        });
      }
    };

    // 监听 hermes.final 事件（流式完成）
    const handleHermesFinal = (data: any) => {
      console.log('📨 Hermes final received:', data);
      if (!data.runId) return;

      const currentMessages = messagesRef.current;
      const messageIndex = currentMessages.findIndex(msg => msg.runId === data.runId);
      
      if (messageIndex >= 0) {
        // Mark message as complete
        useChatStore.getState().updateMessage(currentMessages[messageIndex].id, {
          content: data.content || '',
          status: 'complete',
        });
        
        // 保存助手消息到数据库
        if (currentConversationId && data.content) {
          conversationService.addMessage(teamId, currentConversationId, {
            role: 'assistant',
            content: data.content,
          }).catch(err => console.error('Failed to save assistant message:', err));
        }
      } else if (data.content) {
        // Add new completed message
        useChatStore.getState().addMessage({
          id: data.runId,
          role: 'assistant',
          content: data.content,
          timestamp: Date.now(),
          status: 'complete',
          runId: data.runId,
        });
        
        // 保存助手消息到数据库
        if (currentConversationId) {
          conversationService.addMessage(teamId, currentConversationId, {
            role: 'assistant',
            content: data.content,
          }).catch(err => console.error('Failed to save assistant message:', err));
        }
      }
      
      useChatStore.getState().setSending(false);
    };

    chatListenerRegisteredRef.current = true;
    const unsubscribeChat = on('chat', handleChatEvent);
    const unsubscribeHermesDelta = on('hermes.delta', handleHermesDelta);
    const unsubscribeHermesFinal = on('hermes.final', handleHermesFinal);

    // 组件卸载时取消订阅
    return () => {
      unsubscribeChat();
      unsubscribeHermesDelta();
      unsubscribeHermesFinal();
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

  // Load chat history on mount - 延迟加载，等待连接稳定
  useEffect(() => {
    if (!gatewayConnected || isLoadingHistory) return;

    // 等待 2 秒确保连接稳定后再加载历史记录
    const timer = setTimeout(async () => {
      if (messages.length === 0) {
        console.log('📜 Loading chat history after connection stabilization');
        setIsLoadingHistory(true);
        try {
          const history = await loadHistory(sessionKey);
          if (history && history.length > 0) {
            // Convert history to our message format
            const formattedMessages = history.map((msg: any) => ({
              id: msg.id || `${Date.now()}-${Math.random()}`,
              role: msg.role || 'assistant',
              content: msg.content || msg.text || '',
              timestamp: msg.timestamp || Date.now(),
              runId: msg.runId,
              status: 'complete' as const,
            }));
            setMessages(formattedMessages);
            console.log(`✅ Loaded ${formattedMessages.length} messages from history`);
          }
        } catch (error) {
          console.error('Failed to load history:', error);
          // 不阻塞 UI，允许用户继续操作
        } finally {
          setIsLoadingHistory(false);
        }
      }
    }, 2000); // 等待 2 秒确保连接稳定

    return () => clearTimeout(timer);
  }, [gatewayConnected, sessionKey]);

  // 加载历史记录
  const loadHistory = async (key: string = 'default') => {
    try {
      // 使用 conversation.messages 代替 chat.history
      const history = await send('conversation.messages', { 
        conversationId: currentConversationId || key,
        limit: 50 
      });
      return history?.messages || [];
    } catch (error) {
      console.error('Failed to load chat history:', error);
      return [];
    }
  };

  // Gateway 重连成功后自动发送队列中的消息
  useEffect(() => {
    if (gatewayConnected) {
      const pendingMessages = getPendingMessages();
      if (pendingMessages.length > 0) {
        console.log(`📤 Retrying ${pendingMessages.length} pending messages after reconnection`);
        // 逐个重试队列中的消息
        pendingMessages.forEach(async (pendingMsg) => {
          try {
            await send('hermes.send', {
              sessionId: sessionKey,
              message: pendingMsg.content,
            });
            removeFromPendingQueue(pendingMsg.id);
            console.log(`✅ Successfully retried message ${pendingMsg.id}`);
          } catch (error) {
            console.error(`❌ Failed to retry message ${pendingMsg.id}:`, error);
          }
        });
        clearPendingQueue();
      }
    }
  }, [gatewayConnected]);

  const MAX_RETRIES = 3;

  const handleSend = async (retryCount = 0) => {
    if (!message.trim() || isSending) return;

    // 获取友好的错误消息
    const getErrorMessage = (error: any, isConnected: boolean): string => {
      if (!isConnected) {
        return '网关连接已断开，请检查网络连接后重试';
      }

      const errorMsg = error.message || String(error);
      
      if (errorMsg.includes('timeout') || errorMsg.includes('超时')) {
        return '请求超时，可能是网络不稳定或服务器繁忙，请稍后重试';
      }

      if (errorMsg.includes('401') || errorMsg.includes('auth') || errorMsg.includes('认证')) {
        return '认证失败，请检查 API Key 配置';
      }

      if (errorMsg.includes('429')) {
        return '请求过于频繁，请稍后再试';
      }

      if (errorMsg.includes('disconnect') || errorMsg.includes('断开')) {
        return '连接已断开，正在尝试重连...';
      }

      return '消息发送失败，请稍后重试';
    };

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
      // Generate session ID
      const sessionId = sessionKey || 'default';

      // Send to gateway using hermes.send
      const response = await send('hermes.send', {
        sessionId,
        message: userMessage.content,
      });

      // hermes.send returns { ok: true, messageId: string, runId: string, status: 'started' }
      if (response?.ok) {
        const runId = response.runId || response.messageId;
        console.log('📤 Hermes message sent, runId:', runId);
        
        // 创建一个占位符消息，等待流式响应更新
        const placeholderMessage = {
          id: runId,
          role: 'assistant' as const,
          content: '',
          timestamp: Date.now(),
          status: 'streaming' as const,
          runId: runId,
        };
        addMessage(placeholderMessage);
        
        // 设置超时保护（30秒）
        timeoutManager.current.set(runId, () => {
          console.warn('⏰ Stream timeout for runId:', response.runId);
          const currentMessages = messagesRef.current;
          const messageIndex = currentMessages.findIndex(msg => msg.runId === response.runId);
          
          if (messageIndex >= 0) {
            useChatStore.getState().updateMessage(currentMessages[messageIndex].id, {
              content: currentMessages[messageIndex].content || '（响应超时，请重试）',
              status: 'error',
            });
          }
          useChatStore.getState().setSending(false);
        }, 30000);
      }

      // 如果有当前会话，保存用户消息到数据库
      if (currentConversationId) {
        conversationService.addMessage(teamId, currentConversationId, {
          role: 'user',
          content: userMessage.content,
        }).catch(err => console.error('Failed to save user message:', err));
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // 如果是因为网络断开且重试次数未达上限，加入队列
      if (!gatewayConnected && retryCount < MAX_RETRIES) {
        console.log(`⏳ Message queued for retry (${retryCount + 1}/${MAX_RETRIES})`);
        addToPendingQueue({
          id: userMessage.id,
          content: userMessage.content,
          retryCount: retryCount + 1,
          timestamp: Date.now(),
        });
        
        // 更新消息状态为 pending
        useChatStore.getState().updateMessage(userMessage.id, {
          status: 'pending',
        });
      } else {
        // 超过重试次数或其他错误，显示错误消息
        const errorMessage = getErrorMessage(error, gatewayConnected);
        const errorMessageObj = {
          id: (Date.now() + 1).toString(),
          role: 'assistant' as const,
          content: `❌ ${errorMessage}`,
          timestamp: Date.now(),
          status: 'error' as const,
        };
        addMessage(errorMessageObj);
        setSending(false);
      }
    }
    // 注意：不在这里设置 setSending(false)，等待流式响应完成后再设置
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 处理新建对话
  const handleNewConversation = async () => {
    try {
      const title = `新对话 ${new Date().toLocaleDateString('zh-CN')}`;
      const conversation = await createConversation(teamId, title);
      // 清空当前消息，开始新对话
      setMessages([]);
      console.log('✅ Created new conversation:', conversation.id);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  // 处理选择对话
  const handleSelectConversation = async (conversationId: string) => {
    setCurrentConversationId(conversationId);
    setIsLoadingHistory(true);
    
    try {
      // 从后端加载该对话的消息历史
      const detail = await conversationService.getById(teamId, conversationId);
      const formattedMessages = detail.messages.map((msg) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.createdAt).getTime(),
        status: 'complete' as const,
      }));
      setMessages(formattedMessages);
      console.log(`✅ Loaded ${formattedMessages.length} messages from conversation ${conversationId}`);
    } catch (error) {
      console.error('Failed to load conversation messages:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const hasMessages = messages.length > 0;

  // 处理编辑消息
  const handleEditMessage = (id: string, content: string) => {
    setEditingMessageId(id);
    setEditContent(content);
    setMessage(content);
  };

  // 处理删除消息
  const handleDeleteMessage = (id: string) => {
    if (deleteConfirmId === id) {
      // 确认删除
      deleteMessage(id);
      setDeleteConfirmId(null);
      console.log('✅ Message deleted:', id);
    } else {
      // 显示确认
      setDeleteConfirmId(id);
      // 3秒后自动取消确认
      setTimeout(() => {
        setDeleteConfirmId((prev) => (prev === id ? null : prev));
      }, 3000);
    }
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent('');
    setMessage('');
  };

  // 提交编辑
  const handleSubmitEdit = async () => {
    if (!editingMessageId || !editContent.trim()) return;

    // 更新消息内容
    const msgIndex = messages.findIndex((m) => m.id === editingMessageId);
    if (msgIndex >= 0) {
      const updatedMessages = [...messages];
      updatedMessages[msgIndex] = { ...updatedMessages[msgIndex], content: editContent.trim() };
      setMessages(updatedMessages);
    }

    setEditingMessageId(null);
    setEditContent('');
    setMessage('');

    // TODO: 如果需要同步到后端，可以在这里调用 API
  };

  // 编辑模式下键盘事件
  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  return (
    <div className="flex h-full bg-white overflow-hidden">
      {/* Conversation Sidebar */}
      {isSidebarOpen && (
        <ConversationSidebar
          teamId={teamId}
          currentConversationId={currentConversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toggle Sidebar Button - Only show when sidebar is hidden */}
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="absolute left-4 top-4 z-10 p-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-all duration-150 hover:scale-102"
            title="显示侧边栏"
          >
            <Menu className="w-4 h-4 text-gray-600" />
          </button>
        )}

        {/* Main Content Area - Grows to fill available space */}
        {hasMessages ? (
          /* Conversation View */
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="max-w-4xl mx-auto px-8 py-6 space-y-6">
              {messages.map((msg) => {
              const isDeleteConfirming = deleteConfirmId === msg.id;
              return (
                <ChatMessageItem
                  key={msg.id}
                  message={msg}
                  onEdit={msg.role === 'user' ? handleEditMessage : undefined}
                  onDelete={msg.role === 'user' ? handleDeleteMessage : undefined}
                />
              );
            })}
              <div ref={messagesEndRef} />
            </div>
          </div>
        ) : (
          /* Welcome View - Clean & Simple */
          <div className="flex-1 overflow-y-auto bg-white">
            <div className="max-w-3xl mx-auto px-6 py-12">
              {/* Hero Section - Minimal */}
              <div className="text-center mb-10">
                {/* Logo - Simple */}
                <div className="mb-6">
                  <div className="w-24 h-24 mx-auto bg-indigo-50 rounded-2xl flex items-center justify-center">
                    <svg viewBox="0 0 200 200" className="w-20 h-20">
                      <circle cx="100" cy="100" r="90" fill="none" stroke="#6366F1" strokeWidth="8"/>
                      <circle cx="75" cy="80" r="12" fill="#6366F1"/>
                      <circle cx="125" cy="80" r="12" fill="#6366F1"/>
                      <path d="M 65 120 Q 100 140 135 120" fill="none" stroke="#6366F1" strokeWidth="6" strokeLinecap="round"/>
                    </svg>
                  </div>
                </div>
                
                <h1 className="text-3xl font-semibold text-gray-900 mb-3">
                  Claw Your Ideas Into Reality
                </h1>
                <p className="text-base text-gray-500">
                  Triggered Anywhere, Completed Locally
                </p>
              </div>

              {/* Quick Actions - Simple Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl mx-auto">
                {[
                  { icon: Code, label: '代码开发' },
                  { icon: MessageSquare, label: '日常办公' },
                  { icon: FileText, label: '文档处理' },
                  { icon: BarChart3, label: '数据分析' },
                  { icon: Search, label: '深度研究' },
                  { icon: Presentation, label: '幻灯片' },
                ].map((action) => (
                  <button
                    key={action.label}
                    className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                  >
                    <action.icon className="w-4 h-4" />
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Input Area - Simple & Clean */}
        <div className="border-t border-gray-100 bg-white p-4">
          <div className="max-w-3xl mx-auto">
            {/* Edit Mode Banner */}
            {editingMessageId && (
              <div className="mb-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between">
                <span className="text-sm text-indigo-700">正在编辑消息</span>
                <button
                  onClick={handleCancelEdit}
                  className="p-1 hover:bg-indigo-100 rounded"
                >
                  <X className="w-4 h-4 text-indigo-600" />
                </button>
              </div>
            )}

            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
              {/* Textarea */}
              <textarea
                ref={editingMessageId ? editInputRef : undefined}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (editingMessageId) setEditContent(e.target.value);
                }}
                onKeyDown={editingMessageId ? handleEditKeyDown : handleKeyDown}
                placeholder={gatewayConnected ? (editingMessageId ? "修改消息..." : "输入消息...") : "正在连接网关..."}
                disabled={isSending || !gatewayConnected}
                className="w-full min-h-[80px] px-3 py-2.5 bg-transparent text-sm focus:outline-none resize-none disabled:opacity-50 placeholder:text-gray-400"
              />

              {/* Bottom Toolbar - Simplified */}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                <div className="flex items-center gap-1">
                  {!editingMessageId && (
                    <>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100">
                        <AtSign className="w-4 h-4 text-gray-500" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100">
                        <Paperclip className="w-4 h-4 text-gray-500" />
                      </Button>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {editingMessageId ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 hover:bg-gray-100"
                        onClick={handleCancelEdit}
                      >
                        取消
                      </Button>
                      <Button
                        size="icon"
                        className="h-8 w-8 bg-indigo-500 hover:bg-indigo-600 rounded-lg"
                        onClick={handleSubmitEdit}
                        disabled={!editContent.trim()}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="icon"
                      className="h-8 w-8 bg-indigo-500 hover:bg-indigo-600 rounded-lg disabled:opacity-50"
                      onClick={() => handleSend()}
                      disabled={!message.trim() || isSending || !gatewayConnected}
                    >
                      {isSending ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <p className="text-center text-[11px] text-gray-400 mt-2">
              内容由 AI 生成，请核实重要信息。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
