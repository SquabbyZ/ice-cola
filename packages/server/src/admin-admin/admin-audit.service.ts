import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AppError } from '../common/interfaces/errors';

export interface AuditLogInput {
  adminId: string | null;
  action: string;
  targetId?: string | null;
  targetEmail?: string | null;
  metadata?: Record<string, any> | null;
  ip?: string | null;
  userAgent?: string | null;
}

export interface AuditLogRow {
  id: string;
  adminId: string | null;
  action: string;
  targetId: string | null;
  targetEmail: string | null;
  metadata: Record<string, any> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface ListAuditLogsOptions {
  limit?: number;
  offset?: number;
  adminId?: string | null;
}

@Injectable()
export class AdminAuditService {
  constructor(private db: DatabaseService) {}

  async log(input: AuditLogInput): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO admin_audit_logs
           ("adminId", action, "targetId", "targetEmail", metadata, ip, "userAgent")
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          input.adminId,
          input.action,
          input.targetId ?? null,
          input.targetEmail ?? null,
          input.metadata != null ? JSON.stringify(input.metadata) : null,
          input.ip ?? null,
          input.userAgent ?? null,
        ],
      );
    } catch (err) {
      throw new AppError(
        'AUDIT_LOG_FAILED',
        `Failed to write audit log: ${(err as Error).message ?? 'unknown error'}`,
        500,
      );
    }
  }

  async list({
    limit = 50,
    offset = 0,
    adminId,
  }: ListAuditLogsOptions = {}): Promise<AuditLogRow[]> {
    const params: any[] = [];
    let where = '';
    if (adminId) {
      params.push(adminId);
      where = `WHERE "adminId" = $${params.length}`;
    }
    params.push(limit);
    params.push(offset);

    return this.db.query<AuditLogRow>(
      `SELECT id, "adminId", action, "targetId", "targetEmail", metadata, ip, "userAgent", "createdAt"
       FROM admin_audit_logs
       ${where}
       ORDER BY "createdAt" DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
  }

  async count({ adminId }: { adminId?: string } = {}): Promise<number> {
    const params: any[] = [];
    let where = '';
    if (adminId) {
      params.push(adminId);
      where = `WHERE "adminId" = $${params.length}`;
    }
    const result = await this.db.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM admin_audit_logs ${where}`,
      params,
    );
    return parseInt(result?.count || '0', 10);
  }
}
