import { ForbiddenException } from '@nestjs/common';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { TeamRole } from '../quota/quota.service';
import type { AiModelsService } from './ai-models.service';
import { AiModelsController } from './ai-models.controller';

type MockAiModelsService = {
  findAllProviders: jest.Mock;
  findProviderById: jest.Mock;
  findAllModels: jest.Mock;
  findModelsByProvider: jest.Mock;
  findModelById: jest.Mock;
  findAllApiKeys: jest.Mock;
  findApiKeysByProvider: jest.Mock;
  findEndpointsByProvider: jest.Mock;
  findEndpointById: jest.Mock;
  findModelConfigsByModel: jest.Mock;
  findModelConfigById: jest.Mock;
  findAllDefaultModels: jest.Mock;
  findDefaultModelsByProvider: jest.Mock;
  findDefaultModelByUseCase: jest.Mock;
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
    teamId?: string;
    role: TeamRole;
  };
};

function createController() {
  const service: MockAiModelsService = {
    findAllProviders: jest.fn().mockResolvedValue({ ok: true }),
    findProviderById: jest.fn().mockResolvedValue({ ok: true }),
    findAllModels: jest.fn().mockResolvedValue({ ok: true }),
    findModelsByProvider: jest.fn().mockResolvedValue({ ok: true }),
    findModelById: jest.fn().mockResolvedValue({ ok: true }),
    findAllApiKeys: jest.fn().mockResolvedValue({ ok: true }),
    findApiKeysByProvider: jest.fn().mockResolvedValue({ ok: true }),
    findEndpointsByProvider: jest.fn().mockResolvedValue({ ok: true }),
    findEndpointById: jest.fn().mockResolvedValue({ ok: true }),
    findModelConfigsByModel: jest.fn().mockResolvedValue({ ok: true }),
    findModelConfigById: jest.fn().mockResolvedValue({ ok: true }),
    findAllDefaultModels: jest.fn().mockResolvedValue({ ok: true }),
    findDefaultModelsByProvider: jest.fn().mockResolvedValue({ ok: true }),
    findDefaultModelByUseCase: jest.fn().mockResolvedValue({ ok: true }),
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

function requestFixture(teamId = 'team-1'): AdminRequestFixture {
  return {
    user: {
      id: 'user-1',
      teamId,
      role: TeamRole.ADMIN,
    },
  };
}

type AdminMutationMethod =
  | 'createEndpoint'
  | 'updateEndpoint'
  | 'deleteEndpoint'
  | 'createModelConfig'
  | 'updateModelConfig'
  | 'deleteModelConfig'
  | 'createDefaultModel'
  | 'updateDefaultModel'
  | 'deleteDefaultModel'
  | 'createTeamQuota'
  | 'updateTeamQuota'
  | 'resetTeamQuota'
  | 'deleteTeamQuota'
  | 'createUsageLog';

describe('AiModelsController authorization metadata', () => {
  it.each<AdminMutationMethod>([
    'createEndpoint',
    'updateEndpoint',
    'deleteEndpoint',
    'createModelConfig',
    'updateModelConfig',
    'deleteModelConfig',
    'createDefaultModel',
    'updateDefaultModel',
    'deleteDefaultModel',
    'createTeamQuota',
    'updateTeamQuota',
    'resetTeamQuota',
    'deleteTeamQuota',
    'createUsageLog',
  ])('requires owner or admin for %s', (methodName) => {
    const roles = Reflect.getMetadata(ROLES_KEY, AiModelsController.prototype[methodName]);

    expect(roles).toEqual([TeamRole.OWNER, TeamRole.ADMIN]);
  });
});

describe('AiModelsController platform scoping', () => {
  it('rejects team admins from global AI configuration writes', async () => {
    const { controller } = createController();
    const req = requestFixture('team-1');

    await expect(controller.createProvider({} as never)).rejects.toThrow(ForbiddenException);
    await expect(controller.createModel({} as never)).rejects.toThrow(ForbiddenException);
    await expect(controller.createEndpoint({} as never)).rejects.toThrow(ForbiddenException);
    await expect(controller.createModelConfig({} as never)).rejects.toThrow(ForbiddenException);
    await expect(controller.createDefaultModel({} as never)).rejects.toThrow(ForbiddenException);
    await expect(controller.createApiKey({} as never, req)).rejects.toThrow(ForbiddenException);
    await expect(controller.decryptApiKey()).rejects.toThrow(ForbiddenException);
  });

  it('rejects team admins from global AI configuration reads', async () => {
    const { controller, service } = createController();

    await expect(controller.findAllProviders()).rejects.toThrow(ForbiddenException);
    await expect(controller.findProviderById('provider-1')).rejects.toThrow(ForbiddenException);
    await expect(controller.findAllModels()).rejects.toThrow(ForbiddenException);
    await expect(controller.findAllModels('provider-1')).rejects.toThrow(ForbiddenException);
    await expect(controller.findModelById('model-1')).rejects.toThrow(ForbiddenException);
    await expect(controller.findApiKeys()).rejects.toThrow(ForbiddenException);
    await expect(controller.findApiKeys('provider-1')).rejects.toThrow(ForbiddenException);
    await expect(controller.findEndpoints('provider-1')).rejects.toThrow(ForbiddenException);
    await expect(controller.findEndpointById('endpoint-1')).rejects.toThrow(ForbiddenException);
    await expect(controller.findModelConfigs('model-1')).rejects.toThrow(ForbiddenException);
    await expect(controller.findModelConfigById('config-1')).rejects.toThrow(ForbiddenException);
    await expect(controller.findAllDefaultModels()).rejects.toThrow(ForbiddenException);
    await expect(controller.findDefaultModelsByProvider('provider-1')).rejects.toThrow(ForbiddenException);
    await expect(controller.findDefaultModelByUseCase('chat')).rejects.toThrow(ForbiddenException);

    expect(service.findAllProviders).not.toHaveBeenCalled();
    expect(service.findProviderById).not.toHaveBeenCalled();
    expect(service.findAllModels).not.toHaveBeenCalled();
    expect(service.findModelsByProvider).not.toHaveBeenCalled();
    expect(service.findModelById).not.toHaveBeenCalled();
    expect(service.findAllApiKeys).not.toHaveBeenCalled();
    expect(service.findApiKeysByProvider).not.toHaveBeenCalled();
    expect(service.findEndpointsByProvider).not.toHaveBeenCalled();
    expect(service.findEndpointById).not.toHaveBeenCalled();
    expect(service.findModelConfigsByModel).not.toHaveBeenCalled();
    expect(service.findModelConfigById).not.toHaveBeenCalled();
    expect(service.findAllDefaultModels).not.toHaveBeenCalled();
    expect(service.findDefaultModelsByProvider).not.toHaveBeenCalled();
    expect(service.findDefaultModelByUseCase).not.toHaveBeenCalled();
  });
});

describe('AiModelsController team scoping', () => {
  it('rejects creating team quota for another team', async () => {
    const { controller, service } = createController();

    await expect(controller.createTeamQuota({ teamId: 'team-2' }, requestFixture('team-1'))).rejects.toThrow(ForbiddenException);

    expect(service.createTeamQuota).not.toHaveBeenCalled();
  });

  it('rejects reading team quota for another team', async () => {
    const { controller, service } = createController();

    await expect(controller.findTeamQuota('team-2', requestFixture('team-1'))).rejects.toThrow(ForbiddenException);

    expect(service.findTeamQuotaByTeamId).not.toHaveBeenCalled();
  });

  it('rejects updating team quota for another team', async () => {
    const { controller, service } = createController();

    await expect(controller.updateTeamQuota('team-2', {}, requestFixture('team-1'))).rejects.toThrow(ForbiddenException);

    expect(service.updateTeamQuota).not.toHaveBeenCalled();
  });

  it('rejects resetting team quota for another team', async () => {
    const { controller, service } = createController();

    await expect(controller.resetTeamQuota('team-2', { type: 'daily' }, requestFixture('team-1'))).rejects.toThrow(ForbiddenException);

    expect(service.resetTeamQuotaDaily).not.toHaveBeenCalled();
    expect(service.resetTeamQuotaMonthly).not.toHaveBeenCalled();
  });

  it('rejects deleting team quota for another team', async () => {
    const { controller, service } = createController();

    await expect(controller.deleteTeamQuota('team-2', requestFixture('team-1'))).rejects.toThrow(ForbiddenException);

    expect(service.deleteTeamQuota).not.toHaveBeenCalled();
  });

  it('rejects creating usage logs for another team', async () => {
    const { controller, service } = createController();

    await expect(controller.createUsageLog({ teamId: 'team-2', modelId: 'model-1', providerId: 'provider-1' }, requestFixture('team-1'))).rejects.toThrow(ForbiddenException);

    expect(service.createUsageLog).not.toHaveBeenCalled();
  });

  it('rejects listing usage logs for another team', async () => {
    const { controller, service } = createController();

    await expect(controller.findUsageLogs('team-2', undefined, undefined, requestFixture('team-1'))).rejects.toThrow(ForbiddenException);

    expect(service.findUsageLogsByTeam).not.toHaveBeenCalled();
  });

  it('rejects usage stats for another team', async () => {
    const { controller, service } = createController();

    await expect(controller.getUsageStats('team-2', 'month', requestFixture('team-1'))).rejects.toThrow(ForbiddenException);

    expect(service.getUsageStatsByTeam).not.toHaveBeenCalled();
  });
});
