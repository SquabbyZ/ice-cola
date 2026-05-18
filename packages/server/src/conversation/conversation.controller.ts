import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('teams/:teamId/conversations')
@UseGuards(JwtAuthGuard)
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Post()
  async create(
    @Param('teamId') teamId: string,
    @Body() body: { title: string },
    @Req() req: any,
  ) {
    this.assertTeamAccess(teamId, req);
    const result = await this.conversationService.create(req.user.teamId, body.title, req.user.sub);
    return { success: true, data: result };
  }

  @Get()
  async getList(
    @Param('teamId') teamId: string,
    @Query() query: { page?: number; pageSize?: number },
    @Req() req: any,
  ) {
    this.assertTeamAccess(teamId, req);
    const result = await this.conversationService.getList(req.user.teamId, query);
    return { success: true, data: result };
  }

  @Get(':conversationId')
  async getById(
    @Param('teamId') teamId: string,
    @Param('conversationId') conversationId: string,
    @Req() req: any,
  ) {
    this.assertTeamAccess(teamId, req);
    const result = await this.conversationService.getById(req.user.teamId, conversationId);
    return { success: true, data: result };
  }

  @Post(':conversationId/messages')
  async addMessage(
    @Param('teamId') teamId: string,
    @Param('conversationId') conversationId: string,
    @Body() body: { role: 'user' | 'assistant' | 'system'; content: string; model?: string; usage?: Record<string, any> },
    @Req() req: any,
  ) {
    this.assertTeamAccess(teamId, req);
    const result = await this.conversationService.addMessage(req.user.teamId, conversationId, body);
    return { success: true, data: result };
  }

  @Put(':conversationId')
  async updateTitle(
    @Param('teamId') teamId: string,
    @Param('conversationId') conversationId: string,
    @Body() body: { title: string },
    @Req() req: any,
  ) {
    this.assertTeamAccess(teamId, req);
    const result = await this.conversationService.updateTitle(req.user.teamId, conversationId, body.title);
    return { success: true, data: result };
  }

  @Delete(':conversationId')
  async delete(
    @Param('teamId') teamId: string,
    @Param('conversationId') conversationId: string,
    @Req() req: any,
  ) {
    this.assertTeamAccess(teamId, req);
    await this.conversationService.delete(req.user.teamId, conversationId);
    return { success: true, data: null };
  }

  @Put(':conversationId/messages/:messageId')
  async updateMessage(
    @Param('teamId') teamId: string,
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
    @Body() body: { content: string },
    @Req() req: any,
  ) {
    this.assertTeamAccess(teamId, req);
    const result = await this.conversationService.updateMessage(req.user.teamId, conversationId, messageId, body);
    return { success: true, data: result };
  }

  @Delete(':conversationId/messages/:messageId')
  async deleteMessage(
    @Param('teamId') teamId: string,
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
    @Req() req: any,
  ) {
    this.assertTeamAccess(teamId, req);
    await this.conversationService.deleteMessage(req.user.teamId, conversationId, messageId);
    return { success: true, data: null };
  }

  private assertTeamAccess(teamId: string, req: any): void {
    if (req.user?.teamId !== teamId) {
      throw new ForbiddenException('Team access denied');
    }
  }
}
