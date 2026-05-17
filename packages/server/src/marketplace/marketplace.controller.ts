import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Request, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TeamRole } from '../quota/quota.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { QueryItemsDto, MarketplaceItemStatus } from './dto/query-items.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ApproveSubmissionDto } from './dto/approve-submission.dto';
import { RejectSubmissionDto } from './dto/reject-submission.dto';
import { SkillsSyncService } from './skills-sync.service';

@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService, private readonly skillsSyncService: SkillsSyncService) {}

  // ============================================================
  // Marketplace Items
  // ============================================================

  @Get('items')
  @UseGuards(JwtAuthGuard)
  async findItems(@Query() query: QueryItemsDto, @Request() req: any) {
    const isAdmin = req.user?.role === TeamRole.ADMIN || req.user?.role === TeamRole.OWNER;
    const includeAll = isAdmin && req.query['includeAll'] === 'true';
    const safeQuery: QueryItemsDto = isAdmin || !query.status || query.status === MarketplaceItemStatus.APPROVED
      ? query
      : { ...query, status: MarketplaceItemStatus.APPROVED };
    const result = await this.marketplaceService.findItems(safeQuery, includeAll);
    return {
      code: 0,
      data: result,
      message: '操作成功',
    };
  }

  @Get('items/:id')
  @UseGuards(JwtAuthGuard)
  async findItemById(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const result = await this.marketplaceService.findItemById(id);
    const isAdmin = req.user?.role === TeamRole.ADMIN || req.user?.role === TeamRole.OWNER;
    if (!isAdmin && result.status !== 'approved') {
      throw new NotFoundException('市场项不存在');
    }
    return {
      code: 0,
      data: result,
      message: '操作成功',
    };
  }

  @Post('items')
  @UseGuards(JwtAuthGuard)
  async createItem(@Request() req: any, @Body() dto: CreateItemDto) {
    const result = await this.marketplaceService.createItem(req.user.id, dto);
    return {
      code: 0,
      data: result,
      message: '市场项创建成功',
    };
  }

  @Put('items/:id')
  @UseGuards(JwtAuthGuard)
  async updateItem(@Param('id', ParseIntPipe) id: number, @Request() req: any, @Body() dto: UpdateItemDto) {
    const result = await this.marketplaceService.updateItem(id, req.user.id, dto);
    return {
      code: 0,
      data: result,
      message: '市场项更新成功',
    };
  }

  @Delete('items/:id')
  @UseGuards(JwtAuthGuard)
  async deleteItem(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    await this.marketplaceService.deleteItem(id, req.user.id);
    return {
      code: 0,
      data: null,
      message: '市场项已删除',
    };
  }

  // ============================================================
  // Admin Operations (ADMIN/OWNER only)
  // ============================================================

  @Put('items/:id/admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async adminUpdateItem(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateItemDto) {
    const result = await this.marketplaceService.adminUpdateItem(id, dto);
    return {
      code: 0,
      data: result,
      message: '市场项已更新',
    };
  }

  @Delete('items/:id/admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async adminDeleteItem(@Param('id', ParseIntPipe) id: number) {
    await this.marketplaceService.adminDeleteItem(id);
    return {
      code: 0,
      data: null,
      message: '市场项已删除',
    };
  }

  @Post('sync/mcps')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async syncMcps() {
    const result = await this.marketplaceService.syncMcps();
    return {
      code: 0,
      data: result,
      message: `同步完成：新增 ${result.created} 个，更新 ${result.updated} 个`,
    };
  }

  // ============================================================
  // Submissions
  // ============================================================

  @Post('items/:id/submit')
  @UseGuards(JwtAuthGuard)
  async submitItem(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
    @Body() body: { note?: string },
  ) {
    const result = await this.marketplaceService.submitItem(
      id,
      req.user.id,
      body.note,
    );
    return {
      code: 0,
      data: result,
      message: '发布申请已提交',
    };
  }

  @Get('submissions/my')
  @UseGuards(JwtAuthGuard)
  async findMySubmissions(@Request() req: any) {
    const result = await this.marketplaceService.findMySubmissions(req.user.id);
    return {
      code: 0,
      data: result,
      message: '操作成功',
    };
  }

  @Get('submissions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async findSubmissions(@Query('status') status?: string) {
    const result = await this.marketplaceService.findSubmissions(status);
    return {
      code: 0,
      data: result,
      message: '操作成功',
    };
  }

  // ============================================================
  // Approvals
  // ============================================================

  @Post('submissions/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async approveSubmission(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
    @Body() dto: ApproveSubmissionDto,
  ) {
    const result = await this.marketplaceService.approveSubmission(
      id,
      req.user.id,
      dto.comment,
    );
    return {
      code: 0,
      data: result,
      message: '审批通过',
    };
  }

  @Post('submissions/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async rejectSubmission(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
    @Body() dto: RejectSubmissionDto,
  ) {
    const result = await this.marketplaceService.rejectSubmission(
      id,
      req.user.id,
      dto.comment,
    );
    return {
      code: 0,
      data: result,
      message: '审批已拒绝',
    };
  }

  @Get('approvals')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async findApprovals() {
    const result = await this.marketplaceService.findApprovals();
    return {
      code: 0,
      data: result,
      message: '操作成功',
    };
  }

  // ============================================================
  // Installations
  // ============================================================

  @Post('items/:id/install')
  @UseGuards(JwtAuthGuard)
  async installItem(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
    @Body() body: { config?: Record<string, any> },
  ) {
    const result = await this.marketplaceService.installItem(
      id,
      req.user.id,
      body.config,
    );
    return {
      code: 0,
      data: result,
      message: '安装成功',
    };
  }

  @Delete('items/:id/uninstall')
  @UseGuards(JwtAuthGuard)
  async uninstallItem(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    await this.marketplaceService.uninstallItem(id, req.user.id);
    return {
      code: 0,
      data: null,
      message: '已卸载',
    };
  }

  @Get('installations/my')
  @UseGuards(JwtAuthGuard)
  async findMyInstallations(@Request() req: any) {
    const result = await this.marketplaceService.findMyInstallations(req.user.id);
    return {
      code: 0,
      data: result,
      message: '操作成功',
    };
  }

  // ============================================================
  // Categories
  // ============================================================

  @Get('categories')
  @UseGuards(JwtAuthGuard)
  async findCategories(@Query('itemType') itemType?: string) {
    const result = await this.marketplaceService.findCategories(itemType);
    return {
      code: 0,
      data: result,
      message: '操作成功',
    };
  }

  @Post('categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async createCategory(@Body() dto: CreateCategoryDto) {
    const result = await this.marketplaceService.createCategory(dto);
    return {
      code: 0,
      data: result,
      message: '分类创建成功',
    };
  }

  @Put('categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async updateCategory(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoryDto) {
    const result = await this.marketplaceService.updateCategory(id, dto);
    return {
      code: 0,
      data: result,
      message: '分类更新成功',
    };
  }

  @Delete('categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async deleteCategory(@Param('id', ParseIntPipe) id: number) {
    await this.marketplaceService.deleteCategory(id);
    return {
      code: 0,
      data: null,
      message: '分类已删除',
    };
  }

  // Sync from skills.sh
  @Post('sync/skills-sh')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(TeamRole.OWNER, TeamRole.ADMIN)
  async syncFromSkillsSh(@Request() req: any) {
    const result = await this.skillsSyncService.syncFromSkillsSh();
    return {
      code: 0,
      data: result,
      message: 'skills.sh sync completed',
    };
  }
}
