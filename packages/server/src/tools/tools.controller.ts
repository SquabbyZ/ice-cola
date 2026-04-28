import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ToolRegistryService } from './tool-registry.service';
import {
  RegisterToolDto,
  UpdateToolDto,
  QueryToolsDto,
  ToolType,
  ToolStatus,
} from './dto/tool.dto';

@Controller('tools')
export class ToolsController {
  constructor(private readonly toolRegistryService: ToolRegistryService) {}

  /**
   * 注册新工具
   * POST /api/tools
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async registerTool(@Body() dto: RegisterToolDto) {
    const tool = await this.toolRegistryService.registerTool(dto);
    return {
      success: true,
      data: tool,
    };
  }

  /**
   * 获取工具列表
   * GET /api/tools?type=mcp_server&status=active&category=search&search=web&limit=10&offset=0
   */
  @Get()
  async getTools(@Query() query: QueryToolsDto) {
    const result = await this.toolRegistryService.getTools(query);
    return {
      success: true,
      data: result.tools,
      pagination: {
        total: result.total,
        limit: query.limit || 50,
        offset: query.offset || 0,
      },
    };
  }

  /**
   * 获取工具统计信息
   * GET /api/tools/stats
   */
  @Get('stats')
  async getStats() {
    const stats = await this.toolRegistryService.getStats();
    return {
      success: true,
      data: stats,
    };
  }

  /**
   * 获取工具分类列表
   * GET /api/tools/categories
   */
  @Get('categories')
  async getCategories() {
    const categories = await this.toolRegistryService.getCategories();
    return {
      success: true,
      data: categories,
    };
  }

  /**
   * 根据 ID 获取工具
   * GET /api/tools/:id
   */
  @Get(':id')
  async getToolById(@Param('id') id: string) {
    const tool = await this.toolRegistryService.getToolById(id);
    return {
      success: true,
      data: tool,
    };
  }

  /**
   * 更新工具
   * PUT /api/tools/:id
   */
  @Put(':id')
  async updateTool(
    @Param('id') id: string,
    @Body() dto: UpdateToolDto,
  ) {
    const tool = await this.toolRegistryService.updateTool(id, dto);
    return {
      success: true,
      data: tool,
    };
  }

  /**
   * 切换工具状态（启用/禁用）
   * PUT /api/tools/:id/toggle
   */
  @Put(':id/toggle')
  async toggleToolStatus(@Param('id') id: string) {
    const tool = await this.toolRegistryService.toggleToolStatus(id);
    return {
      success: true,
      data: tool,
    };
  }

  /**
   * 删除工具
   * DELETE /api/tools/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTool(@Param('id') id: string) {
    await this.toolRegistryService.deleteTool(id);
    return null;
  }
}
