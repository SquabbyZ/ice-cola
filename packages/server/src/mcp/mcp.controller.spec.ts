import { ForbiddenException } from '@nestjs/common';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';

type McpServerFixture = {
  id?: string;
  team_id?: string;
  name: string;
  server_id?: string;
};

type ConversationServerFixture = {
  name: string;
  server_type?: string;
  config?: Record<string, unknown>;
};

describe('McpController conversation authorization', () => {
  let controller: McpController;
  let service: jest.Mocked<Pick<McpService, 'assertConversationAccess' | 'findServerById' | 'getConversationMCPServers' | 'setConversationMCPServers' | 'addConversationMCPServer' | 'updateServer' | 'deleteServer' | 'connectServer' | 'incrementInstalls' | 'updateRatings'>>;

  beforeEach(() => {
    service = {
      assertConversationAccess: jest.fn(),
      findServerById: jest.fn(),
      getConversationMCPServers: jest.fn(),
      setConversationMCPServers: jest.fn(),
      addConversationMCPServer: jest.fn(),
      updateServer: jest.fn(),
      deleteServer: jest.fn(),
      connectServer: jest.fn(),
      incrementInstalls: jest.fn(),
      updateRatings: jest.fn(),
    };
    controller = new McpController(service as unknown as McpService);
  });

  it('scopes marketplace server reads to the authenticated team', async () => {
    const server = { id: 'server-1', team_id: 'team-1', name: 'Filesystem' };
    service.findServerById.mockResolvedValue(server);

    await expect(controller.findServerById('server-1', { user: { id: 'user-1', teamId: 'team-1' } })).resolves.toEqual({
      success: true,
      data: server,
    });
    expect(service.findServerById).toHaveBeenCalledWith('server-1', 'team-1');
  });

  it('checks team ownership before returning conversation MCP servers', async () => {
    const servers: ConversationServerFixture[] = [{ name: 'Filesystem', server_type: 'stdio' }];
    service.getConversationMCPServers.mockResolvedValue(servers);

    await expect(controller.getConversationMCPServers('conversation-1', { user: { id: 'user-1', teamId: 'team-1' } })).resolves.toEqual({
      success: true,
      data: servers,
    });
    expect(service.assertConversationAccess).toHaveBeenCalledWith('conversation-1', 'team-1');
  });

  it('returns an empty list when a conversation has no MCP servers', async () => {
    service.getConversationMCPServers.mockResolvedValue([]);

    await expect(controller.getConversationMCPServers('conversation-1', { user: { id: 'user-1', teamId: 'team-1' } })).resolves.toEqual({
      success: true,
      data: [],
    });
    expect(service.assertConversationAccess).toHaveBeenCalledWith('conversation-1', 'team-1');
  });

  it('does not read MCP servers when conversation access is denied', async () => {
    service.assertConversationAccess.mockRejectedValue(new ForbiddenException('Conversation access denied'));

    await expect(controller.getConversationMCPServers('conversation-1', { user: { id: 'user-2', teamId: 'team-2' } })).rejects.toThrow(ForbiddenException);
    expect(service.getConversationMCPServers).not.toHaveBeenCalled();
  });

  it('scopes conversation server replacement to accessible team servers', async () => {
    const enabledServers: McpServerFixture[] = [{ server_id: 'server-1', name: 'Filesystem' }];
    service.setConversationMCPServers.mockResolvedValue(enabledServers);

    await expect(controller.setConversationMCPServers('conversation-1', { serverIds: ['server-1'] }, { user: { id: 'user-1', teamId: 'team-1' } })).resolves.toEqual({
      success: true,
      data: enabledServers,
    });
    expect(service.setConversationMCPServers).toHaveBeenCalledWith('conversation-1', ['server-1'], 'team-1');
  });

  it('scopes added conversation servers to accessible team servers', async () => {
    const addedServer: McpServerFixture = { server_id: 'server-1', name: 'Filesystem' };
    service.addConversationMCPServer.mockResolvedValue(addedServer);

    await expect(controller.addConversationMCPServer(
      'conversation-1',
      'server-1',
      { serverName: 'Filesystem', serverType: 'stdio', config: { command: 'unsafe-client-value' } },
      { user: { id: 'user-1', teamId: 'team-1' } }
    )).resolves.toEqual({
      success: true,
      data: addedServer,
    });
    expect(service.addConversationMCPServer).toHaveBeenCalledWith({
      conversationId: 'conversation-1',
      serverId: 'server-1',
      teamId: 'team-1',
    });
  });

  it('scopes user MCP connections to accessible team servers', async () => {
    const connection: McpServerFixture = { server_id: 'server-1', name: 'Filesystem' };
    service.connectServer.mockResolvedValue(connection);

    await expect(controller.connectServer({ serverId: 'server-1', config: { root: '/workspace' } }, { user: { id: 'user-1', teamId: 'team-1' } })).resolves.toEqual({
      success: true,
      data: connection,
    });
    expect(service.connectServer).toHaveBeenCalledWith('user-1', 'server-1', 'team-1', { root: '/workspace' });
  });

  it('scopes marketplace install counters to accessible team servers', async () => {
    const server = { id: 'server-1', team_id: 'team-1', name: 'Filesystem' };
    service.incrementInstalls.mockResolvedValue(server);

    await expect(controller.installServer('server-1', { user: { id: 'user-1', teamId: 'team-1' } })).resolves.toEqual({
      success: true,
      data: server,
    });
    expect(service.incrementInstalls).toHaveBeenCalledWith('server-1', 'team-1');
  });

  it('scopes marketplace ratings to accessible team servers', async () => {
    const server = { id: 'server-1', team_id: 'team-1', name: 'Filesystem' };
    service.updateRatings.mockResolvedValue(server);

    await expect(controller.rateServer('server-1', { ratings: 5 }, { user: { id: 'user-1', teamId: 'team-1' } })).resolves.toEqual({
      success: true,
      data: server,
    });
    expect(service.updateRatings).toHaveBeenCalledWith('server-1', 5, 'team-1');
  });

  it('scopes marketplace server updates to the authenticated team', async () => {
    const updatedServer = { id: 'server-1', team_id: 'team-1', name: 'Updated MCP' };
    service.updateServer.mockResolvedValue(updatedServer);

    await expect(controller.updateServer('server-1', { name: 'Updated MCP' }, { user: { id: 'user-1', teamId: 'team-1' } })).resolves.toEqual({
      success: true,
      data: updatedServer,
    });
    expect(service.updateServer).toHaveBeenCalledWith('server-1', { name: 'Updated MCP' }, 'team-1');
  });

  it('scopes marketplace server deletes to the authenticated team', async () => {
    service.deleteServer.mockResolvedValue();

    await expect(controller.deleteServer('server-1', { user: { id: 'user-1', teamId: 'team-1' } })).resolves.toEqual({
      success: true,
      data: null,
    });
    expect(service.deleteServer).toHaveBeenCalledWith('server-1', 'team-1');
  });
});
