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
import { AdminRole } from '../admin-admin/dto/invite.dto';
import { AdminJwtAuthGuard } from '../auth/admin-jwt-auth.guard';
import { AdminRoles } from '../common/decorators/admin-roles.decorator';
import { AdminRolesGuard } from '../common/guards/admin-roles.guard';
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
    role: AdminRole;
  };
}

@Controller('admin/ai')
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
export class AiModelsController {
  constructor(private readonly aiModelsService: AiModelsService) {}

  // ==================== SEED ====================

  @Post('seed')
  @AdminRoles(AdminRole.OWNER, AdminRole.ADMIN)
  async seed() {
    throw new ForbiddenException('AI model seeding is not available from the admin API');
  }

  // ==================== PROVIDERS ====================

  @Post('providers')
  @AdminRoles(AdminRole.OWNER, AdminRole.ADMIN)
  async createProvider(@Body() body: CreateProviderDto) {
    const result = await this.aiModelsService.createProvider(body);
    return { success: true, data: convertKeys(result) };
  }

  @Get('providers')
  @AdminRoles(AdminRole.OWNER, AdminRole.ADMIN)
  async findAllProviders() {
    const result = await this.aiModelsService.findAllProviders();
    return { success: true, data: convertKeys(result) };
  }

  @Get('providers/:id')
  @AdminRoles(AdminRole.OWNER, AdminRole.ADMIN)
  async findProviderById(@Param('id') id: string) {
    const result = await this.aiModelsService.findProviderById(id);
    return { success: true, data: convertKeys(result) };
  }

  @Put('providers/:id')
  @AdminRoles(AdminRole.OWNER, AdminRole.ADMIN)
  async updateProvider(
    @Param('id') id: string,
    @Body() body: UpdateProviderDto,
  ) {
    const result = await this.aiModelsService.updateProvider(id, body);
    return { success: true, data: convertKeys(result) };
  }

  @Delete('providers/:id')
  @AdminRoles(AdminRole.OWNER, AdminRole.ADMIN)
  async deleteProvider(@Param('id') id: string) {
    const result = await this.aiModelsService.deleteProvider(id);
    return { success: true, data: convertKeys(result) };
  }

  // ==================== MODELS ====================

  @Post('models')
  @AdminRoles(AdminRole.OWNER, AdminRole.ADMIN)
  async createModel(@Body() body: CreateModelDto) {
    const result = await this.aiModelsService.createModel(body);
    return { success: true, data: convertKeys(result) };
  }

  @Get('models')
  @AdminRoles(AdminRole.OWNER, AdminRole.ADMIN)
  async findAllModels(@Query('providerId') providerId?: string) {
    const result = providerId
      ? await this.aiModelsService.findModelsByProvider(providerId)
      : await this.aiModelsService.findAllModels();
    return { success: true, data: convertKeys(result) };
  }

  @Get('models/:id')
  @AdminRoles(AdminRole.OWNER, AdminRole.ADMIN)
  async findModelById(@Param('id') id: string) {
    const result = await this.aiModelsService.findModelById(id);
    return { success: true, data: convertKeys(result) };
  }

  @Put('models/:id')
  @AdminRoles(AdminRole.OWNER, AdminRole.ADMIN)
  async updateModel(
    @Param('id') id: string,
    @Body() body: UpdateModelDto,
  ) {
    const result = await this.aiModelsService.updateModel(id, body);
    return { success: true, data: convertKeys(result) };
  }

  @Delete('models/:id')
  @AdminRoles(AdminRole.OWNER, AdminRole.ADMIN)
  async deleteModel(@Param('id') id: string) {
    const result = await this.aiModelsService.deleteModel(id);
    return { success: true, data: convertKeys(result) };
  }

  // ==================== FETCH MODELS ====================

  @Post('providers/:id/fetch-models')
  @AdminRoles(AdminRole.OWNER, AdminRole.ADMIN)
  async fetchModelsFromProvider(@Param('id') id: string) {
    const result = await this.aiModelsService.fetchModelsFromProvider(id);
    return { success: true, data: convertKeys(result) };
  }

  // ==================== API KEYS ====================

  @Post('api-keys')
  @AdminRoles(AdminRole.OWNER, AdminRole.ADMIN)
  async createApiKey(@Body() body: CreateApiKeyDto, @Request() req: AuthenticatedAdminRequest) {
    const result = await this.aiModelsService.createApiKey(body, req.user.id);
    return { success: true, data: convertKeys(result) };
  }

