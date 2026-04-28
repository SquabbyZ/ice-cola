import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { MemoryService, Message } from '../interfaces/memory.interface';

@Injectable()
export class MemoryServiceImpl implements MemoryService {
  private readonly logger = new Logger(MemoryServiceImpl.name);
  private readonly DEFAULT_CONTEXT_LIMIT = 10;
  private readonly MAX_TOKENS_ESTIMATE = 4000; // 粗略估计，实际应该用 tokenizer

  constructor(private db: DatabaseService) {}

  /**
   * 获取最近的上下文消息
   */
  async getRecentContext(conversationId: string, limit: number = this.DEFAULT_CONTEXT_LIMIT): Promise<Message[]> {
    try {
      const messages = await this.db.query<Message>(
        'SELECT * FROM messages WHERE "conversationId" = $1 ORDER BY "createdAt" DESC LIMIT $2',
        [conversationId, limit]
      );

      // 反转以获得时间正序
      return messages.reverse();
    } catch (error: any) {
      this.logger.error(`Failed to get recent context: ${error.message}`);
      return [];
    }
  }

  /**
   * 基于关键词搜索相关消息
   */
  async searchRelevantMessages(
    conversationId: string,
    query: string,
    limit: number = 5
  ): Promise<Message[]> {
    try {
      // 简单的关键词匹配（不区分大小写）
      const keywords = query.split(/\s+/).filter(k => k.length > 2);
      
      if (keywords.length === 0) {
        return this.getRecentContext(conversationId, limit);
      }

      // 构建 LIKE 查询
      const likeConditions = keywords.map((_, idx) => `content ILIKE $${idx + 2}`).join(' OR ');
      const params = [conversationId, ...keywords.map(k => `%${k}%`)];

      const messages = await this.db.query<Message>(
        `SELECT * FROM messages 
         WHERE "conversationId" = $1 AND (${likeConditions})
         ORDER BY "createdAt" DESC 
         LIMIT $${keywords.length + 2}`,
        [...params, limit]
      );

      return messages.reverse();
    } catch (error: any) {
      this.logger.warn(`Keyword search failed, falling back to recent context: ${error.message}`);
      return this.getRecentContext(conversationId, limit);
    }
  }

  /**
   * 压缩上下文以适应 token 限制
   */
  compressContext(messages: Message[], maxTokens: number = this.MAX_TOKENS_ESTIMATE): Message[] {
    if (!messages || messages.length === 0) {
      return [];
    }

    // 简单策略：从前往后截断，保留最近的消息
    let totalLength = 0;
    const result: Message[] = [];

    // 从后往前遍历，保留最近的消息
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      const estimatedTokens = this.estimateTokens(message.content);

      if (totalLength + estimatedTokens <= maxTokens) {
        result.unshift(message);
        totalLength += estimatedTokens;
      } else {
        break;
      }
    }

    // 如果第一条消息被截断，添加系统提示说明
    if (result.length < messages.length && result.length > 0) {
      this.logger.debug(`Context compressed: ${messages.length} -> ${result.length} messages`);
    }

    return result;
  }

  /**
   * 估算文本的 token 数量（粗略估计）
   */
  private estimateTokens(text: string): number {
    // 简单估计：英文约 4 字符/token，中文约 1-2 字符/token
    // 这里使用保守估计：3 字符/token
    return Math.ceil(text.length / 3);
  }
}
