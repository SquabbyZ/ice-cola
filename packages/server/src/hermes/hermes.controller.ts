import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HermesService } from './hermes.service';
import { ChatRequestDto } from './dto/hermes.dto';

@Controller('hermes')
export class HermesController {
  constructor(private readonly hermesService: HermesService) {}

  @Get('status')
  async getStatus() {
    return this.hermesService.getStatus();
  }

  @UseGuards(JwtAuthGuard)
  @Post('chat')
  async chat(@Request() req, @Body() dto: ChatRequestDto) {
    return this.hermesService.chat(req.user.sub, req.user.teamId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  async getSessions(@Request() req) {
    return this.hermesService.getSessions(req.user.teamId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions/:sessionId')
  async getSession(@Request() req, @Param('sessionId') sessionId: string) {
    return this.hermesService.getSession(req.user.teamId, sessionId);
  }
}
