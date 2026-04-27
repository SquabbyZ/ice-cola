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
  ) {
    const result = await this.conversationService.create(teamId, body.title);
    return { success: true, data: result };
  }

  @Get()
  async getList(
    @Param('teamId') teamId: string,
    @Query() query: { page?: number; pageSize?: number },
  ) {
    const result = await this.conversationService.getList(teamId, query);
    return { success: true, data: result };
  }

  @Get(':conversationId')
  async getById(
    @Param('teamId') teamId: string,
    @Param('conversationId') conversationId: string,
  ) {
    const result = await this.conversationService.getById(teamId, conversationId);
    return { success: true, data: result };
  }

  @Post(':conversationId/messages')
  async addMessage(
    @Param('teamId') teamId: string,
    @Param('conversationId') conversationId: string,
    @Body() body: { role: 'user' | 'assistant' | 'system'; content: string; model?: string; usage?: Record<string, any> },
  ) {
    const result = await this.conversationService.addMessage(teamId, conversationId, body);
    return { success: true, data: result };
  }

  @Put(':conversationId')
  async updateTitle(
    @Param('teamId') teamId: string,
    @Param('conversationId') conversationId: string,
    @Body() body: { title: string },
  ) {
    const result = await this.conversationService.updateTitle(teamId, conversationId, body.title);
    return { success: true, data: result };
  }

  @Delete(':conversationId')
  async delete(
    @Param('teamId') teamId: string,
    @Param('conversationId') conversationId: string,
  ) {
    await this.conversationService.delete(teamId, conversationId);
    return { success: true, data: null };
  }
}
