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
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { AiModelsService } from './ai-models.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TeamRole } from '../quota/quota.service';
import { CreateProviderDto, UpdateProviderDto } from './dto/provider.dto';
import { CreateModelDto, UpdateModelDto } from './dto/model.dto';
import { CreateApiKeyDto, UpdateApiKeyStatusDto, UpdateApiKeyDto } from './dto/api-key.dto';
import { CreateEndpointDto, UpdateEndpointDto } from './dto/endpoint.dto';
import {
  CreateModelConfigDto,
  UpdateModelConfigDto,
} from './dto/model-config.dto';
import {
  CreateDefaultModelDto,
  UpdateDefaultModelDto,
} from './dto/default-model.dto';
import {
  CreateTeamQuotaDto,
  UpdateTeamQuotaDto,
} from './dto/team-quota.dto';
import { CreateUsageLogDto } from './dto/usage-log.dto';

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function convertKeys(obj: any): any {
  if (Array.isArray(obj)) return obj.map(convertKeys);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [snakeToCamel(key), convertKeys(value)]),
    );
  }
  return obj;
}

interface AuthenticatedAdminRequest {
  user: {
    id: string;
    teamId?: string;
    role: TeamRole;
  };
}

@Controller('admin/ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiModelsController {
  constructor(private readonly aiModelsService: AiModelsService) {}

  private assertSameTeam(req: AuthenticatedAdminRequest, teamId: string): void {
    if (!req.user.teamId || req.user.teamId !== teamId) {
      throw new ForbiddenException('Cannot access another team');
    }
  }

  private requirePlatformAdmin(): never {
    throw new ForbiddenException('Platform admin privileges required');
  }

  // ==================== SEED ====================

  @Post('seed')
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async seed() {
    this.requirePlatformAdmin();
  }

  // ==================== PROVIDERS ====================

  @Post('providers')
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async createProvider(@Body() body: CreateProviderDto) {
    this.requirePlatformAdmin();
    const result = await this.aiModelsService.createProvider(body);
    return { success: true, data: convertKeys(result) };
  }

  @Get('providers')
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async findAllProviders() {
    this.requirePlatformAdmin();
    const result = await this.aiModelsService.findAllProviders();
    return { success: true, data: convertKeys(result) };
  }

  @Get('providers/:id')
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async findProviderById(@Param('id') id: string) {
    this.requirePlatformAdmin();
    const result = await this.aiModelsService.findProviderById(id);
    return { success: true, data: convertKeys(result) };
  }

  @Put('providers/:id')
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async updateProvider(
    @Param('id') id: string,
    @Body() body: UpdateProviderDto,
  ) {
    this.requirePlatformAdmin();
    const result = await this.aiModelsService.updateProvider(id, body);
    return { success: true, data: convertKeys(result) };
  }

  @Delete('providers/:id')
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async deleteProvider(@Param('id') id: string) {
    this.requirePlatformAdmin();
    const result = await this.aiModelsService.deleteProvider(id);
    return { success: true, data: convertKeys(result) };
  }

  // ==================== MODELS ====================

  @Post('models')
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async createModel(@Body() body: CreateModelDto) {
    this.requirePlatformAdmin();
    const result = await this.aiModelsService.createModel(body);
    return { success: true, data: convertKeys(result) };
  }

  @Get('models')
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async findAllModels(@Query('providerId') providerId?: string) {
    this.requirePlatformAdmin();
    const result = providerId
      ? await this.aiModelsService.findModelsByProvider(providerId)
      : await this.aiModelsService.findAllModels();
    return { success: true, data: convertKeys(result) };
  }

  @Get('models/:id')
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async findModelById(@Param('id') id: string) {
    this.requirePlatformAdmin();
    const result = await this.aiModelsService.findModelById(id);
    return { success: true, data: convertKeys(result) };
  }

  @Put('models/:id')
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async updateModel(
    @Param('id') id: string,
    @Body() body: UpdateModelDto,
  ) {
    this.requirePlatformAdmin();
    const result = await this.aiModelsService.updateModel(id, body);
    return { success: true, data: convertKeys(result) };
  }

  @Delete('models/:id')
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async deleteModel(@Param('id') id: string) {
    this.requirePlatformAdmin();
    const result = await this.aiModelsService.deleteModel(id);
    return { success: true, data: convertKeys(result) };
  }

  // ==================== FETCH MODELS ====================

  @Post('providers/:id/fetch-models')
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async fetchModelsFromProvider(@Param('id') id: string) {
    this.requirePlatformAdmin();
    const result = await this.aiModelsService.fetchModelsFromProvider(id);
    return { success: true, data: convertKeys(result) };
  }

  // ==================== API KEYS ====================

  @Post('api-keys')
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async createApiKey(@Body() body: CreateApiKeyDto, @Request() req: AuthenticatedAdminRequest) {
    this.requirePlatformAdmin();
    const result = await this.aiModelsService.createApiKey(body, req.user.id);
    return { success: true, data: convertKeys(result) };
  }

  @Get('api-keys')
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async findApiKeys(@Query('providerId') providerId?: string) {
    this.requirePlatformAdmin();
    const result = providerId
      ? await this.aiModelsService.findApiKeysByProvider(providerId)
      : await this.aiModelsService.findAllApiKeys();
    return { success: true, data: convertKeys(result) };
  }

  @Get('api-keys/:id/decrypt')
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async decryptApiKey() {
    throw new ForbiddenException('API key plaintext export is not allowed');
  }

  @Put('api-keys/:id/status')
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async updateApiKeyStatus(
    @Param('id') id: string,
    @Body() body: UpdateApiKeyStatusDto,
  ) {
    this.requirePlatformAdmin();
    const result = await this.aiModelsService.updateApiKeyStatus(id, body);
    return { success: true, data: convertKeys(result) };
  }

  @Put('api-keys/:id')
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async updateApiKey(
    @Param('id') id: string,
    @Body() body: UpdateApiKeyDto,
  ) {
    this.requirePlatformAdmin();
    const result = await this.aiModelsService.updateApiKey(id, body);
    return { success: true, data: convertKeys(result) };
  }

  @Delete('api-keys/:id')
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async deleteApiKey(@Param('id') id: string) {
    this.requirePlatformAdmin();
    const result = await this.aiModelsService.deleteApiKey(id);
    return { success: true, data: convertKeys(result) };
  }

  // ==================== ENDPOINTS ====================

  @Post('endpoints')
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async createEndpoint(@Body() body: CreateEndpointDto) {
    this.requirePlatformAdmin();
    const result = await this.aiModelsService.createEndpoint(body);
    return { success: true, data: result };
  }

  @Get('endpoints')
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async findEndpoints(@Query('providerId') providerId: string) {
    this.requirePlatformAdmin();
    const result = await this.aiModelsService.findEndpointsByProvider(providerId);
    return { success: true, data: result };
  }

  @Get('endpoints/:id')
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async findEndpointById(@Param('id') id: string) {
    this.requirePlatformAdmin();
    const result = await this.aiModelsService.findEndpointById(id);
    return { success: true, data: result };
  }

  @Put('endpoints/:id')
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async updateEndpoint(
    @Param('id') id: string,
    @Body() body: UpdateEndpointDto,
  ) {
    this.requirePlatformAdmin();
    const result = await this.aiModelsService.updateEndpoint(id, body);
    return { success: true, data: result };
  }

  @Delete('endpoints/:id')
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async deleteEndpoint(@Param('id') id: string) {
    this.requirePlatformAdmin();
    const result = await this.aiModelsService.deleteEndpoint(id);
    return { success: true, data: result };
  }

  // ==================== MODEL CONFIGS ====================

  @Post('model-configs')
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async createModelConfig(@Body() body: CreateModelConfigDto) {
    this.requirePlatformAdmin();
    const result = await this.aiModelsService.createModelConfig(body);
    return { success: true, data: result };
  }

  @Get('model-configs')
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async findModelConfigs(@Query('modelId') modelId: string) {
    this.requirePlatformAdmin();
    const result = await this.aiModelsService.findModelConfigsByModel(modelId);
    return { success: true, data: result };
  }

  @Get('model-configs/:id')
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async findModelConfigById(@Param('id') id: string) {
    this.requirePlatformAdmin();
    const result = await this.aiModelsService.findModelConfigById(id);
    return { success: true, data: result };
  }

  @Put('model-configs/:id')
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async updateModelConfig(
    @Param('id') id: string,
    @Body() body: UpdateModelConfigDto,
  ) {
    this.requirePlatformAdmin();
    const result = await this.aiModelsService.updateModelConfig(id, body);
    return { success: true, data: result };
  }

  @Delete('model-configs/:id')
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async deleteModelConfig(@Param('id') id: string) {
    this.requirePlatformAdmin();
    const result = await this.aiModelsService.deleteModelConfig(id);
    return { success: true, data: result };
  }

  // ==================== DEFAULT MODELS ====================

  @Post('default-models')
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async createDefaultModel(@Body() body: CreateDefaultModelDto) {
    this.requirePlatformAdmin();
    const result = await this.aiModelsService.createDefaultModel(body);
    return { success: true, data: result };
  }

  @Get('default-models')
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async findAllDefaultModels() {
    this.requirePlatformAdmin();
    const result = await this.aiModelsService.findAllDefaultModels();
    return { success: true, data: result };
  }

  @Get('default-models/provider/:providerId')
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async findDefaultModelsByProvider(@Param('providerId') providerId: string) {
    this.requirePlatformAdmin();
    const result = await this.aiModelsService.findDefaultModelsByProvider(
      providerId,
    );
    return { success: true, data: result };
  }

  @Get('default-models/use-case/:useCase')
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async findDefaultModelByUseCase(@Param('useCase') useCase: string) {
    this.requirePlatformAdmin();
    const result = await this.aiModelsService.findDefaultModelByUseCase(useCase);
    return { success: true, data: result };
  }

  @Put('default-models/:id')
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async updateDefaultModel(
    @Param('id') id: string,
    @Body() body: UpdateDefaultModelDto,
  ) {
    this.requirePlatformAdmin();
    const result = await this.aiModelsService.updateDefaultModel(id, body);
    return { success: true, data: result };
  }

  @Delete('default-models/:id')
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async deleteDefaultModel(@Param('id') id: string) {
    this.requirePlatformAdmin();
    const result = await this.aiModelsService.deleteDefaultModel(id);
    return { success: true, data: result };
  }

  // ==================== TEAM QUOTAS ====================

  @Post('team-quotas')
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async createTeamQuota(@Body() body: CreateTeamQuotaDto, @Request() req: AuthenticatedAdminRequest) {
    this.assertSameTeam(req, body.teamId);
    const result = await this.aiModelsService.createTeamQuota(body);
    return { success: true, data: result };
  }

  @Get('team-quotas')
  async findTeamQuota(@Query('teamId') teamId: string, @Request() req: AuthenticatedAdminRequest) {
    this.assertSameTeam(req, teamId);
    const result = await this.aiModelsService.findTeamQuotaByTeamId(teamId);
    return { success: true, data: result };
  }

  @Put('team-quotas/:teamId')
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async updateTeamQuota(
    @Param('teamId') teamId: string,
    @Body() body: UpdateTeamQuotaDto,
    @Request() req: AuthenticatedAdminRequest,
  ) {
    this.assertSameTeam(req, teamId);
    const result = await this.aiModelsService.updateTeamQuota(teamId, body);
    return { success: true, data: result };
  }

  @Post('team-quotas/:teamId/reset')
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async resetTeamQuota(
    @Param('teamId') teamId: string,
    @Body() body: { type: 'daily' | 'monthly' },
    @Request() req: AuthenticatedAdminRequest,
  ) {
    this.assertSameTeam(req, teamId);
    const result =
      body.type === 'daily'
        ? await this.aiModelsService.resetTeamQuotaDaily(teamId)
        : await this.aiModelsService.resetTeamQuotaMonthly(teamId);
    return { success: true, data: result };
  }

  @Delete('team-quotas/:teamId')
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async deleteTeamQuota(@Param('teamId') teamId: string, @Request() req: AuthenticatedAdminRequest) {
    this.assertSameTeam(req, teamId);
    const result = await this.aiModelsService.deleteTeamQuota(teamId);
    return { success: true, data: result };
  }

  // ==================== USAGE LOGS ====================

  @Post('usage-logs')
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async createUsageLog(@Body() body: CreateUsageLogDto, @Request() req: AuthenticatedAdminRequest) {
    this.assertSameTeam(req, body.teamId);
    const result = await this.aiModelsService.createUsageLog(body);
    return { success: true, data: result };
  }

  @Get('usage-logs')
  async findUsageLogs(
    @Query('teamId') teamId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Request() req?: AuthenticatedAdminRequest,
  ) {
    if (req) {
      this.assertSameTeam(req, teamId);
    }
    const result = await this.aiModelsService.findUsageLogsByTeam(
      teamId,
      limit || 100,
      offset || 0,
    );
    return { success: true, data: result };
  }

  @Get('usage-logs/stats')
  async getUsageStats(
    @Query('teamId') teamId: string,
    @Query('period') period?: 'day' | 'week' | 'month',
    @Request() req?: AuthenticatedAdminRequest,
  ) {
    if (req) {
      this.assertSameTeam(req, teamId);
    }
    const result = await this.aiModelsService.getUsageStatsByTeam(
      teamId,
      period || 'month',
    );
    return { success: true, data: result };
  }
}