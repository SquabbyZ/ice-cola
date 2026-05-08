import React, { useState, useRef, useEffect } from 'react';
import {
  Code,
  MessageSquare,
  FileText,
  BarChart3,
  Search,
  Presentation,
  AtSign,
  Paperclip,
  Send,
  Menu,
  X,
  Check,
  Square
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChatStore, type Attachment } from '@/stores/chat';
import { useExpertStore } from '@/stores/experts';
import { useConversationStore } from '@/stores/conversations';
import { useAuthStore } from '@/stores/authStore';
import { useGateway } from '@/hooks/useGateway';
import ChatMessageItem from '@/components/ChatMessageItem';
import { ExpertSelector } from '@/components/ExpertSelector';
import { MCPSelector } from '@/components/MCPSelector';
import { ConversationSidebar } from '@/components/ConversationSidebar';
import { TimeoutManager } from '@/lib/timeout-manager';
import { conversationService } from '@/services/conversation-service';
import { conversationMCPService } from '@/services/conversation-mcp-service';

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}


const Chat: React.FC = () => {
  // const [activeMode, setActiveMode] = useState<Mode>('office');
  const [message, setMessage] = useState('');
  const [editContent, setEditContent] = useState('');
  const [_isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [selectedMCPServerIds, setSelectedMCPServerIds] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 统一的超时管理器
  const timeoutManager = useRef(new TimeoutManager());

  const { messages, addMessage, setMessages, setSending, isSending, sessionKey,
          editingMessageId, setEditingMessageId, deleteMessage,
          addToPendingQueue, removeFromPendingQueue, getPendingMessages, clearPendingQueue,
          activeStreamId, setActiveStreamId } = useChatStore();
  const { loadPrompts } = useExpertStore();
  const {
    currentConversationId,
    setCurrentConversationId,
    loadConversations,
    createConversation,
    conversations,
    renameConversation,
  } = useConversationStore();

  // 使用新的 useGateway hook 管理连接
  const { isConnected: gatewayConnected, send, on } = useGateway({ autoConnect: true });
  
  // 保持 messages ref 更新
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // 监听器注册标记
  const chatListenerRegisteredRef = useRef(false);

  // 累积 delta 的 buffer（因为服务器发送增量 delta，需要客户端拼接）
  const deltaAccumulatorRef = useRef<Record<string, string>>({});

  // 从 authStore 获取 teamId
  const user = useAuthStore(state => state.user);
  const teamId = user?.team?.id || 'default';

  // 组件卸载时清理所有超时定时器
  useEffect(() => {
    return () => {
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

  // 加载当前对话的 MCP 服务器选择
  useEffect(() => {
    if (currentConversationId) {
      conversationMCPService.getConversationMCPServers(currentConversationId)
        .then(servers => {
          setSelectedMCPServerIds(servers.map(s => s.server_id));
        })
        .catch(err => console.error('Failed to load MCP servers for conversation:', err));
    }
  }, [currentConversationId]);

  // 处理 MCP 服务器选择变化
  const handleMCPSelectionChange = async (serverIds: string[]) => {
    setSelectedMCPServerIds(serverIds);
    if (currentConversationId) {
      try {
        await conversationMCPService.setConversationMCPServers(currentConversationId, serverIds);
      } catch (err) {
        console.error('Failed to save MCP server selection:', err);
      }
    }
  };

  // 监听 Gateway hermes 事件（流式响应和错误处理）
  useEffect(() => {
    if (chatListenerRegisteredRef.current) {
      return;
    }

    // 监听 hermes.delta 事件（流式增量）
    // 服务器发送 messageId + delta（增量文本），需要客户端累积拼接
    const handleHermesDelta = (data: any) => {
      const msgId = data.messageId || data.runId;
      if (!msgId) return;

      // 累积 delta 文本
      deltaAccumulatorRef.current[msgId] = (deltaAccumulatorRef.current[msgId] || '') + (data.delta || '');
      const accumulated = deltaAccumulatorRef.current[msgId];

      const currentMessages = messagesRef.current;
      const messageIndex = currentMessages.findIndex(msg => msg.runId === msgId);

      if (messageIndex >= 0) {
        useChatStore.getState().updateMessage(currentMessages[messageIndex].id, {
          content: accumulated,
          status: 'streaming',
        });
      } else if (accumulated) {
        useChatStore.getState().addMessage({
          id: msgId,
          role: 'assistant',
          content: accumulated,
          timestamp: Date.now(),
          status: 'streaming',
          runId: msgId,
        });
      }

      // 清除超时保护
      timeoutManager.current.clear(msgId);
    };

    // 监听 hermes.final 事件（流式完成）
    // 服务器发送 messageId + content（完整文本）
    const handleHermesFinal = (data: any) => {
      const msgId = data.messageId || data.runId;
      if (!msgId) return;

      // 清除超时保护
      timeoutManager.current.clear(msgId);

      // 优先使用服务器发来的完整 content，其次用累积的 delta
      const finalContent = data.content || deltaAccumulatorRef.current[msgId] || '';

      const currentMessages = messagesRef.current;
      const messageIndex = currentMessages.findIndex(msg => msg.runId === msgId);

      if (messageIndex >= 0) {
        useChatStore.getState().updateMessage(currentMessages[messageIndex].id, {
          content: finalContent,
          status: 'complete',
        });

        // 保存助手消息到数据库
        if (currentConversationId && finalContent) {
          conversationService.addMessage(teamId, currentConversationId, {
            role: 'assistant',
            content: finalContent,
          });
        }
      } else if (finalContent) {
        // Check if delta handler already created this message (by id)
        const existingById = currentMessages.find(msg => msg.id === msgId);
        if (!existingById) {
          useChatStore.getState().addMessage({
            id: msgId,
            role: 'assistant',
            content: finalContent,
            timestamp: Date.now(),
            status: 'complete',
            runId: msgId,
          });
        }

        // 保存助手消息到数据库
        if (currentConversationId) {
          conversationService.addMessage(teamId, currentConversationId, {
            role: 'assistant',
            content: finalContent,
          });
        }
      }

      // 清理累积 buffer
      delete deltaAccumulatorRef.current[msgId];
      useChatStore.getState().setSending(false);
      useChatStore.getState().setActiveStreamId(null);
    };

    // 监听 hermes.error 事件
    const handleHermesError = (data: any) => {
      const msgId = data.messageId || data.runId;
      if (!msgId) return;

      timeoutManager.current.clear(msgId);
      const currentMessages = messagesRef.current;
      const messageIndex = currentMessages.findIndex(msg => msg.runId === msgId);
      const errorMessage = data.error || '消息发送失败，请稍后重试';

      if (messageIndex >= 0) {
        useChatStore.getState().updateMessage(currentMessages[messageIndex].id, {
          content: `❌ ${errorMessage}`,
          status: 'error',
        });
      } else {
        useChatStore.getState().addMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `❌ ${errorMessage}`,
          timestamp: Date.now(),
          status: 'error',
        });
      }

      // 清理累积 buffer
      delete deltaAccumulatorRef.current[msgId];
      useChatStore.getState().setSending(false);
      useChatStore.getState().setActiveStreamId(null);
    };

    // 监听 hermes.tool 事件（工具调用进度）
    const handleHermesTool = (data: any) => {
      const msgId = data.messageId || data.runId;
      if (!msgId) return;

      const currentMessages = messagesRef.current;
      const messageIndex = currentMessages.findIndex(msg => msg.runId === msgId);
      if (messageIndex < 0) return;

      const msg = currentMessages[messageIndex];
      const existingToolCall = msg.toolCalls?.find(tc => tc.toolCallId === data.toolCallId);

      if (existingToolCall) {
        useChatStore.getState().updateToolCall(msg.id, data.toolCallId, {
          output: data.output || existingToolCall.output,
          imageUrl: data.imageUrl || existingToolCall.imageUrl,
          status: data.status || 'running',
        });
      } else {
        useChatStore.getState().addToolCall(msg.id, {
          toolCallId: data.toolCallId,
          toolName: data.toolName,
          input: data.input,
          status: data.status || 'running',
        });
      }
    };

    chatListenerRegisteredRef.current = true;
    const unsubscribeHermesDelta = on('hermes.delta', handleHermesDelta);
    const unsubscribeHermesFinal = on('hermes.final', handleHermesFinal);
    const unsubscribeHermesError = on('hermes.error', handleHermesError);
    const unsubscribeHermesTool = on('hermes.tool', handleHermesTool);

    // 组件卸载时取消订阅
    return () => {
      unsubscribeHermesDelta();
      unsubscribeHermesFinal();
      unsubscribeHermesError();
      unsubscribeHermesTool();
      chatListenerRegisteredRef.current = false;
    };
  }, [on, currentConversationId, teamId]);

//   const modes: { id: Mode; icon: React.FC<any>; label: string }[] = [
//     { id: 'start', icon: Sparkles, label: '开始' },
//     { id: 'code', icon: Code, label: '代码开发' },
//     { id: 'office', icon: MessageSquare, label: '日常办公' },
//     { id: 'task', icon: FolderOpen, label: '任务' },
//   ];

//   const quickActions = [
//     { icon: FileText, label: '文档处理' },
//     { icon: TrendingUp, label: '金融服务' },
//     { icon: BarChart3, label: '数据分析及可视化' },
//     { icon: Search, label: '深度研究' },
//     { icon: FolderOpen, label: '产品管理' },
//     { icon: Presentation, label: '幻灯片' },
//     { icon: Palette, label: '设计' },
//     { icon: Mail, label: '邮件编辑' },
//   ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Gateway 重连成功后自动发送队列中的消息
  useEffect(() => {
    if (gatewayConnected) {
      const pendingMessages = getPendingMessages();
      if (pendingMessages.length > 0) {
        // 逐个重试队列中的消息
        pendingMessages.forEach(async (pendingMsg) => {
          try {
            await send('hermes.send', {
              sessionId: sessionKey,
              message: pendingMsg.content,
            });
            removeFromPendingQueue(pendingMsg.id);
          } catch {
            // retry failed silently
          }
        });
        clearPendingQueue();
      }
    }
  }, [gatewayConnected]);

  const MAX_RETRIES = 3;

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

  // 核心发送逻辑
  const handleSendWithContent = async (content: string, retryCount = 0) => {
    if ((!content && attachments.length === 0) || isSending) return;

    const userMessage = {
      id: crypto.randomUUID(),
      role: 'user' as const,
      content: content || '[附件]',
      timestamp: Date.now(),
      status: 'complete' as const,
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };

    addMessage(userMessage);
    setMessage('');
    setSending(true);

    try {
      const sessionId = sessionKey || 'default';

      const response = await send('hermes.send', {
        sessionId,
        message: userMessage.content,
        conversationId: currentConversationId || undefined,
        expertId: useExpertStore.getState().activeExpertId || undefined,
        attachments: attachments.length > 0 ? attachments.map(a => ({
          type: a.type,
          name: a.name,
          mimeType: a.mimeType,
          data: a.data,
        })) : undefined,
      });
      setAttachments([]);

      if (response?.ok) {
        const runId = response.runId || response.messageId;

        const placeholderMessage = {
          id: runId,
          role: 'assistant' as const,
          content: '',
          timestamp: Date.now(),
          status: 'streaming' as const,
          runId: runId,
        };
        addMessage(placeholderMessage);
        setActiveStreamId(runId);

        timeoutManager.current.set(runId, () => {
          const currentMessages = messagesRef.current;
          const messageIndex = currentMessages.findIndex(msg => msg.runId === runId);

          if (messageIndex >= 0) {
            useChatStore.getState().updateMessage(currentMessages[messageIndex].id, {
              content: currentMessages[messageIndex].content || '（响应超时，请重试）',
              status: 'error',
            });
          }
          useChatStore.getState().setSending(false);
        }, 30000);
      }

      if (currentConversationId) {
        conversationService.addMessage(teamId, currentConversationId, {
          role: 'user',
          content: userMessage.content,
        });

        const currentConv = conversations.find(c => c.id === currentConversationId);
        if (currentConv && !currentConv.title) {
          const newTitle = generateTitle(userMessage.content);
          renameConversation(teamId, currentConversationId, newTitle);
        }
      }
    } catch (error) {
      if (!gatewayConnected && retryCount < MAX_RETRIES) {
        addToPendingQueue({
          id: userMessage.id,
          content: userMessage.content,
          retryCount: retryCount + 1,
          timestamp: Date.now(),
        });

        useChatStore.getState().updateMessage(userMessage.id, {
          status: 'pending',
        });
      } else {
        const errorMessage = getErrorMessage(error, gatewayConnected);
        const errorMessageObj = {
          id: crypto.randomUUID(),
          role: 'assistant' as const,
          content: `❌ ${errorMessage}`,
          timestamp: Date.now(),
          status: 'error' as const,
        };
        addMessage(errorMessageObj);
        setSending(false);
      }
    }
  };

  const handleSend = () => {
    handleSendWithContent(message.trim());
  };

  // 重新生成最后一条 AI 回复
  const handleRegenerate = () => {
    if (isSending) return;

    // 找到最后一条 AI 回复和对应的用户消息
    const lastAssistantIdx = [...messages].reverse().findIndex(m => m.role === 'assistant' && m.status === 'complete');
    if (lastAssistantIdx === -1) return;

    const realIdx = messages.length - 1 - lastAssistantIdx;
    const lastAssistant = messages[realIdx];

    // 找到这条 AI 回复之前的最后一条用户消息
    const lastUserMsg = [...messages.slice(0, realIdx)].reverse().find(m => m.role === 'user');
    if (!lastUserMsg) return;

    // 删除最后一条 AI 回复
    deleteMessage(lastAssistant.id);

    // 重新发送用户消息
    handleSendWithContent(lastUserMsg.content);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 停止生成
  const handleStopGeneration = () => {
    if (!activeStreamId) return;
    send('hermes.abort', { messageId: activeStreamId });
    setActiveStreamId(null);
    setSending(false);
  };

  // 生成对话标题（截取前20个字符）
  const generateTitle = (content: string): string => {
    const trimmed = content.trim();
    if (trimmed.length <= 20) return trimmed;
    return trimmed.slice(0, 20) + '...';
  };

  // 处理新建对话
  const handleNewConversation = async () => {
    try {
      await createConversation(teamId, '');
      // 清空当前消息，开始新对话
      setMessages([]);
    } catch {
      // create conversation failed
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
    } catch {
      // load conversation messages failed
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
      // 同步到服务器
      if (currentConversationId) {
        conversationService.deleteMessage(teamId, currentConversationId, id).catch(() => {
          // sync failed, local state already updated
        });
      }
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        continue;
      }
      const data = await readFileAsBase64(file);
      newAttachments.push({
        id: crypto.randomUUID(),
        type: file.type.startsWith('image/') ? 'image' : 'file',
        name: file.name,
        url: URL.createObjectURL(file),
        mimeType: file.type,
        data,
      });
    }
    setAttachments(prev => [...prev, ...newAttachments]);
    e.target.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => {
      const att = prev.find(a => a.id === id);
      if (att) URL.revokeObjectURL(att.url);
      return prev.filter(a => a.id !== id);
    });
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

    // 同步到服务器
    if (currentConversationId) {
      conversationService.updateMessage(teamId, currentConversationId, editingMessageId, {
        content: editContent.trim(),
      }).catch(() => {
        // sync failed, local state already updated
      });
    }
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
              {messages.map((msg, index) => {
              const isLastAssistant = msg.role === 'assistant' && msg.status === 'complete'
                && (index === messages.length - 1 || messages.slice(index + 1).every(m => m.role !== 'assistant' || m.status !== 'complete'));
              return (
                <ChatMessageItem
                  key={msg.id}
                  message={msg}
                  onEdit={msg.role === 'user' ? handleEditMessage : undefined}
                  onDelete={msg.role === 'user' ? handleDeleteMessage : undefined}
                  onRegenerate={isLastAssistant ? handleRegenerate : undefined}
                />
              );
            })}
              <div ref={messagesEndRef} />
            </div>
          </div>
        ) : (
          /* Welcome View */
          <div className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 to-white">
            <div className="max-w-4xl mx-auto px-6 py-16">
              {/* Hero Section */}
              <div className="text-center mb-14">
                <div className="mb-6">
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <svg viewBox="0 0 200 200" className="w-12 h-12">
                      <circle cx="100" cy="100" r="90" fill="none" stroke="white" strokeWidth="8"/>
                      <circle cx="75" cy="80" r="12" fill="white"/>
                      <circle cx="125" cy="80" r="12" fill="white"/>
                      <path d="M 65 120 Q 100 140 135 120" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round"/>
                    </svg>
                  </div>
                </div>
                <h1 className="text-4xl font-bold text-gray-900 mb-3 tracking-tight">
                  Claw Your Ideas Into Reality
                </h1>
                <p className="text-lg text-gray-400 font-medium">
                  Triggered Anywhere, Completed Locally
                </p>
              </div>

              {/* Suggestion Cards - Bento Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
                {[
                  {
                    icon: Code,
                    label: '代码开发',
                    desc: '编写、调试、重构代码',
                    prompt: '帮我写一个功能：实现一个高性能的 Node.js REST API，包含用户认证、数据校验和错误处理。',
                    gradient: 'from-blue-500 to-cyan-500',
                    bg: 'bg-blue-50',
                    iconColor: 'text-blue-600',
                  },
                  {
                    icon: MessageSquare,
                    label: '日常办公',
                    desc: '写作、翻译、总结',
                    prompt: '帮我写一封专业的商务邮件，主题是关于下周的项目合作会议邀请。',
                    gradient: 'from-emerald-500 to-teal-500',
                    bg: 'bg-emerald-50',
                    iconColor: 'text-emerald-600',
                  },
                  {
                    icon: FileText,
                    label: '文档处理',
                    desc: '解析、提取、生成文档',
                    prompt: '帮我整理一份项目技术方案文档的模板，包含需求分析、架构设计、接口定义和部署方案。',
                    gradient: 'from-amber-500 to-orange-500',
                    bg: 'bg-amber-50',
                    iconColor: 'text-amber-600',
                  },
                  {
                    icon: BarChart3,
                    label: '数据分析',
                    desc: '统计、可视化、洞察',
                    prompt: '帮我分析一组用户活跃数据的趋势，给出关键指标的变化分析和改进建议。',
                    gradient: 'from-violet-500 to-purple-500',
                    bg: 'bg-violet-50',
                    iconColor: 'text-violet-600',
                  },
                  {
                    icon: Search,
                    label: '深度研究',
                    desc: '搜索、整合、分析',
                    prompt: '搜索并总结最新的 AI Agent 技术发展趋势，包括主流框架对比和应用场景。',
                    gradient: 'from-rose-500 to-pink-500',
                    bg: 'bg-rose-50',
                    iconColor: 'text-rose-600',
                  },
                  {
                    icon: Presentation,
                    label: '幻灯片',
                    desc: '演示文稿内容规划',
                    prompt: '帮我规划一个 10 页的产品发布会演示文稿大纲，主题是 AI 驱动的智能助手。',
                    gradient: 'from-indigo-500 to-blue-500',
                    bg: 'bg-indigo-50',
                    iconColor: 'text-indigo-600',
                  },
                  {
                    icon: AtSign,
                    label: '邮件编辑',
                    desc: '专业邮件撰写',
                    prompt: '帮我撰写一封客户投诉回复邮件，保持专业且有同理心的语气，提出解决方案。',
                    gradient: 'from-sky-500 to-blue-500',
                    bg: 'bg-sky-50',
                    iconColor: 'text-sky-600',
                  },
                  {
                    icon: BarChart3,
                    label: '产品规划',
                    desc: '路线图、需求分析',
                    prompt: '帮我制定一个 Q3 产品路线图，包括核心功能迭代计划、技术债务清理和用户体验优化。',
                    gradient: 'from-fuchsia-500 to-purple-500',
                    bg: 'bg-fuchsia-50',
                    iconColor: 'text-fuchsia-600',
                  },
                ].map((action) => (
                  <button
                    key={action.label}
                    onClick={() => handleSendWithContent(action.prompt)}
                    className={`group relative flex flex-col items-start p-5 rounded-2xl border border-gray-100 bg-white
                      hover:shadow-lg hover:shadow-gray-200/50 hover:border-transparent hover:-translate-y-0.5
                      active:scale-[0.98] transition-all duration-300 text-left`}
                  >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center mb-3
                      shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all duration-300`}>
                      <action.icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 mb-1">{action.label}</span>
                    <span className="text-xs text-gray-400 leading-relaxed">{action.desc}</span>
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
              {/* Tools Bar */}
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200">
                <ExpertSelector
                  experts={useExpertStore.getState().prompts}
                  activeExpertId={useExpertStore.getState().activeExpertId}
                  onSelectExpert={(id) => useExpertStore.getState().setActiveExpert(id)}
                />
                <MCPSelector
                  conversationId={currentConversationId}
                  selectedServerIds={selectedMCPServerIds}
                  onSelectionChange={handleMCPSelectionChange}
                />
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.txt,.csv,.json,.md"
                className="hidden"
                onChange={handleFileSelect}
              />

              {/* Attachment previews */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2 pb-2 border-b border-gray-200">
                  {attachments.map(att => (
                    <div key={att.id} className="relative group flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs">
                      {att.type === 'image' ? (
                        <img src={att.url} alt={att.name} className="w-8 h-8 rounded object-cover" />
                      ) : (
                        <FileText className="w-4 h-4 text-gray-400" />
                      )}
                      <span className="text-gray-600 max-w-[100px] truncate">{att.name}</span>
                      <button
                        onClick={() => removeAttachment(att.id)}
                        className="ml-1 p-0.5 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3 text-gray-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-gray-100"
                        onClick={() => fileInputRef.current?.click()}
                      >
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
                  ) : isSending && activeStreamId ? (
                    <Button
                      size="icon"
                      className="h-8 w-8 bg-red-500 hover:bg-red-600 rounded-lg"
                      onClick={handleStopGeneration}
                    >
                      <Square className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      size="icon"
                      className="h-8 w-8 bg-indigo-500 hover:bg-indigo-600 rounded-lg disabled:opacity-50"
                      onClick={() => handleSend()}
                      disabled={(!message.trim() && attachments.length === 0) || isSending || !gatewayConnected}
                    >
                      <Send className="w-4 h-4" />
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
