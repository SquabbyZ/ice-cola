import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  aiModelsApi,
  CreateProviderDto,
  UpdateProviderDto,
  CreateModelDto,
  UpdateModelDto,
  CreateApiKeyDto,
  CreateEndpointDto,
  CreateModelConfigDto,
  CreateDefaultModelDto,
  UpdateDefaultModelDto,
  CreateTeamQuotaDto,
  UpdateTeamQuotaDto,
  Model,
  Provider,
  UpdateApiKeyDto,
  UpdateEndpointDto,
  UpdateModelConfigDto,
} from '../services/aiModelsApi';

interface RawProvider extends Provider {
  website?: string;
  enabled?: boolean;
}

type RawModel = Omit<Model, 'capabilities'> & {
  capabilities?: Model['capabilities'] | { type?: string; contextWindow?: number };
  pricing?: { inputPricePer1m?: number; outputPricePer1m?: number };
};

function transformProvider(provider: RawProvider): Provider {
  return {
    ...provider,
    websiteUrl: provider.website || provider.websiteUrl,
    status: provider.status ?? (provider.enabled === false ? 'inactive' : 'active'),
  };
}

function transformModel(model: RawModel): Model {
  const capabilities = Array.isArray(model.capabilities) ? model.capabilities : [];
  const capabilityShape = Array.isArray(model.capabilities) ? undefined : model.capabilities;

  return {
    ...model,
    capabilities,
    modelType: capabilityShape?.type || model.modelType || 'chat',
    contextWindow: capabilityShape?.contextWindow || model.contextWindow,
    inputPricePer1m: model.pricing?.inputPricePer1m ?? model.inputPricePer1m,
    outputPricePer1m: model.pricing?.outputPricePer1m ?? model.outputPricePer1m,
  };
}

interface QuotaAlertTeamQuota {
  dailyTokenLimit: number;
  usedToday: number;
  monthlyTokenLimit: number;
  usedThisMonth: number;
}

// ==================== PROVIDERS ====================

export function useProviders() {
  return useQuery({
    queryKey: ['ai', 'providers'],
    queryFn: () => aiModelsApi.getProviders().then(res => {
      const providers: RawProvider[] = res.data.data;
      // Transform API response to match frontend Provider interface
      return providers.map(transformProvider);
    }),
  });
}

export function useProvider(id: string) {
  return useQuery({
    queryKey: ['ai', 'providers', id],
    queryFn: () => aiModelsApi.getProvider(id).then(res => res.data.data),
    enabled: !!id,
  });
}

export function useCreateProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProviderDto) => aiModelsApi.createProvider(data).then(res => res.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'providers'] });
    },
  });
}

export function useUpdateProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProviderDto }) =>
      aiModelsApi.updateProvider(id, data).then(res => res.data.data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'providers'] });
      queryClient.invalidateQueries({ queryKey: ['ai', 'providers', id] });
    },
  });
}

export function useDeleteProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => aiModelsApi.deleteProvider(id).then(res => res.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'providers'] });
    },
  });
}

// ==================== MODELS ====================

export function useModels(providerId?: string) {
  return useQuery({
    queryKey: ['ai', 'models', { providerId }],
    queryFn: () => aiModelsApi.getModels(providerId).then(res => {
      const models: RawModel[] = res.data.data;
      // Transform API response to match frontend Model interface
      return models.map(transformModel);
    }),
  });
}

export function useModel(id: string) {
  return useQuery({
    queryKey: ['ai', 'models', id],
    queryFn: () => aiModelsApi.getModel(id).then(res => res.data.data),
    enabled: !!id,
  });
}

export function useCreateModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateModelDto) => aiModelsApi.createModel(data).then(res => res.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'models'] });
    },
  });
}

export function useUpdateModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateModelDto }) =>
      aiModelsApi.updateModel(id, data).then(res => res.data.data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'models'] });
      queryClient.invalidateQueries({ queryKey: ['ai', 'models', id] });
    },
  });
}

export function useDeleteModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => aiModelsApi.deleteModel(id).then(res => res.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'models'] });
    },
  });
}

export function useFetchModelsFromProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (providerId: string) =>
      aiModelsApi.fetchModelsFromProvider(providerId).then(res => res.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'models'] });
    },
  });
}

export function useTestConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (providerId: string) => aiModelsApi.testConnection(providerId).then(res => res.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'providers'] });
    },
  });
}

// ==================== API KEYS ====================

export function useApiKeys(providerId?: string) {
  return useQuery({
    queryKey: ['ai', 'api-keys', { providerId }],
    queryFn: () => aiModelsApi.getApiKeys(providerId).then(res => res.data.data),
  });
}

export function useDecryptApiKey() {
  return useMutation({
    mutationFn: (id: string) => aiModelsApi.decryptApiKey(id).then(res => res.data.data.apiKey),
  });
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateApiKeyDto) => aiModelsApi.createApiKey(data).then(res => res.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'api-keys'] });
    },
  });
}

export function useUpdateApiKeyStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      aiModelsApi.updateApiKeyStatus(id, { isActive }).then(res => res.data.data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'api-keys'] });
      queryClient.invalidateQueries({ queryKey: ['ai', 'api-keys', id] });
    },
  });
}

