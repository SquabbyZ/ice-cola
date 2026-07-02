import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminAuditService, AuditLogRow } from './admin-audit.service';
import { AdminJwtAuthGuard } from '../auth/admin-jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TeamRole } from '../quota/quota.service';
import { AppError } from '../common/interfaces/errors';

interface ListQuery {
  limit?: string;
  offset?: string;
  adminId?: string;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Controller('admin/audit-logs')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class AdminAuditController {
  constructor(private readonly audit: AdminAuditService) {}

  @Get()
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async list(
    @Query() q: ListQuery,
  ): Promise<{ success: true; data: { items: AuditLogRow[]; total: number } }> {
    const limit = Math.min(
      Math.max(parseInt(q.limit ?? '50', 10) || 50, 1),
      200,
    );
    const offset = Math.max(parseInt(q.offset ?? '0', 10) || 0, 0);
    if (q.adminId && !UUID_RE.test(q.adminId)) {
      throw new AppError('INVALID_ADMIN_ID', 'adminId 必须是 UUID', 400);
    }
    const [items, total] = await Promise.all([
      this.audit.list({ limit, offset, adminId: q.adminId }),
      this.audit.count({ adminId: q.adminId }),
    ]);
    return { success: true, data: { items, total } };
  }
}
