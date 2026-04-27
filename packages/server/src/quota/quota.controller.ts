import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { QuotaService } from './quota.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { TeamRole } from './quota.service';

@Controller('teams/:teamId/quota')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuotaController {
  constructor(private readonly quotaService: QuotaService) {}

  @Get()
  async getQuota(@Param('teamId') teamId: string) {
    const quota = await this.quotaService.getQuota(teamId);
    return { success: true, data: quota };
  }

  @Post('recharge')
  @Roles(TeamRole.ADMIN, TeamRole.OWNER)
  async recharge(
    @Param('teamId') teamId: string,
    @Body() body: { amount: string; note?: string },
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.quotaService.recharge(
      teamId,
      user.sub,
      parseInt(body.amount, 10),
      body.note || null,
      user.role as TeamRole,
    );
    return { success: true, data: result };
  }
}
