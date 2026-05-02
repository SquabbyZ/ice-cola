import {
  Controller,
  Get,
  Param,
} from '@nestjs/common';
import { TeamsService } from './teams.service';

@Controller('teams/invitations')
export class InvitationsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get(':token/validate')
  async validateInvitation(@Param('token') token: string) {
    const result = await this.teamsService.validateInvitation(token);
    return { success: true, data: result };
  }
}