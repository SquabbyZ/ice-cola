import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.service';
import { AppError } from '../common/interfaces/errors';

export enum TeamRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export interface QuotaCheckResult {
  hasQuota: boolean;
  remaining?: number;
  unlimited: boolean;
}

interface QuotaRow {
  id: string;
  teamId: string;
  totalAmt: string;
  usedAmt: string;
  period: number | null;
  resetDay: number | null;
  resetAt: Date | null;
}

@Injectable()
export class QuotaService {
  constructor(private db: DatabaseService) {}

  async getQuota(teamId: string) {
    let quota = await this.db.findQuotaByTeamId(teamId) as QuotaRow | null;

    if (!quota) {
      quota = await this.db.createQuota({
        teamId,
        totalAmt: BigInt(1000),
        usedAmt: BigInt(0),
      }) as QuotaRow;
    }

    const totalAmt = BigInt(quota.totalAmt);
    const usedAmt = BigInt(quota.usedAmt);
    const remainingAmt = totalAmt === BigInt(-1) ? BigInt(-1) : totalAmt - usedAmt;

    return {
      teamId: quota.teamId,
      total: Number(totalAmt),
      used: Number(usedAmt),
      remaining: Number(remainingAmt),
      period: quota.period,
      resetDay: quota.resetDay,
      resetAt: quota.resetAt,
      isUnlimited: totalAmt === BigInt(-1),
    };
  }

  async checkQuota(teamId: string): Promise<QuotaCheckResult> {
    let quota = await this.db.findQuotaByTeamId(teamId) as QuotaRow | null;

    if (!quota) {
      quota = await this.db.createQuota({
        teamId,
        totalAmt: BigInt(1000),
        usedAmt: BigInt(0),
      }) as QuotaRow;
    }

    const totalAmt = BigInt(quota.totalAmt);

    if (totalAmt === BigInt(-1)) {
      return { hasQuota: true, unlimited: true };
    }

    const usedAmt = BigInt(quota.usedAmt);
    const remaining = Number(totalAmt - usedAmt);
    return {
      hasQuota: remaining > 0,
      remaining,
      unlimited: false,
    };
  }

  async consumeQuota(teamId: string, amount: number): Promise<void> {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new AppError('QUOTA_INVALID_AMOUNT', '额度变更数量必须是正整数', 400);
    }

    await this.db.transaction(async (client) => {
      await this.lockQuotaTeam(client, teamId);
      let quota = await this.findQuotaForUpdate(client, teamId);

      if (!quota) {
        quota = await this.createQuotaInTransaction(client, {
          teamId,
          totalAmt: BigInt(1000),
          usedAmt: BigInt(0),
        }) as QuotaRow;
      }

      const totalAmt = BigInt(quota.totalAmt);
      const usedAmt = BigInt(quota.usedAmt);

      if (totalAmt !== BigInt(-1)) {
        const remaining = totalAmt - usedAmt;
        if (remaining < BigInt(amount)) {
          throw new AppError('QUOTA_INSUFFICIENT', `配额不足，还剩 ${remaining}`, 403);
        }
      }

      await this.incrementQuotaUsedInTransaction(client, teamId, BigInt(amount));
    });
  }

  async recharge(
    teamId: string,
    userId: string,
    amount: number,
    note: string | null,
    operatorRole: TeamRole,
  ) {
    if (operatorRole === TeamRole.MEMBER) {
      throw new AppError('QUOTA_ADMIN_REQUIRED', '只有管理员可以调整额度', 403);
    }

    if (!Number.isInteger(amount) || amount <= 0) {
      throw new AppError('QUOTA_INVALID_AMOUNT', '额度变更数量必须是正整数', 400);
    }

    return this.db.transaction(async (client) => {
      await this.lockQuotaTeam(client, teamId);
      let quota = await this.findQuotaForUpdate(client, teamId);

      if (!quota) {
        await this.createQuotaInTransaction(client, {
          teamId,
          totalAmt: BigInt(amount),
          usedAmt: BigInt(0),
        });
        return {
          success: true,
          newTotal: amount,
        };
      }

      const currentTotal = BigInt(quota.totalAmt);
      const newTotal = currentTotal + BigInt(amount);

      await this.updateQuotaTotalInTransaction(client, teamId, BigInt(amount));

      return {
        success: true,
        newTotal: Number(newTotal),
      };
    });
  }

  private async lockQuotaTeam(client: PoolClient, teamId: string): Promise<void> {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [teamId]);
  }

  private async findQuotaForUpdate(client: PoolClient, teamId: string): Promise<QuotaRow | null> {
    const rows = await client.query<QuotaRow>(
      'SELECT * FROM quotas WHERE "teamId" = $1 FOR UPDATE',
      [teamId],
    );
    return rows.rows[0] || null;
  }

  private async createQuotaInTransaction(
    client: PoolClient,
    data: {
      teamId: string;
      totalAmt: bigint;
      usedAmt: bigint;
    },
  ): Promise<QuotaRow> {
    const rows = await client.query<QuotaRow>(
      `INSERT INTO quotas (id, "teamId", "totalAmt", "usedAmt", "period", "resetDay", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [
        randomUUID(),
        data.teamId,
        data.totalAmt.toString(),
        data.usedAmt.toString(),
        30,
        1,
      ],
    );
    return rows.rows[0];
  }

  private async incrementQuotaUsedInTransaction(client: PoolClient, teamId: string, amount: bigint): Promise<void> {
    await client.query(
      'UPDATE quotas SET "usedAmt" = "usedAmt" + $1, "updatedAt" = NOW() WHERE "teamId" = $2',
      [amount.toString(), teamId],
    );
  }

  private async updateQuotaTotalInTransaction(client: PoolClient, teamId: string, amount: bigint): Promise<void> {
    await client.query(
      'UPDATE quotas SET "totalAmt" = "totalAmt" + $1, "updatedAt" = NOW() WHERE "teamId" = $2',
      [amount.toString(), teamId],
    );
  }
}