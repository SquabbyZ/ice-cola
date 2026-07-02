// Slice 2026-07-02-gateway-split-usage: provider-usage recording cluster
// extracted from GatewayService. The `recordProviderUsage` method moved
// verbatim from gateway.service.ts with the same signature and the same
// behavior.
//
// NOTE: this cluster uses AiModelsService (NOT DatabaseService as the
// original PRD drafted). The method body calls
// `aiModelsService.updateApiKeyLastUsed`, `aiModelsService.createUsageLog`,
// and `aiModelsService.incrementTeamQuotaUsage`. Keeping the AiModelsService
// dep preserves zero-behavior-change (verbatim body copy). If a later slice
// wants to route these calls through DatabaseService, the migration belongs
// in that later slice — slice 3 is a pure file move.
//
// `private` access modifier widened to `public` so GatewayService can
// delegate to it via constructor injection.
import { Injectable, Logger } from '@nestjs/common';
import { AiModelsService } from '../ai-models/ai-models.service';

@Injectable()
export class GatewayUsageService {
  private readonly logger = new Logger(GatewayUsageService.name);

  constructor(private aiModelsService: AiModelsService) {}

  async recordProviderUsage(
    apiKeyId: string,
    providerId: string,
    modelId: string,
    totalTokens: number,
    latencyMs: number,
    teamId?: string,
  ) {
    // Update API key last used timestamp
    await this.aiModelsService.updateApiKeyLastUsed(apiKeyId);

    if (!teamId) return;

    // Log usage
    await this.aiModelsService.createUsageLog({
      teamId,
      modelId,
      providerId,
      totalTokens,
      latencyMs,
      status: 'success',
    });

    // Increment quota counters
    await this.aiModelsService.incrementTeamQuotaUsage(teamId, totalTokens, true).catch(err => {
      this.logger.warn('Failed to increment quota usage:', err);
    });
  }
}