  @Get('api-keys')
  @AdminRoles(AdminRole.OWNER, AdminRole.ADMIN)
  async findApiKeys(@Query('providerId') providerId?: string) {
    const result = providerId
      ? await this.aiModelsService.findApiKeysByProvider(providerId)
      : await this.aiModelsService.findAllApiKeys();
    return { success: true, data: convertKeys(result) };
  }

  @Get('api-keys/:id/decrypt')
  @AdminRoles(AdminRole.OWNER, AdminRole.ADMIN)
  async decryptApiKey() {
    throw new ForbiddenException('API key plaintext export is not allowed');
  }

  @Put('api-keys/:id/status')
  @AdminRoles(AdminRole.OWNER, AdminRole.ADMIN)
  async updateApiKeyStatus(
    @Param('id') id: string,
    @Body() body: UpdateApiKeyStatusDto,
  ) {
    const result = await this.aiModelsService.updateApiKeyStatus(id, body);
    return { success: true, data: convertKeys(result) };
  }

  @Put('api-keys/:id')
  @AdminRoles(AdminRole.OWNER, AdminRole.ADMIN)
  async updateApiKey(
    @Param('id') id: string,
    @Body() body: UpdateApiKeyDto,
  ) {
    const result = await this.aiModelsService.updateApiKey(id, body);
    return { success: true, data: convertKeys(result) };
  }

  @Delete('api-keys/:id')
  @AdminRoles(AdminRole.OWNER, AdminRole.ADMIN)
  async deleteApiKey(@Param('id') id: string) {
    const result = await this.aiModelsService.deleteApiKey(id);
    return { success: true, data: convertKeys(result) };
  }

  // ==================== ENDPOINTS ====================

  @Post('endpoints')
  @AdminRoles(AdminRole.OWNER, AdminRole.ADMIN)
  async createEndpoint(@Body() body: CreateEndpointDto) {
    const result = await this.aiModelsService.createEndpoint(body);
    return { success: true, data: result };
  }

  @Get('endpoints')
  @AdminRoles(AdminRole.OWNER, AdminRole.ADMIN)
  async findEndpoints(@Query('providerId') providerId: string) {
    const result = await this.aiModelsService.findEndpointsByProvider(providerId);
    return { success: true, data: result };
  }

  @Get('endpoints/:id')
  @AdminRoles(AdminRole.OWNER, AdminRole.ADMIN)
  async findEndpointById(@Param('id') id: string) {
    const result = await this.aiModelsService.findEndpointById(id);
    return { success: true, data: result };
  }

  @Put('endpoints/:id')
  @AdminRoles(AdminRole.OWNER, AdminRole.ADMIN)
  async updateEndpoint(
    @Param('id') id: string,
    @Body() body: UpdateEndpointDto,
  ) {
    const result = await this.aiModelsService.updateEndpoint(id, body);
    return { success: true, data: result };
  }

  @Delete('endpoints/:id')
  @AdminRoles(AdminRole.OWNER, AdminRole.ADMIN)
  async deleteEndpoint(@Param('id') id: string) {
    const result = await this.aiModelsService.deleteEndpoint(id);
    return { success: true, data: result };
  }

  // ==================== MODEL CONFIGS ====================

  @Post('model-configs')
  @AdminRoles(AdminRole.OWNER, AdminRole.ADMIN)
  async createModelConfig(@Body() body: CreateModelConfigDto) {
    const result = await this.aiModelsService.createModelConfig(body);
    return { success: true, data: result };
  }

  @Get('model-configs')
  @AdminRoles(AdminRole.OWNER, AdminRole.ADMIN)
  async findModelConfigs(@Query('modelId') modelId: string) {
    const result = await this.aiModelsService.findModelConfigsByModel(modelId);
    return { success: true, data: result };
  }

  @Get('model-configs/:id')
  @AdminRoles(AdminRole.OWNER, AdminRole.ADMIN)
  async findModelConfigById(@Param('id') id: string) {
    const result = await this.aiModelsService.findModelConfigById(id);
    return { success: true, data: result };
  }

  @Put('model-configs/:id')
  @AdminRoles(AdminRole.OWNER, AdminRole.ADMIN)
  async updateModelConfig(
    @Param('id') id: string,
    @Body() body: UpdateModelConfigDto,
  ) {
    const result = await this.aiModelsService.updateModelConfig(id, body);
    return { success: true, data: result };
  }

  @Delete('model-configs/:id')
  @AdminRoles(AdminRole.OWNER, AdminRole.ADMIN)
  async deleteModelConfig(@Param('id') id: string) {
    const result = await this.aiModelsService.deleteModelConfig(id);
    return { success: true, data: result };
  }

  // ==================== DEFAULT MODELS ====================

