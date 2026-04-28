import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  ToolDefinition,
  RegisterToolDto,
  UpdateToolDto,
  QueryToolsDto,
  ToolType,
  ToolStatus,
} from './dto/tool.dto';

@Injectable()
export class ToolRegistryService {
  private readonly logger = new Logger(ToolRegistryService.name);
  private tools: Map<string, ToolDefinition> = new Map();

  constructor() {
    // 初始化一些默认工具
    this.initializeDefaultTools();
  }

  /**
   * 注册新工具
   */
  async registerTool(dto: RegisterToolDto): Promise<ToolDefinition> {
    const id = uuidv4();
    const now = new Date();

    const tool: ToolDefinition = {
      id,
      name: dto.name,
      description: dto.description,
      type: dto.type,
      status: ToolStatus.ACTIVE,
      mcpConfig: dto.mcpConfig,
      openclawConfig: dto.openclawConfig,
      metadata: dto.metadata || {},
      createdAt: now,
      updatedAt: now,
    };

    this.tools.set(id, tool);
    this.logger.log(`Tool registered: ${tool.name} (${id})`);

    return tool;
  }

  /**
   * 获取所有工具列表
   */
  async getTools(query?: QueryToolsDto): Promise<{
    tools: ToolDefinition[];
    total: number;
  }> {
    let filtered = Array.from(this.tools.values());

    // 应用过滤条件
    if (query?.type) {
      filtered = filtered.filter((t) => t.type === query.type);
    }

    if (query?.status) {
      filtered = filtered.filter((t) => t.status === query.status);
    }

    if (query?.category && query.category !== 'all') {
      filtered = filtered.filter(
        (t) => t.metadata?.category === query.category,
      );
    }

    if (query?.search) {
      const searchLower = query.search.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(searchLower) ||
          t.description.toLowerCase().includes(searchLower),
      );
    }

    const total = filtered.length;

    // 分页
    const offset = query?.offset || 0;
    const limit = query?.limit || 50;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      tools: paginated,
      total,
    };
  }

  /**
   * 根据 ID 获取工具
   */
  async getToolById(id: string): Promise<ToolDefinition> {
    const tool = this.tools.get(id);
    if (!tool) {
      throw new NotFoundException(`Tool with id ${id} not found`);
    }
    return tool;
  }

  /**
   * 根据名称获取工具
   */
  async getToolByName(name: string): Promise<ToolDefinition> {
    const tool = Array.from(this.tools.values()).find(
      (t) => t.name === name,
    );
    if (!tool) {
      throw new NotFoundException(`Tool with name ${name} not found`);
    }
    return tool;
  }

  /**
   * 更新工具
   */
  async updateTool(id: string, dto: UpdateToolDto): Promise<ToolDefinition> {
    const tool = await this.getToolById(id);

    // 更新字段
    if (dto.name !== undefined) tool.name = dto.name;
    if (dto.description !== undefined) tool.description = dto.description;
    if (dto.status !== undefined) tool.status = dto.status;
    if (dto.mcpConfig !== undefined) {
      tool.mcpConfig = { ...tool.mcpConfig, ...dto.mcpConfig };
    }
    if (dto.openclawConfig !== undefined) {
      tool.openclawConfig = {
        ...tool.openclawConfig,
        ...dto.openclawConfig,
      };
    }
    if (dto.metadata !== undefined) {
      tool.metadata = { ...tool.metadata, ...dto.metadata };
    }

    tool.updatedAt = new Date();
    this.tools.set(id, tool);

    this.logger.log(`Tool updated: ${tool.name} (${id})`);
    return tool;
  }

  /**
   * 删除工具
   */
  async deleteTool(id: string): Promise<void> {
    const tool = await this.getToolById(id);
    this.tools.delete(id);
    this.logger.log(`Tool deleted: ${tool.name} (${id})`);
  }

  /**
   * 启用/禁用工具
   */
  async toggleToolStatus(id: string): Promise<ToolDefinition> {
    const tool = await this.getToolById(id);
    tool.status =
      tool.status === ToolStatus.ACTIVE
        ? ToolStatus.INACTIVE
        : ToolStatus.ACTIVE;
    tool.updatedAt = new Date();
    this.tools.set(id, tool);

    this.logger.log(
      `Tool ${tool.status === ToolStatus.ACTIVE ? 'enabled' : 'disabled'}: ${tool.name} (${id})`,
    );
    return tool;
  }

  /**
   * 获取工具分类列表
   */
  async getCategories(): Promise<string[]> {
    const categories = new Set<string>();
    for (const tool of this.tools.values()) {
      if (tool.metadata?.category) {
        categories.add(tool.metadata.category);
      }
    }
    return Array.from(categories);
  }

  /**
   * 获取工具统计信息
   */
  async getStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    const tools = Array.from(this.tools.values());

    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    for (const tool of tools) {
      byType[tool.type] = (byType[tool.type] || 0) + 1;
      byStatus[tool.status] = (byStatus[tool.status] || 0) + 1;
    }

    return {
      total: tools.length,
      byType,
      byStatus,
    };
  }

  /**
   * 初始化默认工具
   */
  private initializeDefaultTools(): void {
    const defaultTools: RegisterToolDto[] = [
      {
        name: 'web_search',
        description: '网络搜索工具，用于查询实时信息',
        type: ToolType.OPENCLAW_TOOL,
        openclawConfig: {
          module: '@openclaw/tools/search',
          function: 'search',
          permissions: ['network'],
        },
        metadata: {
          version: '1.0.0',
          author: 'OpenClaw Team',
          tags: ['search', 'web', 'information'],
          category: 'search',
        },
      },
      {
        name: 'code_runner',
        description: '代码执行工具，支持 Python 和 JavaScript',
        type: ToolType.OPENCLAW_TOOL,
        openclawConfig: {
          module: '@openclaw/tools/code-runner',
          function: 'execute',
          permissions: ['sandbox', 'execution'],
        },
        metadata: {
          version: '1.0.0',
          author: 'OpenClaw Team',
          tags: ['code', 'execution', 'python', 'javascript'],
          category: 'development',
        },
      },
      {
        name: 'file_operations',
        description: '文件操作工具，支持读写文件和数据处理',
        type: ToolType.OPENCLAW_TOOL,
        openclawConfig: {
          module: '@openclaw/tools/file-ops',
          function: 'operate',
          permissions: ['filesystem', 'read', 'write'],
        },
        metadata: {
          version: '1.0.0',
          author: 'OpenClaw Team',
          tags: ['file', 'io', 'excel', 'ppt'],
          category: 'productivity',
        },
      },
    ];

    for (const toolDto of defaultTools) {
      this.registerTool(toolDto).catch((error) => {
        this.logger.error(`Failed to initialize default tool: ${error.message}`);
      });
    }

    this.logger.log('Default tools initialized');
  }
}
