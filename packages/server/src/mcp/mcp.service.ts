import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  CreateMCPServerDtoType,
  UpdateMCPServerDtoType,
} from './dto/mcp.dto';

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
    const params: any[] = [];
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

  async findServerById(id: string) {
    return this.db.queryOne('SELECT * FROM mcp_servers WHERE id = $1', [id]);
  }

  async updateServer(id: string, dto: UpdateMCPServerDtoType) {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    const snakeCaseMap: Record<string, string> = {
      configSchema: 'config_schema',
    };

    Object.entries(dto).forEach(([key, value]) => {
      if (value !== undefined) {
        const snakeKey = snakeCaseMap[key] || key.replace(/([A-Z])/g, '_$1').toLowerCase();
        fields.push(`${snakeKey} = $${paramCount}`);
        if (key === 'configSchema') {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
        paramCount++;
      }
    });

    if (fields.length === 0) return this.findServerById(id);

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const rows = await this.db.query(
      `UPDATE mcp_servers SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    return rows[0];
  }

  async deleteServer(id: string) {
    await this.db.query('DELETE FROM mcp_servers WHERE id = $1', [id]);
  }

  async incrementInstalls(id: string) {
    return this.db.queryOne(
      'UPDATE mcp_servers SET installs = installs + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );
  }

  async updateRatings(id: string, ratings: number) {
    return this.db.queryOne(
      'UPDATE mcp_servers SET ratings = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [ratings, id]
    );
  }

  // ==================== User MCP Connections ====================

  async connectServer(userId: string, serverId: string, config?: Record<string, string>) {
    const id = this.generateUUID();
    return this.db.queryOne(
      `INSERT INTO user_mcp_connections (id, user_id, server_id, status, config, connected_at)
       VALUES ($1, $2, $3, 'connected', $4, NOW())
       ON CONFLICT (user_id, server_id) DO UPDATE SET status = 'connected', config = COALESCE($4, user_mcp_connections.config), connected_at = NOW()
       RETURNING *`,
      [id, userId, serverId, config ? JSON.stringify(config) : null]
    );
  }

  async disconnectServer(userId: string, serverId: string) {
    return this.db.queryOne(
      `UPDATE user_mcp_connections SET status = 'disconnected', disconnected_at = NOW() WHERE user_id = $1 AND server_id = $2 RETURNING *`,
      [userId, serverId]
    );
  }

  async findUserConnections(userId: string) {
    const rows = await this.db.query(
      `SELECT umc.*, ms.name, ms.description, ms.version, ms.author, ms.category, ms.icon, ms.color, ms.tags, ms.homepage, ms.repository, ms.enabled as server_enabled, ms.config_schema, ms.instructions, ms.ratings, ms.installs
       FROM user_mcp_connections umc
       INNER JOIN mcp_servers ms ON umc.server_id = ms.id
       WHERE umc.user_id = $1
       ORDER BY umc.connected_at DESC`,
      [userId]
    );
    return rows.map((row: any) => ({
      ...row,
      connected: row.status === 'connected',
      enabled: row.status === 'connected',
    }));
  }

  async findConnectedServers(userId: string) {
    const connections = await this.findUserConnections(userId);
    return connections.filter((c: any) => c.status === 'connected');
  }

  async updateConnectionConfig(userId: string, serverId: string, config: Record<string, string>) {
    return this.db.queryOne(
      `UPDATE user_mcp_connections SET config = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND server_id = $3 RETURNING *`,
      [JSON.stringify(config), userId, serverId]
    );
  }

  async getConnectionStatus(userId: string, serverId: string) {
    return this.db.queryOne(
      'SELECT * FROM user_mcp_connections WHERE user_id = $1 AND server_id = $2',
      [userId, serverId]
    );
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}