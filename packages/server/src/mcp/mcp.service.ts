import { ForbiddenException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  CreateMCPServerDtoType,
  UpdateMCPServerDtoType,
} from './dto/mcp.dto';

type MCPQueryParam = string | number | boolean | string[] | null;

type MCPServerRow = {
  status?: string;
};

type ConversationMCPServerRow = {
  name: string;
  server_type?: string;
  config?: Record<string, unknown>;
};

type ConversationMCPConfig = {
  servers: ConversationMCPServerRow[];
  mcpServers: Array<{
    name: string;
    type: string;
    config: Record<string, unknown>;
  }>;
};

type ConversationMCPServerInput = {
  conversationId: string;
  serverId: string;
  teamId: string;
};

type UpdateMCPServerField = {
  readonly key: keyof UpdateMCPServerDtoType;
  readonly column: string;
  readonly serialize?: (value: NonNullable<UpdateMCPServerDtoType[keyof UpdateMCPServerDtoType]>) => MCPQueryParam;
};

const UPDATE_SERVER_FIELDS: UpdateMCPServerField[] = [
  { key: 'name', column: 'name' },
  { key: 'description', column: 'description' },
  { key: 'version', column: 'version' },
  { key: 'author', column: 'author' },
  { key: 'category', column: 'category' },
  { key: 'icon', column: 'icon' },
  { key: 'color', column: 'color' },
  { key: 'tags', column: 'tags', serialize: (value) => value as string[] },
  { key: 'homepage', column: 'homepage' },
  { key: 'repository', column: 'repository' },
  { key: 'enabled', column: 'enabled', serialize: (value) => value as boolean },
  { key: 'configSchema', column: 'config_schema', serialize: (value) => JSON.stringify(value) },
  { key: 'instructions', column: 'instructions' },
  { key: 'ratings', column: 'ratings', serialize: (value) => value as number },
  { key: 'installs', column: 'installs', serialize: (value) => value as number },
];

@Injectable()
export class McpService {
  constructor(private readonly db: DatabaseService) {}

  // ==================== MCP Servers ====================

