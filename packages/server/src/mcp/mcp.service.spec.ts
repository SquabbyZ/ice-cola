import { McpService } from './mcp.service';
import { DatabaseService } from '../database/database.service';

type QueryRow = {
  id?: string;
  server_id?: string;
  server_type?: string;
  name?: string;
  config?: Record<string, unknown>;
};

describe('McpService conversation servers', () => {
  let service: McpService;
  let db: jest.Mocked<Pick<DatabaseService,
    | 'query'
    | 'queryOne'
    | 'getConversationMCPServers'
    | 'setConversationMCPServers'
    | 'clearConversationMCPServers'
    | 'addConversationMCPServer'
    | 'removeConversationMCPServer'
  >>;

  beforeEach(() => {
    db = {
      query: jest.fn(),
      queryOne: jest.fn(),
      getConversationMCPServers: jest.fn(),
      setConversationMCPServers: jest.fn(),
      clearConversationMCPServers: jest.fn(),
      addConversationMCPServer: jest.fn(),
      removeConversationMCPServer: jest.fn(),
    };
    service = new McpService(db as unknown as DatabaseService);
  });

  it('delegates conversation server updates after checking team access to every server', async () => {
    const enabledServers = [{ server_id: 'server-1', name: 'Filesystem' }];
    db.query.mockResolvedValue([{ id: 'server-1' }]);
    db.setConversationMCPServers.mockResolvedValue(enabledServers);

    await expect(service.setConversationMCPServers('conversation-1', ['server-1'], 'team-1')).resolves.toEqual(enabledServers);
    expect(db.query).toHaveBeenCalledWith(
      'SELECT id FROM mcp_servers WHERE id = ANY($1) AND (team_id = $2 OR team_id IS NULL)',
      [['server-1'], 'team-1']
    );
    expect(db.setConversationMCPServers).toHaveBeenCalledWith('conversation-1', ['server-1']);
  });

  it('adds a conversation server using trusted marketplace metadata', async () => {
    const addedServer: QueryRow = { server_id: 'server-1', server_type: 'stdio' };
    db.queryOne.mockResolvedValue({ id: 'server-1', name: 'Filesystem', server_type: 'stdio' });
    db.addConversationMCPServer.mockResolvedValue(addedServer);

    await expect(service.addConversationMCPServer({
      conversationId: 'conversation-1',
      serverId: 'server-1',
      teamId: 'team-1',
    })).resolves.toEqual(addedServer);

    expect(db.queryOne).toHaveBeenCalledWith(
      'SELECT * FROM mcp_servers WHERE id = $1 AND (team_id = $2 OR team_id IS NULL)',
      ['server-1', 'team-1']
    );
    expect(db.addConversationMCPServer).toHaveBeenCalledWith({
      conversationId: 'conversation-1',
      serverId: 'server-1',
      serverName: 'Filesystem',
      serverType: 'stdio',
    });
  });

  it('rejects conversation server updates when any server is outside the team scope', async () => {
    db.query.mockResolvedValue([]);

    await expect(service.setConversationMCPServers('conversation-1', ['server-1'], 'team-1')).rejects.toThrow('MCP server access denied');
    expect(db.setConversationMCPServers).not.toHaveBeenCalled();
  });

  it('rejects added conversation servers outside the team scope', async () => {
    db.queryOne.mockResolvedValue(null);

    await expect(service.addConversationMCPServer({
      conversationId: 'conversation-1',
      serverId: 'server-1',
      teamId: 'team-1',
    })).rejects.toThrow('MCP server access denied');
    expect(db.addConversationMCPServer).not.toHaveBeenCalled();
  });

  it('checks team server access before creating a user MCP connection', async () => {
    const connection = { server_id: 'server-1' };
    db.query.mockResolvedValue([{ id: 'server-1' }]);
    db.queryOne.mockResolvedValue(connection);

    await expect(service.connectServer('user-1', 'server-1', 'team-1', { root: '/workspace' })).resolves.toEqual(connection);
    expect(db.queryOne).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO user_mcp_connections'),
      expect.arrayContaining(['user-1', 'server-1', JSON.stringify({ root: '/workspace' })])
    );
  });

  it('scopes marketplace install and rating updates to accessible team servers', async () => {
    const server = { id: 'server-1' };
    db.queryOne.mockResolvedValue(server);

    await expect(service.incrementInstalls('server-1', 'team-1')).resolves.toEqual(server);
    await expect(service.updateRatings('server-1', 5, 'team-1')).resolves.toEqual(server);

    expect(db.queryOne).toHaveBeenNthCalledWith(
      1,
      'UPDATE mcp_servers SET installs = installs + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND (team_id = $2 OR team_id IS NULL) RETURNING *',
      ['server-1', 'team-1']
    );
    expect(db.queryOne).toHaveBeenNthCalledWith(
      2,
      'UPDATE mcp_servers SET ratings = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND (team_id = $3 OR team_id IS NULL) RETURNING *',
      [5, 'server-1', 'team-1']
    );
  });

  it('builds Hermes MCP config from enabled conversation servers', async () => {
    const servers = [
      { name: 'Filesystem', server_type: 'stdio', config: { root: '/workspace' } },
      { name: 'GitHub', server_type: 'http', config: { endpoint: 'https://example.invalid/mcp' } },
    ];
    db.getConversationMCPServers.mockResolvedValue(servers);

    await expect(service.getConversationMCPConfig('conversation-1')).resolves.toEqual({
      servers,
      mcpServers: [
        { name: 'Filesystem', type: 'stdio', config: { root: '/workspace' } },
        { name: 'GitHub', type: 'http', config: { endpoint: 'https://example.invalid/mcp' } },
      ],
    });
  });
});
