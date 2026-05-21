import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LingqiEstimateRequest, QuotaService } from './quota.service';
import { DatabaseService } from '../database/database.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentAuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { TeamRole } from './quota.service';

const REDEEM_ATTEMPT_WINDOW_MS = 60_000;
const MAX_REDEEM_ATTEMPTS_PER_WINDOW = 5;
const DEFAULT_LEDGER_LIMIT = 10;
const MAX_LEDGER_LIMIT = 100;

@Controller('teams/:teamId/quota')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuotaController {
  constructor(
    private readonly quotaService: QuotaService,
    private readonly databaseService: DatabaseService,
  ) {}

  private assertTeamAccess(teamId: string, user: CurrentAuthUser): void {
    if (user.teamId !== teamId) {
      throw new ForbiddenException('不能访问其他团队的灵气额度');
    }
  }

  private async assertRedeemRateLimit(teamId: string, userId: string): Promise<void> {
    const result = await this.databaseService.queryOne<{ attempt_count: string }>(
      `INSERT INTO redemption_attempt_limits (team_id, user_id, attempt_count, reset_at, updated_at)
       VALUES ($1, $2, 1, NOW() + ($3::integer * INTERVAL '1 millisecond'), NOW())
       ON CONFLICT (team_id, user_id) DO UPDATE SET
         attempt_count = CASE
           WHEN redemption_attempt_limits.reset_at <= NOW() THEN 1
           ELSE redemption_attempt_limits.attempt_count + 1
         END,
         reset_at = CASE
           WHEN redemption_attempt_limits.reset_at <= NOW() THEN NOW() + ($3::integer * INTERVAL '1 millisecond')
           ELSE redemption_attempt_limits.reset_at
         END,
         updated_at = NOW()
       RETURNING attempt_count`,
      [teamId, userId, REDEEM_ATTEMPT_WINDOW_MS],
    );

    if (Number(result?.attempt_count ?? 0) > MAX_REDEEM_ATTEMPTS_PER_WINDOW) {
      throw new ForbiddenException('兑换尝试过于频繁，请稍后再试');
    }
  }

  private validateRedeemBody(body: unknown): string {
    if (!body || typeof body !== 'object') {
      throw new BadRequestException('兑换码请求无效');
    }

    const code = (body as { code?: unknown }).code;
    if (typeof code !== 'string' || code.trim().length === 0) {
      throw new BadRequestException('兑换码无效');
    }

    return code;
  }

  private validateEstimateBody(body: unknown): LingqiEstimateRequest {
    if (!body || typeof body !== 'object') {
      throw new BadRequestException('灵气预估请求无效');
    }

    const request = body as Record<string, unknown>;
    const transactionTypes = ['chat_message', 'tool_call', 'expert_skill', 'background_task'];
    const toolComplexities = ['light', 'medium', 'heavy'];
    const taskPhases = ['create', 'execute', 'artifact'];

    if (!transactionTypes.includes(request.transactionType as string)) {
      throw new BadRequestException('事务类型无效');
    }

    if (request.modelId !== undefined && typeof request.modelId !== 'string') {
      throw new BadRequestException('模型 ID 无效');
    }

    if (request.toolComplexity !== undefined && !toolComplexities.includes(request.toolComplexity as string)) {
      throw new BadRequestException('工具复杂度无效');
    }

    if (request.taskPhase !== undefined && !taskPhases.includes(request.taskPhase as string)) {
      throw new BadRequestException('任务阶段无效');
    }

    if (request.context !== undefined && (!request.context || typeof request.context !== 'object' || Array.isArray(request.context))) {
      throw new BadRequestException('上下文无效');
    }

    return body as LingqiEstimateRequest;
  }

  private parseLedgerLimit(limit?: string): number {
    if (limit === undefined) {
      return DEFAULT_LEDGER_LIMIT;
    }

    const parsedLimit = Number(limit);
    if (!Number.isInteger(parsedLimit)) {
      return DEFAULT_LEDGER_LIMIT;
    }

    return Math.min(MAX_LEDGER_LIMIT, Math.max(1, parsedLimit));
  }

  @Get()
  async getQuota(
    @Param('teamId') teamId: string,
    @CurrentUser() user: CurrentAuthUser,
  ) {
    this.assertTeamAccess(teamId, user);
    const quota = await this.quotaService.getQuota(teamId);
    return { success: true, data: quota };
  }

  @Get('status')
  async getLingqiStatus(
    @Param('teamId') teamId: string,
    @CurrentUser() user: CurrentAuthUser,
  ) {
    this.assertTeamAccess(teamId, user);
    const status = await this.quotaService.getLingqiStatus(teamId);
    return { success: true, data: status };
  }

  @Get('ledger')
  async getRecentLingqiLedgerEntries(
    @Param('teamId') teamId: string,
    @Query('limit') limit: string | undefined,
    @CurrentUser() user: CurrentAuthUser,
  ) {
    this.assertTeamAccess(teamId, user);
    const entries = await this.quotaService.getRecentLingqiLedgerEntries(teamId, this.parseLedgerLimit(limit));
    return { success: true, data: entries };
  }

  @Post('redeem')
  async redeemLingqi(
    @Param('teamId') teamId: string,
    @Body() body: unknown,
    @CurrentUser() user: CurrentAuthUser,
  ) {
    this.assertTeamAccess(teamId, user);
    await this.assertRedeemRateLimit(teamId, user.sub);
    const code = this.validateRedeemBody(body);
    const result = await this.quotaService.redeemLingqiCode(teamId, user.sub, code);
    return { success: true, data: result };
  }

  @Post('estimate')
  async estimateLingqiCost(
    @Param('teamId') teamId: string,
    @Body() body: unknown,
    @CurrentUser() user: CurrentAuthUser,
  ) {
    this.assertTeamAccess(teamId, user);
    const request = this.validateEstimateBody(body);
    const result = await this.quotaService.estimateLingqiCost(teamId, request);
    return { success: true, data: result };
  }

  @Post('recharge')
  @Roles(TeamRole.ADMIN, TeamRole.OWNER)
  async recharge(
    @Param('teamId') teamId: string,
    @Body() _body: unknown,
    @CurrentUser() user: CurrentAuthUser,
  ) {
    this.assertTeamAccess(teamId, user);
    throw new ForbiddenException('公开团队接口不支持直接充值灵气');
  }
}