  async createServer(dto: CreateMCPServerDtoType, teamId?: string) {
    const id = this.generateUUID();
    const rows = await this.db.query(
      `INSERT INTO mcp_servers (id, name, description, version, author, category, icon, color, tags, homepage, repository, enabled, config_schema, instructions, team_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        id,
        dto.name,
        dto.description || null,
        dto.version || '1.0.0',
        dto.author || null,
        dto.category,
        dto.icon || null,
        dto.color || null,
        dto.tags || [],
        dto.homepage || null,
        dto.repository || null,
        dto.enabled ?? true,
        dto.configSchema ? JSON.stringify(dto.configSchema) : null,
        dto.instructions || null,
        teamId || null,
      ]
    );
    return rows[0];
  }

  async findAllServers(teamId?: string, category?: string, search?: string) {
    let query = 'SELECT * FROM mcp_servers WHERE 1=1';
    const params: MCPQueryParam[] = [];
    let paramIndex = 1;

    if (teamId) {
      query += ` AND (team_id = $${paramIndex} OR team_id IS NULL)`;
      params.push(teamId);
      paramIndex++;
    } else {
      query += ` AND team_id IS NULL`;
    }

    if (category && category !== 'all') {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (search) {
      query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ' ORDER BY installs DESC, ratings DESC';
    return this.db.query(query, params);
  }

  async findServerById(id: string, teamId: string) {
    return this.db.queryOne('SELECT * FROM mcp_servers WHERE id = $1 AND (team_id = $2 OR team_id IS NULL)', [id, teamId]);
  }

  async updateServer(id: string, dto: UpdateMCPServerDtoType, teamId: string) {
    const fields: string[] = [];
    const values: MCPQueryParam[] = [];
    let paramCount = 1;

    for (const field of UPDATE_SERVER_FIELDS) {
      const value = dto[field.key];
      if (value !== undefined) {
        fields.push(`${field.column} = $${paramCount}`);
        values.push(field.serialize ? field.serialize(value) : value as MCPQueryParam);
        paramCount++;
      }
    }

    if (fields.length === 0) return this.findServerById(id, teamId);

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id, teamId);

    const rows = await this.db.query(
      `UPDATE mcp_servers SET ${fields.join(', ')} WHERE id = $${paramCount} AND team_id = $${paramCount + 1} RETURNING *`,
      values
    );
    return rows[0];
  }

  async deleteServer(id: string, teamId: string) {
    await this.db.query('DELETE FROM mcp_servers WHERE id = $1 AND team_id = $2', [id, teamId]);
  }

  async incrementInstalls(id: string, teamId: string) {
    return this.db.queryOne(
      'UPDATE mcp_servers SET installs = installs + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND (team_id = $2 OR team_id IS NULL) RETURNING *',
      [id, teamId]
    );
  }

  async updateRatings(id: string, ratings: number, teamId: string) {
    return this.db.queryOne(
      'UPDATE mcp_servers SET ratings = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND (team_id = $3 OR team_id IS NULL) RETURNING *',
      [ratings, id, teamId]
    );
  }

  // ==================== User MCP Connections ====================

  async connectServer(userId: string, serverId: string, teamId: string, config?: Record<string, string>) {
    await this.assertServersAccessible([serverId], teamId);
    const id = this.generateUUID();
    return this.db.queryOne(
      `INSERT INTO user_mcp_connections (id, user_id, server_id, status, config, connected_at)
       VALUES ($1, $2, $3, 'connected', $4, NOW())
       ON CONFLICT (user_id, server_id) DO UPDATE SET status = 'connected', config = COALESCE($4, user_mcp_connections.config), connected_at = NOW()
       RETURNING *`,
      [id, userId, serverId, config ? JSON.stringify(config) : null]
    );
  }

  async disconnectServer(userId: string, serverId: string, teamId: string) {
    return this.db.queryOne(
      `UPDATE user_mcp_connections umc
       SET status = 'disconnected', disconnected_at = NOW()
       FROM mcp_servers ms
       WHERE umc.server_id = ms.id
         AND umc.user_id = $1
         AND umc.server_id = $2
         AND (ms.team_id = $3 OR ms.team_id IS NULL)
       RETURNING umc.*`,
      [userId, serverId, teamId]
    );
  }

  async findUserConnections(userId: string, teamId: string) {
    const rows = await this.db.query(
      `SELECT umc.*, ms.name, ms.description, ms.version, ms.author, ms.category, ms.icon, ms.color, ms.tags, ms.homepage, ms.repository, ms.enabled as server_enabled, ms.config_schema, ms.instructions, ms.ratings, ms.installs
       FROM user_mcp_connections umc
       INNER JOIN mcp_servers ms ON umc.server_id = ms.id
       WHERE umc.user_id = $1 AND (ms.team_id = $2 OR ms.team_id IS NULL)
       ORDER BY umc.connected_at DESC`,
      [userId, teamId]
    );
    return rows.map((row: MCPServerRow) => ({
      ...row,
      connected: row.status === 'connected',
      enabled: row.status === 'connected',
    }));
  }

  async findConnectedServers(userId: string, teamId: string) {
    const connections = await this.findUserConnections(userId, teamId);
    return connections.filter((connection: MCPServerRow) => connection.status === 'connected');
  }

  async updateConnectionConfig(userId: string, serverId: string, teamId: string, config: Record<string, string>) {
    return this.db.queryOne(
      `UPDATE user_mcp_connections umc
       SET config = $1, updated_at = CURRENT_TIMESTAMP
       FROM mcp_servers ms
       WHERE umc.server_id = ms.id
         AND umc.user_id = $2
         AND umc.server_id = $3
         AND (ms.team_id = $4 OR ms.team_id IS NULL)
       RETURNING umc.*`,
      [JSON.stringify(config), userId, serverId, teamId]
    );
  }

  async getConnectionStatus(userId: string, serverId: string, teamId: string) {
    return this.db.queryOne(
      `SELECT umc.*
       FROM user_mcp_connections umc
       INNER JOIN mcp_servers ms ON umc.server_id = ms.id
       WHERE umc.user_id = $1 AND umc.server_id = $2 AND (ms.team_id = $3 OR ms.team_id IS NULL)`,
      [userId, serverId, teamId]
    );
  }

  async assertConversationAccess(conversationId: string, teamId: string) {
    const conversation = await this.db.findConversationById(conversationId, teamId);
    if (!conversation) {
      throw new ForbiddenException('Conversation access denied');
    }
  }

  async assertServersAccessible(serverIds: string[], teamId: string) {
    if (serverIds.length === 0) return;

    const rows = await this.db.query(
      'SELECT id FROM mcp_servers WHERE id = ANY($1) AND (team_id = $2 OR team_id IS NULL)',
      [serverIds, teamId]
    );
    if (rows.length !== new Set(serverIds).size) {
      throw new ForbiddenException('MCP server access denied');
    }
  }

  async getConversationMCPServers(conversationId: string): Promise<ConversationMCPServerRow[]> {
    const rows = await this.db.getConversationMCPServers(conversationId);
    return rows.map((row) => ({
      name: row.name,
      server_type: row.server_type,
      config: row.config,
    }));
  }

  async setConversationMCPServers(conversationId: string, serverIds: string[], teamId: string) {
    await this.assertServersAccessible(serverIds, teamId);
    return this.db.setConversationMCPServers(conversationId, serverIds);
  }

  async clearConversationMCPServers(conversationId: string, teamId: string) {
    await this.assertConversationAccess(conversationId, teamId);
    return this.db.clearConversationMCPServers(conversationId);
  }

  async addConversationMCPServer(input: ConversationMCPServerInput) {
    const server = await this.findServerById(input.serverId, input.teamId);
    if (!server) {
      throw new ForbiddenException('MCP server access denied');
    }
    return this.db.addConversationMCPServer({
      conversationId: input.conversationId,
      serverId: input.serverId,
      serverName: server.name,
      serverType: server.server_type || 'stdio',
    });
  }

  async removeConversationMCPServer(conversationId: string, serverId: string, teamId: string) {
    await this.assertConversationAccess(conversationId, teamId);
    await this.assertServersAccessible([serverId], teamId);
    return this.db.removeConversationMCPServer(conversationId, serverId);
  }

  async getConversationMCPConfig(conversationId: string): Promise<ConversationMCPConfig> {
    const servers = await this.getConversationMCPServers(conversationId);
    const mcpServers = servers.map((server) => ({
      name: server.name,
      type: server.server_type || 'stdio',
      config: server.config || {},
    }));

    return { servers, mcpServers };
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}