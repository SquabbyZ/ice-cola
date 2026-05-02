import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { McpService } from './mcp.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('mcp')
@UseGuards(JwtAuthGuard)
export class McpController {
  constructor(private readonly mcpService: McpService) {}

  // ==================== MCP Server Marketplace ====================

  @Get('servers')
  async findAllServers(
    @Request() req: any,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    const userTeamId = req.user.teamId;
    const result = await this.mcpService.findAllServers(userTeamId, category, search);
    return { success: true, data: result };
  }

  @Get('servers/:id')
  async findServerById(@Param('id') id: string) {
    const result = await this.mcpService.findServerById(id);
    return { success: true, data: result };
  }

  @Post('servers')
  async createServer(
    @Body() body: any,
    @Request() req: any,
  ) {
    const userTeamId = req.user.teamId;
    const result = await this.mcpService.createServer(body, userTeamId);
    return { success: true, data: result };
  }

  @Put('servers/:id')
  async updateServer(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const result = await this.mcpService.updateServer(id, body);
    return { success: true, data: result };
  }

  @Delete('servers/:id')
  async deleteServer(@Param('id') id: string) {
    await this.mcpService.deleteServer(id);
    return { success: true, data: null };
  }

  @Post('servers/:id/install')
  async installServer(@Param('id') id: string) {
    const result = await this.mcpService.incrementInstalls(id);
    return { success: true, data: result };
  }

  @Post('servers/:id/rate')
  async rateServer(
    @Param('id') id: string,
    @Body() body: { ratings: number },
  ) {
    const result = await this.mcpService.updateRatings(id, body.ratings);
    return { success: true, data: result };
  }

  // ==================== User MCP Connections ====================

  @Get('connections')
  async findUserConnections(@Request() req: any) {
    const result = await this.mcpService.findUserConnections(req.user.id);
    return { success: true, data: result };
  }

  @Get('connections/connected')
  async findConnectedServers(@Request() req: any) {
    const result = await this.mcpService.findConnectedServers(req.user.id);
    return { success: true, data: result };
  }

  @Post('connect')
  async connectServer(
    @Body() body: { serverId: string; config?: Record<string, string> },
    @Request() req: any,
  ) {
    const result = await this.mcpService.connectServer(req.user.id, body.serverId, body.config);
    return { success: true, data: result };
  }

  @Post('disconnect')
  async disconnectServer(
    @Body() body: { serverId: string },
    @Request() req: any,
  ) {
    const result = await this.mcpService.disconnectServer(req.user.id, body.serverId);
    return { success: true, data: result };
  }

  @Put('connections/:serverId/config')
  async updateConnectionConfig(
    @Param('serverId') serverId: string,
    @Body() body: { config: Record<string, string> },
    @Request() req: any,
  ) {
    const result = await this.mcpService.updateConnectionConfig(req.user.id, serverId, body.config);
    return { success: true, data: result };
  }

  @Get('connections/:serverId/status')
  async getConnectionStatus(
    @Param('serverId') serverId: string,
    @Request() req: any,
  ) {
    const result = await this.mcpService.getConnectionStatus(req.user.id, serverId);
    return { success: true, data: result };
  }
}