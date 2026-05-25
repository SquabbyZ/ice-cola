import { ForbiddenException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ConversationCapabilitiesService {
  constructor(private readonly db: DatabaseService) {}

  async assertConversationAccess(conversationId: string, teamId: string) {
    const conversation = await this.db.findConversationById(conversationId, teamId);
    if (!conversation) {
      throw new ForbiddenException('Conversation access denied');
    }
    return conversation;
  }

  async getConversationExpert(conversationId: string, teamId: string): Promise<string | null> {
    const conversation = await this.assertConversationAccess(conversationId, teamId);
    return conversation.expert_id || conversation.expertId || null;
  }

  async setConversationExpert(conversationId: string, teamId: string, expertId: string | null): Promise<string | null> {
    await this.assertConversationAccess(conversationId, teamId);
    if (expertId) {
      const expert = await this.db.findExpertByIdForTeam(expertId, teamId);
      if (!expert) {
        throw new ForbiddenException('Expert access denied');
      }
    }
    await this.db.updateConversation(conversationId, { expertId });
    return expertId;
  }

  async getConversationExtensions(conversationId: string, teamId: string, userId: string): Promise<string[]> {
    await this.assertConversationAccess(conversationId, teamId);
    return this.db.getConversationExtensionIds(conversationId, userId);
  }

  async setConversationExtensions(conversationId: string, teamId: string, userId: string, extensionIds: string[]): Promise<string[]> {
    await this.assertConversationAccess(conversationId, teamId);
    return this.db.setConversationExtensions(conversationId, extensionIds, userId);
  }
}
