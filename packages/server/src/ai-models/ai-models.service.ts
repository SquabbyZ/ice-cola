import { Injectable, OnModuleInit, HttpException, HttpStatus } from '@nestjs/common';
import { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.service';
import { EncryptionService } from './encryption.service';
import { AiApiClient } from './api-client';
import { seedAiModels } from './seed/ai-models.seed';
import { CreateProviderDto, UpdateProviderDto } from './dto/provider.dto';
import { CreateModelDto, UpdateModelDto } from './dto/model.dto';
import { CreateApiKeyDto, UpdateApiKeyStatusDto, UpdateApiKeyDto } from './dto/api-key.dto';
import { CreateEndpointDto, UpdateEndpointDto } from './dto/endpoint.dto';
import {
  CreateModelConfigDto,
  UpdateModelConfigDto,
} from './dto/model-config.dto';
import {
  CreateDefaultModelDto,
  UpdateDefaultModelDto,
} from './dto/default-model.dto';
import {
  CreateTeamQuotaDto,
  UpdateTeamQuotaDto,
} from './dto/team-quota.dto';
import { CreateUsageLogDto } from './dto/usage-log.dto';
import {
  buildCatalogProjection,
  deactivateModelCatalogProjection,
  upsertModelCatalogProjection,
} from './model-catalog-projection';

type SqlValue = string | number | boolean | null;

interface CatalogProjectionDefaults {
  rank?: number;
  costMultiplier?: number;
  requiredPlanLevel?: number;
}

@Injectable()
export class AiModelsService implements OnModuleInit {
  constructor(
    private readonly db: DatabaseService,
    private readonly encryption: EncryptionService,
    private readonly apiClient: AiApiClient,
  ) {}

  // ==================== PROVIDER CRUD ====================

  async createProvider(data: CreateProviderDto) {
    const id = this.generateUUID();
    return this.db.queryOne(
      `INSERT INTO ai_providers (id, name, code, logo_url, website_url, description, sort_order, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW(), NOW())
       RETURNING *`,
      [
        id,
        data.name,
        data.code,
        data.logoUrl || null,
        data.websiteUrl || null,
        data.description || null,
        data.sortOrder || 0,
      ],
    );
  }

  async findAllProviders() {
    return this.db.query(
      'SELECT * FROM ai_providers ORDER BY sort_order ASC, name ASC',
    );
  }

  async findProviderById(id: string) {
    return this.db.queryOne('SELECT * FROM ai_providers WHERE id = $1', [id]);
  }

  async findProviderByCode(code: string) {
    return this.db.queryOne('SELECT * FROM ai_providers WHERE code = $1', [
      code,
    ]);
  }

  async updateProvider(id: string, data: UpdateProviderDto) {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.logoUrl !== undefined) {
      fields.push(`logo_url = $${paramCount++}`);
      values.push(data.logoUrl);
    }
    if (data.websiteUrl !== undefined) {
      fields.push(`website = $${paramCount++}`);
      values.push(data.websiteUrl);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${paramCount++}`);
      values.push(data.description);
    }
    if (data.sortOrder !== undefined) {
      fields.push(`sort_order = $${paramCount++}`);
      values.push(data.sortOrder);
    }
    if (data.status !== undefined) {
      fields.push(`status = $${paramCount++}`);
      values.push(data.status);
    }

    if (fields.length === 0) return this.findProviderById(id);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const rows = await this.db.query(
      `UPDATE ai_providers SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values,
    );
    return rows[0];
  }

  async deleteProvider(id: string) {
    return this.db.queryOne('DELETE FROM ai_providers WHERE id = $1 RETURNING *', [id]);
  }

  // ==================== MODEL CRUD ====================

  async createModel(data: CreateModelDto) {
    return this.db.transaction(async (client) => {
      const id = this.generateUUID();
      const pricing = {
        inputPricePer1m: data.inputPricePer1m || null,
        outputPricePer1m: data.outputPricePer1m || null,
      };
      const result = await client.query(
        `INSERT INTO ai_models (id, provider_id, name, model_id, description, capabilities, pricing, sort_order, status, enabled, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', true, NOW(), NOW())
         RETURNING *`,
        [
          id,
          data.providerId,
          data.name,
          data.modelId,
          data.description || null,
          data.capabilities ? JSON.stringify(data.capabilities) : JSON.stringify({ type: data.modelType, contextWindow: data.contextWindow }),
          JSON.stringify(pricing),
          data.sortOrder || 0,
        ],
      );
      const model = result.rows[0];

      await upsertModelCatalogProjection(
        client,
        buildCatalogProjection(model, data),
      );

      return model;
    });
  }

  async findModelsByProvider(providerId: string) {
    return this.db.query(
      'SELECT * FROM ai_models WHERE provider_id = $1 ORDER BY sort_order ASC, name ASC',
      [providerId],
    );
  }

  async findAllModels() {
    return this.db.query(
      'SELECT m.*, p.name as provider_name, p.code as provider_code FROM ai_models m JOIN ai_providers p ON m.provider_id = p.id ORDER BY p.sort_order ASC, m.sort_order ASC, m.name ASC',
    );
  }

  async findModelById(id: string) {
    return this.db.queryOne(
      `SELECT m.*, p.name as provider_name, p.code as provider_code
       FROM ai_models m
       JOIN ai_providers p ON m.provider_id = p.id
       WHERE m.id = $1`,
      [id],
    );
  }

  async findModelByProviderAndModelId(providerId: string, modelId: string) {
    return this.db.queryOne(
      'SELECT * FROM ai_models WHERE provider_id = $1 AND model_id = $2',
      [providerId, modelId],
    );
  }

  async findExecutableModelByModelId(modelId: string) {
    return this.db.queryOne(
      `SELECT m.*, p.name as provider_name, p.code as provider_code
       FROM ai_models m
       JOIN ai_providers p ON m.provider_id = p.id
       WHERE m.model_id = $1 AND m.status = 'active'
       ORDER BY p.sort_order ASC, m.sort_order ASC, m.name ASC
       LIMIT 1`,
      [modelId],
    );
  }

  async updateModel(id: string, data: UpdateModelDto) {
    return this.db.transaction(async (client) => {
      const existingResult = await client.query(
        'SELECT * FROM ai_models WHERE id = $1',
        [id],
      );
      const existingModel = existingResult.rows[0];
      if (!existingModel) return null;

      const fields: string[] = [];
      const values: SqlValue[] = [];
      let paramCount = 1;

      if (data.name !== undefined) {
        fields.push(`name = $${paramCount++}`);
        values.push(data.name);
      }
      if (data.description !== undefined) {
        fields.push(`description = $${paramCount++}`);
        values.push(data.description);
      }
      if (data.contextWindow !== undefined) {
        fields.push(`context_window = $${paramCount++}`);
        values.push(data.contextWindow);
      }
      if (data.inputPricePer1m !== undefined) {
        fields.push(`input_price_per_1m = $${paramCount++}`);
        values.push(data.inputPricePer1m);
      }
      if (data.outputPricePer1m !== undefined) {
        fields.push(`output_price_per_1m = $${paramCount++}`);
        values.push(data.outputPricePer1m);
      }
      if (data.sortOrder !== undefined) {
        fields.push(`sort_order = $${paramCount++}`);
        values.push(data.sortOrder);
      }
      if (data.capabilities !== undefined) {
        fields.push(`capabilities = $${paramCount++}`);
        values.push(JSON.stringify(data.capabilities));
      }
      if (data.metadata !== undefined) {
        fields.push(`metadata = $${paramCount++}`);
        values.push(JSON.stringify(data.metadata));
      }
      if (data.status !== undefined) {
        fields.push(`status = $${paramCount++}`);
        values.push(data.status);
      }

      const shouldSyncCatalog =
        data.displayName !== undefined ||
        data.rank !== undefined ||
        data.costMultiplier !== undefined ||
        data.requiredPlanLevel !== undefined ||
        data.isCatalogVisible !== undefined;

      if (fields.length === 0) {
        if (shouldSyncCatalog) {
          const catalogDefaults = await this.findCatalogProjectionDefaults(
            client,
            existingModel.model_id,
          );

          await upsertModelCatalogProjection(
            client,
            buildCatalogProjection(existingModel, data, catalogDefaults),
          );
        }

        return existingModel;
      }

      fields.push(`updated_at = NOW()`);
      values.push(id);

      const result = await client.query(
        `UPDATE ai_models SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values,
      );
      const updatedModel = result.rows[0];
      const catalogDefaults = await this.findCatalogProjectionDefaults(
        client,
        updatedModel.model_id,
      );

      await upsertModelCatalogProjection(
        client,
        buildCatalogProjection(updatedModel, data, catalogDefaults),
      );

      return updatedModel;
    });
  }

  async deleteModel(id: string) {
    return this.db.transaction(async (client) => {
      const existingResult = await client.query(
        'SELECT * FROM ai_models WHERE id = $1',
        [id],
      );
      const existingModel = existingResult.rows[0];
      if (!existingModel) return null;

      const result = await client.query(
        `UPDATE ai_models SET status = 'inactive', enabled = false, updated_at = NOW() WHERE id = $1 RETURNING *`,
        [id],
      );
      const deactivatedModel = result.rows[0];

      await deactivateModelCatalogProjection(client, existingModel.model_id);

      return deactivatedModel;
    });
  }

  // ==================== FETCH MODELS FROM PROVIDER ====================

  private readonly defaultProviderUrls: Record<string, string> = {
    openai: 'https://api.openai.com',
    anthropic: 'https://api.anthropic.com',
    minimax: 'https://api.minimaxi.com/anthropic',
    deepseek: 'https://api.deepseek.com',
    google: 'https://generativelanguage.googleapis.com',
    moonshot: 'https://api.moonshot.cn',
    zhipu: 'https://open.bigmodel.cn',
    baichuan: 'https://api.baichuan-ai.com',
    alibaba: 'https://dashscope.aliyuncs.com',
    baidu: 'https://aip.baidubce.com',
    bytedance: 'https://open.bytedanceapi.com',
    tencent: 'https://hunyuan.tencentcloudapi.com',
    siliconflow: 'https://api.siliconflow.cn',
    together: 'https://api.together.xyz',
    groq: 'https://api.groq.com',
    cerebras: 'https://api.cerebras.ai',
    cohere: 'https://api.cohere.com',
    mistral: 'https://api.mistral.ai',
    fireworks: 'https://api.fireworks.ai',
    xai: 'https://api.x.ai',
    ollama: 'http://localhost:11434',
    openrouter: 'https://openrouter.ai',
  };

  async fetchModelsFromProvider(providerId: string) {
    const provider = await this.findProviderById(providerId);
    if (!provider) {
      throw new HttpException('Provider not found', HttpStatus.NOT_FOUND);
    }

    const apiKey = await this.findActiveApiKeyByProvider(providerId);
    if (!apiKey) {
      throw new HttpException(
        'No active API key found for this provider',
        HttpStatus.BAD_REQUEST,
      );
    }

    const decryptedKey = await this.getDecryptedApiKey(apiKey.id);
    if (!decryptedKey) {
      throw new HttpException(
        'Failed to decrypt API key',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    let baseUrl: string | undefined;
    const endpoint = await this.findDefaultEndpointByProvider(providerId);
    if (endpoint) {
      baseUrl = endpoint.base_url;
    }
    if (!baseUrl) {
      baseUrl = this.defaultProviderUrls[provider.code];
    }
    if (!baseUrl) {
      throw new HttpException(
        'No endpoint configured and no default URL for this provider',
        HttpStatus.BAD_REQUEST,
      );
    }

    let remoteModels: Array<{ id: string; name?: string }> = [];
    try {
      const body = await this.apiClient.fetchModels(baseUrl, decryptedKey, 15000);
      if (Array.isArray(body?.data)) {
        remoteModels = body.data;
      } else if (Array.isArray(body?.models)) {
        remoteModels = body.models;
      } else if (Array.isArray(body)) {
        remoteModels = body;
      }
    } catch (error: any) {
      const status = error?.response?.status;
      const message =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        'Unknown error';
      throw new HttpException(
        `Failed to fetch models from provider API (${status || 'network'}): ${message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    const existingModels = await this.findModelsByProvider(providerId);
    const existingByModelId = new Map(
      existingModels.map((m: any) => [m.model_id, m]),
    );

    const results: any[] = [];
    for (const remote of remoteModels) {
      const modelIdStr = remote.id;
      if (!modelIdStr) continue;

      if (existingByModelId.has(modelIdStr)) {
        const existing = existingByModelId.get(modelIdStr);
        const rows = await this.db.query(
          `UPDATE ai_models SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
          [remote.name || modelIdStr, existing.id],
        );
        results.push(rows[0]);
        existingByModelId.delete(modelIdStr);
      } else {
        const id = this.generateUUID();
        const row = await this.db.queryOne(
          `INSERT INTO ai_models (id, provider_id, name, model_id, description, capabilities, pricing, sort_order, enabled, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW())
           RETURNING *`,
          [
            id,
            providerId,
            remote.name || modelIdStr,
            modelIdStr,
            null,
            JSON.stringify({}),
            JSON.stringify({}),
            0,
          ],
        );
        results.push(row);
      }
    }

    return results;
  }

  // ==================== API KEY CRUD ====================

  private readonly safeApiKeyColumns = `id, provider_id, key_name, is_active, last_used_at, expires_at, created_at, updated_at`;

  private async findSafeApiKeyById(id: string) {
    return this.db.queryOne(
      `SELECT ${this.safeApiKeyColumns} FROM ai_api_keys WHERE id = $1`,
      [id],
    );
  }

  async createApiKey(data: CreateApiKeyDto, userId: string) {
    const id = this.generateUUID();
    const keyHash = this.encryption.hashForLookup(data.apiKey);
    const { encrypted, iv, authTag } = this.encryption.encrypt(data.apiKey);

    return this.db.queryOne(
      `INSERT INTO ai_api_keys (id, provider_id, key_name, key_hash, encrypted_key, iv, auth_tag, is_active, expires_at, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9, NOW(), NOW())
       RETURNING ${this.safeApiKeyColumns}`,
      [
        id,
        data.providerId,
        data.keyName,
        keyHash,
        encrypted,
        iv,
        authTag,
        data.expiresAt || null,
        userId,
      ],
    );
  }

  async findAllApiKeys() {
    return this.db.query(
      `SELECT ${this.safeApiKeyColumns}
       FROM ai_api_keys ORDER BY created_at DESC`,
    );
  }

  async findApiKeysByProvider(providerId: string) {
    const rows = await this.db.query(
      `SELECT ${this.safeApiKeyColumns}
       FROM ai_api_keys WHERE provider_id = $1 ORDER BY created_at DESC`,
      [providerId],
    );
    return rows;
  }

  async findActiveApiKeyByProvider(providerId: string) {
    return this.db.queryOne(
      `SELECT * FROM ai_api_keys
       WHERE provider_id = $1 AND is_active = true AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY created_at DESC LIMIT 1`,
      [providerId],
    );
  }

  async getDecryptedApiKey(id: string): Promise<string | null> {
    const key = await this.db.queryOne('SELECT * FROM ai_api_keys WHERE id = $1', [
      id,
    ]);
    if (!key) return null;

    try {
      return this.encryption.decrypt(key.encrypted_key, key.iv, key.auth_tag);
    } catch {
      return null;
    }
  }

  async updateApiKeyStatus(id: string, data: UpdateApiKeyStatusDto) {
    const rows = await this.db.query(
      `UPDATE ai_api_keys SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING ${this.safeApiKeyColumns}`,
      [data.isActive, id],
    );
    return rows[0];
  }

  async updateApiKey(id: string, data: UpdateApiKeyDto) {
    // Update key name if provided
    if (data.keyName !== undefined) {
      await this.db.query(
        `UPDATE ai_api_keys SET key_name = $1, updated_at = NOW() WHERE id = $2`,
        [data.keyName, id],
      );
    }
    // Update API key value if provided
    if (data.apiKey !== undefined) {
      const keyHash = this.encryption.hashForLookup(data.apiKey);
      const { encrypted, iv, authTag } = this.encryption.encrypt(data.apiKey);
      await this.db.query(
        `UPDATE ai_api_keys SET key_hash = $1, encrypted_key = $2, iv = $3, auth_tag = $4, updated_at = NOW() WHERE id = $5`,
        [keyHash, encrypted, iv, authTag, id],
      );
    }
    // Update or create endpoint if endpointUrl is provided
    if (data.endpointUrl !== undefined) {
      // Find the api key to get providerId
      const key = await this.db.queryOne(
        'SELECT id, provider_id FROM ai_api_keys WHERE id = $1',
        [id],
      );
      if (key) {
        // Check if default endpoint exists for this provider
        const existingEndpoint = await this.db.queryOne(
          'SELECT * FROM ai_endpoints WHERE provider_id = $1 AND is_default = true',
          [key.provider_id],
        );
        if (existingEndpoint) {
          // Update existing endpoint
          await this.db.query(
            `UPDATE ai_endpoints SET base_url = $1, updated_at = NOW() WHERE id = $2`,
            [data.endpointUrl, existingEndpoint.id],
          );
        } else {
          // Create new default endpoint
          const endpointId = this.generateUUID();
          await this.db.query(
            `INSERT INTO ai_endpoints (id, provider_id, name, base_url, headers, timeout_ms, retry_count, is_active, is_default, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, true, true, NOW(), NOW())`,
            [endpointId, key.provider_id, 'Default', data.endpointUrl, null, 60000, 3],
          );
        }
      }
    }
    return this.findSafeApiKeyById(id);
  }

  async deleteApiKey(id: string) {
    return this.db.queryOne(
      `DELETE FROM ai_api_keys WHERE id = $1 RETURNING ${this.safeApiKeyColumns}`,
      [id],
    );
  }

  async updateApiKeyLastUsed(id: string) {
    await this.db.query(
      'UPDATE ai_api_keys SET last_used_at = NOW() WHERE id = $1',
      [id],
    );
  }

  // ==================== ENDPOINT CRUD ====================

  async createEndpoint(data: CreateEndpointDto) {
    const id = this.generateUUID();
    return this.db.queryOne(
      `INSERT INTO ai_endpoints (id, provider_id, name, base_url, headers, timeout_ms, retry_count, is_active, is_default, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, NOW(), NOW())
       RETURNING *`,
      [
        id,
        data.providerId,
        data.name,
        data.baseUrl,
        data.headers ? JSON.stringify(data.headers) : null,
        data.timeoutMs || 60000,
        data.retryCount || 3,
        data.isDefault || false,
      ],
    );
  }

  async findEndpointsByProvider(providerId: string) {
    return this.db.query(
      'SELECT * FROM ai_endpoints WHERE provider_id = $1 ORDER BY is_default DESC, created_at ASC',
      [providerId],
    );
  }

  async findEndpointById(id: string) {
    return this.db.queryOne('SELECT * FROM ai_endpoints WHERE id = $1', [id]);
  }

  async findDefaultEndpointByProvider(providerId: string) {
    return this.db.queryOne(
      'SELECT * FROM ai_endpoints WHERE provider_id = $1 AND is_default = true AND is_active = true',
      [providerId],
    );
  }

  async updateEndpoint(id: string, data: UpdateEndpointDto) {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.baseUrl !== undefined) {
      fields.push(`base_url = $${paramCount++}`);
      values.push(data.baseUrl);
    }
    if (data.headers !== undefined) {
      fields.push(`headers = $${paramCount++}`);
      values.push(data.headers ? JSON.stringify(data.headers) : null);
    }
    if (data.timeoutMs !== undefined) {
      fields.push(`timeout_ms = $${paramCount++}`);
      values.push(data.timeoutMs);
    }
    if (data.retryCount !== undefined) {
      fields.push(`retry_count = $${paramCount++}`);
      values.push(data.retryCount);
    }
    if (data.isActive !== undefined) {
      fields.push(`is_active = $${paramCount++}`);
      values.push(data.isActive);
    }
    if (data.isDefault !== undefined) {
      fields.push(`is_default = $${paramCount++}`);
      values.push(data.isDefault);
    }

    if (fields.length === 0) return this.findEndpointById(id);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const rows = await this.db.query(
      `UPDATE ai_endpoints SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values,
    );
    return rows[0];
  }

  async deleteEndpoint(id: string) {
    return this.db.queryOne('DELETE FROM ai_endpoints WHERE id = $1 RETURNING *', [
      id,
    ]);
  }

  // ==================== MODEL CONFIG CRUD ====================

  async createModelConfig(data: CreateModelConfigDto) {
    const id = this.generateUUID();
    return this.db.queryOne(
      `INSERT INTO ai_model_configs (id, model_id, config_name, temperature, max_tokens, top_p, top_k, frequency_penalty, presence_penalty, stop_sequences, response_format, extra_params, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, NOW(), NOW())
       RETURNING *`,
      [
        id,
        data.modelId,
        data.configName,
        data.temperature ?? 0.7,
        data.maxTokens ?? 4096,
        data.topP ?? 1.0,
        data.topK ?? 100,
        data.frequencyPenalty ?? 0.0,
        data.presencePenalty ?? 0.0,
        data.stopSequences ? JSON.stringify(data.stopSequences) : null,
        data.responseFormat ? JSON.stringify(data.responseFormat) : null,
        data.extraParams ? JSON.stringify(data.extraParams) : null,
      ],
    );
  }

  async findModelConfigsByModel(modelId: string) {
    return this.db.query(
      'SELECT * FROM ai_model_configs WHERE model_id = $1 ORDER BY created_at ASC',
      [modelId],
    );
  }

  async findModelConfigById(id: string) {
    return this.db.queryOne('SELECT * FROM ai_model_configs WHERE id = $1', [
      id,
    ]);
  }

  async updateModelConfig(id: string, data: UpdateModelConfigDto) {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.configName !== undefined) {
      fields.push(`config_name = $${paramCount++}`);
      values.push(data.configName);
    }
    if (data.temperature !== undefined) {
      fields.push(`temperature = $${paramCount++}`);
      values.push(data.temperature);
    }
    if (data.maxTokens !== undefined) {
      fields.push(`max_tokens = $${paramCount++}`);
      values.push(data.maxTokens);
    }
    if (data.topP !== undefined) {
      fields.push(`top_p = $${paramCount++}`);
      values.push(data.topP);
    }
    if (data.topK !== undefined) {
      fields.push(`top_k = $${paramCount++}`);
      values.push(data.topK);
    }
    if (data.frequencyPenalty !== undefined) {
      fields.push(`frequency_penalty = $${paramCount++}`);
      values.push(data.frequencyPenalty);
    }
    if (data.presencePenalty !== undefined) {
      fields.push(`presence_penalty = $${paramCount++}`);
      values.push(data.presencePenalty);
    }
    if (data.stopSequences !== undefined) {
      fields.push(`stop_sequences = $${paramCount++}`);
      values.push(data.stopSequences ? JSON.stringify(data.stopSequences) : null);
    }
    if (data.responseFormat !== undefined) {
      fields.push(`response_format = $${paramCount++}`);
      values.push(data.responseFormat ? JSON.stringify(data.responseFormat) : null);
    }
    if (data.extraParams !== undefined) {
      fields.push(`extra_params = $${paramCount++}`);
      values.push(data.extraParams ? JSON.stringify(data.extraParams) : null);
    }
    if (data.isActive !== undefined) {
      fields.push(`is_active = $${paramCount++}`);
      values.push(data.isActive);
    }

    if (fields.length === 0) return this.findModelConfigById(id);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const rows = await this.db.query(
      `UPDATE ai_model_configs SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values,
    );
    return rows[0];
  }

  async deleteModelConfig(id: string) {
    return this.db.queryOne(
      'DELETE FROM ai_model_configs WHERE id = $1 RETURNING *',
      [id],
    );
  }

  // ==================== DEFAULT MODEL CRUD ====================

  async createDefaultModel(data: CreateDefaultModelDto) {
    const id = this.generateUUID();
    return this.db.queryOne(
      `INSERT INTO ai_default_models (id, provider_id, model_id, config_id, use_case, is_system_default, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       ON CONFLICT (provider_id, use_case) DO UPDATE SET model_id = $3, config_id = $4, updated_at = NOW()
       RETURNING *`,
      [
        id,
        data.providerId,
        data.modelId,
        data.configId || null,
        data.useCase,
        data.isSystemDefault ?? false,
      ],
    );
  }

  async findDefaultModelsByProvider(providerId: string) {
    return this.db.query(
      `SELECT dm.*, m.name as model_name, m.model_id as model_code, mc.config_name
       FROM ai_default_models dm
       JOIN ai_models m ON dm.model_id = m.id
       LEFT JOIN ai_model_configs mc ON dm.config_id = mc.id
       WHERE dm.provider_id = $1
       ORDER BY dm.use_case ASC`,
      [providerId],
    );
  }

  async findAllDefaultModels() {
    return this.db.query(
      `SELECT dm.*, m.name as model_name, m.model_id as model_code, m.provider_id, p.name as provider_name, p.code as provider_code,
              mc.config_name
       FROM ai_default_models dm
       JOIN ai_models m ON dm.model_id = m.id
       JOIN ai_providers p ON dm.provider_id = p.id
       LEFT JOIN ai_model_configs mc ON dm.config_id = mc.id
       ORDER BY p.sort_order ASC, dm.use_case ASC`,
    );
  }

  async findDefaultModelByUseCase(useCase: string) {
    return this.db.queryOne(
      `SELECT dm.*, m.name as model_name, m.model_id as model_code, p.name as provider_name, p.code as provider_code,
              mc.temperature, mc.max_tokens, mc.top_p, mc.top_k, mc.frequency_penalty, mc.presence_penalty, mc.stop_sequences, mc.response_format, mc.extra_params
       FROM ai_default_models dm
       JOIN ai_models m ON dm.model_id = m.id
       JOIN ai_providers p ON dm.provider_id = p.id
       LEFT JOIN ai_model_configs mc ON dm.config_id = mc.id
       WHERE dm.use_case = $1`,
      [useCase],
    );
  }

  async updateDefaultModel(id: string, data: UpdateDefaultModelDto) {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.modelId !== undefined) {
      fields.push(`model_id = $${paramCount++}`);
      values.push(data.modelId);
    }
    if (data.configId !== undefined) {
      fields.push(`config_id = $${paramCount++}`);
      values.push(data.configId);
    }
    if (data.isSystemDefault !== undefined) {
      fields.push(`is_system_default = $${paramCount++}`);
      values.push(data.isSystemDefault);
    }

    if (fields.length === 0) return this.findDefaultModelByUseCase(id);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const rows = await this.db.query(
      `UPDATE ai_default_models SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values,
    );
    return rows[0];
  }

  async deleteDefaultModel(id: string) {
    return this.db.queryOne(
      'DELETE FROM ai_default_models WHERE id = $1 RETURNING *',
      [id],
    );
  }

  // ==================== TEAM QUOTA CRUD ====================

  async createTeamQuota(data: CreateTeamQuotaDto) {
    const id = this.generateUUID();
    return this.db.queryOne(
      `INSERT INTO ai_team_quotas (id, team_id, daily_token_limit, monthly_token_limit, daily_request_limit, monthly_request_limit, used_today, used_this_month, requests_today, requests_this_month, quota_reset_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 0, 0, 0, 0, NOW(), NOW(), NOW())
       RETURNING *`,
      [
        id,
        data.teamId,
        data.dailyTokenLimit ?? 1000000,
        data.monthlyTokenLimit ?? 10000000,
        data.dailyRequestLimit ?? 1000,
        data.monthlyRequestLimit ?? 50000,
      ],
    );
  }

  async findTeamQuotaByTeamId(teamId: string) {
    return this.db.queryOne('SELECT * FROM ai_team_quotas WHERE team_id = $1', [
      teamId,
    ]);
  }

  async updateTeamQuota(teamId: string, data: UpdateTeamQuotaDto) {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.dailyTokenLimit !== undefined) {
      fields.push(`daily_token_limit = $${paramCount++}`);
      values.push(data.dailyTokenLimit);
    }
    if (data.monthlyTokenLimit !== undefined) {
      fields.push(`monthly_token_limit = $${paramCount++}`);
      values.push(data.monthlyTokenLimit);
    }
    if (data.dailyRequestLimit !== undefined) {
      fields.push(`daily_request_limit = $${paramCount++}`);
      values.push(data.dailyRequestLimit);
    }
    if (data.monthlyRequestLimit !== undefined) {
      fields.push(`monthly_request_limit = $${paramCount++}`);
      values.push(data.monthlyRequestLimit);
    }

    if (fields.length === 0) return this.findTeamQuotaByTeamId(teamId);

    fields.push(`updated_at = NOW()`);
    values.push(teamId);

    const rows = await this.db.query(
      `UPDATE ai_team_quotas SET ${fields.join(', ')} WHERE team_id = $${paramCount} RETURNING *`,
      values,
    );
    return rows[0];
  }

  async incrementTeamQuotaUsage(
    teamId: string,
    tokens: number,
    isRequest: boolean = true,
  ) {
    const tokenField = isRequest ? 'used_today' : 'used_today';
    const requestField = isRequest ? 'requests_today' : 'requests_today';

    return this.db.queryOne(
      `UPDATE ai_team_quotas
       SET used_today = used_today + $1,
           used_this_month = used_this_month + $1,
           requests_today = requests_today + $2,
           requests_this_month = requests_this_month + $2,
           updated_at = NOW()
       WHERE team_id = $3
       RETURNING *`,
      [tokens, isRequest ? 1 : 0, teamId],
    );
  }

  async resetTeamQuotaDaily(teamId: string) {
    return this.db.queryOne(
      `UPDATE ai_team_quotas
       SET used_today = 0, requests_today = 0, quota_reset_at = NOW(), updated_at = NOW()
       WHERE team_id = $1
       RETURNING *`,
      [teamId],
    );
  }

  async resetTeamQuotaMonthly(teamId: string) {
    return this.db.queryOne(
      `UPDATE ai_team_quotas
       SET used_this_month = 0, requests_this_month = 0, updated_at = NOW()
       WHERE team_id = $1
       RETURNING *`,
      [teamId],
    );
  }

  async deleteTeamQuota(teamId: string) {
    return this.db.queryOne(
      'DELETE FROM ai_team_quotas WHERE team_id = $1 RETURNING *',
      [teamId],
    );
  }

  // ==================== USAGE LOG ====================

  async createUsageLog(data: CreateUsageLogDto) {
    const id = this.generateUUID();
    return this.db.queryOne(
      `INSERT INTO ai_usage_logs (id, team_id, user_id, model_id, provider_id, conversation_id, input_tokens, output_tokens, total_tokens, cost, latency_ms, endpoint, model_params, response_id, status, error_message, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
       RETURNING *`,
      [
        id,
        data.teamId,
        data.userId || null,
        data.modelId,
        data.providerId,
        data.conversationId || null,
        data.inputTokens || 0,
        data.outputTokens || 0,
        data.totalTokens || 0,
        data.cost || 0,
        data.latencyMs || null,
        data.endpoint || null,
        data.modelParams ? JSON.stringify(data.modelParams) : null,
        data.responseId || null,
        data.status || 'success',
        data.errorMessage || null,
      ],
    );
  }

  async findUsageLogsByTeam(
    teamId: string,
    limit: number = 100,
    offset: number = 0,
  ) {
    return this.db.query(
      `SELECT ul.*, m.name as model_name, m.model_id as model_code, p.name as provider_name
       FROM ai_usage_logs ul
       JOIN ai_models m ON ul.model_id = m.id
       JOIN ai_providers p ON ul.provider_id = p.id
       WHERE ul.team_id = $1
       ORDER BY ul.created_at DESC
       LIMIT $2 OFFSET $3`,
      [teamId, limit, offset],
    );
  }

  async getUsageStatsByTeam(teamId: string, period: 'day' | 'week' | 'month') {
    let startDate: Date;
    const now = new Date();

    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    const result = await this.db.queryOne<{
      total_cost: string;
      total_tokens: string;
      total_requests: string;
    }>(
      `SELECT COALESCE(SUM(cost), 0) as total_cost,
              COALESCE(SUM(total_tokens), 0) as total_tokens,
              COUNT(*) as total_requests
       FROM ai_usage_logs
       WHERE team_id = $1 AND created_at >= $2`,
      [teamId, startDate.toISOString()],
    );

    const breakdown = await this.db.query<{
      model_name: string;
      provider_name: string;
      cost: string;
      tokens: string;
      requests: string;
    }>(
      `SELECT m.name as model_name, p.name as provider_name,
              COALESCE(SUM(ul.cost), 0) as cost,
              COALESCE(SUM(ul.total_tokens), 0) as tokens,
              COUNT(*) as requests
       FROM ai_usage_logs ul
       JOIN ai_models m ON ul.model_id = m.id
       JOIN ai_providers p ON ul.provider_id = p.id
       WHERE ul.team_id = $1 AND ul.created_at >= $2
       GROUP BY m.name, p.name
       ORDER BY cost DESC`,
      [teamId, startDate.toISOString()],
    );

    return {
      totalCost: parseFloat(result?.total_cost || '0'),
      totalTokens: parseInt(result?.total_tokens || '0', 10),
      totalRequests: parseInt(result?.total_requests || '0', 10),
      breakdown: breakdown.map((r) => ({
        modelName: r.model_name,
        providerName: r.provider_name,
        cost: parseFloat(r.cost),
        tokens: parseInt(r.tokens, 10),
        requests: parseInt(r.requests, 10),
      })),
    };
  }

  // ==================== HELPERS ====================

  private async findCatalogProjectionDefaults(
    client: PoolClient,
    modelName: string,
  ): Promise<CatalogProjectionDefaults> {
    const result = await client.query(
      `SELECT rank, cost_multiplier, required_plan_level FROM model_catalog WHERE model_name = $1`,
      [modelName],
    );
    const existingCatalog = result.rows[0];

    if (!existingCatalog) return {};

    return {
      rank: existingCatalog.rank,
      costMultiplier: existingCatalog.cost_multiplier,
      requiredPlanLevel: existingCatalog.required_plan_level,
    };
  }

  async onModuleInit() {
    try {
      await seedAiModels(this.db, this.encryption);
    } catch (error) {
      console.error('Failed to seed AI models:', error);
    }
  }


  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}