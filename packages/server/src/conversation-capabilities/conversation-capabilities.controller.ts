import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ConversationCapabilitiesService } from './conversation-capabilities.service';

type AuthenticatedRequest = {
  user: {
    id: string;
    teamId: string;
  };
};

@Controller('conversation-capabilities/:conversationId')
@UseGuards(JwtAuthGuard)
export class ConversationCapabilitiesController {
  constructor(private readonly capabilitiesService: ConversationCapabilitiesService) {}

  @Get('expert')
  async getExpert(
    @Param('conversationId') conversationId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const data = await this.capabilitiesService.getConversationExpert(conversationId, req.user.teamId);
    return { success: true, data };
  }

  @Post('expert')
  async setExpert(
    @Param('conversationId') conversationId: string,
    @Body() body: { expertId?: string | null },
    @Request() req: AuthenticatedRequest,
  ) {
    const data = await this.capabilitiesService.setConversationExpert(
      conversationId,
      req.user.teamId,
      body?.expertId || null,
    );
    return { success: true, data };
  }

  @Get('extensions')
  async getExtensions(
    @Param('conversationId') conversationId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const data = await this.capabilitiesService.getConversationExtensions(
      conversationId,
      req.user.teamId,
      req.user.id,
    );
    return { success: true, data };
  }

  @Post('extensions')
  async setExtensions(
    @Param('conversationId') conversationId: string,
    @Body() body: { extensionIds?: string[] },
    @Request() req: AuthenticatedRequest,
  ) {
    const extensionIds = Array.isArray(body?.extensionIds) ? body.extensionIds : [];
    const data = await this.capabilitiesService.setConversationExtensions(
      conversationId,
      req.user.teamId,
      req.user.id,
      extensionIds,
    );
    return { success: true, data };
  }
}
