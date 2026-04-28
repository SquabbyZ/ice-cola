import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TeamsService } from './teams.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTeamDto, UpdateTeamDto, AddMemberDto, UpdateMemberRoleDto, InviteMemberDto } from './dto/team.dto';

@Controller('teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  async createTeam(@Request() req: any, @Body() dto: CreateTeamDto) {
    const result = await this.teamsService.createTeam(req.user.id, dto);
    return { success: true, data: result };
  }

  @Get('my')
  async getMyTeams(@Request() req: any) {
    const result = await this.teamsService.getMyTeams(req.user.id);
    return { success: true, data: result };
  }

  @Get(':teamId')
  async getTeam(@Param('teamId') teamId: string) {
    const result = await this.teamsService.getTeam(teamId);
    return { success: true, data: result };
  }

  @Put(':teamId')
  async updateTeam(
    @Param('teamId') teamId: string,
    @Body() dto: UpdateTeamDto,
  ) {
    const result = await this.teamsService.updateTeam(teamId, dto);
    return { success: true, data: result };
  }

  @Get(':teamId/members')
  async getTeamMembers(@Param('teamId') teamId: string) {
    const result = await this.teamsService.getTeamMembers(teamId);
    return { success: true, data: result };
  }

  @Post(':teamId/members')
  async addMember(
    @Param('teamId') teamId: string,
    @Body() dto: AddMemberDto,
  ) {
    const result = await this.teamsService.addMember(teamId, dto.email, dto.role);
    return { success: true, data: result };
  }

  @Put(':teamId/members/:userId/role')
  async updateMemberRole(
    @Param('teamId') teamId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    const result = await this.teamsService.updateMemberRole(teamId, userId, dto);
    return { success: true, data: result };
  }

  @Delete(':teamId/members/:userId')
  async removeMember(
    @Param('teamId') teamId: string,
    @Param('userId') userId: string,
  ) {
    const result = await this.teamsService.removeMember(teamId, userId);
    return { success: true, data: result };
  }

  @Post(':teamId/leave')
  async leaveTeam(@Param('teamId') teamId: string, @Request() req: any) {
    const result = await this.teamsService.leaveTeam(teamId, req.user.id);
    return { success: true, data: result };
  }

  @Post(':teamId/invite')
  async sendInvitation(
    @Param('teamId') teamId: string,
    @Request() req: any,
    @Body() dto: InviteMemberDto,
  ) {
    const result = await this.teamsService.sendInvitation(teamId, req.user.id, dto.email, dto.role);
    return { success: true, data: result };
  }

  @Post('invitations/:token/accept')
  async acceptInvitation(@Param('token') token: string, @Request() req: any) {
    const result = await this.teamsService.acceptInvitation(token, req.user.id);
    return { success: true, data: result };
  }

  @Get('invitations/:id/revoke')
  async revokeInvitation(@Param('id') id: string, @Request() req: any) {
    const result = await this.teamsService.revokeInvitation(id, req.user.id);
    return { success: true, data: result };
  }

  @Get(':teamId/invitations')
  async getTeamInvitations(@Param('teamId') teamId: string, @Request() req: any) {
    const result = await this.teamsService.getTeamInvitations(teamId, req.user.id);
    return { success: true, data: result };
  }
}
