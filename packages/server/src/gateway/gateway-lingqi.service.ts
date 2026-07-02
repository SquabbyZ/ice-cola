// Slice 2026-07-02-gateway-split-trio: lingqi charge / refund / quota
// cluster extracted from GatewayService. All 5 methods moved verbatim
// from gateway.service.ts (lines 1866-1906, 1924-1995, 2411-2444) with
// the same signatures and the same behavior. `private` access modifiers
// widened to `public` so GatewayService can delegate to them via
// constructor injection.
//
// Scope:
//   - prepareLingqiCharge        (estimate + select execution model)
//   - prepayLingqiCharge         (consume Lingqi before execution)
//   - refundLingqiIfUnsuccessful (delegate to refundLingqiCharge on failure)
//   - refundLingqiCharge         (refund Lingqi after failed execution)
//   - checkQuota                 (request/token quota gate)
//
// State sharing (CRITICAL — preserves double-spend protection):
//
// The `refundedLingqiMessages` Set must remain the same instance across
// (a) refundLingqiCharge writes via refundLingqiIfUnsuccessful (Lingqi service)
// (b) refundLingqiCharge reads via abortHermesMessage (Hermes service —
//     via this.refundLingqiIfUnsuccessful → this.refundLingqiCharge path)
//
// Per PRD AC-8 the Set lives on the facade (GatewayService.refundedLingqiMessages)
// and is shared with the cluster services via lambda callbacks supplied at
// construction time. The Lingqi service receives 3 callbacks:
//   - isRefunded(id)       → boolean
//   - markRefunded(id)     → void
//   - unmarkRefunded(id)   → void  (idempotency-rollback on refund failure)
//   - sendStreamEvent(...) → void  (WebSocket broadcast, exact verbatim
//                                    signature from gateway.service.ts:2463)
//
// This pattern keeps the Set identity shared without exposing the
// facade reference to the cluster (no circular dep risk).
import { Injectable, Logger } from '@nestjs/common';
import { AiModelsService } from '../ai-models/ai-models.service';
import { QuotaService } from '../quota/quota.service';
import { generateUUID } from './gateway.helpers';
import {
  HermesMessageParams,
  HermesSendResult,
  LingqiChargeDecision,
} from './gateway.types';
import { WebSocket } from 'ws';

export interface LingqiStateCallbacks {
  /** Returns true if the given billingId has already been refunded. */
  isRefunded: (billingId: string) => boolean;
  /** Marks the given billingId as refunded (idempotency guard). */
  markRefunded: (billingId: string) => void;
  /** Rolls back the refunded marker so a retry can succeed. */
  unmarkRefunded: (billingId: string) => void;
  /** Streams an error to the WebSocket client (matches verbatim gateway.service.ts:2463). */
  sendStreamEvent: (eventType: string, data: unknown, targetWs?: WebSocket) => void;
  /** Proxy to facade's `generateUUID` so spec's `jest.spyOn(service as any, 'generateUUID')` propagates. */
  generateUUID: () => string;
}

@Injectable()
export class GatewayLingqiService {
  private readonly logger = new Logger(GatewayLingqiService.name);

  constructor(
    private quotaService: QuotaService,
    private aiModelsService: AiModelsService,
    private state: LingqiStateCallbacks,
  ) {}

  async prepareLingqiCharge(
    params: HermesMessageParams,
    billingId: string,
    senderWs?: WebSocket,
  ): Promise<
    | LingqiChargeDecision
    | { error: HermesSendResult }
  > {
    if (!params.teamId) {
      return { charge: { amount: 0, billingId }, billingId };
    }

    const estimate = await this.quotaService.estimateLingqiCost(params.teamId, {
      transactionType: 'chat_message',
      modelId: params.model,
      context: { conversationId: params.conversationId },
    });
    const messageId = params.messageId || this.state.generateUUID();

    if (!estimate.canAfford) {
      const error = estimate.reason || 'LINGQI_INSUFFICIENT_BALANCE';
      this.state.sendStreamEvent('hermes.error', { messageId, error }, senderWs);
      return { error: { ok: false, messageId, error } };
    }

    const executionModel = await this.quotaService.getSelectedModelForExecution(
      params.teamId,
      params.model,
      params.conversationId,
    );

    return {
      charge: {
        amount: estimate.estimatedCost,
        modelId: executionModel.id,
        billingId,
      },
      billingId,
      executionModelName: executionModel.modelName,
    };
  }

