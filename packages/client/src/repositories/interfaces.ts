/**
 * OpenClaw Desktop - Repository 接口定义
 * 
 * 定义所有数据访问层的接口,遵循 Repository Pattern
 * 实现与具体数据库解耦,便于测试和替换
 */

// ==================== 核心实体类型定义 ====================

export interface User {
  id: string;
  authType: 'local' | 'wechat' | 'wecom' | 'dingtalk';
  externalId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Conversation {
  id: string;
  sessionId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  createdAt: Date;
}

export interface UsageRecord {
  id: string;
  userId: string;
  sessionId: string;
  conversationId: string;
  messageId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  timestamp: Date;
}

export interface ApiKey {
  id: string;
  userId: string;
  provider: string;
  keyHash: string; // 只存储哈希值,不存储明文
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt: Date | null;
}

export interface ExpertPrompt {
  id: string;
  userId: string;
  name: string;
  description: string;
  systemPrompt: string;
  tags: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Repository 接口定义 ====================

/**
 * 用户数据访问接口
 */
export interface IUserRepository {
  /** 创建新用户 */
  create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
  
  /** 根据 ID 查找用户 */
  findById(id: string): Promise<User | null>;
  
  /** 查找所有用户 */
  findAll(): Promise<User[]>;
  
  /** 更新用户信息 */
  update(id: string, updates: Partial<User>): Promise<User>;
  
  /** 删除用户 */
  delete(id: string): Promise<void>;
}

/**
 * 会话数据访问接口
 */
export interface ISessionRepository {
  /** 创建新会话 */
  create(session: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>): Promise<Session>;
  
  /** 根据 ID 查找会话 */
  findById(id: string): Promise<Session | null>;
  
  /** 查找用户的所有会话 */
  findByUserId(userId: string): Promise<Session[]>;
  
  /** 更新会话 */
  update(id: string, updates: Partial<Session>): Promise<Session>;
  
  /** 删除会话 */
  delete(id: string): Promise<void>;
}

/**
 * 对话数据访问接口
 */
export interface IConversationRepository {
  /** 创建新对话 */
  create(conversation: Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Conversation>;
  
  /** 根据 ID 查找对话 */
  findById(id: string): Promise<Conversation | null>;
  
  /** 查找会话的所有对话 */
  findBySessionId(sessionId: string): Promise<Conversation[]>;
  
  /** 更新对话 */
  update(id: string, updates: Partial<Conversation>): Promise<Conversation>;
  
  /** 删除对话 */
  delete(id: string): Promise<void>;
}

/**
 * 消息数据访问接口
 */
export interface IMessageRepository {
  /** 创建新消息 */
  create(message: Omit<Message, 'id' | 'createdAt'>): Promise<Message>;
  
  /** 根据 ID 查找消息 */
  findById(id: string): Promise<Message | null>;
  
  /** 查找对话的所有消息(按时间排序) */
  findByConversationId(conversationId: string, limit?: number): Promise<Message[]>;
  
  /** 更新消息 */
  update(id: string, updates: Partial<Message>): Promise<Message>;
  
  /** 删除消息 */
  delete(id: string): Promise<void>;
  
  /** 批量删除对话的所有消息 */
  deleteByConversationId(conversationId: string): Promise<number>;
}

/**
 * 用量记录数据访问接口
 */
export interface IUsageRepository {
  /** 记录用量 */
  record(usage: Omit<UsageRecord, 'id'>): Promise<UsageRecord>;
  
  /** 查找用户的用量记录(按时间段) */
  findByUserId(userId: string, period: { start: Date; end: Date }): Promise<UsageRecord[]>;
  
  /** 获取用量统计 */
  getStats(userId: string, period: { start: Date; end: Date }): Promise<{
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCost: number;
    requestCount: number;
  }>;
  
  /** 删除指定日期之前的旧记录 */
  deleteOlderThan(date: Date): Promise<number>;
}

/**
 * API Key 数据访问接口
 */
export interface IApiKeyRepository {
  /** 创建新的 API Key */
  create(apiKey: Omit<ApiKey, 'id' | 'createdAt' | 'updatedAt' | 'lastUsedAt'>): Promise<ApiKey>;
  
  /** 根据 ID 查找 API Key */
  findById(id: string): Promise<ApiKey | null>;
  
  /** 查找用户的所有 API Keys */
  findByUserId(userId: string): Promise<ApiKey[]>;
  
  /** 查找用户的活跃 API Keys */
  findActiveByUserId(userId: string): Promise<ApiKey[]>;
  
  /** 更新 API Key */
  update(id: string, updates: Partial<ApiKey>): Promise<ApiKey>;
  
  /** 标记为已使用 */
  markAsUsed(id: string): Promise<ApiKey>;
  
  /** 删除 API Key */
  delete(id: string): Promise<void>;
}

/**
 * Expert Prompt 数据访问接口
 */
export interface IExpertPromptRepository {
  /** 创建新的 Expert Prompt */
  create(prompt: Omit<ExpertPrompt, 'id' | 'createdAt' | 'updatedAt'>): Promise<ExpertPrompt>;
  
  /** 根据 ID 查找 Expert Prompt */
  findById(id: string): Promise<ExpertPrompt | null>;
  
  /** 查找用户的所有 Expert Prompts */
  findByUserId(userId: string): Promise<ExpertPrompt[]>;
  
  /** 查找用户的活跃 Expert Prompts */
  findActiveByUserId(userId: string): Promise<ExpertPrompt[]>;
  
  /** 根据标签搜索 */
  searchByTags(userId: string, tags: string[]): Promise<ExpertPrompt[]>;
  
  /** 更新 Expert Prompt */
  update(id: string, updates: Partial<ExpertPrompt>): Promise<ExpertPrompt>;
  
  /** 删除 Expert Prompt */
  delete(id: string): Promise<void>;
}
