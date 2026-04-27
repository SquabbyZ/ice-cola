import { Injectable } from '@nestjs/common';
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

  async consumeQuota(teamId: string, amount: number, note?: string): Promise<void> {
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

    if (totalAmt !== BigInt(-1)) {
      const remaining = totalAmt - usedAmt;
      if (remaining < BigInt(amount)) {
        throw new AppError('QUOTA_INSUFFICIENT', `配额不足，还剩 ${remaining}`, 403);
      }
    }

    await this.db.incrementQuotaUsed(teamId, BigInt(amount));
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

    let quota = await this.db.findQuotaByTeamId(teamId) as QuotaRow | null;

    if (!quota) {
      quota = await this.db.createQuota({
        teamId,
        totalAmt: BigInt(amount),
        usedAmt: BigInt(0),
      }) as QuotaRow;
      return {
        success: true,
        newTotal: amount,
      };
    }

    const currentTotal = BigInt(quota.totalAmt);
    const newTotal = currentTotal + BigInt(amount);

    await this.db.updateQuota(teamId, { totalAmt: newTotal });

    return {
      success: true,
      newTotal: Number(newTotal),
    };
  }
}