  async prepayLingqiCharge(
    params: HermesMessageParams,
    charge: { amount: number; modelId?: string; billingId: string },
    messageId: string,
    billingId: string,
  ): Promise<{ ok: true } | { error: HermesSendResult }> {
    if (!params.teamId || charge.amount <= 0) {
      return { ok: true };
    }

    if (!params.userId) {
      return { error: { ok: false, messageId, error: 'Authentication required' } };
    }

    try {
      await this.quotaService.consumeLingqi(params.teamId, params.userId, {
        amount: charge.amount,
        transactionType: 'chat_message',
        sourceType: 'chat',
        sourceId: params.conversationId || messageId,
        description: '聊天模型调用',
        metadata: { modelId: charge.modelId || params.model || null, messageId },
        idempotencyKey: `charge:chat:${billingId}`,
      });
      return { ok: true };
    } catch (error: unknown) {
      this.logger.error('Failed to prepay Lingqi before chat execution:', error);
      return { error: { ok: false, messageId, error: 'LINGQI_CHARGE_FAILED' } };
    }
  }

  async refundLingqiIfUnsuccessful(
    params: HermesMessageParams,
    charge: { amount: number; modelId?: string; billingId: string },
    result: HermesSendResult,
    hasBillableOutput = false,
  ): Promise<HermesSendResult> {
    if ((result.ok && !result.aborted) || hasBillableOutput) {
      return result;
    }

    await this.refundLingqiCharge(params, charge, result.messageId);
    return result;
  }

  async refundLingqiCharge(
    params: HermesMessageParams,
    charge: { amount: number; modelId?: string; billingId: string },
    messageId: string,
  ): Promise<void> {
    if (!params.teamId || !params.userId || charge.amount <= 0 || this.state.isRefunded(charge.billingId)) {
      return;
    }

    this.state.markRefunded(charge.billingId);

    try {
      await this.quotaService.refundLingqi(params.teamId, params.userId, {
        amount: charge.amount,
        transactionType: 'chat_message',
        sourceType: 'chat_refund',
        sourceId: params.conversationId || messageId,
        description: '聊天模型调用退款',
        metadata: { modelId: charge.modelId || params.model || null, messageId },
        idempotencyKey: `refund:chat:${charge.billingId}`,
        refundOfIdempotencyKey: `charge:chat:${charge.billingId}`,
      });
    } catch (error: unknown) {
      // Rollback the idempotency marker so a retry can succeed
      this.state.unmarkRefunded(charge.billingId);
      this.logger.error('Failed to refund Lingqi after unsuccessful chat execution:', error);
    }
  }

  async checkQuota(teamId: string): Promise<string | null> {
    try {
      const quota = await this.aiModelsService.findTeamQuotaByTeamId(teamId);
      if (!quota) return null; // No quota configured, allow

      const dailyReqLimit = quota.daily_request_limit ?? 1000;
      const monthlyReqLimit = quota.monthly_request_limit ?? 50000;
      const dailyTokenLimit = quota.daily_token_limit ?? 1000000;
      const monthlyTokenLimit = quota.monthly_token_limit ?? 10000000;

      const requestsToday = quota.requests_today ?? 0;
      const requestsThisMonth = quota.requests_this_month ?? 0;
      const tokensToday = quota.used_today ?? 0;
      const tokensThisMonth = quota.used_this_month ?? 0;

      if (requestsToday >= dailyReqLimit) {
        return `Daily request limit reached (${requestsToday}/${dailyReqLimit})`;
      }
      if (requestsThisMonth >= monthlyReqLimit) {
        return `Monthly request limit reached (${requestsThisMonth}/${monthlyReqLimit})`;
      }
      if (tokensToday >= dailyTokenLimit) {
        return `Daily token limit reached (${tokensToday}/${dailyTokenLimit})`;
      }
      if (tokensThisMonth >= monthlyTokenLimit) {
        return `Monthly token limit reached (${tokensThisMonth}/${monthlyTokenLimit})`;
      }

      return null;
    } catch (err) {
      this.logger.warn('Failed to check quota, allowing request:', err);
      return null;
    }
  }
}