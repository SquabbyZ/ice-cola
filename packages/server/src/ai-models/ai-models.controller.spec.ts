import { ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AdminRole } from '../admin-admin/dto/invite.dto';
import { AdminJwtAuthGuard } from '../auth/admin-jwt-auth.guard';
import { ADMIN_ROLES_KEY } from '../common/decorators/admin-roles.decorator';
import { AdminRolesGuard } from '../common/guards/admin-roles.guard';
import type { AiModelsService } from './ai-models.service';
import { AiModelsController } from './ai-models.controller';

type MockAiModelsService = {
  createProvider: jest.Mock;
  findAllProviders: jest.Mock;
  findProviderById: jest.Mock;
  updateProvider: jest.Mock;
  deleteProvider: jest.Mock;
  createModel: jest.Mock;
  findAllModels: jest.Mock;
  findModelsByProvider: jest.Mock;
  findModelById: jest.Mock;
  updateModel: jest.Mock;
  deleteModel: jest.Mock;
  fetchModelsFromProvider: jest.Mock;
  createApiKey: jest.Mock;
  findAllApiKeys: jest.Mock;
  findApiKeysByProvider: jest.Mock;
  updateApiKeyStatus: jest.Mock;
  updateApiKey: jest.Mock;
  deleteApiKey: jest.Mock;
  createEndpoint: jest.Mock;
  findEndpointsByProvider: jest.Mock;
  findEndpointById: jest.Mock;
  updateEndpoint: jest.Mock;
  deleteEndpoint: jest.Mock;
  createModelConfig: jest.Mock;
  findModelConfigsByModel: jest.Mock;
  findModelConfigById: jest.Mock;
  updateModelConfig: jest.Mock;
  deleteModelConfig: jest.Mock;
  createDefaultModel: jest.Mock;
  findAllDefaultModels: jest.Mock;
  findDefaultModelsByProvider: jest.Mock;
  findDefaultModelByUseCase: jest.Mock;
  updateDefaultModel: jest.Mock;
  deleteDefaultModel: jest.Mock;
  createTeamQuota: jest.Mock;
  findTeamQuotaByTeamId: jest.Mock;
  updateTeamQuota: jest.Mock;
  resetTeamQuotaDaily: jest.Mock;
  resetTeamQuotaMonthly: jest.Mock;
  deleteTeamQuota: jest.Mock;
  createUsageLog: jest.Mock;
  findUsageLogsByTeam: jest.Mock;
  getUsageStatsByTeam: jest.Mock;
};

type AdminRequestFixture = {
  user: {
    id: string;
    role: AdminRole;
  };
};

