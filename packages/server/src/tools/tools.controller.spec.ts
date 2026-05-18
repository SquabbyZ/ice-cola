import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { ToolsController } from './tools.controller';
import { ToolRegistryService } from './tool-registry.service';
import { ToolsModule } from './tools.module';
import { ToolStatus, ToolType } from './dto/tool.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { TeamRole } from '../quota/quota.service';

describe('ToolsController', () => {
  let controller: ToolsController;
  let service: jest.Mocked<Pick<ToolRegistryService,
    | 'registerTool'
    | 'getTools'
    | 'getStats'
    | 'getCategories'
    | 'getToolById'
    | 'updateTool'
    | 'toggleToolStatus'
    | 'deleteTool'
  >>;

  beforeEach(async () => {
    service = {
      registerTool: jest.fn(),
      getTools: jest.fn(),
      getStats: jest.fn(),
      getCategories: jest.fn(),
      getToolById: jest.fn(),
      updateTool: jest.fn(),
      toggleToolStatus: jest.fn(),
      deleteTool: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ToolsController],
      providers: [
        { provide: ToolRegistryService, useValue: service },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<ToolsController>(ToolsController);
  });

  it('requires authenticated admins at the controller boundary', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, ToolsController)).toEqual([JwtAuthGuard, RolesGuard]);
    expect(Reflect.getMetadata(ROLES_KEY, ToolsController)).toEqual([TeamRole.OWNER, TeamRole.ADMIN]);
  });

  it('compiles with real guard dependencies', async () => {
    await expect(Test.createTestingModule({
      imports: [ToolsModule],
    }).compile()).resolves.toBeDefined();
  });

  it('returns tool stats through the service', async () => {
    service.getStats.mockResolvedValue({ total: 1, byType: { [ToolType.OPENCLAW_TOOL]: 1 }, byStatus: { [ToolStatus.ACTIVE]: 1 } });

    await expect(controller.getStats()).resolves.toEqual({
      success: true,
      data: { total: 1, byType: { [ToolType.OPENCLAW_TOOL]: 1 }, byStatus: { [ToolStatus.ACTIVE]: 1 } },
    });
  });

  it('registers tools through the service', async () => {
    service.registerTool.mockResolvedValue({
      id: 'tool-1',
      name: 'tool',
      description: 'desc',
      type: ToolType.OPENCLAW_TOOL,
      status: ToolStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(controller.registerTool({
      name: 'tool',
      description: 'desc',
      type: ToolType.OPENCLAW_TOOL,
    })).resolves.toEqual(expect.objectContaining({
      success: true,
      data: expect.objectContaining({ name: 'tool' }),
    }));
  });
});
