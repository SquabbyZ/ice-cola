import { Test, TestingModule } from '@nestjs/testing';
import { OrchestratorServiceImpl } from './orchestrator.service';
import { DatabaseService } from '../../database/database.service';
import { ToolRegistryImpl } from '../tools/tool-registry';

describe('OrchestratorServiceImpl', () => {
  let service: OrchestratorServiceImpl;
  let db: jest.Mocked<DatabaseService>;
  let toolRegistry: ToolRegistryImpl;

  const mockTool = {
    name: 'test-tool',
    execute: jest.fn().mockResolvedValue({ result: 'success' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrchestratorServiceImpl,
        {
          provide: DatabaseService,
          useValue: {
            updateTaskPlanStatus: jest.fn(),
            updateTaskPlanData: jest.fn(),
          },
        },
        ToolRegistryImpl,
      ],
    }).compile();

    service = module.get<OrchestratorServiceImpl>(OrchestratorServiceImpl);
    db = module.get(DatabaseService);
    toolRegistry = module.get<ToolRegistryImpl>(ToolRegistryImpl);
  });

  describe('executeStep', () => {
    it('executes step with valid tool', async () => {
      toolRegistry.register(mockTool as any);

      const step = {
        id: 'step-1',
        order: 1,
        description: 'Test step',
        toolName: 'test-tool',
        input: { data: 'test' },
        status: 'pending' as const,
      };

      const result = await service.executeStep(step);

      expect(result.status).toBe('completed');
      expect(result.output).toEqual({ result: 'success' });
      expect(mockTool.execute).toHaveBeenCalledWith({ data: 'test' });
    });

    it('fails step when tool not found', async () => {
      const step = {
        id: 'step-1',
        order: 1,
        description: 'Test step',
        toolName: 'nonexistent-tool',
        input: {},
        status: 'pending' as const,
      };

      const result = await service.executeStep(step);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('not found');
    });

    it('fails step when tool execution throws', async () => {
      const failingTool = {
        name: 'failing-tool',
        execute: jest.fn().mockRejectedValue(new Error('Execution failed')),
      };
      toolRegistry.register(failingTool as any);

      const step = {
        id: 'step-1',
        order: 1,
        description: 'Failing step',
        toolName: 'failing-tool',
        input: {},
        status: 'pending' as const,
      };

      const result = await service.executeStep(step);

      expect(result.status).toBe('failed');
      expect(result.error).toBe('Execution failed');
    });
  });

  describe('executePlan', () => {
    it('executes all steps in order', async () => {
      toolRegistry.register(mockTool as any);
      db.updateTaskPlanStatus.mockResolvedValue(undefined);
      db.updateTaskPlanData.mockResolvedValue(undefined);

      const plan = {
        id: 'plan-1',
        conversationId: 'conv-1',
        userInput: 'Test input',
        steps: [
          {
            id: 'step-1',
            order: 1,
            description: 'Step 1',
            toolName: 'test-tool',
            input: { data: '1' },
            status: 'pending' as const,
          },
          {
            id: 'step-2',
            order: 2,
            description: 'Step 2',
            toolName: 'test-tool',
            input: { data: '2' },
            status: 'pending' as const,
          },
        ],
        status: 'planning' as const,
        createdAt: new Date(),
      };

      const result = await service.executePlan(plan);

      expect(result.steps[0].status).toBe('completed');
      expect(result.steps[1].status).toBe('completed');
      expect(db.updateTaskPlanStatus).toHaveBeenCalledWith('plan-1', 'completed');
    });

    it('stops execution when step fails', async () => {
      const failingTool = {
        name: 'failing-tool',
        execute: jest.fn().mockRejectedValue(new Error('Failed')),
      };
      toolRegistry.register(failingTool as any);
      db.updateTaskPlanStatus.mockResolvedValue(undefined);
      db.updateTaskPlanData.mockResolvedValue(undefined);

      const plan = {
        id: 'plan-1',
        conversationId: 'conv-1',
        userInput: 'Test input',
        steps: [
          {
            id: 'step-1',
            order: 1,
            description: 'Step 1',
            toolName: 'failing-tool',
            input: {},
            status: 'pending' as const,
          },
          {
            id: 'step-2',
            order: 2,
            description: 'Step 2',
            toolName: 'test-tool',
            input: {},
            status: 'pending' as const,
          },
        ],
        status: 'planning' as const,
        createdAt: new Date(),
      };

      const result = await service.executePlan(plan);

      expect(result.steps[0].status).toBe('failed');
      expect(result.steps[1].status).toBe('pending'); // Not executed
    });
  });

  describe('getToolRegistry', () => {
    it('returns tool registry instance', () => {
      const registry = service.getToolRegistry();

      expect(registry).toBe(toolRegistry);
    });
  });

  describe('registerDefaultTools', () => {
    it('registers tools with the registry', () => {
      const customTool = {
        name: 'custom-tool',
        execute: jest.fn(),
      };

      service.registerDefaultTools([customTool as any]);

      const retrieved = toolRegistry.get('custom-tool');
      expect(retrieved).toBeDefined();
    });
  });
});