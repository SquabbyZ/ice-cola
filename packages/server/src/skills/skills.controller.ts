import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { SkillsService, type TeamSkillAccessPolicy } from './skills.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TeamRole } from '../quota/quota.service';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';

type AuthenticatedRequest = {
  user: {
    id: string;
    teamId: string;
    role?: string;
  };
};

@Controller('teams/:teamId/skills')
@UseGuards(JwtAuthGuard)
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Post()
  async create(
    @Param('teamId') teamId: string,
    @Request() req: AuthenticatedRequest,
    @Body() body: CreateSkillDto,
  ) {
    this.assertTeamRouteAccess(teamId, req);
    const result = await this.skillsService.create(req.user.teamId, req.user.id, body);
    return { success: true, data: result };
  }

  @Get()
  async findAll(
    @Param('teamId') teamId: string,
    @Request() req: AuthenticatedRequest,
    @Query('status') status?: string,
  ) {
    this.assertTeamRouteAccess(teamId, req);
    const result = await this.skillsService.findAll(req.user.teamId, status);
    return { success: true, data: result };
  }

  @Get('personal')
  async findPersonal(
    @Param('teamId') teamId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    this.assertTeamRouteAccess(teamId, req);
    const result = await this.skillsService.findPersonal(req.user.id);
    return { success: true, data: result };
  }

  @Get('team')
  async findTeamSkills(
    @Param('teamId') teamId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    this.assertTeamRouteAccess(teamId, req);
    const result = await this.skillsService.findTeamSkills(req.user.teamId);
    return { success: true, data: result };
  }

  @Get('marketplace')
  async findMarketplace(
    @Param('teamId') teamId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    this.assertTeamRouteAccess(teamId, req);
    const result = await this.skillsService.findMarketplace(req.user.teamId);
    return { success: true, data: result };
  }

  @Get(':skillId')
  async findOne(
    @Param('teamId') teamId: string,
    @Param('skillId') skillId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    this.assertTeamRouteAccess(teamId, req);
    const result = await this.skillsService.findOne(skillId, req.user.teamId);
    return { success: true, data: result };
  }

  @Put(':skillId')
  async update(
    @Param('teamId') teamId: string,
    @Param('skillId') skillId: string,
    @Body() body: UpdateSkillDto,
    @Request() req: AuthenticatedRequest,
  ) {
    this.assertTeamRouteAccess(teamId, req);
    const result = await this.skillsService.update(skillId, req.user.teamId, body);
    return { success: true, data: result };
  }

  @Delete(':skillId')
  async delete(
    @Param('teamId') teamId: string,
    @Param('skillId') skillId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    this.assertTeamRouteAccess(teamId, req);
    await this.skillsService.delete(skillId, req.user.teamId);
    return { success: true, data: null };
  }

  @Get(':skillId/versions')
  async getVersions(
    @Param('teamId') teamId: string,
    @Param('skillId') skillId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    this.assertTeamRouteAccess(teamId, req);
    const result = await this.skillsService.getVersions(skillId, req.user.teamId);
    return { success: true, data: result };
  }

  @Post(':skillId/versions/:versionId/revert')
  async revertToVersion(
    @Param('teamId') teamId: string,
    @Param('skillId') skillId: string,
    @Param('versionId') versionId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    this.assertTeamRouteAccess(teamId, req);
    const result = await this.skillsService.revertToVersion(skillId, versionId, req.user.id, req.user.teamId);
    return { success: true, data: result };
  }

  @Post(':skillId/publish-team')
  async requestPublishToTeam(
    @Param('teamId') teamId: string,
    @Param('skillId') skillId: string,
    @Request() req: AuthenticatedRequest,
    @Body() body: { accessPolicy?: TeamSkillAccessPolicy },
  ) {
    this.assertTeamRouteAccess(teamId, req);
    const result = await this.skillsService.requestPublishToTeam(skillId, {
      userId: req.user.id,
      teamId: req.user.teamId,
      role: req.user.role,
    }, body.accessPolicy);
    return { success: true, data: result };
  }

  @Post(':skillId/approve-team')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async approveTeamPublish(
    @Param('teamId') teamId: string,
    @Param('skillId') skillId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    this.assertTeamRouteAccess(teamId, req);
    const result = await this.skillsService.approveTeamPublish(skillId, req.user.id, {
      userId: req.user.id,
      teamId: req.user.teamId,
      role: req.user.role,
    });
    return { success: true, data: result };
  }

  @Post(':skillId/reject-team')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async rejectTeamPublish(
    @Param('teamId') teamId: string,
    @Param('skillId') skillId: string,
    @Request() req: AuthenticatedRequest,
    @Body() body: { comment?: string },
  ) {
    this.assertTeamRouteAccess(teamId, req);
    const result = await this.skillsService.rejectTeamPublish(skillId, req.user.id, body.comment || '', {
      userId: req.user.id,
      teamId: req.user.teamId,
      role: req.user.role,
    });
    return { success: true, data: result };
  }

  @Post(':skillId/publish-marketplace')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async requestPublishToMarketplace(
    @Param('teamId') teamId: string,
    @Param('skillId') skillId: string,
    @Request() req: AuthenticatedRequest,
    @Body() body: { note?: string },
  ) {
    this.assertTeamRouteAccess(teamId, req);
    const result = await this.skillsService.requestPublishToMarketplace(skillId, req.user.id, body.note, {
      userId: req.user.id,
      teamId: req.user.teamId,
      role: req.user.role,
    });
    return { success: true, data: result };
  }

  private assertTeamRouteAccess(teamId: string, req: AuthenticatedRequest): void {
    if (teamId !== req.user.teamId) {
      throw new ForbiddenException('Team access denied');
    }
  }
}