export function useUpdateApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateApiKeyDto }) =>
      aiModelsApi.updateApiKey(id, data).then(res => res.data.data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'api-keys'] });
      queryClient.invalidateQueries({ queryKey: ['ai', 'api-keys', id] });
    },
  });
}

export function useDeleteApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => aiModelsApi.deleteApiKey(id).then(res => res.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'api-keys'] });
    },
  });
}

// ==================== ENDPOINTS ====================

export function useEndpoints(providerId?: string) {
  return useQuery({
    queryKey: ['ai', 'endpoints', { providerId }],
    queryFn: () => aiModelsApi.getEndpoints(providerId).then(res => res.data.data),
  });
}

export function useCreateEndpoint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateEndpointDto) => aiModelsApi.createEndpoint(data).then(res => res.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'endpoints'] });
    },
  });
}

export function useUpdateEndpoint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEndpointDto }) =>
      aiModelsApi.updateEndpoint(id, data).then(res => res.data.data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'endpoints'] });
      queryClient.invalidateQueries({ queryKey: ['ai', 'endpoints', id] });
    },
  });
}

export function useDeleteEndpoint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => aiModelsApi.deleteEndpoint(id).then(res => res.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'endpoints'] });
    },
  });
}

// ==================== MODEL CONFIGS ====================

export function useModelConfigs(modelId?: string) {
  return useQuery({
    queryKey: ['ai', 'model-configs', { modelId }],
    queryFn: () => aiModelsApi.getModelConfigs(modelId).then(res => res.data.data),
  });
}

export function useCreateModelConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateModelConfigDto) => aiModelsApi.createModelConfig(data).then(res => res.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'model-configs'] });
    },
  });
}

export function useUpdateModelConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateModelConfigDto }) =>
      aiModelsApi.updateModelConfig(id, data).then(res => res.data.data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'model-configs'] });
      queryClient.invalidateQueries({ queryKey: ['ai', 'model-configs', id] });
    },
  });
}

export function useDeleteModelConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => aiModelsApi.deleteModelConfig(id).then(res => res.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'model-configs'] });
    },
  });
}

// ==================== DEFAULT MODELS ====================

export function useDefaultModels() {
  return useQuery({
    queryKey: ['ai', 'default-models'],
    queryFn: () => aiModelsApi.getDefaultModels().then(res => res.data.data),
  });
}

export function useCreateDefaultModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDefaultModelDto) => aiModelsApi.createDefaultModel(data).then(res => res.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'default-models'] });
    },
  });
}

export function useUpdateDefaultModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDefaultModelDto }) =>
      aiModelsApi.updateDefaultModel(id, data).then(res => res.data.data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'default-models'] });
      queryClient.invalidateQueries({ queryKey: ['ai', 'default-models', id] });
    },
  });
}

export function useDeleteDefaultModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => aiModelsApi.deleteDefaultModel(id).then(res => res.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'default-models'] });
    },
  });
}

// ==================== TEAM QUOTAS ====================

export function useTeamQuotas(teamId?: string) {
  return useQuery({
    queryKey: ['ai', 'team-quotas', { teamId }],
    queryFn: () => aiModelsApi.getTeamQuotas(teamId).then(res => res.data.data),
  });
}

export function useCreateTeamQuota() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTeamQuotaDto) => aiModelsApi.createTeamQuota(data).then(res => res.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'team-quotas'] });
    },
  });
}

export function useUpdateTeamQuota() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ teamId, data }: { teamId: string; data: UpdateTeamQuotaDto }) =>
      aiModelsApi.updateTeamQuota(teamId, data).then(res => res.data.data),
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'team-quotas'] });
      queryClient.invalidateQueries({ queryKey: ['ai', 'team-quotas', teamId] });
    },
  });
}

export function useResetTeamQuota() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ teamId, type }: { teamId: string; type: 'daily' | 'monthly' }) =>
      aiModelsApi.resetTeamQuota(teamId, type).then(res => res.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'team-quotas'] });
    },
  });
}

export function useDeleteTeamQuota() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (teamId: string) => aiModelsApi.deleteTeamQuota(teamId).then(res => res.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'team-quotas'] });
    },
  });
}

// ==================== USAGE LOGS ====================

export function useUsageLogs(params: { teamId?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['ai', 'usage-logs', params],
    queryFn: () => aiModelsApi.getUsageLogs(params).then(res => res.data.data),
  });
}

export function useUsageStats(params: { teamId?: string; period?: 'day' | 'week' | 'month' }) {
  return useQuery({
    queryKey: ['ai', 'usage-stats', params],
    queryFn: () => aiModelsApi.getUsageStats(params).then(res => res.data.data),
  });
}

// ==================== QUOTA ALERTS ====================

export function useQuotaAlerts() {
  return useQuery({
    queryKey: ['ai', 'quota-alerts'],
    queryFn: async () => {
      const quotas = await aiModelsApi.getTeamQuotas().then(res => res.data.data);
      return quotas.filter((q: QuotaAlertTeamQuota) => {
        const dailyPercent = q.dailyTokenLimit > 0 ? (q.usedToday / q.dailyTokenLimit) * 100 : 0;
        const monthlyPercent = q.monthlyTokenLimit > 0 ? (q.usedThisMonth / q.monthlyTokenLimit) * 100 : 0;
        return dailyPercent > 80 || monthlyPercent > 80;
      });
    },
  });
}