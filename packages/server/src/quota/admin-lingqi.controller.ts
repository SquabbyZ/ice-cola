import { Body, Controller, ForbiddenException, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AdminJwtAuthGuard } from '../auth/admin-jwt-auth.guard';
import { AdminRole } from '../admin-admin/dto/invite.dto';
import { AdminRoles } from '../common/decorators/admin-roles.decorator';
import { AdminRolesGuard } from '../common/guards/admin-roles.guard';
import {
  AdminLingqiLedgerQuery,
  CreateAdminRedemptionCodeRequest,
  ListAdminRedemptionCodesQuery,
  QuotaService,
} from './quota.service';

interface AuthenticatedRequest {
  user: {
    sub: string;
  };
}

interface DisableRedemptionCodeBody {
  reason?: string;
}

@Controller('admin/lingqi')
@UseGuards(AdminJwtAuthGuard, AdminRolesGuard)
@AdminRoles(AdminRole.OWNER, AdminRole.ADMIN)
export class AdminLingqiController {
  constructor(private readonly quotaService: QuotaService) {}

  @Post('redemption-codes')
  async createRedemptionCode(@Req() req: AuthenticatedRequest, @Body() body: CreateAdminRedemptionCodeRequest) {
    return {
      success: true,
      data: await this.quotaService.createAdminRedemptionCode(req.user.sub, body),
    };
  }

  @Get('redemption-codes')
  async listRedemptionCodes(@Req() req: AuthenticatedRequest, @Query() query: ListAdminRedemptionCodesQuery) {
    return {
      success: true,
      data: await this.quotaService.listAdminRedemptionCodes(req.user.sub, query),
    };
  }

  @Get('redemption-codes/:id')
  async getRedemptionCode(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return {
      success: true,
      data: await this.quotaService.getAdminRedemptionCode(id, req.user.sub),
    };
  }

  @Post('redemption-codes/:id/disable')
  async disableRedemptionCode(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: DisableRedemptionCodeBody,
  ) {
    return {
      success: true,
      data: await this.quotaService.disableAdminRedemptionCode(id, req.user.sub, body.reason),
    };
  }

  @Get('ledger')
  @AdminRoles(AdminRole.OWNER)
  async listLedger(@Query() query: AdminLingqiLedgerQuery) {
    if (query.teamId) {
      const { teamId, ...scopedQuery } = query;
      return {
        success: true,
        data: await this.quotaService.listAdminLingqiLedgerEntries(teamId, scopedQuery),
      };
    }

    // If no teamId, return empty result
    return {
      success: true,
      data: { items: [], total: 0, limit: query.limit || 10, offset: query.offset || 0 },
    };
  }
}