function createController() {
  const service: MockAiModelsService = {
    createProvider: jest.fn().mockResolvedValue({ id: 'provider-1', display_name: 'OpenAI' }),
    findAllProviders: jest.fn().mockResolvedValue({ ok: true }),
    findProviderById: jest.fn().mockResolvedValue({ ok: true }),
    updateProvider: jest.fn().mockResolvedValue({ id: 'provider-1', display_name: 'OpenAI Updated' }),
    deleteProvider: jest.fn().mockResolvedValue({ deleted: true }),
    createModel: jest.fn().mockResolvedValue({ id: 'model-1', model_name: 'gpt-4' }),
    findAllModels: jest.fn().mockResolvedValue({ ok: true }),
    findModelsByProvider: jest.fn().mockResolvedValue({ ok: true }),
    findModelById: jest.fn().mockResolvedValue({ ok: true }),
    updateModel: jest.fn().mockResolvedValue({ id: 'model-1', model_name: 'gpt-4o' }),
    deleteModel: jest.fn().mockResolvedValue({ deleted: true }),
    fetchModelsFromProvider: jest.fn().mockResolvedValue([{ id: 'model-2', model_name: 'gpt-4o' }]),
    createApiKey: jest.fn().mockResolvedValue({ id: 'key-1', key_name: 'primary' }),
    findAllApiKeys: jest.fn().mockResolvedValue({ ok: true }),
    findApiKeysByProvider: jest.fn().mockResolvedValue({ ok: true }),
    updateApiKeyStatus: jest.fn().mockResolvedValue({ id: 'key-1', status: 'active' }),
    updateApiKey: jest.fn().mockResolvedValue({ id: 'key-1', key_name: 'secondary' }),
    deleteApiKey: jest.fn().mockResolvedValue({ deleted: true }),
    createEndpoint: jest.fn().mockResolvedValue({ id: 'endpoint-1' }),
    findEndpointsByProvider: jest.fn().mockResolvedValue({ ok: true }),
    findEndpointById: jest.fn().mockResolvedValue({ ok: true }),
    updateEndpoint: jest.fn().mockResolvedValue({ id: 'endpoint-1', url: 'https://updated.example.test' }),
    deleteEndpoint: jest.fn().mockResolvedValue({ deleted: true }),
    createModelConfig: jest.fn().mockResolvedValue({ id: 'config-1' }),
    findModelConfigsByModel: jest.fn().mockResolvedValue({ ok: true }),
    findModelConfigById: jest.fn().mockResolvedValue({ ok: true }),
    updateModelConfig: jest.fn().mockResolvedValue({ id: 'config-1', temperature: 0.3 }),
    deleteModelConfig: jest.fn().mockResolvedValue({ deleted: true }),
    createDefaultModel: jest.fn().mockResolvedValue({ id: 'default-1' }),
    findAllDefaultModels: jest.fn().mockResolvedValue({ ok: true }),
    findDefaultModelsByProvider: jest.fn().mockResolvedValue({ ok: true }),
    findDefaultModelByUseCase: jest.fn().mockResolvedValue({ ok: true }),
    updateDefaultModel: jest.fn().mockResolvedValue({ id: 'default-1', priority: 2 }),
    deleteDefaultModel: jest.fn().mockResolvedValue({ deleted: true }),
    createTeamQuota: jest.fn().mockResolvedValue({ ok: true }),
    findTeamQuotaByTeamId: jest.fn().mockResolvedValue({ ok: true }),
    updateTeamQuota: jest.fn().mockResolvedValue({ ok: true }),
    resetTeamQuotaDaily: jest.fn().mockResolvedValue({ ok: true }),
    resetTeamQuotaMonthly: jest.fn().mockResolvedValue({ ok: true }),
    deleteTeamQuota: jest.fn().mockResolvedValue({ ok: true }),
    createUsageLog: jest.fn().mockResolvedValue({ ok: true }),
    findUsageLogsByTeam: jest.fn().mockResolvedValue({ ok: true }),
    getUsageStatsByTeam: jest.fn().mockResolvedValue({ ok: true }),
  };

  return {
    controller: new AiModelsController(service as unknown as AiModelsService),
    service,
  };
}

function requestFixture(): AdminRequestFixture {
  return {
    user: {
      id: 'admin-1',
      role: AdminRole.ADMIN,
    },
  };
}

type OwnerOrAdminMethod =
  | 'seed'
  | 'createProvider'
  | 'findAllProviders'
  | 'findProviderById'
  | 'updateProvider'
  | 'deleteProvider'
  | 'createModel'
  | 'findAllModels'
  | 'findModelById'
  | 'updateModel'
  | 'deleteModel'
  | 'fetchModelsFromProvider'
  | 'createApiKey'
  | 'findApiKeys'
  | 'decryptApiKey'
  | 'updateApiKeyStatus'
  | 'updateApiKey'
  | 'deleteApiKey'
  | 'createEndpoint'
  | 'findEndpoints'
  | 'findEndpointById'
  | 'updateEndpoint'
  | 'deleteEndpoint'
  | 'createModelConfig'
  | 'findModelConfigs'
  | 'findModelConfigById'
  | 'updateModelConfig'
  | 'deleteModelConfig'
  | 'createDefaultModel'
  | 'findAllDefaultModels'
  | 'findDefaultModelsByProvider'
  | 'findDefaultModelByUseCase'
  | 'updateDefaultModel'
  | 'deleteDefaultModel'
  | 'createTeamQuota'
  | 'findTeamQuota'
  | 'updateTeamQuota'
  | 'resetTeamQuota'
  | 'deleteTeamQuota'
  | 'createUsageLog'
  | 'findUsageLogs'
  | 'getUsageStats';