  @Post('default-models')
  @AdminRoles(AdminRole.OWNER, AdminRole.ADMIN)
  async createDefaultModel(@Body() body: CreateDefaultModelDto) {
    const result = await this.aiModelsService.createDefaultModel(body);
    return { success: true, data: result };
  }

  @Get('default-models')
  @AdminRoles(AdminRole.OWNER, AdminRole.ADMIN)
  async findAllDefaultModels() {
    const result = await this.aiModelsService.findAllDefaultModels();
    return { success: true, data: result };
  }

  @Get('default-models/provider/:providerId')
  @AdminRoles(AdminRole.OWNER, AdminRole.ADMIN)
  async findDefaultModelsByProvider(@Param('providerId') providerId: string) {
    const result = await this.aiModelsService.findDefaultModelsByProvider(
      providerId,
    );
    return { success: true, data: result };
  }

  @Get('default-models/use-case/:useCase')
  @AdminRoles(AdminRole.OWNER, AdminRole.ADMIN)
  async findDefaultModelByUseCase(@Param('useCase') useCase: string) {
    const result = await this.aiModelsService.findDefaultModelByUseCase(useCase);
    return { success: true, data: result };
  }

  @Put('default-models/:id')
  @AdminRoles(AdminRole.OWNER, AdminRole.ADMIN)
  async updateDefaultModel(
    @Param('id') id: string,
    @Body() body: UpdateDefaultModelDto,
  ) {
    const result = await this.aiModelsService.updateDefaultModel(id, body);
    return { success: true, data: result };
  }

  @Delete('default-models/:id')
  @AdminRoles(AdminRole.OWNER, AdminRole.ADMIN)
  async deleteDefaultModel(@Param('id') id: string) {
    const result = await this.aiModelsService.deleteDefaultModel(id);
    return { success: true, data: result };
  }

  // ==================== TEAM QUOTAS ====================

  @Post('team-quotas')
  @AdminRoles(AdminRole.OWNER, AdminRole.ADMIN)
  async createTeamQuota(@Body() body: CreateTeamQuotaDto) {
    const result = await this.aiModelsService.createTeamQuota(body);
    return { success: true, data: result };
  }

  @Get('team-quotas')
  @AdminRoles(AdminRole.OWNER, AdminRole.ADMIN)
  async findTeamQuota(@Query('teamId') teamId: string) {
    const result = await this.aiModelsService.findTeamQuotaByTeamId(teamId);
    return { success: true, data: result };
  }

  @Put('team-quotas/:teamId')
  @AdminRoles(AdminRole.OWNER, AdminRole.ADMIN)
  async updateTeamQuota(
    @Param('teamId') teamId: string,
    @Body() body: UpdateTeamQuotaDto,
  ) {
    const result = await this.aiModelsService.updateTeamQuota(teamId, body);
    return { success: true, data: result };
  }

  @Post('team-quotas/:teamId/reset')
  @AdminRoles(AdminRole.OWNER, AdminRole.ADMIN)
  async resetTeamQuota(
    @Param('teamId') teamId: string,
    @Body() body: { type: 'daily' | 'monthly' },
  ) {
    const result =
      body.type === 'daily'
        ? await this.aiModelsService.resetTeamQuotaDaily(teamId)
        : await this.aiModelsService.resetTeamQuotaMonthly(teamId);
    return { success: true, data: result };
  }

  @Delete('team-quotas/:teamId')
  @AdminRoles(AdminRole.OWNER, AdminRole.ADMIN)
  async deleteTeamQuota(@Param('teamId') teamId: string) {
    const result = await this.aiModelsService.deleteTeamQuota(teamId);
    return { success: true, data: result };
  }

  // ==================== USAGE LOGS ====================

  @Post('usage-logs')
  @AdminRoles(AdminRole.OWNER, AdminRole.ADMIN)
  async createUsageLog(@Body() body: CreateUsageLogDto) {
    const result = await this.aiModelsService.createUsageLog(body);
    return { success: true, data: result };
  }

  @Get('usage-logs')
  @AdminRoles(AdminRole.OWNER, AdminRole.ADMIN)
  async findUsageLogs(
    @Query('teamId') teamId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const result = await this.aiModelsService.findUsageLogsByTeam(
      teamId,
      limit || 100,
      offset || 0,
    );
    return { success: true, data: result };
  }

  @Get('usage-logs/stats')
  @AdminRoles(AdminRole.OWNER, AdminRole.ADMIN)
  async getUsageStats(
    @Query('teamId') teamId: string,
    @Query('period') period?: 'day' | 'week' | 'month',
  ) {
    const result = await this.aiModelsService.getUsageStatsByTeam(
      teamId,
      period || 'month',
    );
    return { success: true, data: result };
  }
}