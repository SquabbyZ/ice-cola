/**
 * Gateway RPC 方法封装
 * 
 * 提供类型安全的 Gateway API 调用
 */

import { GatewayClient } from './gateway-client';

/**
 * OpenClaw Gateway RPC 服务
 */
export class GatewayRpcService {
  private client: GatewayClient;

  /**
   * 构造函数
   * @param client Gateway 客户端
   */
  constructor(client: GatewayClient) {
    this.client = client;
  }

  /**
   * 检查 Gateway 是否可用
   */
  async ping(): Promise<boolean> {
    try {
      await this.client.send('system.ping');
      return true;
    } catch (error) {
      console.error('Ping failed:', error);
      return false;
    }
  }

  /**
   * 获取 Gateway 版本信息
   */
  async getVersion(): Promise<{ version: string; build?: string }> {
    return this.client.send('system.version');
  }

  /**
   * 获取 Gateway 状态
   */
  async getStatus(): Promise<{
    uptime: number;
    connections: number;
    memory: {
      rss: number;
      heapUsed: number;
      heapTotal: number;
    };
  }> {
    return this.client.send('system.status');
  }

  /**
   * 发送聊天消息
   * @param sessionKey 会话 Key
   * @param message 消息内容
   * @param options 选项
   */
  async sendChatMessage(
    sessionKey: string,
    message: string,
    options?: {
      model?: string;
      temperature?: number;
      idempotencyKey?: string;
    }
  ): Promise<{
    messageId: string;
    response: string;
    model: string;
    tokens: {
      input: number;
      output: number;
    };
  }> {
    return this.client.send('chat.send', {
      sessionKey,
      message,
      ...options,
    });
  }

  /**
   * 获取聊天历史
   * @param sessionKey 会话 Key
   * @param limit 限制数量
   */
  async getChatHistory(sessionKey: string, limit?: number): Promise<Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
  }>> {
    return this.client.send('chat.history', {
      sessionKey,
      limit,
    });
  }

  /**
   * 列出所有会话
   */
  async listSessions(): Promise<Array<{
    id: string;
    name: string;
    lastActivity: string;
    messageCount: number;
  }>> {
    return this.client.send('sessions.list');
  }

  /**
   * 创建新会话
   * @param name 会话名称
   */
  async createSession(name: string): Promise<{
    id: string;
    name: string;
    createdAt: string;
  }> {
    return this.client.send('sessions.create', { name });
  }

  /**
   * 删除会话
   * @param sessionKey 会话 Key
   */
  async deleteSession(sessionKey: string): Promise<void> {
    return this.client.send('sessions.delete', { sessionKey });
  }

  /**
   * 获取模型列表
   */
  async listModels(): Promise<Array<{
    id: string;
    name: string;
    provider: string;
    capabilities: string[];
  }>> {
    return this.client.send('models.list');
  }

  /**
   * 获取用量统计
   * @param period 周期 (day/week/month)
   */
  async getUsageStats(_period: 'day' | 'week' | 'month'): Promise<{
    totalCost: number;
    totalTokens: number;
    requestCount: number;
    breakdown: Array<{
      model: string;
      cost: number;
      tokens: number;
    }>;
  }> {
    // 使用 usage.status 而不是 usage.stats
    return this.client.send('usage.status');
  }

  /**
   * 通用 RPC 调用方法
   * @param method 方法名
   * @param params 参数
   */
  async send(method: string, params?: any): Promise<any> {
    return this.client.send(method, params);
  }

  /**
   * 订阅事件
   * @param eventName 事件名
   * @param handler 处理器
   */
  on(eventName: string, handler: (data: any) => void): () => void {
    return this.client.on(eventName, handler);
  }

  /**
   * 取消所有订阅
   */
  offAll(): void {
    // GatewayClient 会在 disconnect 时自动清理
    console.warn('Use the unsubscribe function returned by on() instead');
  }
}