describe('AiModelsController authorization metadata', () => {
  it('uses admin-token authentication for admin AI routes', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, AiModelsController);

    expect(guards).toEqual([AdminJwtAuthGuard, AdminRolesGuard]);
  });

  it.each<OwnerOrAdminMethod>([
    'seed',
    'createProvider',
    'findAllProviders',
    'findProviderById',
    'updateProvider',
    'deleteProvider',
    'createModel',
    'findAllModels',
    'findModelById',
    'updateModel',
    'deleteModel',
    'fetchModelsFromProvider',
    'createApiKey',
    'findApiKeys',
    'decryptApiKey',
    'updateApiKeyStatus',
    'updateApiKey',
    'deleteApiKey',
    'createEndpoint',
    'findEndpoints',
    'findEndpointById',
    'updateEndpoint',
    'deleteEndpoint',
    'createModelConfig',
    'findModelConfigs',
    'findModelConfigById',
    'updateModelConfig',
    'deleteModelConfig',
    'createDefaultModel',
    'findAllDefaultModels',
    'findDefaultModelsByProvider',
    'findDefaultModelByUseCase',
    'updateDefaultModel',
    'deleteDefaultModel',
    'createTeamQuota',
    'findTeamQuota',
    'updateTeamQuota',
    'resetTeamQuota',
    'deleteTeamQuota',
    'createUsageLog',
    'findUsageLogs',
    'getUsageStats',
  ])('requires admin owner or admin for %s', (methodName) => {
    const roles = Reflect.getMetadata(ADMIN_ROLES_KEY, AiModelsController.prototype[methodName]);

    expect(roles).toEqual([AdminRole.OWNER, AdminRole.ADMIN]);
  });
});

