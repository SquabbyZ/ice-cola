import api from './api';

// DTOs
export interface CreateProviderDto {
  name: string;
  code: string;
  logoUrl?: string;
  websiteUrl?: string;
  description?: string;
  sortOrder?: number;
}

export interface UpdateProviderDto {
  name?: string;
  logoUrl?: string;
  websiteUrl?: string;
  description?: string;
  sortOrder?: number;
  status?: 'active' | 'inactive';
}

export interface CreateModelDto {
  providerId: string;
  name: string;
  modelId: string;
  modelType: 'chat' | 'vision' | 'embedding' | 'text';
  description?: string;
  contextWindow?: number;
  inputPricePer1m?: number;
  outputPricePer1m?: number;
  sortOrder?: number;
  capabilities?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateModelDto {
  name?: string;
  description?: string;
  contextWindow?: number;
  inputPricePer1m?: number;
  outputPricePer1m?: number;
  sortOrder?: number;
  capabilities?: string[];
  metadata?: Record<string, any>;
  status?: 'active' | 'inactive';
}

export interface CreateApiKeyDto {
  providerId: string;
  keyName: string;
  apiKey: string;
  expiresAt?: string;
}

export interface UpdateApiKeyStatusDto {
  isActive: boolean;
}

export interface UpdateApiKeyDto {
  keyName?: string;
  apiKey?: string;
  endpointUrl?: string;
}

export interface CreateEndpointDto {
  providerId: string;
  name: string;
  baseUrl: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  retryCount?: number;
  isDefault?: boolean;
}

export interface UpdateEndpointDto {
  name?: string;
  baseUrl?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  retryCount?: number;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface CreateModelConfigDto {
  modelId: string;
  configName: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  responseFormat?: { type: string };
  extraParams?: Record<string, any>;
  isActive?: boolean;
}

export interface UpdateModelConfigDto {
  configName?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  responseFormat?: { type: string };
  extraParams?: Record<string, any>;
  isActive?: boolean;
}

export interface CreateDefaultModelDto {
  providerId: string;
  modelId: string;
  configId?: string;
  useCase: 'general' | 'coding' | 'creative' | 'analysis';
  isSystemDefault?: boolean;
}

export interface UpdateDefaultModelDto {
  modelId?: string;
  configId?: string | null;
  isSystemDefault?: boolean;
}

export interface CreateTeamQuotaDto {
  teamId: string;
  dailyTokenLimit?: number;
  monthlyTokenLimit?: number;
  dailyRequestLimit?: number;
  monthlyRequestLimit?: number;
}

export interface UpdateTeamQuotaDto {
  dailyTokenLimit?: number;
  monthlyTokenLimit?: number;
  dailyRequestLimit?: number;
  monthlyRequestLimit?: number;
}

export interface CreateUsageLogDto {
  teamId: string;
  userId?: string;
  modelId: string;
  providerId: string;
  conversationId?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  cost?: number;
  latencyMs?: number;
  endpoint?: string;
  modelParams?: Record<string, any>;
  responseId?: string;
  status?: 'success' | 'error' | 'rate_limited';
  errorMessage?: string;
}

// API Response types
export interface Provider {
  id: string;
  name: string;
  code: string;
  logoUrl?: string;
  websiteUrl?: string;
  description?: string;
  sortOrder: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Model {
  id: string;
  providerId: string;
  name: string;
  modelId: string;
  modelType: string;
  description?: string;
  contextWindow?: number;
  inputPricePer1m?: number;
  outputPricePer1m?: number;
  sortOrder: number;
  status: string;
  capabilities?: string[];
  metadata?: Record<string, any>;
  providerName?: string;
  providerCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKey {
  id: string;
  providerId: string;
  keyName: string;
  keyHash: string;
  encryptedKey: string;
  iv: string;
  authTag: string;
  isActive: boolean;
  lastUsedAt?: string;
  expiresAt?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Endpoint {
  id: string;
  providerId: string;
  name: string;
  baseUrl: string;
  headers?: Record<string, string>;
  timeoutMs: number;
  retryCount: number;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ModelConfig {
  id: string;
  modelId: string;
  configName: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  topK: number;
  frequencyPenalty: number;
  presencePenalty: number;
  stopSequences?: string[];
  responseFormat?: { type: string };
  extraParams?: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DefaultModel {
  id: string;
  providerId: string;
  modelId: string;
  configId?: string;
  useCase: string;
  isSystemDefault: boolean;
  createdAt: string;
  updatedAt: string;
  providerName?: string;
  modelName?: string;
  configName?: string;
}

export interface TeamQuota {
  id: string;
  teamId: string;
  dailyTokenLimit: number;
  monthlyTokenLimit: number;
  dailyRequestLimit: number;
  monthlyRequestLimit: number;
  usedToday: number;
  usedThisMonth: number;
  requestsToday: number;
  requestsThisMonth: number;
  quotaResetAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UsageLog {
  id: string;
  teamId: string;
  userId?: string;
  modelId: string;
  providerId: string;
  conversationId?: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  latencyMs?: number;
  endpoint?: string;
  modelParams?: Record<string, any>;
  responseId?: string;
  status: string;
  errorMessage?: string;
  createdAt: string;
}

export interface UsageStats {
  totalCost: number;
  totalTokens: number;
  totalRequests: number;
  breakdown: {
    model: string;
    cost: number;
    tokens: number;
  }[];
}

// API Service
export const aiModelsApi = {
  // Providers
  getProviders: () => api.get<{ success: boolean; data: Provider[] }>('/admin/ai/providers'),
  getProvider: (id: string) => api.get<{ success: boolean; data: Provider }>(`/admin/ai/providers/${id}`),
  createProvider: (data: CreateProviderDto) => api.post<{ success: boolean; data: Provider }>('/admin/ai/providers', data),
  updateProvider: (id: string, data: UpdateProviderDto) => api.put<{ success: boolean; data: Provider }>(`/admin/ai/providers/${id}`, data),
  deleteProvider: (id: string) => api.delete<{ success: boolean; data: Provider }>(`/admin/ai/providers/${id}`),

  // Models
  getModels: (providerId?: string) =>
    api.get<{ success: boolean; data: Model[] }>('/admin/ai/models', {
      params: providerId ? { providerId } : undefined,
    }),
  fetchModelsFromProvider: (providerId: string) =>
    api.post<{ success: boolean; data: Model[] }>(`/admin/ai/providers/${providerId}/fetch-models`),
  getModel: (id: string) => api.get<{ success: boolean; data: Model }>(`/admin/ai/models/${id}`),
  createModel: (data: CreateModelDto) => api.post<{ success: boolean; data: Model }>('/admin/ai/models', data),
  updateModel: (id: string, data: UpdateModelDto) => api.put<{ success: boolean; data: Model }>(`/admin/ai/models/${id}`, data),
  deleteModel: (id: string) => api.delete<{ success: boolean; data: Model }>(`/admin/ai/models/${id}`),

  // API Keys
  getApiKeys: (providerId?: string) =>
    api.get<{ success: boolean; data: ApiKey[] }>('/admin/ai/api-keys', {
      params: providerId ? { providerId } : undefined,
    }),
  decryptApiKey: (id: string) => api.get<{ success: boolean; data: { apiKey: string } }>(`/admin/ai/api-keys/${id}/decrypt`),
  createApiKey: (data: CreateApiKeyDto) => api.post<{ success: boolean; data: ApiKey }>('/admin/ai/api-keys', data),
  updateApiKeyStatus: (id: string, data: UpdateApiKeyStatusDto) =>
    api.put<{ success: boolean; data: ApiKey }>(`/admin/ai/api-keys/${id}/status`, data),
  updateApiKey: (id: string, data: UpdateApiKeyDto) =>
    api.put<{ success: boolean; data: ApiKey }>(`/admin/ai/api-keys/${id}`, data),
  deleteApiKey: (id: string) => api.delete<{ success: boolean; data: ApiKey }>(`/admin/ai/api-keys/${id}`),

  // Endpoints
  getEndpoints: (providerId?: string) =>
    api.get<{ success: boolean; data: Endpoint[] }>('/admin/ai/endpoints', {
      params: providerId ? { providerId } : undefined,
    }),
  getEndpoint: (id: string) => api.get<{ success: boolean; data: Endpoint }>(`/admin/ai/endpoints/${id}`),
  createEndpoint: (data: CreateEndpointDto) => api.post<{ success: boolean; data: Endpoint }>('/admin/ai/endpoints', data),
  updateEndpoint: (id: string, data: UpdateEndpointDto) =>
    api.put<{ success: boolean; data: Endpoint }>(`/admin/ai/endpoints/${id}`, data),
  deleteEndpoint: (id: string) => api.delete<{ success: boolean; data: Endpoint }>(`/admin/ai/endpoints/${id}`),

  // Model Configs
  getModelConfigs: (modelId?: string) =>
    api.get<{ success: boolean; data: ModelConfig[] }>('/admin/ai/model-configs', {
      params: modelId ? { modelId } : undefined,
    }),
  getModelConfig: (id: string) => api.get<{ success: boolean; data: ModelConfig }>(`/admin/ai/model-configs/${id}`),
  createModelConfig: (data: CreateModelConfigDto) =>
    api.post<{ success: boolean; data: ModelConfig }>('/admin/ai/model-configs', data),
  updateModelConfig: (id: string, data: UpdateModelConfigDto) =>
    api.put<{ success: boolean; data: ModelConfig }>(`/admin/ai/model-configs/${id}`, data),
  deleteModelConfig: (id: string) => api.delete<{ success: boolean; data: ModelConfig }>(`/admin/ai/model-configs/${id}`),

  // Default Models
  getDefaultModels: () => api.get<{ success: boolean; data: DefaultModel[] }>('/admin/ai/default-models'),
  getDefaultModelsByProvider: (providerId: string) =>
    api.get<{ success: boolean; data: DefaultModel[] }>(`/admin/ai/default-models/provider/${providerId}`),
  getDefaultModelByUseCase: (useCase: string) =>
    api.get<{ success: boolean; data: DefaultModel }>(`/admin/ai/default-models/use-case/${useCase}`),
  createDefaultModel: (data: CreateDefaultModelDto) =>
    api.post<{ success: boolean; data: DefaultModel }>('/admin/ai/default-models', data),
  updateDefaultModel: (id: string, data: UpdateDefaultModelDto) =>
    api.put<{ success: boolean; data: DefaultModel }>(`/admin/ai/default-models/${id}`, data),
  deleteDefaultModel: (id: string) => api.delete<{ success: boolean; data: DefaultModel }>(`/admin/ai/default-models/${id}`),

  // Team Quotas
  getTeamQuotas: (teamId?: string) =>
    api.get<{ success: boolean; data: TeamQuota[] }>('/admin/ai/team-quotas', {
      params: teamId ? { teamId } : undefined,
    }),
  createTeamQuota: (data: CreateTeamQuotaDto) =>
    api.post<{ success: boolean; data: TeamQuota }>('/admin/ai/team-quotas', data),
  updateTeamQuota: (teamId: string, data: UpdateTeamQuotaDto) =>
    api.put<{ success: boolean; data: TeamQuota }>(`/admin/ai/team-quotas/${teamId}`, data),
  resetTeamQuota: (teamId: string, type: 'daily' | 'monthly') =>
    api.post<{ success: boolean; data: TeamQuota }>(`/admin/ai/team-quotas/${teamId}/reset`, { type }),
  deleteTeamQuota: (teamId: string) => api.delete<{ success: boolean; data: TeamQuota }>(`/admin/ai/team-quotas/${teamId}`),

  // Test Connection
  testConnection: (providerId: string) =>
    api.post<{ success: boolean; data: { success: boolean; message: string } }>(`/admin/ai/providers/${providerId}/test-connection`),

  // Usage Logs
  getUsageLogs: (params?: { teamId?: string; limit?: number; offset?: number }) =>
    api.get<{ success: boolean; data: UsageLog[]; meta?: { total: number } }>('/admin/ai/usage-logs', { params }),

  // Usage Stats
  getUsageStats: (params?: { teamId?: string; period?: 'day' | 'week' | 'month' }) =>
    api.get<{ success: boolean; data: UsageStats }>('/admin/ai/usage-stats', { params }),
};