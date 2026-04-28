import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { SkillsService } from './skills.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('teams/:teamId/skills')
@UseGuards(JwtAuthGuard)
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Post()
  async create(
    @Param('teamId') teamId: string,
    @Request() req: any,
    @Body() body: { name: string; description?: string; version?: string; icon?: string; category?: string; tags?: string[]; content: string; configSchema?: Record<string, any>; config?: Record<string, any> },
  ) {
    const result = await this.skillsService.create(teamId, req.user.id, body);
    return { success: true, data: result };
  }

  @Get()
  async findAll(
    @Param('teamId') teamId: string,
    @Query('status') status?: string,
  ) {
    const result = await this.skillsService.findAll(teamId, status);
    return { success: true, data: result };
  }

  @Get('personal')
  async findPersonal(@Request() req: any) {
    const result = await this.skillsService.findPersonal(req.user.id);
    return { success: true, data: result };
  }

  @Get('team')
  async findTeamSkills(@Param('teamId') teamId: string) {
    const result = await this.skillsService.findTeamSkills(teamId);
    return { success: true, data: result };
  }

  @Get('marketplace')
  async findMarketplace(@Param('teamId') teamId: string) {
    const result = await this.skillsService.findMarketplace(teamId);
    return { success: true, data: result };
  }

  @Get(':skillId')
  async findOne(@Param('skillId') skillId: string) {
    const result = await this.skillsService.findOne(skillId);
    return { success: true, data: result };
  }

  @Put(':skillId')
  async update(
    @Param('skillId') skillId: string,
    @Body() body: any,
  ) {
    const result = await this.skillsService.update(skillId, body);
    return { success: true, data: result };
  }

  @Delete(':skillId')
  async delete(@Param('skillId') skillId: string) {
    await this.skillsService.delete(skillId);
    return { success: true, data: null };
  }

  @Get(':skillId/versions')
  async getVersions(@Param('skillId') skillId: string) {
    const result = await this.skillsService.getVersions(skillId);
    return { success: true, data: result };
  }

  @Post(':skillId/versions/:versionId/revert')
  async revertToVersion(
    @Param('skillId') skillId: string,
    @Param('versionId') versionId: string,
    @Request() req: any,
  ) {
    const result = await this.skillsService.revertToVersion(skillId, versionId, req.user.id);
    return { success: true, data: result };
  }

  @Post(':skillId/publish-team')
  async requestPublishToTeam(@Param('skillId') skillId: string) {
    const result = await this.skillsService.requestPublishToTeam(skillId);
    return { success: true, data: result };
  }

  @Post(':skillId/approve-team')
  async approveTeamPublish(
    @Param('skillId') skillId: string,
    @Request() req: any,
  ) {
    const result = await this.skillsService.approveTeamPublish(skillId, req.user.id);
    return { success: true, data: result };
  }

  @Post(':skillId/reject-team')
  async rejectTeamPublish(
    @Param('skillId') skillId: string,
    @Request() req: any,
    @Body() body: { comment?: string },
  ) {
    const result = await this.skillsService.rejectTeamPublish(skillId, req.user.id, body.comment || '');
    return { success: true, data: result };
  }

  @Post(':skillId/publish-marketplace')
  async requestPublishToMarketplace(@Param('skillId') skillId: string) {
    const result = await this.skillsService.requestPublishToMarketplace(skillId);
    return { success: true, data: result };
  }

  @Post(':skillId/approve-marketplace')
  async approveMarketplacePublish(
    @Param('skillId') skillId: string,
    @Request() req: any,
    @Body() body: { marketplaceId: string },
  ) {
    const result = await this.skillsService.approveMarketplacePublish(skillId, req.user.id, body.marketplaceId);
    return { success: true, data: result };
  }
}