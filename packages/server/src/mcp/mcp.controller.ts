import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { McpService } from './mcp.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateMCPServerDtoType, UpdateMCPServerDtoType } from './dto/mcp.dto';

type AuthenticatedRequest = {
  user: {
    id: string;
    teamId: string;
    role?: string;
  };
};

@Controller('mcp')
@UseGuards(JwtAuthGuard)
export class McpController {
  constructor(private readonly mcpService: McpService) {}

  // ==================== MCP Server Marketplace ====================

  @Get('servers')
  async findAllServers(
    @Request() req: AuthenticatedRequest,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    const userTeamId = req.user.teamId;
    const result = await this.mcpService.findAllServers(userTeamId, category, search);
    return { success: true, data: result };
  }

  @Get('servers/:id')
  async findServerById(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const result = await this.mcpService.findServerById(id, req.user.teamId);
    return { success: true, data: result };
  }

  @Post('servers')
  async createServer(
    @Body() body: CreateMCPServerDtoType,
    @Request() req: AuthenticatedRequest,
  ) {
    const userTeamId = req.user.teamId;
    const result = await this.mcpService.createServer(body, userTeamId);
    return { success: true, data: result };
  }

  @Put('servers/:id')
  async updateServer(
    @Param('id') id: string,
    @Body() body: UpdateMCPServerDtoType,
    @Request() req: AuthenticatedRequest,
  ) {
    const result = await this.mcpService.updateServer(id, body, req.user.teamId);
    return { success: true, data: result };
  }

  @Delete('servers/:id')
  async deleteServer(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    await this.mcpService.deleteServer(id, req.user.teamId);
    return { success: true, data: null };
  }

  @Post('servers/:id/install')
  async installServer(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const result = await this.mcpService.incrementInstalls(id, req.user.teamId);
    return { success: true, data: result };
  }

  @Post('servers/:id/rate')
  async rateServer(
    @Param('id') id: string,
    @Body() body: { ratings: number },
    @Request() req: AuthenticatedRequest,
  ) {
    const result = await this.mcpService.updateRatings(id, body.ratings, req.user.teamId);
    return { success: true, data: result };
  }

  // ==================== User MCP Connections ====================

  @Get('connections')
  async findUserConnections(@Request() req: AuthenticatedRequest) {
    const result = await this.mcpService.findUserConnections(req.user.id);
    return { success: true, data: result };
  }

  @Get('connections/connected')
  async findConnectedServers(@Request() req: AuthenticatedRequest) {
    const result = await this.mcpService.findConnectedServers(req.user.id);
    return { success: true, data: result };
  }

  @Post('connect')
  async connectServer(
    @Body() body: { serverId: string; config?: Record<string, string> },
    @Request() req: AuthenticatedRequest,
  ) {
    const result = await this.mcpService.connectServer(req.user.id, body.serverId, req.user.teamId, body.config);
    return { success: true, data: result };
  }

  @Post('disconnect')
  async disconnectServer(
    @Body() body: { serverId: string },
    @Request() req: AuthenticatedRequest,
  ) {
    const result = await this.mcpService.disconnectServer(req.user.id, body.serverId);
    return { success: true, data: result };
  }

  @Put('connections/:serverId/config')
  async updateConnectionConfig(
    @Param('serverId') serverId: string,
    @Body() body: { config: Record<string, string> },
    @Request() req: AuthenticatedRequest,
  ) {
    const result = await this.mcpService.updateConnectionConfig(req.user.id, serverId, body.config);
    return { success: true, data: result };
  }

  @Get('connections/:serverId/status')
  async getConnectionStatus(
    @Param('serverId') serverId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const result = await this.mcpService.getConnectionStatus(req.user.id, serverId);
    return { success: true, data: result };
  }

  // ==================== Conversation MCP Servers ====================

  @Get('conversation/:conversationId/servers')
  async getConversationMCPServers(@Param('conversationId') conversationId: string, @Request() req: AuthenticatedRequest) {
    await this.mcpService.assertConversationAccess(conversationId, req.user.teamId);
    const result = await this.mcpService.getConversationMCPServers(conversationId);
    return { success: true, data: result };
  }

  @Post('conversation/:conversationId/servers')
  async setConversationMCPServers(
    @Param('conversationId') conversationId: string,
    @Body() body: { serverIds: string[] },
    @Request() req: AuthenticatedRequest,
  ) {
    await this.mcpService.assertConversationAccess(conversationId, req.user.teamId);
    const result = await this.mcpService.setConversationMCPServers(conversationId, body.serverIds, req.user.teamId);
    return { success: true, data: result };
  }

  @Delete('conversation/:conversationId/servers')
  async clearConversationMCPServers(@Param('conversationId') conversationId: string, @Request() req: AuthenticatedRequest) {
    await this.mcpService.assertConversationAccess(conversationId, req.user.teamId);
    const result = await this.mcpService.clearConversationMCPServers(conversationId);
    return { success: true, data: result };
  }

  @Post('conversation/:conversationId/servers/:serverId')
  async addConversationMCPServer(
    @Param('conversationId') conversationId: string,
    @Param('serverId') serverId: string,
    @Body() body: { serverName: string; serverType?: string; config?: Record<string, unknown> },
    @Request() req: AuthenticatedRequest,
  ) {
    await this.mcpService.assertConversationAccess(conversationId, req.user.teamId);
    const result = await this.mcpService.addConversationMCPServer({
      conversationId,
      serverId,
      teamId: req.user.teamId,
    });
    return { success: true, data: result };
  }

  @Delete('conversation/:conversationId/servers/:serverId')
  async removeConversationMCPServer(
    @Param('conversationId') conversationId: string,
    @Param('serverId') serverId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    await this.mcpService.assertConversationAccess(conversationId, req.user.teamId);
    const result = await this.mcpService.removeConversationMCPServer(conversationId, serverId);
    return { success: true, data: result };
  }

  @Get('conversation/:conversationId/mcp-config')
  async getConversationMCPConfig(@Param('conversationId') conversationId: string, @Request() req: AuthenticatedRequest) {
    await this.mcpService.assertConversationAccess(conversationId, req.user.teamId);
    const result = await this.mcpService.getConversationMCPConfig(conversationId);
    return { success: true, data: result };
  }
}