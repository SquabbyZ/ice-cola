/**
 * Hermes Core - 记忆管理接口定义
 */

export interface Message {
  id: string;
  conversationId: string;
  userId?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  usage?: any;
  metadata?: any;
  createdAt: Date;
}

export interface MemoryService {
  /**
   * 获取最近 N 条消息作为上下文
   */
  getRecentContext(conversationId: string, limit?: number): Promise<Message[]>;

  /**
   * 基于关键词检索相关历史消息
   */
  searchRelevantMessages(
    conversationId: string,
    query: string,
    limit?: number,
  ): Promise<Message[]>;

  /**
   * 压缩长上下文（简单版：截断）
   */
  compressContext(messages: Message[], maxTokens?: number): Message[];
}
