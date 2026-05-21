import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser, CurrentAuthUser } from '../common/decorators/current-user.decorator';
import { QuotaService } from './quota.service';

interface SelectModelRequest {
  modelId: string;
  conversationId?: string;
}

const ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const MAX_ID_LENGTH = 256;

@Controller('teams/:teamId/models')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ModelCatalogController {
  constructor(private readonly quotaService: QuotaService) {}

  private assertTeamAccess(teamId: string, user: CurrentAuthUser): void {
    if (user.teamId !== teamId) {
      throw new ForbiddenException('不能访问其他团队的模型目录');
    }
  }

  private validateId(value: unknown, message: string): string {
    if (typeof value !== 'string') {
      throw new BadRequestException(message);
    }

    const trimmedValue = value.trim();
    if (trimmedValue.length === 0 || trimmedValue.length > MAX_ID_LENGTH || !ID_PATTERN.test(trimmedValue)) {
      throw new BadRequestException(message);
    }

    return trimmedValue;
  }

  private validateSelectBody(body: unknown): SelectModelRequest {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('模型选择请求无效');
    }

    const request = body as Record<string, unknown>;
    const modelId = this.validateId(request.modelId, '模型 ID 无效');

    const conversationId = request.conversationId;
    if (conversationId !== undefined) {
      return {
        modelId,
        conversationId: this.validateId(conversationId, '会话 ID 无效'),
      };
    }

    return { modelId };
  }

  @Get('catalog')
  async getCatalog(
    @Param('teamId') teamId: string,
    @CurrentUser() user: CurrentAuthUser,
  ) {
    this.assertTeamAccess(teamId, user);
    const catalog = await this.quotaService.getModelCatalogForTeam(teamId);
    return { success: true, data: catalog };
  }

  @Post('select')
  async selectModel(
    @Param('teamId') teamId: string,
    @Body() body: unknown,
    @CurrentUser() user: CurrentAuthUser,
  ) {
    this.assertTeamAccess(teamId, user);
    const request = this.validateSelectBody(body);
    const selectedModel = await this.quotaService.selectModel(teamId, request.modelId, request.conversationId);
    return { success: true, data: selectedModel };
  }
}
