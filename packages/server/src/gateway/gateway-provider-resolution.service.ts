// Slice 2026-07-02-gateway-split-provider-resolution: model resolution +
// hermes-agent health/status cluster extracted from GatewayService.
// Methods moved verbatim from gateway.service.ts with identical signatures and
// identical behavior. `private` access modifiers widened to `public` so
// GatewayService can delegate to them via constructor injection.
//
// Scope:
//   - findDefaultGenerateModel        (generateConfig path)
//   - resolveProviderModelForLingqiCharge (billing-time model lookup)
//   - tryBuildHermesProviderOverride   (direct-path override builder)
//   - checkHermesAgentHealth           (cached health probe)
//   - getHermesAgentStatus             (status reporter)
//
// Helper dependencies (`normalizeProviderBaseUrl`) are imported from
// `./gateway.helpers` — those are module-scope pure exports from slice 1
// (already-pure functions, not duplicated here).
//
// `hermesAgentStatus` (mutable cache), `hermesAgentUrl` (immutable), and
// `HERMES_HEALTH_TTL_MS` moved verbatim from the facade. GatewayService
// accesses them via accessor closure so existing internal callsites
// (`sendHermesAgentMessage`) read identical values without further edits.
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { AiModelsService } from '../ai-models/ai-models.service';
import { firstValueFrom } from 'rxjs';
import {
  LingqiChargeDecision,
  ProviderModelRow,
  HermesAgentProviderOverride,
} from './gateway.types';
import {
  normalizeInternalServiceUrl,
  normalizeProviderBaseUrl,
} from './gateway.helpers';

@Injectable()
export class GatewayProviderResolutionService {
  private readonly logger = new Logger(GatewayProviderResolutionService.name);
  // Mutable cache for hermes-agent health probes. Ownership migrated from
  // the facade so that `checkHermesAgentHealth` writes and `getHermesAgentStatus`
  // reads from the same in-memory record (preserves TTL/cache semantics).
  private hermesAgentStatus: { healthy: boolean; lastChecked: number } = {
    healthy: false,
    lastChecked: 0,
  };
  private readonly hermesAgentUrl: string;
  private readonly HERMES_HEALTH_TTL_MS = 30000;

  constructor(
    private aiModelsService: AiModelsService,
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.hermesAgentUrl = normalizeInternalServiceUrl(
      this.configService.get<string>('HERMES_AGENT_URL') ||
        process.env.HERMES_AGENT_URL ||
        'http://localhost:8642',
      'HERMES_AGENT_URL',
    );
  }

  // Exposed for the facade to inline into `sendHermesAgentMessage` reads.
  // The internal callsite uses the literal `${hermesAgentUrl}` template so we
  // expose a getter that returns the immutable value computed in the ctor.
  getHermesAgentUrl(): string {
    return this.hermesAgentUrl;
  }

  // Exposed so the facade's `sendHermesAgentMessage` log line and the
  // `getHermesAgentStatus` reporter can both observe the immutable endpoint
  // value through the same source. Logically identical to the prior
  // facade field; the call wiring in `getHermesAgentStatus` switches
  // from `this.hermesAgentUrl` to `this.getHermesAgentUrl()`.
  getLastHermesChecked(): number {
    return this.hermesAgentStatus.lastChecked;
  }

  async findDefaultGenerateModel(teamId: string): Promise<ProviderModelRow | null> {
    void teamId;
    try {
      const models = await this.aiModelsService.findAllModels();
      if (!models || models.length === 0) return null;
      // Find the first model that has an active API key
      for (const model of models) {
        const key = await this.aiModelsService.findActiveApiKeyByProvider(model.provider_id);
        if (key) return model;
      }
      return null;
    } catch (error) {
      this.logger.error('Failed to find default generate model:', error);
      return null;
    }
  }

  async resolveProviderModelForLingqiCharge(lingqiCharge: LingqiChargeDecision): Promise<ProviderModelRow | null> {
    if (!lingqiCharge.executionModelName) {
      this.logger.warn('[resolveProviderModelForLingqiCharge] executionModelName is empty or undefined');
      return null;
    }

    this.logger.log(`[resolveProviderModelForLingqiCharge] Resolving provider model for: ${lingqiCharge.executionModelName}`);
    const result = await this.aiModelsService.findExecutableModelByModelId(lingqiCharge.executionModelName);

    if (!result) {
      this.logger.warn(`[resolveProviderModelForLingqiCharge] No active model found for model_id: ${lingqiCharge.executionModelName}`);
    }

    return result;
  }

  async tryBuildHermesProviderOverride(
    lingqiCharge: LingqiChargeDecision,
  ): Promise<HermesAgentProviderOverride | undefined> {
    const providerModel = await this.resolveProviderModelForLingqiCharge(lingqiCharge);
    if (!providerModel) {
      return undefined;
    }

    const apiKeyRecord = await this.aiModelsService.findActiveApiKeyByProvider(providerModel.provider_id);
    if (!apiKeyRecord) {
      return undefined;
    }

    const decryptedKey = await this.aiModelsService.getDecryptedApiKey(apiKeyRecord.id);
    if (!decryptedKey) {
      return undefined;
    }

    const endpoint = await this.aiModelsService.findDefaultEndpointByProvider(providerModel.provider_id);
    if (!endpoint?.base_url) {
      return undefined;
    }

    let baseUrl: string;
    try {
      baseUrl = normalizeProviderBaseUrl(endpoint.base_url);
    } catch {
      return undefined;
    }

    const providerCode = (providerModel.provider_code || providerModel.provider_name || '').toLowerCase();

    return {
      baseUrl,
      apiKey: decryptedKey,
      authStyle: 'bearer',
      modelId: providerModel.model_id,
      providerCode,
    };
  }

  async checkHermesAgentHealth(): Promise<boolean> {
    const now = Date.now();
    if (now - this.hermesAgentStatus.lastChecked < this.HERMES_HEALTH_TTL_MS) {
      return this.hermesAgentStatus.healthy;
    }
    try {
      await firstValueFrom(
        this.httpService.get(`${this.hermesAgentUrl}/health`, { timeout: 2000, maxRedirects: 0 }),
      );
      this.hermesAgentStatus = { healthy: true, lastChecked: now };
      return true;
    } catch {
      this.hermesAgentStatus = { healthy: false, lastChecked: now };
      return false;
    }
  }

  async getHermesAgentStatus() {
    const healthy = await this.checkHermesAgentHealth();
    return {
      ok: true,
      hermesAgent: {
        available: healthy,
        endpoint: this.hermesAgentUrl,
        lastChecked: this.hermesAgentStatus.lastChecked,
      },
    };
  }
}
