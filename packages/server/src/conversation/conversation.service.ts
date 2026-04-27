import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AppError } from '../common/interfaces/errors';

interface ConversationRow {
  id: string;
  teamId: string;
  userId: string;
  platform: string;
  sessionId: string | null;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
  message_count?: string;
}

interface MessageRow {
  id: string;
  conversationId: string;
  userId: string | null;
  role: string;
  content: string;
  model: string | null;
  usage: any;
  metadata: any;
  createdAt: Date;
}

@Injectable()
export class ConversationService {
  constructor(private db: DatabaseService) {}

  async create(
    teamId: string,
    title: string,
    userId?: string,
  ) {
    const conversation = await this.db.createConversation({
      teamId,
      userId: userId || '',
      title,
      platform: 'hermes',
    });

    return conversation;
  }

  async getList(
    teamId: string,
    options?: { page?: number; pageSize?: number },
  ) {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const [conversations, total] = await Promise.all([
      this.db.findConversationsByTeamId(teamId, skip, pageSize) as Promise<ConversationRow[]>,
      this.db.countConversationsByTeamId(teamId),
    ]);

    const conversationsWithLastMessage = await Promise.all(
      conversations.map(async (c) => {
        const lastMessage = await this.db.findLastMessageByConversationId(c.id) as MessageRow | null;
        return {
          id: c.id,
          platform: c.platform,
          sessionId: c.sessionId,
          title: c.title,
          messageCount: parseInt(c.message_count || '0', 10),
          lastMessageAt: lastMessage?.createdAt || null,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        };
      })
    );

    return {
      conversations: conversationsWithLastMessage,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getById(teamId: string, conversationId: string) {
    const conversation = await this.db.findConversationById(conversationId, teamId) as ConversationRow | null;

    if (!conversation) {
      throw new AppError('CONVERSATION_NOT_FOUND', '会话不存在', 404);
    }

    const messages = await this.db.findMessagesByConversationId(conversationId) as MessageRow[];

    return {
      id: conversation.id,
      platform: conversation.platform,
      sessionId: conversation.sessionId,
      title: conversation.title,
      teamId: conversation.teamId,
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        model: m.model,
        usage: m.usage,
        createdAt: m.createdAt,
      })),
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  }

  async addMessage(
    teamId: string,
    conversationId: string,
    data: {
      role: 'user' | 'assistant' | 'system';
      content: string;
      model?: string;
      usage?: Record<string, any>;
    },
  ) {
    const conversation = await this.db.findConversationById(conversationId, teamId);

    if (!conversation) {
      throw new AppError('CONVERSATION_NOT_FOUND', '会话不存在', 404);
    }

    const message = await this.db.createMessage({
      conversationId,
      role: data.role,
      content: data.content,
      model: data.model,
      usage: data.usage,
    }) as MessageRow;

    // Update conversation's updatedAt
    await this.db.updateConversation(conversationId, {});

    return {
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
    };
  }

  async updateTitle(
    teamId: string,
    conversationId: string,
    title: string,
  ) {
    const conversation = await this.db.findConversationById(conversationId, teamId);

    if (!conversation) {
      throw new AppError('CONVERSATION_NOT_FOUND', '会话不存在', 404);
    }

    await this.db.updateConversation(conversationId, { title });

    return { success: true };
  }

  async delete(teamId: string, conversationId: string) {
    const conversation = await this.db.findConversationById(conversationId, teamId);

    if (!conversation) {
      throw new AppError('CONVERSATION_NOT_FOUND', '会话不存在', 404);
    }

    await this.db.deleteMessagesByConversationId(conversationId);
    await this.db.deleteConversation(conversationId);

    return { success: true };
  }
}