describe('AiModelsController admin AI configuration routes', () => {
  it('keeps seed disabled from the admin API', async () => {
    const { controller } = createController();

    await expect(controller.seed()).rejects.toThrow(ForbiddenException);
    await expect(controller.seed()).rejects.toThrow('AI model seeding is not available from the admin API');
  });

  it('allows owner or admin provider configuration methods to delegate to the service', async () => {
    const { controller, service } = createController();
    const createBody = { displayName: 'OpenAI' } as never;
    const updateBody = { displayName: 'OpenAI Updated' } as never;

    await expect(controller.createProvider(createBody)).resolves.toEqual({
      success: true,
      data: { id: 'provider-1', displayName: 'OpenAI' },
    });
    await expect(controller.findAllProviders()).resolves.toEqual({ success: true, data: { ok: true } });
    await expect(controller.findProviderById('provider-1')).resolves.toEqual({ success: true, data: { ok: true } });
    await expect(controller.updateProvider('provider-1', updateBody)).resolves.toEqual({
      success: true,
      data: { id: 'provider-1', displayName: 'OpenAI Updated' },
    });
    await expect(controller.deleteProvider('provider-1')).resolves.toEqual({ success: true, data: { deleted: true } });

    expect(service.createProvider).toHaveBeenCalledWith(createBody);
    expect(service.findAllProviders).toHaveBeenCalledWith();
    expect(service.findProviderById).toHaveBeenCalledWith('provider-1');
    expect(service.updateProvider).toHaveBeenCalledWith('provider-1', updateBody);
    expect(service.deleteProvider).toHaveBeenCalledWith('provider-1');
  });

  it('allows owner or admin model methods to delegate to the service', async () => {
    const { controller, service } = createController();
    const createBody = { modelName: 'gpt-4' } as never;
    const updateBody = { modelName: 'gpt-4o' } as never;

    await expect(controller.createModel(createBody)).resolves.toEqual({
      success: true,
      data: { id: 'model-1', modelName: 'gpt-4' },
    });
    await expect(controller.findAllModels()).resolves.toEqual({ success: true, data: { ok: true } });
    await expect(controller.findAllModels('provider-1')).resolves.toEqual({ success: true, data: { ok: true } });
    await expect(controller.findModelById('model-1')).resolves.toEqual({ success: true, data: { ok: true } });
    await expect(controller.updateModel('model-1', updateBody)).resolves.toEqual({
      success: true,
      data: { id: 'model-1', modelName: 'gpt-4o' },
    });
    await expect(controller.deleteModel('model-1')).resolves.toEqual({ success: true, data: { deleted: true } });
    await expect(controller.fetchModelsFromProvider('provider-1')).resolves.toEqual({
      success: true,
      data: [{ id: 'model-2', modelName: 'gpt-4o' }],
    });

    expect(service.createModel).toHaveBeenCalledWith(createBody);
    expect(service.findAllModels).toHaveBeenCalledWith();
    expect(service.findModelsByProvider).toHaveBeenCalledWith('provider-1');
    expect(service.findModelById).toHaveBeenCalledWith('model-1');
    expect(service.updateModel).toHaveBeenCalledWith('model-1', updateBody);
    expect(service.deleteModel).toHaveBeenCalledWith('model-1');
    expect(service.fetchModelsFromProvider).toHaveBeenCalledWith('provider-1');
  });

  it('allows owner or admin API key methods to delegate to the service', async () => {
    const { controller, service } = createController();
    const req = requestFixture();
    const apiKeyBody = { keyName: 'primary' } as never;
    const statusBody = { status: 'active' } as never;
    const updateBody = { keyName: 'secondary' } as never;

    await expect(controller.createApiKey(apiKeyBody, req)).resolves.toEqual({
      success: true,
      data: { id: 'key-1', keyName: 'primary' },
    });
    await expect(controller.findApiKeys()).resolves.toEqual({ success: true, data: { ok: true } });
    await expect(controller.findApiKeys('provider-1')).resolves.toEqual({ success: true, data: { ok: true } });
    await expect(controller.updateApiKeyStatus('key-1', statusBody)).resolves.toEqual({
      success: true,
      data: { id: 'key-1', status: 'active' },
    });
    await expect(controller.updateApiKey('key-1', updateBody)).resolves.toEqual({
      success: true,
      data: { id: 'key-1', keyName: 'secondary' },
    });
    await expect(controller.deleteApiKey('key-1')).resolves.toEqual({ success: true, data: { deleted: true } });

    expect(service.createApiKey).toHaveBeenCalledWith(apiKeyBody, 'admin-1');
    expect(service.findAllApiKeys).toHaveBeenCalledWith();
    expect(service.findApiKeysByProvider).toHaveBeenCalledWith('provider-1');
    expect(service.updateApiKeyStatus).toHaveBeenCalledWith('key-1', statusBody);
    expect(service.updateApiKey).toHaveBeenCalledWith('key-1', updateBody);
    expect(service.deleteApiKey).toHaveBeenCalledWith('key-1');
  });

  it('allows owner or admin endpoint methods to delegate to the service', async () => {
    const { controller, service } = createController();
    const createBody = { url: 'https://example.test' } as never;
    const updateBody = { url: 'https://updated.example.test' } as never;

    await expect(controller.createEndpoint(createBody)).resolves.toEqual({ success: true, data: { id: 'endpoint-1' } });
    await expect(controller.findEndpoints('provider-1')).resolves.toEqual({ success: true, data: { ok: true } });
    await expect(controller.findEndpointById('endpoint-1')).resolves.toEqual({ success: true, data: { ok: true } });
    await expect(controller.updateEndpoint('endpoint-1', updateBody)).resolves.toEqual({
      success: true,
      data: { id: 'endpoint-1', url: 'https://updated.example.test' },
    });
    await expect(controller.deleteEndpoint('endpoint-1')).resolves.toEqual({ success: true, data: { deleted: true } });

    expect(service.createEndpoint).toHaveBeenCalledWith(createBody);
    expect(service.findEndpointsByProvider).toHaveBeenCalledWith('provider-1');
    expect(service.findEndpointById).toHaveBeenCalledWith('endpoint-1');
    expect(service.updateEndpoint).toHaveBeenCalledWith('endpoint-1', updateBody);
    expect(service.deleteEndpoint).toHaveBeenCalledWith('endpoint-1');
  });

  it('allows owner or admin model config methods to delegate to the service', async () => {
    const { controller, service } = createController();
    const createBody = { modelId: 'model-1' } as never;
    const updateBody = { temperature: 0.3 } as never;

    await expect(controller.createModelConfig(createBody)).resolves.toEqual({ success: true, data: { id: 'config-1' } });
    await expect(controller.findModelConfigs('model-1')).resolves.toEqual({ success: true, data: { ok: true } });
    await expect(controller.findModelConfigById('config-1')).resolves.toEqual({ success: true, data: { ok: true } });
    await expect(controller.updateModelConfig('config-1', updateBody)).resolves.toEqual({
      success: true,
      data: { id: 'config-1', temperature: 0.3 },
    });
    await expect(controller.deleteModelConfig('config-1')).resolves.toEqual({ success: true, data: { deleted: true } });

    expect(service.createModelConfig).toHaveBeenCalledWith(createBody);
    expect(service.findModelConfigsByModel).toHaveBeenCalledWith('model-1');
    expect(service.findModelConfigById).toHaveBeenCalledWith('config-1');
    expect(service.updateModelConfig).toHaveBeenCalledWith('config-1', updateBody);
    expect(service.deleteModelConfig).toHaveBeenCalledWith('config-1');
  });

  it('allows owner or admin default model methods to delegate to the service', async () => {
    const { controller, service } = createController();
    const createBody = { providerId: 'provider-1', useCase: 'chat' } as never;
    const updateBody = { priority: 2 } as never;

    await expect(controller.createDefaultModel(createBody)).resolves.toEqual({ success: true, data: { id: 'default-1' } });
    await expect(controller.findAllDefaultModels()).resolves.toEqual({ success: true, data: { ok: true } });
    await expect(controller.findDefaultModelsByProvider('provider-1')).resolves.toEqual({ success: true, data: { ok: true } });
    await expect(controller.findDefaultModelByUseCase('chat')).resolves.toEqual({ success: true, data: { ok: true } });
    await expect(controller.updateDefaultModel('default-1', updateBody)).resolves.toEqual({
      success: true,
      data: { id: 'default-1', priority: 2 },
    });
    await expect(controller.deleteDefaultModel('default-1')).resolves.toEqual({ success: true, data: { deleted: true } });

    expect(service.createDefaultModel).toHaveBeenCalledWith(createBody);
    expect(service.findAllDefaultModels).toHaveBeenCalledWith();
    expect(service.findDefaultModelsByProvider).toHaveBeenCalledWith('provider-1');
    expect(service.findDefaultModelByUseCase).toHaveBeenCalledWith('chat');
    expect(service.updateDefaultModel).toHaveBeenCalledWith('default-1', updateBody);
    expect(service.deleteDefaultModel).toHaveBeenCalledWith('default-1');
  });

  it('keeps API key plaintext export blocked', async () => {
    const { controller } = createController();

    await expect(controller.decryptApiKey()).rejects.toThrow(ForbiddenException);
    await expect(controller.decryptApiKey()).rejects.toThrow('API key plaintext export is not allowed');
  });
});

