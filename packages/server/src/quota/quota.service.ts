import { createHash, createHmac, randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.service';
import { AppError } from '../common/interfaces/errors';

export enum TeamRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export type LingqiTransactionType = 'chat_message' | 'tool_call' | 'expert_skill' | 'background_task';
export type LingqiDirection = 'grant' | 'consume';

export interface QuotaCheckResult {
  hasQuota: boolean;
  remaining?: number;
  unlimited: boolean;
}

export interface CultivationRealmView {
  name: string;
  displayName: string;
  minTotalConsumed: number;
  sortOrder: number;
  privileges: Record<string, unknown>;
}

export interface LingqiStatus {
  teamId: string;
  balance: number;
  totalGranted: number;
  totalConsumed: number;
  cultivationRealm: CultivationRealmView;
  nextCultivationRealm: CultivationRealmView | null;
  realmProgress: {
    current: number;
    required: number;
    percentage: number;
  };
  subscription: SubscriptionView;
  warningThreshold: number;
}

export interface LingqiEstimateRequest {
  transactionType: LingqiTransactionType;
  modelId?: string;
  toolComplexity?: 'light' | 'medium' | 'heavy';
  taskPhase?: 'create' | 'execute' | 'artifact';
  context?: Record<string, unknown>;
}

export interface LingqiEstimateResult {
  estimatedCost: number;
  balanceAfterEstimate: number;
  canAfford: boolean;
  reason: 'SUBSCRIPTION_REQUIRED' | 'LINGQI_INSUFFICIENT_BALANCE' | null;
  model: ModelCatalogView;
  subscription: SubscriptionView;
}

export interface AvailableModelCatalogView extends ModelCatalogView {
  description: string | null;
  isAvailable: boolean;
  unavailableReason: 'SUBSCRIPTION_REQUIRED' | null;
}

export interface SelectedModelForExecution {
  id: string;
  modelName: string;
}

export interface ConsumeLingqiRequest {
  amount: number;
  transactionType: LingqiTransactionType;
  sourceType: string;
  sourceId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
  refundOfIdempotencyKey?: string;
}

export interface LingqiLedgerEntryView {
  id: string;
  direction: string;
  amount: number;
  transactionType: string;
  sourceType: string;
  description: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export type AdminRedemptionCodeType = 'lingqi_only' | 'plan_with_lingqi';
export type AdminRedemptionCodeStatus = 'active' | 'redeemed' | 'expired' | 'disabled';

export interface CreateAdminRedemptionCodeRequest {
  type: AdminRedemptionCodeType;
  lingqiAmount: number;
  planId?: string;
  expiresAt?: string;
  note?: string;
}

export interface AdminRedemptionCodeView {
  id: string;
  type: AdminRedemptionCodeType;
  codePreview: string;
  lingqiAmount: number;
  planId: string | null;
  maxUses: number;
  usedCount: number;
  status: AdminRedemptionCodeStatus;
  expiresAt: Date | null;
  note: string | null;
  createdByUserId: string | null;
  disabledAt: Date | null;
  disabledByUserId: string | null;
  disabledReason: string | null;
  redeemedTeamId: string | null;
  redeemedUserId: string | null;
  redeemedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatedAdminRedemptionCodeView extends AdminRedemptionCodeView {
  code: string;
}

export interface ListAdminRedemptionCodesQuery {
  status?: AdminRedemptionCodeStatus;
  limit?: number | string;
  offset?: number | string;
}

export interface AdminLingqiLedgerEntryView extends LingqiLedgerEntryView {
  teamId: string;
  userId: string | null;
  sourceId: string | null;
}

export interface AdminLingqiLedgerQuery {
  teamId?: string;
  userId?: string;
  direction?: LingqiDirection;
  transactionType?: string;
  from?: string;
  to?: string;
  limit?: number | string;
  offset?: number | string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
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

interface LingqiAccountRow {
  team_id: string;
  balance_amt: string;
  total_granted_amt: string;
  total_consumed_amt: string;
}

interface CultivationRealmRow {
  name: string;
  display_name: string;
  min_total_consumed_amt: string;
  sort_order: number;
  privileges: Record<string, unknown>;
}

interface SubscriptionRow {
  id?: string;
  plan_id?: string;
  name?: string;
  display_name?: string;
  level: number;
  cost_discount_rate: string;
  model_rank_limit: number;
  expires_at?: Date | null;
}

interface SubscriptionView {
  planName: string;
  displayName: string;
  level: number;
  costDiscountRate: number;
  modelRankLimit: number;
  expiresAt: Date | null;
}

interface ModelCatalogRow {
  id: string;
  model_name: string;
  display_name: string;
  description?: string | null;
  rank: number;
  cost_multiplier: string;
  required_plan_level: number;
  is_active: boolean;
}

interface ModelCatalogView {
  id: string;
  modelName: string;
  displayName: string;
  rank: number;
  costMultiplier: number;
  requiredPlanLevel: number;
}

interface RedemptionCodeRow {
  id: string;
  lingqi_amount: string;
  plan_id: string | null;
  max_uses: number;
  used_count: number;
  expires_at: Date | string | null;
  is_active?: boolean;
}

interface AdminRedemptionCodeRow extends RedemptionCodeRow {
  code_preview: string | null;
  created_by_user_id: string | null;
  note: string | null;
  disabled_at: Date | null;
  disabled_by_user_id: string | null;
  disabled_reason: string | null;
  redeemed_team_id?: string | null;
  redeemed_user_id?: string | null;
  redeemed_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface LingqiLedgerEntryRow {
  id: string;
  team_id?: string;
  user_id?: string | null;
  direction: string;
  amount: string;
  transaction_type: string;
  source_type: string;
  source_id?: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
}

const INITIAL_LINGQI_BALANCE = 0;
const WARNING_THRESHOLD = 0.2;
const CHAT_BASE_COST = 10;
const SKILL_BASE_COST = 20;
const TOOL_COSTS = {
  light: 5,
  medium: 15,
  heavy: 30,
} as const;
const TASK_PHASE_COSTS = {
  create: 10,
  execute: 25,
  artifact: 15,
} as const;
const MAX_REDEMPTION_CODE_LENGTH = 128;
const REDEMPTION_CODE_PATTERN = /^[A-Z0-9_-]+$/;
const GENERATED_REDEMPTION_CODE_LENGTH = 24;
const DEFAULT_ADMIN_LIST_LIMIT = 50;
const MAX_ADMIN_REDEMPTION_NOTE_LENGTH = 500;
const ID_PATTERN = /^[a-zA-Z0-9_-]{1,100}$/;

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
      throw new AppError('LINGQI_INVALID_AMOUNT', '灵气充值数量必须为正整数', 400);
    }

    const newTotal = await this.db.transaction(async (client) => {
      await this.lockQuotaTeam(client, teamId);
      const grantedAmount = BigInt(amount);
      const quotaResult = await client.query<Pick<QuotaRow, 'totalAmt'>>(
        `SELECT "totalAmt"
         FROM quotas
         WHERE "teamId" = $1
         FOR UPDATE`,
        [teamId],
      );
      const quota = quotaResult.rows[0];
      let nextTotal: bigint;

      if (!quota) {
        nextTotal = grantedAmount;
        await client.query(
          `INSERT INTO quotas (id, "teamId", "totalAmt", "usedAmt", "period", "resetDay", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
          [randomUUID(), teamId, nextTotal.toString(), '0', 30, 1],
        );
      } else {
        nextTotal = BigInt(quota.totalAmt) + grantedAmount;
        await client.query(
          `UPDATE quotas
           SET "totalAmt" = "totalAmt" + $1,
               "updatedAt" = NOW()
           WHERE "teamId" = $2`,
          [grantedAmount.toString(), teamId],
        );
      }

      await this.ensureLingqiAccountInTransaction(client, teamId);
      const description = note || '管理员灵气充值';

      await client.query<LingqiAccountRow>(
        `UPDATE lingqi_accounts
         SET balance_amt = balance_amt + $1,
             total_granted_amt = total_granted_amt + $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE team_id = $2
         RETURNING team_id, balance_amt, total_granted_amt, total_consumed_amt`,
        [grantedAmount.toString(), teamId],
      );

      await client.query(
        `INSERT INTO lingqi_ledger_entries (team_id, user_id, direction, amount, transaction_type, source_type, source_id, description, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
        [
          teamId,
          userId,
          'grant',
          grantedAmount.toString(),
          'admin_recharge',
          'admin_recharge',
          null,
          description,
          JSON.stringify(note ? { note } : {}),
        ],
      );

      return nextTotal;
    });

    return {
      success: true,
      newTotal: Number(newTotal),
    };
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

  hashRedemptionCode(code: string): string {
    const normalizedCode = this.normalizeRedemptionCode(code);
    return this.hashNormalizedRedemptionCode(normalizedCode, this.getRedemptionPepper());
  }

  hashLegacyRedemptionCode(code: string): string {
    const normalizedCode = this.normalizeRedemptionCode(code);
    return this.hashNormalizedRedemptionCode(normalizedCode);
  }

  async getLingqiStatus(teamId: string, accountOverride?: LingqiAccountRow): Promise<LingqiStatus> {
    const account = accountOverride ?? await this.ensureLingqiAccount(teamId);
    const realms = await this.getCultivationRealms();
    const subscription = await this.getActiveSubscription(teamId);
    const totalConsumed = Number(account.total_consumed_amt);
    const { currentRealm, nextRealm, progress } = this.deriveRealmProgress(realms, totalConsumed);

    return {
      teamId,
      balance: Number(account.balance_amt),
      totalGranted: Number(account.total_granted_amt),
      totalConsumed,
      cultivationRealm: currentRealm,
      nextCultivationRealm: nextRealm,
      realmProgress: progress,
      subscription,
      warningThreshold: WARNING_THRESHOLD,
    };
  }

  async createAdminRedemptionCode(
    createdByUserId: string,
    request: CreateAdminRedemptionCodeRequest,
  ): Promise<CreatedAdminRedemptionCodeView> {
    const validatedRequest = await this.validateCreateAdminRedemptionCodeRequest(request);
    const code = this.generateRedemptionCode();
    const codeHash = this.hashRedemptionCode(code);
    const codePreview = this.toRedemptionCodePreview(code);
    const rows = await this.db.query<AdminRedemptionCodeRow>(
      `INSERT INTO redemption_codes (
         code_hash, display_label, code_preview, lingqi_amount, plan_id, max_uses,
         expires_at, created_by_user_id, note
       )
       VALUES ($1, $2, $3, $4, $5, 1, $6, $7, $8)
       RETURNING id, lingqi_amount, plan_id, max_uses, used_count, expires_at, is_active,
         code_preview, created_by_user_id, note, disabled_at, disabled_by_user_id,
         disabled_reason, created_at, updated_at`,
      [
        codeHash,
        codePreview,
        codePreview,
        validatedRequest.lingqiAmount.toString(),
        validatedRequest.planId,
        validatedRequest.expiresAt,
        createdByUserId,
        validatedRequest.note,
      ],
    );

    return {
      ...this.toAdminRedemptionCodeView(rows[0]),
      code,
    };
  }

  async listAdminRedemptionCodes(
    createdByUserId: string,
    query: ListAdminRedemptionCodesQuery = {},
  ): Promise<PaginatedResult<AdminRedemptionCodeView>> {
    const limit = this.clampAdminListLimit(query.limit);
    const offset = this.clampOffset(query.offset);
    const values: unknown[] = [createdByUserId];
    const conditions: string[] = ['rc.created_by_user_id = $1'];

    if (query.status === 'active') {
      conditions.push('rc.is_active = true');
      conditions.push('rc.used_count < rc.max_uses');
      conditions.push('(rc.expires_at IS NULL OR rc.expires_at >= CURRENT_TIMESTAMP)');
    } else if (query.status === 'redeemed') {
      conditions.push('(rc.used_count >= rc.max_uses OR rr.redeemed_at IS NOT NULL)');
    } else if (query.status === 'expired') {
      conditions.push('rc.is_active = true');
      conditions.push('rc.used_count < rc.max_uses');
      conditions.push('rc.expires_at < CURRENT_TIMESTAMP');
    } else if (query.status === 'disabled') {
      conditions.push('rc.is_active = false');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await this.db.query<AdminRedemptionCodeRow & { total_count: string }>(
      `SELECT rc.id, rc.lingqi_amount, rc.plan_id, rc.max_uses, rc.used_count, rc.expires_at,
         rc.is_active, rc.code_preview, rc.created_by_user_id, rc.note, rc.disabled_at,
         rc.disabled_by_user_id, rc.disabled_reason, rc.created_at, rc.updated_at,
         rr.team_id AS redeemed_team_id, rr.user_id AS redeemed_user_id, rr.redeemed_at,
         COUNT(*) OVER() AS total_count
       FROM redemption_codes rc
       LEFT JOIN redemption_redemptions rr ON rr.code_id = rc.id
       ${whereClause}
       ORDER BY rc.created_at DESC, rc.id DESC
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset],
    );

    return {
      items: rows.map((row) => this.toAdminRedemptionCodeView(row)),
      total: rows[0] ? Number(rows[0].total_count) : 0,
      limit,
      offset,
    };
  }

  async getAdminRedemptionCode(id: string, createdByUserId: string): Promise<AdminRedemptionCodeView> {
    const row = await this.db.queryOne<AdminRedemptionCodeRow>(
      `SELECT rc.id, rc.lingqi_amount, rc.plan_id, rc.max_uses, rc.used_count, rc.expires_at,
         rc.is_active, rc.code_preview, rc.created_by_user_id, rc.note, rc.disabled_at,
         rc.disabled_by_user_id, rc.disabled_reason, rc.created_at, rc.updated_at,
         rr.team_id AS redeemed_team_id, rr.user_id AS redeemed_user_id, rr.redeemed_at
       FROM redemption_codes rc
       LEFT JOIN redemption_redemptions rr ON rr.code_id = rc.id
       WHERE rc.id = $1 AND rc.created_by_user_id = $2
       LIMIT 1`,
      [id, createdByUserId],
    );

    if (!row) {
      throw new AppError('LINGQI_REDEMPTION_CODE_NOT_FOUND', '兑换码不存在', 404);
    }

    return this.toAdminRedemptionCodeView(row);
  }

  async disableAdminRedemptionCode(id: string, disabledByUserId: string, reason?: string): Promise<AdminRedemptionCodeView> {
    const existing = await this.getAdminRedemptionCode(id, disabledByUserId);

    if (existing.status === 'redeemed') {
      throw new AppError('LINGQI_REDEMPTION_CODE_REDEEMED', '已兑换的兑换码不能禁用', 400);
    }

    const rows = await this.db.query<AdminRedemptionCodeRow>(
      `UPDATE redemption_codes
       SET is_active = false,
           disabled_at = CURRENT_TIMESTAMP,
           disabled_by_user_id = $2,
           disabled_reason = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND created_by_user_id = $2
       RETURNING id, lingqi_amount, plan_id, max_uses, used_count, expires_at, is_active,
         code_preview, created_by_user_id, note, disabled_at, disabled_by_user_id,
         disabled_reason, created_at, updated_at`,
      [id, disabledByUserId, reason ?? null],
    );

    return this.toAdminRedemptionCodeView(rows[0]);
  }

  async listAdminLingqiLedgerEntries(
    teamId: string,
    query: Omit<AdminLingqiLedgerQuery, 'teamId'> = {},
  ): Promise<PaginatedResult<AdminLingqiLedgerEntryView>> {
    const limit = this.clampAdminListLimit(query.limit);
    const offset = this.clampOffset(query.offset);
    const values: unknown[] = [teamId];
    const conditions: string[] = ['team_id = $1'];

    if (query.userId) {
      values.push(query.userId);
      conditions.push(`user_id = $${values.length}`);
    }

    if (query.direction) {
      values.push(query.direction);
      conditions.push(`direction = $${values.length}`);
    }

    if (query.transactionType) {
      values.push(query.transactionType);
      conditions.push(`transaction_type = $${values.length}`);
    }

    if (query.from) {
      values.push(new Date(query.from));
      conditions.push(`created_at >= $${values.length}`);
    }

    if (query.to) {
      values.push(new Date(query.to));
      conditions.push(`created_at <= $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await this.db.query<LingqiLedgerEntryRow & { total_count: string }>(
      `SELECT id, team_id, user_id, direction, amount, transaction_type, source_type,
         source_id, description, metadata, created_at, COUNT(*) OVER() AS total_count
       FROM lingqi_ledger_entries
       ${whereClause}
       ORDER BY created_at DESC, id DESC
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset],
    );

    return {
      items: rows.map((row) => this.toAdminLingqiLedgerEntryView(row)),
      total: rows[0] ? Number(rows[0].total_count) : 0,
      limit,
      offset,
    };
  }

  private async validateCreateAdminRedemptionCodeRequest(request: CreateAdminRedemptionCodeRequest): Promise<{
    type: AdminRedemptionCodeType;
    lingqiAmount: number;
    planId: string | null;
    expiresAt: Date | null;
    note: string | null;
  }> {
    if (request.type !== 'lingqi_only' && request.type !== 'plan_with_lingqi') {
      throw new AppError('LINGQI_REDEMPTION_TYPE_INVALID', '兑换码类型无效', 400);
    }

    if (!Number.isInteger(request.lingqiAmount) || request.lingqiAmount <= 0) {
      throw new AppError('LINGQI_REDEMPTION_AMOUNT_INVALID', '灵气数量必须为正整数', 400);
    }

    if (request.note !== undefined && (typeof request.note !== 'string' || request.note.length > MAX_ADMIN_REDEMPTION_NOTE_LENGTH)) {
      throw new AppError('LINGQI_REDEMPTION_NOTE_INVALID', '备注长度不能超过 500 个字符', 400);
    }

    const planId = request.planId?.trim() || null;
    if (request.type === 'plan_with_lingqi' && !planId) {
      throw new AppError('LINGQI_REDEMPTION_PLAN_REQUIRED', '套餐兑换码必须选择套餐', 400);
    }

    if (planId && !ID_PATTERN.test(planId)) {
      throw new AppError('LINGQI_REDEMPTION_PLAN_INVALID', '套餐 ID 无效', 400);
    }

    if (planId) {
      const plan = await this.db.queryOne<{ id: string }>(
        'SELECT id FROM subscription_plans WHERE id = $1 AND is_active = true LIMIT 1',
        [planId],
      );
      if (!plan) {
        throw new AppError('LINGQI_REDEMPTION_PLAN_INVALID', '套餐不存在或已停用', 400);
      }
    }

    const expiresAt = request.expiresAt ? new Date(request.expiresAt) : null;
    if (request.expiresAt && Number.isNaN(expiresAt?.getTime())) {
      throw new AppError('LINGQI_REDEMPTION_EXPIRES_AT_INVALID', '过期时间无效', 400);
    }

    return {
      type: request.type,
      lingqiAmount: request.lingqiAmount,
      planId,
      expiresAt,
      note: request.note?.trim() || null,
    };
  }

  async redeemLingqiCode(teamId: string, userId: string, code: string): Promise<{ grantedAmount: number; status: LingqiStatus }> {
    const codeHashes = this.getRedemptionCodeLookupHashes(code);

    const account = await this.db.transaction(async (client) => {
      await this.lockQuotaTeam(client, teamId);

      const codeResult = await client.query<RedemptionCodeRow>(
        `SELECT id, lingqi_amount, plan_id, max_uses, used_count, expires_at, is_active
         FROM redemption_codes
         WHERE code_hash = ANY($1::text[])
         ORDER BY array_position($1::text[], code_hash)
         LIMIT 1
         FOR UPDATE`,
        [codeHashes],
      );
      const redemptionCode = codeResult.rows[0];

      if (!redemptionCode || redemptionCode.is_active === false) {
        throw new AppError('LINGQI_REDEMPTION_CODE_INVALID', '灵气兑换码无效', 400);
      }

      if (redemptionCode.expires_at && new Date(redemptionCode.expires_at).getTime() < Date.now()) {
        throw new AppError('LINGQI_REDEMPTION_CODE_EXPIRED', '灵气兑换码已过期', 400);
      }

      if (redemptionCode.used_count >= redemptionCode.max_uses) {
        throw new AppError('LINGQI_REDEMPTION_CODE_EXHAUSTED', '灵气兑换码已用尽', 400);
      }

      const usedResult = await client.query(
        `SELECT id
         FROM redemption_redemptions
         WHERE code_id = $1
         LIMIT 1`,
        [redemptionCode.id],
      );

      if (usedResult.rows.length > 0) {
        throw new AppError('LINGQI_REDEMPTION_CODE_EXHAUSTED', '灵气兑换码已用尽', 400);
      }

      await this.ensureLingqiAccountInTransaction(client, teamId);
      const grantedAmount = BigInt(redemptionCode.lingqi_amount);
      const updateResult = await client.query<LingqiAccountRow>(
        `UPDATE lingqi_accounts
         SET balance_amt = balance_amt + $1,
             total_granted_amt = total_granted_amt + $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE team_id = $2
         RETURNING team_id, balance_amt, total_granted_amt, total_consumed_amt`,
        [grantedAmount.toString(), teamId],
      );

      await client.query(
        `INSERT INTO redemption_redemptions (code_id, team_id, user_id)
         VALUES ($1, $2, $3)`,
        [redemptionCode.id, teamId, userId],
      );

      await client.query(
        `INSERT INTO lingqi_ledger_entries (team_id, user_id, direction, amount, transaction_type, source_type, source_id, description, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
        [
          teamId,
          userId,
          'grant',
          grantedAmount.toString(),
          'redemption_code',
          'redemption_code',
          redemptionCode.id,
          '灵气兑换码充值',
          JSON.stringify({ codeId: redemptionCode.id }),
        ],
      );

      await client.query(
        `UPDATE redemption_codes
         SET used_count = used_count + 1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [redemptionCode.id],
      );

      if (redemptionCode.plan_id) {
        await client.query(
          `INSERT INTO team_subscriptions (team_id, plan_id, starts_at, expires_at, status, source_type, source_id)
           VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '30 days', 'active', $3, $4)
           ON CONFLICT (team_id) WHERE status = 'active'
           DO UPDATE SET plan_id = EXCLUDED.plan_id,
                         starts_at = EXCLUDED.starts_at,
                         expires_at = EXCLUDED.expires_at,
                         source_type = EXCLUDED.source_type,
                         source_id = EXCLUDED.source_id,
                         updated_at = CURRENT_TIMESTAMP`,
          [teamId, redemptionCode.plan_id, 'redemption_code', redemptionCode.id],
        );
      }

      return {
        account: updateResult.rows[0],
        grantedAmount: Number(redemptionCode.lingqi_amount),
      };
    });

    return {
      grantedAmount: account.grantedAmount,
      status: await this.getLingqiStatus(teamId, account.account),
    };
  }

  async getModelCatalogForTeam(teamId: string): Promise<AvailableModelCatalogView[]> {
    const subscription = await this.getActiveSubscription(teamId);
    const rows = await this.db.query<ModelCatalogRow>(
      `SELECT id, model_name, display_name, description, rank, cost_multiplier, required_plan_level, is_active
       FROM model_catalog
       WHERE is_active = true
       ORDER BY required_plan_level ASC, rank ASC, display_name ASC`,
    );

    return rows.map((row) => this.toAvailableModelCatalogView(row, subscription));
  }

  async selectModel(teamId: string, modelId: string, conversationId?: string): Promise<AvailableModelCatalogView> {
    const catalog = await this.getModelCatalogForTeam(teamId);
    const selectedModel = catalog.find((model) => model.id === modelId);

    if (!selectedModel?.isAvailable) {
      throw new AppError('MODEL_NOT_AVAILABLE', '所选功法不可用', 403);
    }

    if (conversationId) {
      await this.selectConversationModel(teamId, conversationId, modelId);
      return selectedModel;
    }

    await this.db.query(
      `INSERT INTO team_selected_models (team_id, model_catalog_id, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (team_id)
       DO UPDATE SET model_catalog_id = EXCLUDED.model_catalog_id,
                     updated_at = CURRENT_TIMESTAMP`,
      [teamId, modelId],
    );

    return selectedModel;
  }

  async getSelectedModelForExecution(teamId: string, modelId?: string, conversationId?: string): Promise<SelectedModelForExecution> {
    const subscription = await this.getActiveSubscription(teamId);
    const model = modelId
      ? await this.getModelCatalogItem(modelId)
      : await this.getSelectedModelForTeam(teamId, conversationId);

    this.assertModelAvailableForSubscription(model, subscription);

    return {
      id: model.id,
      modelName: model.modelName,
    };
  }

  async estimateLingqiCost(teamId: string, request: LingqiEstimateRequest): Promise<LingqiEstimateResult> {
    const subscription = await this.getActiveSubscription(teamId);
    const conversationId = typeof request.context?.conversationId === 'string'
      ? request.context.conversationId
      : undefined;
    const model = request.modelId
      ? await this.getModelCatalogItem(request.modelId)
      : await this.getSelectedModelForTeam(teamId, conversationId);

    const account = await this.ensureLingqiAccount(teamId);
    const balance = Number(account.balance_amt);

    if (model.requiredPlanLevel > subscription.level || model.rank > subscription.modelRankLimit) {
      return {
        estimatedCost: 0,
        balanceAfterEstimate: balance,
        canAfford: false,
        reason: 'SUBSCRIPTION_REQUIRED',
        model,
        subscription,
      };
    }

    const baseCost = this.getBaseCost(request);
    const estimatedCost = Math.ceil(baseCost * model.costMultiplier * subscription.costDiscountRate);
    const canAfford = balance >= estimatedCost;

    return {
      estimatedCost,
      balanceAfterEstimate: balance - estimatedCost,
      canAfford,
      reason: canAfford ? null : 'LINGQI_INSUFFICIENT_BALANCE',
      model,
      subscription,
    };
  }

  async consumeLingqi(teamId: string, userId: string, request: ConsumeLingqiRequest): Promise<{ balance: number; totalConsumed: number }> {
    if (!Number.isInteger(request.amount) || request.amount <= 0) {
      throw new AppError('LINGQI_INVALID_AMOUNT', '灵气消耗数量必须为正整数', 400);
    }

    const account = await this.db.transaction(async (client) => {
      await this.lockQuotaTeam(client, teamId);
      const currentAccount = await this.ensureLingqiAccountInTransaction(client, teamId);

      if (request.idempotencyKey) {
        const existingDebit = await client.query<LingqiAccountRow>(
          `SELECT account.team_id, account.balance_amt, account.total_granted_amt, account.total_consumed_amt
           FROM lingqi_ledger_entries ledger
           JOIN lingqi_accounts account ON account.team_id = ledger.team_id
           WHERE ledger.team_id = $1 AND ledger.idempotency_key = $2 AND ledger.direction = 'consume'
           LIMIT 1`,
          [teamId, request.idempotencyKey],
        );

        if (existingDebit.rows.length > 0) {
          return existingDebit.rows[0];
        }
      }

      if (BigInt(currentAccount.balance_amt) < BigInt(request.amount)) {
        throw new AppError('LINGQI_INSUFFICIENT_BALANCE', '灵气余额不足', 403);
      }

      const updateResult = await client.query<LingqiAccountRow>(
        `UPDATE lingqi_accounts
         SET balance_amt = balance_amt - $1,
             total_consumed_amt = total_consumed_amt + $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE team_id = $2
         RETURNING team_id, balance_amt, total_granted_amt, total_consumed_amt`,
        [request.amount.toString(), teamId],
      );

      await client.query(
        `INSERT INTO lingqi_ledger_entries (team_id, user_id, direction, amount, transaction_type, source_type, source_id, description, metadata, idempotency_key)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)`,
        [
          teamId,
          userId,
          'consume',
          request.amount.toString(),
          request.transactionType,
          request.sourceType,
          request.sourceId ?? null,
          request.description ?? null,
          JSON.stringify(request.metadata ?? {}),
          request.idempotencyKey ?? null,
        ],
      );

      return updateResult.rows[0];
    });

    return {
      balance: Number(account.balance_amt),
      totalConsumed: Number(account.total_consumed_amt),
    };
  }

  async refundLingqi(teamId: string, userId: string, request: ConsumeLingqiRequest): Promise<{ balance: number; totalConsumed: number }> {
    if (!Number.isInteger(request.amount) || request.amount <= 0) {
      throw new AppError('LINGQI_INVALID_AMOUNT', '灵气退款数量必须为正整数', 400);
    }

    const account = await this.db.transaction(async (client) => {
      await this.lockQuotaTeam(client, teamId);
      const currentAccount = await this.ensureLingqiAccountInTransaction(client, teamId);

      if (!request.refundOfIdempotencyKey) {
        throw new AppError('LINGQI_REFUND_SOURCE_REQUIRED', '灵气退款缺少原始扣费记录', 400);
      }

      if (request.idempotencyKey) {
        const existingRefund = await client.query<{ id: string }>(
          `SELECT id FROM lingqi_ledger_entries
           WHERE team_id = $1 AND idempotency_key = $2 AND direction = 'grant'
           LIMIT 1`,
          [teamId, request.idempotencyKey],
        );

        if (existingRefund.rows.length > 0) {
          return currentAccount;
        }
      }

      const originalDebit = await client.query<{ id: string; amount: string }>(
        `SELECT id, amount FROM lingqi_ledger_entries
         WHERE team_id = $1 AND idempotency_key = $2 AND direction = 'consume'
         LIMIT 1`,
        [teamId, request.refundOfIdempotencyKey],
      );

      if (originalDebit.rows.length === 0 || BigInt(originalDebit.rows[0].amount) !== BigInt(request.amount)) {
        throw new AppError('LINGQI_REFUND_SOURCE_INVALID', '灵气退款原始扣费记录无效', 400);
      }

      const existingRefundForDebit = await client.query<{ id: string }>(
        `SELECT id FROM lingqi_ledger_entries
         WHERE team_id = $1
           AND direction = 'grant'
           AND metadata->>'refundOfIdempotencyKey' = $2
         LIMIT 1`,
        [teamId, request.refundOfIdempotencyKey],
      );

      if (existingRefundForDebit.rows.length > 0) {
        return currentAccount;
      }

      if (BigInt(currentAccount.total_consumed_amt) < BigInt(request.amount)) {
        throw new AppError('LINGQI_REFUND_EXCEEDS_CONSUMED', '灵气退款不能超过已消耗数量', 400);
      }

      const updateResult = await client.query<LingqiAccountRow>(
        `UPDATE lingqi_accounts
         SET balance_amt = balance_amt + $1,
             total_consumed_amt = total_consumed_amt - $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE team_id = $2
         RETURNING team_id, balance_amt, total_granted_amt, total_consumed_amt`,
        [request.amount.toString(), teamId],
      );

      await client.query(
        `INSERT INTO lingqi_ledger_entries (team_id, user_id, direction, amount, transaction_type, source_type, source_id, description, metadata, idempotency_key)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)`,
        [
          teamId,
          userId,
          'grant',
          request.amount.toString(),
          request.transactionType,
          request.sourceType,
          request.sourceId ?? null,
          request.description ?? null,
          JSON.stringify({ ...request.metadata, refundOfIdempotencyKey: request.refundOfIdempotencyKey }),
          request.idempotencyKey ?? null,
        ],
      );

      return updateResult.rows[0];
    });

    return {
      balance: Number(account.balance_amt),
      totalConsumed: Number(account.total_consumed_amt),
    };
  }

  async getRecentLingqiLedgerEntries(teamId: string, limit: number): Promise<LingqiLedgerEntryView[]> {
    const safeLimit = this.clampLedgerLimit(limit);
    const rows = await this.db.query<LingqiLedgerEntryRow>(
      `SELECT id, direction, amount, transaction_type, source_type, description, metadata, created_at
       FROM lingqi_ledger_entries
       WHERE team_id = $1
       ORDER BY created_at DESC, id DESC
       LIMIT $2`,
      [teamId, safeLimit],
    );

    return rows.map((row) => this.toLedgerEntryView(row));
  }

  private generateRedemptionCode(): string {
    return randomUUID().replace(/-/g, '').slice(0, GENERATED_REDEMPTION_CODE_LENGTH).toUpperCase();
  }

  private toRedemptionCodePreview(code: string): string {
    return `${code.slice(0, 4)}...${code.slice(-4)}`;
  }

  private normalizeRedemptionCode(code: string): string {
    if (typeof code !== 'string') {
      throw new AppError('LINGQI_REDEMPTION_CODE_INVALID', '灵气兑换码无效', 400);
    }

    const normalizedCode = code.trim().toUpperCase();

    if (
      normalizedCode.length === 0 ||
      normalizedCode.length > MAX_REDEMPTION_CODE_LENGTH ||
      !REDEMPTION_CODE_PATTERN.test(normalizedCode)
    ) {
      throw new AppError('LINGQI_REDEMPTION_CODE_INVALID', '灵气兑换码无效', 400);
    }

    return normalizedCode;
  }

  private getRedemptionCodeLookupHashes(code: string): string[] {
    const normalizedCode = this.normalizeRedemptionCode(code);
    const pepper = this.getRedemptionPepper();
    const currentHash = this.hashNormalizedRedemptionCode(normalizedCode, pepper);

    if (!pepper) {
      return [currentHash];
    }

    const legacyHash = this.hashNormalizedRedemptionCode(normalizedCode);
    return currentHash === legacyHash ? [currentHash] : [currentHash, legacyHash];
  }

  private getRedemptionPepper(): string | null {
    const pepper = process.env.LINGQI_REDEMPTION_PEPPER?.trim();
    return pepper && pepper.length > 0 ? pepper : null;
  }

  private hashNormalizedRedemptionCode(normalizedCode: string, pepper?: string | null): string {
    if (pepper) {
      return createHmac('sha256', pepper).update(normalizedCode).digest('hex');
    }

    return createHash('sha256').update(normalizedCode).digest('hex');
  }

  private clampLedgerLimit(limit: number): number {
    if (!Number.isInteger(limit)) {
      return 10;
    }

    return Math.min(100, Math.max(1, limit));
  }

  private clampAdminListLimit(limit: number | string | undefined): number {
    const parsedLimit = typeof limit === 'string' ? Number(limit) : limit;

    if (!Number.isInteger(parsedLimit)) {
      return DEFAULT_ADMIN_LIST_LIMIT;
    }

    return Math.min(100, Math.max(1, parsedLimit));
  }

  private clampOffset(offset: number | string | undefined): number {
    const parsedOffset = typeof offset === 'string' ? Number(offset) : offset;

    if (!Number.isInteger(parsedOffset) || parsedOffset < 0) {
      return 0;
    }

    return parsedOffset;
  }

  private async ensureLingqiAccount(teamId: string): Promise<LingqiAccountRow> {
    const existing = await this.db.queryOne<LingqiAccountRow>(
      `SELECT team_id, balance_amt, total_granted_amt, total_consumed_amt
       FROM lingqi_accounts
       WHERE team_id = $1`,
      [teamId],
    );

    if (existing) {
      return existing;
    }

    const created = await this.db.queryOne<LingqiAccountRow>(
      `INSERT INTO lingqi_accounts (team_id, balance_amt, total_granted_amt, total_consumed_amt)
       VALUES ($1, $2, $2, 0)
       ON CONFLICT (team_id) DO UPDATE SET team_id = EXCLUDED.team_id
       RETURNING team_id, balance_amt, total_granted_amt, total_consumed_amt`,
      [teamId, INITIAL_LINGQI_BALANCE.toString()],
    );

    return created ?? {
      team_id: teamId,
      balance_amt: INITIAL_LINGQI_BALANCE.toString(),
      total_granted_amt: INITIAL_LINGQI_BALANCE.toString(),
      total_consumed_amt: '0',
    };
  }

  private async ensureLingqiAccountInTransaction(client: PoolClient, teamId: string): Promise<LingqiAccountRow> {
    const existingResult = await client.query<LingqiAccountRow>(
      `SELECT team_id, balance_amt, total_granted_amt, total_consumed_amt
       FROM lingqi_accounts
       WHERE team_id = $1
       FOR UPDATE`,
      [teamId],
    );

    if (existingResult.rows[0]) {
      return existingResult.rows[0];
    }

    const createdResult = await client.query<LingqiAccountRow>(
      `INSERT INTO lingqi_accounts (team_id, balance_amt, total_granted_amt, total_consumed_amt)
       VALUES ($1, $2, $2, 0)
       RETURNING team_id, balance_amt, total_granted_amt, total_consumed_amt`,
      [teamId, INITIAL_LINGQI_BALANCE.toString()],
    );

    return createdResult.rows[0];
  }

  private async getCultivationRealms(): Promise<CultivationRealmView[]> {
    const rows = await this.db.query<CultivationRealmRow>(
      `SELECT name, display_name, min_total_consumed_amt, sort_order, privileges
       FROM cultivation_realms
       WHERE is_active = true
       ORDER BY sort_order ASC`,
    );

    return rows.map((row) => ({
      name: row.name,
      displayName: row.display_name,
      minTotalConsumed: Number(row.min_total_consumed_amt),
      sortOrder: row.sort_order,
      privileges: row.privileges ?? {},
    }));
  }

  private deriveRealmProgress(realms: CultivationRealmView[], totalConsumed: number) {
    const fallbackRealm: CultivationRealmView = {
      name: 'mortal',
      displayName: '凡人',
      minTotalConsumed: 0,
      sortOrder: 1,
      privileges: {},
    };
    const currentRealm = realms.reduce(
      (selected, realm) => realm.minTotalConsumed <= totalConsumed ? realm : selected,
      realms[0] ?? fallbackRealm,
    );
    const currentIndex = realms.findIndex((realm) => realm.name === currentRealm.name);
    const nextRealm = currentIndex >= 0 ? realms[currentIndex + 1] ?? null : null;
    const current = totalConsumed - currentRealm.minTotalConsumed;
    const required = nextRealm ? nextRealm.minTotalConsumed - currentRealm.minTotalConsumed : 0;
    const percentage = required > 0 ? Math.min(100, Math.floor((current / required) * 100)) : 100;

    return {
      currentRealm,
      nextRealm,
      progress: {
        current,
        required,
        percentage,
      },
    };
  }

  private async getActiveSubscription(teamId: string): Promise<SubscriptionView> {
    const row = await this.db.queryOne<SubscriptionRow>(
      `SELECT sp.name, sp.display_name, sp.level, sp.cost_discount_rate, sp.model_rank_limit, ts.expires_at
       FROM team_subscriptions ts
       JOIN subscription_plans sp ON sp.id = ts.plan_id
       WHERE ts.team_id = $1
         AND ts.status = 'active'
         AND ts.expires_at > CURRENT_TIMESTAMP
         AND sp.is_active = true
       ORDER BY ts.expires_at DESC
       LIMIT 1`,
      [teamId],
    );

    if (row) {
      return this.toSubscriptionView(row);
    }

    const defaultPlan = await this.db.queryOne<SubscriptionRow>(
      `SELECT name, display_name, level, cost_discount_rate, model_rank_limit
       FROM subscription_plans
       WHERE name = 'wanderer' AND is_active = true
       LIMIT 1`,
    );

    return this.toSubscriptionView(defaultPlan ?? {
      name: 'wanderer',
      display_name: '散修',
      level: 0,
      cost_discount_rate: '1.00',
      model_rank_limit: 1,
      expires_at: null,
    });
  }

  private async selectConversationModel(teamId: string, conversationId: string, modelId: string): Promise<void> {
    const conversation = await this.db.queryOne<{ id: string }>(
      'SELECT id FROM conversations WHERE id = $1 AND "teamId" = $2',
      [conversationId, teamId],
    );

    if (!conversation) {
      throw new AppError('CONVERSATION_NOT_FOUND', '会话不存在', 404);
    }

    await this.db.query(
      `INSERT INTO conversation_selected_models (conversation_id, model_catalog_id, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (conversation_id)
       DO UPDATE SET model_catalog_id = EXCLUDED.model_catalog_id,
                     updated_at = CURRENT_TIMESTAMP`,
      [conversationId, modelId],
    );
  }

  private assertModelAvailableForSubscription(model: ModelCatalogView, subscription: SubscriptionView): void {
    if (model.requiredPlanLevel > subscription.level || model.rank > subscription.modelRankLimit) {
      throw new AppError('MODEL_NOT_AVAILABLE', '所选功法不可用', 403);
    }
  }

  private async getModelCatalogItem(modelId: string): Promise<ModelCatalogView> {
    const row = await this.db.queryOne<ModelCatalogRow>(
      `SELECT id, model_name, display_name, rank, cost_multiplier, required_plan_level, is_active
       FROM model_catalog
       WHERE id = $1 AND is_active = true
       LIMIT 1`,
      [modelId],
    );

    if (!row) {
      throw new AppError('LINGQI_MODEL_NOT_FOUND', '模型不存在或不可用', 404);
    }

    return this.toModelCatalogView(row);
  }

  private async getSelectedModelForTeam(teamId: string, conversationId?: string): Promise<ModelCatalogView> {
    if (conversationId) {
      const conversationModel = await this.db.queryOne<ModelCatalogRow>(
        `SELECT mc.id, mc.model_name, mc.display_name, mc.rank, mc.cost_multiplier, mc.required_plan_level, mc.is_active
         FROM conversation_selected_models csm
         JOIN conversations c ON c.id = csm.conversation_id
         JOIN model_catalog mc ON mc.id = csm.model_catalog_id
         WHERE csm.conversation_id = $1 AND c."teamId" = $2 AND mc.is_active = true
         LIMIT 1`,
        [conversationId, teamId],
      );

      if (conversationModel) {
        return this.toModelCatalogView(conversationModel);
      }
    }

    const teamModel = await this.db.queryOne<ModelCatalogRow>(
      `SELECT mc.id, mc.model_name, mc.display_name, mc.rank, mc.cost_multiplier, mc.required_plan_level, mc.is_active
       FROM team_selected_models tsm
       JOIN model_catalog mc ON mc.id = tsm.model_catalog_id
       WHERE tsm.team_id = $1 AND mc.is_active = true
       LIMIT 1`,
      [teamId],
    );

    if (teamModel) {
      return this.toModelCatalogView(teamModel);
    }

    const fallbackModel = await this.db.queryOne<ModelCatalogRow>(
      `SELECT id, model_name, display_name, rank, cost_multiplier, required_plan_level, is_active
       FROM model_catalog
       WHERE is_active = true
       ORDER BY rank ASC
       LIMIT 1`,
    );

    if (!fallbackModel) {
      throw new AppError('LINGQI_MODEL_NOT_FOUND', '模型不存在或不可用', 404);
    }

    return this.toModelCatalogView(fallbackModel);
  }

  private getBaseCost(request: LingqiEstimateRequest): number {
    if (request.transactionType === 'chat_message') {
      return CHAT_BASE_COST;
    }

    if (request.transactionType === 'expert_skill') {
      return SKILL_BASE_COST;
    }

    if (request.transactionType === 'tool_call') {
      return TOOL_COSTS[request.toolComplexity ?? 'medium'];
    }

    return TASK_PHASE_COSTS[request.taskPhase ?? 'execute'];
  }

  private toSubscriptionView(row: SubscriptionRow): SubscriptionView {
    return {
      planName: row.name ?? 'wanderer',
      displayName: row.display_name ?? '散修',
      level: row.level,
      costDiscountRate: Number(row.cost_discount_rate),
      modelRankLimit: row.model_rank_limit,
      expiresAt: row.expires_at ?? null,
    };
  }

  private toModelCatalogView(row: ModelCatalogRow): ModelCatalogView {
    return {
      id: row.id,
      modelName: row.model_name,
      displayName: row.display_name,
      rank: row.rank,
      costMultiplier: Number(row.cost_multiplier),
      requiredPlanLevel: row.required_plan_level,
    };
  }

  private toAvailableModelCatalogView(row: ModelCatalogRow, subscription: SubscriptionView): AvailableModelCatalogView {
    const requiresHigherLevel = row.required_plan_level > subscription.level;
    const exceedsRankLimit = row.rank > subscription.modelRankLimit;
    const isAvailable = !requiresHigherLevel && !exceedsRankLimit;

    return {
      ...this.toModelCatalogView(row),
      description: row.description ?? null,
      isAvailable,
      unavailableReason: isAvailable ? null : 'SUBSCRIPTION_REQUIRED',
    };
  }

  private toLedgerEntryView(row: LingqiLedgerEntryRow): LingqiLedgerEntryView {
    return {
      id: row.id,
      direction: row.direction,
      amount: Number(row.amount),
      transactionType: row.transaction_type,
      sourceType: row.source_type,
      description: row.description,
      metadata: row.metadata ?? {},
      createdAt: row.created_at,
    };
  }

  private toAdminLingqiLedgerEntryView(row: LingqiLedgerEntryRow): AdminLingqiLedgerEntryView {
    return {
      ...this.toLedgerEntryView(row),
      teamId: row.team_id ?? '',
      userId: row.user_id ?? null,
      sourceId: row.source_id ?? null,
    };
  }

  private toAdminRedemptionCodeView(row: AdminRedemptionCodeRow): AdminRedemptionCodeView {
    return {
      id: row.id,
      type: row.plan_id ? 'plan_with_lingqi' : 'lingqi_only',
      codePreview: row.code_preview ?? '',
      lingqiAmount: Number(row.lingqi_amount),
      planId: row.plan_id,
      maxUses: row.max_uses,
      usedCount: row.used_count,
      status: this.deriveAdminRedemptionCodeStatus(row),
      expiresAt: row.expires_at ? new Date(row.expires_at) : null,
      note: row.note,
      createdByUserId: row.created_by_user_id,
      disabledAt: row.disabled_at,
      disabledByUserId: row.disabled_by_user_id,
      disabledReason: row.disabled_reason,
      redeemedTeamId: row.redeemed_team_id ?? null,
      redeemedUserId: row.redeemed_user_id ?? null,
      redeemedAt: row.redeemed_at ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private deriveAdminRedemptionCodeStatus(row: AdminRedemptionCodeRow): AdminRedemptionCodeStatus {
    if (row.used_count >= row.max_uses || row.redeemed_at) {
      return 'redeemed';
    }

    if (row.is_active === false) {
      return 'disabled';
    }

    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
      return 'expired';
    }

    return 'active';
  }
}
