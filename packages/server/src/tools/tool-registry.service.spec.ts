import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ToolRegistryService } from './tool-registry.service';
import { ToolType, ToolStatus, ToolDefinition } from './dto/tool.dto';

describe('ToolRegistryService', () => {
  let service: ToolRegistryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ToolRegistryService],
    }).compile();

    service = module.get<ToolRegistryService>(ToolRegistryService);
  });

  const createMockTool = (overrides?: Partial<ToolDefinition>): ToolDefinition => ({
    id: 'tool-1',
    name: 'test_tool',
    description: 'A test tool',
    type: ToolType.OPENCLAW_TOOL,
    status: ToolStatus.ACTIVE,
    mcpConfig: null,
    openclawConfig: { module: 'test', function: 'test' },
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  describe('registerTool', () => {
    it('registers a new tool', async () => {
      const dto = {
        name: 'new_tool',
        description: 'A new tool',
        type: ToolType.OPENCLAW_TOOL,
        openclawConfig: { module: 'test', function: 'test' },
      };

      const result = await service.registerTool(dto);

      expect(result.name).toBe('new_tool');
      expect(result.id).toBeDefined();
      expect(result.status).toBe(ToolStatus.ACTIVE);
    });
  });

  describe('getTools', () => {
    it('returns all tools', async () => {
      const result = await service.getTools();

      expect(result.tools).toBeDefined();
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('filters tools by type', async () => {
      const result = await service.getTools({ type: ToolType.MCP_SERVER });

      result.tools.forEach((tool) => {
        expect(tool.type).toBe(ToolType.MCP_SERVER);
      });
    });

    it('filters tools by status', async () => {
      const result = await service.getTools({ status: ToolStatus.ACTIVE });

      result.tools.forEach((tool) => {
        expect(tool.status).toBe(ToolStatus.ACTIVE);
      });
    });

    it('filters tools by search term', async () => {
      const result = await service.getTools({ search: 'web' });

      result.tools.forEach((tool) => {
        const matchesSearch =
          tool.name.toLowerCase().includes('web') ||
          tool.description.toLowerCase().includes('web');
        expect(matchesSearch).toBe(true);
      });
    });

    it('returns paginated results', async () => {
      const result = await service.getTools({ offset: 0, limit: 2 });

      expect(result.tools.length).toBeLessThanOrEqual(2);
    });
  });

  describe('getToolById', () => {
    it('returns tool when found', async () => {
      const tools = await service.getTools();
      if (tools.tools.length > 0) {
        const result = await service.getToolById(tools.tools[0].id);
        expect(result.id).toBe(tools.tools[0].id);
      }
    });

    it('throws NotFoundException when not found', async () => {
      await expect(service.getToolById('nonexistent-id'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('getToolByName', () => {
    it('returns tool when found', async () => {
      const tools = await service.getTools();
      if (tools.tools.length > 0) {
        const result = await service.getToolByName(tools.tools[0].name);
        expect(result.name).toBe(tools.tools[0].name);
      }
    });

    it('throws NotFoundException when not found', async () => {
      await expect(service.getToolByName('nonexistent-tool'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('updateTool', () => {
    it('updates tool name', async () => {
      const tools = await service.getTools();
      if (tools.tools.length > 0) {
        const toolId = tools.tools[0].id;
        const result = await service.updateTool(toolId, { name: 'updated_name' });
        expect(result.name).toBe('updated_name');
      }
    });

    it('updates tool description', async () => {
      const tools = await service.getTools();
      if (tools.tools.length > 0) {
        const toolId = tools.tools[0].id;
        const result = await service.updateTool(toolId, { description: 'updated description' });
        expect(result.description).toBe('updated description');
      }
    });

    it('updates tool status', async () => {
      const tools = await service.getTools();
      if (tools.tools.length > 0) {
        const toolId = tools.tools[0].id;
        const result = await service.updateTool(toolId, { status: ToolStatus.INACTIVE });
        expect(result.status).toBe(ToolStatus.INACTIVE);
      }
    });

    it('throws NotFoundException when tool not found', async () => {
      await expect(service.updateTool('nonexistent-id', { name: 'test' }))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteTool', () => {
    it('deletes tool', async () => {
      const dto = {
        name: 'tool_to_delete',
        description: 'A tool to delete',
        type: ToolType.OPENCLAW_TOOL,
        openclawConfig: { module: 'test', function: 'test' },
      };
      const newTool = await service.registerTool(dto);

      await expect(service.deleteTool(newTool.id)).resolves.not.toThrow();

      await expect(service.getToolById(newTool.id))
        .rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when tool not found', async () => {
      await expect(service.deleteTool('nonexistent-id'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('toggleToolStatus', () => {
    it('toggles tool status from ACTIVE to INACTIVE', async () => {
      const tools = await service.getTools();
      if (tools.tools.length > 0) {
        const tool = tools.tools.find(t => t.status === ToolStatus.ACTIVE);
        if (tool) {
          const result = await service.toggleToolStatus(tool.id);
          expect(result.status).toBe(ToolStatus.INACTIVE);
        }
      }
    });

    it('toggles tool status from INACTIVE to ACTIVE', async () => {
      const tools = await service.getTools();
      if (tools.tools.length > 0) {
        const tool = tools.tools.find(t => t.status === ToolStatus.INACTIVE);
        if (tool) {
          const result = await service.toggleToolStatus(tool.id);
          expect(result.status).toBe(ToolStatus.ACTIVE);
        }
      }
    });
  });

  describe('getCategories', () => {
    it('returns list of categories', async () => {
      const result = await service.getCategories();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getStats', () => {
    it('returns tool statistics', async () => {
      const result = await service.getStats();

      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.byType).toBeDefined();
      expect(result.byStatus).toBeDefined();
    });
  });
});