describe('AiModelsController admin usage management routes', () => {
  it('allows owner or admin team quota methods to delegate to the service', async () => {
    const { controller, service } = createController();
    const createBody = { teamId: 'team-2' } as never;
    const updateBody = { dailyLimit: 100 } as never;

    await expect(controller.createTeamQuota(createBody)).resolves.toEqual({ success: true, data: { ok: true } });
    await expect(controller.findTeamQuota('team-2')).resolves.toEqual({ success: true, data: { ok: true } });
    await expect(controller.updateTeamQuota('team-2', updateBody)).resolves.toEqual({ success: true, data: { ok: true } });
    await expect(controller.resetTeamQuota('team-2', { type: 'daily' })).resolves.toEqual({ success: true, data: { ok: true } });
    await expect(controller.resetTeamQuota('team-2', { type: 'monthly' })).resolves.toEqual({ success: true, data: { ok: true } });
    await expect(controller.deleteTeamQuota('team-2')).resolves.toEqual({ success: true, data: { ok: true } });

    expect(service.createTeamQuota).toHaveBeenCalledWith(createBody);
    expect(service.findTeamQuotaByTeamId).toHaveBeenCalledWith('team-2');
    expect(service.updateTeamQuota).toHaveBeenCalledWith('team-2', updateBody);
    expect(service.resetTeamQuotaDaily).toHaveBeenCalledWith('team-2');
    expect(service.resetTeamQuotaMonthly).toHaveBeenCalledWith('team-2');
    expect(service.deleteTeamQuota).toHaveBeenCalledWith('team-2');
  });

  it('allows owner or admin usage log methods to delegate to the service', async () => {
    const { controller, service } = createController();
    const createBody = { teamId: 'team-2', modelId: 'model-1', providerId: 'provider-1' } as never;

    await expect(controller.createUsageLog(createBody)).resolves.toEqual({ success: true, data: { ok: true } });
    await expect(controller.findUsageLogs('team-2')).resolves.toEqual({ success: true, data: { ok: true } });
    await expect(controller.findUsageLogs('team-2', 25, 50)).resolves.toEqual({ success: true, data: { ok: true } });
    await expect(controller.getUsageStats('team-2')).resolves.toEqual({ success: true, data: { ok: true } });
    await expect(controller.getUsageStats('team-2', 'week')).resolves.toEqual({ success: true, data: { ok: true } });

    expect(service.createUsageLog).toHaveBeenCalledWith(createBody);
    expect(service.findUsageLogsByTeam).toHaveBeenCalledWith('team-2', 100, 0);
    expect(service.findUsageLogsByTeam).toHaveBeenCalledWith('team-2', 25, 50);
    expect(service.getUsageStatsByTeam).toHaveBeenCalledWith('team-2', 'month');
    expect(service.getUsageStatsByTeam).toHaveBeenCalledWith('team-2', 'week');
  });
});
