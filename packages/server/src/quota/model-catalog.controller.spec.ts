import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ModelCatalogController } from './model-catalog.controller';
import { QuotaService } from './quota.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';

type QuotaServiceFixture = jest.Mocked<Pick<QuotaService,
  | 'getModelCatalogForTeam'
  | 'selectModel'
>>;

describe('ModelCatalogController', () => {
  let controller: ModelCatalogController;
  let quotaService: QuotaServiceFixture;

  const user = {
    sub: 'user-1',
    teamId: 'team-1',
    role: 'MEMBER',
    type: 'access',
  } as JwtPayload;

  const selectedModel = {
    id: 'model-basic',
    modelName: 'basic',
    displayName: '入门心法',
    description: '基础功法',
    rank: 1,
    costMultiplier: 1,
    requiredPlanLevel: 0,
    isAvailable: true,
    unavailableReason: null,
  } as const;

  beforeEach(() => {
    quotaService = {
      getModelCatalogForTeam: jest.fn(),
      selectModel: jest.fn(),
    };
    controller = new ModelCatalogController(quotaService as unknown as QuotaService);
  });

  it('returns model catalog in a success envelope', async () => {
    quotaService.getModelCatalogForTeam.mockResolvedValue([selectedModel]);

    await expect(controller.getCatalog('team-1', user)).resolves.toEqual({
      success: true,
      data: [selectedModel],
    });
    expect(quotaService.getModelCatalogForTeam).toHaveBeenCalledWith('team-1');
  });

  it('selects a model in a success envelope', async () => {
    quotaService.selectModel.mockResolvedValue(selectedModel);

    await expect(controller.selectModel('team-1', { modelId: 'model-basic', conversationId: 'conv-1' }, user)).resolves.toEqual({
      success: true,
      data: selectedModel,
    });
    expect(quotaService.selectModel).toHaveBeenCalledWith('team-1', 'model-basic', 'conv-1');
  });

  it('selects a team default model when conversationId is omitted', async () => {
    quotaService.selectModel.mockResolvedValue(selectedModel);

    await controller.selectModel('team-1', { modelId: 'model-basic' }, user);

    expect(quotaService.selectModel).toHaveBeenCalledWith('team-1', 'model-basic', undefined);
  });

  it('rejects catalog access for another team without invoking service', async () => {
    await expect(controller.getCatalog('team-2', user)).rejects.toBeInstanceOf(ForbiddenException);
    expect(quotaService.getModelCatalogForTeam).not.toHaveBeenCalled();
  });

  it('rejects selection for another team without invoking service', async () => {
    await expect(controller.selectModel('team-2', { modelId: 'model-basic' }, user)).rejects.toBeInstanceOf(ForbiddenException);
    expect(quotaService.selectModel).not.toHaveBeenCalled();
  });

  it.each([
    null,
    {},
    { modelId: '' },
    { modelId: '   ' },
    { modelId: 123 },
    { modelId: 'x'.repeat(257) },
    { modelId: '../model-basic' },
    { modelId: 'model-basic', conversationId: '' },
    { modelId: 'model-basic', conversationId: '   ' },
    { modelId: 'model-basic', conversationId: 123 },
    { modelId: 'model-basic', conversationId: 'x'.repeat(257) },
    { modelId: 'model-basic', conversationId: '../conv-1' },
  ])('rejects invalid select body %# without invoking service', async (body) => {
    await expect(controller.selectModel('team-1', body, user)).rejects.toBeInstanceOf(BadRequestException);
    expect(quotaService.selectModel).not.toHaveBeenCalled();
  });
});
