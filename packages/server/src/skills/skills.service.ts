import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';

@Injectable()
export class SkillsService {
  constructor(private readonly db: DatabaseService) {}

  async create(teamId: string, authorId: string, dto: CreateSkillDto) {
    const rows = await this.db.query(
      `INSERT INTO skills (name, description, version, icon, category, tags, content, config_schema, config, team_id, author_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'personal')
       RETURNING *`,
      [dto.name, dto.description, dto.version || '1.0.0', dto.icon, dto.category, dto.tags, dto.content, dto.configSchema, dto.config, teamId, authorId]
    );
    return rows[0];
  }

  async findAll(teamId: string, status?: string) {
    let query = 'SELECT * FROM skills WHERE team_id = $1';
    const params: any[] = [teamId];

    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';
    return this.db.query(query, params);
  }

  async findPersonal(authorId: string) {
    return this.db.query(
      `SELECT * FROM skills WHERE author_id = $1 AND status = 'personal' ORDER BY created_at DESC`,
      [authorId]
    );
  }

  async findTeamSkills(teamId: string) {
    return this.db.query(
      `SELECT * FROM skills WHERE team_id = $1 AND status IN ('team', 'team_pending', 'marketplace_pending', 'marketplace') ORDER BY created_at DESC`,
      [teamId]
    );
  }

  async findMarketplace(teamId: string) {
    return this.db.query(
      `SELECT * FROM skills WHERE team_id = $1 AND status IN ('team', 'marketplace') ORDER BY ratings DESC, installs DESC`,
      [teamId]
    );
  }

  async findOne(id: string) {
    const rows = await this.db.query('SELECT * FROM skills WHERE id = $1', [id]);
    return rows[0];
  }

  async update(id: string, dto: UpdateSkillDto) {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(dto).forEach(([key, value]) => {
      if (value !== undefined) {
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        fields.push(`${snakeKey} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const rows = await this.db.query(
      `UPDATE skills SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    return rows[0];
  }

  async delete(id: string) {
    await this.db.query('DELETE FROM skills WHERE id = $1', [id]);
  }

  async saveVersion(skillId: string, version: string, content: string, configSchema: any, createdBy: string) {
    const rows = await this.db.query(
      `INSERT INTO skill_versions (skill_id, version, content, config_schema, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [skillId, version, content, configSchema, createdBy]
    );
    return rows[0];
  }

  async getVersions(skillId: string) {
    return this.db.query(
      `SELECT sv.*, u.name as created_by_name
       FROM skill_versions sv
       LEFT JOIN users u ON sv.created_by = u.id
       WHERE sv.skill_id = $1
       ORDER BY sv.created_at DESC`,
      [skillId]
    );
  }

  async revertToVersion(skillId: string, versionId: string, userId: string) {
    const versionRows = await this.db.query(
      'SELECT * FROM skill_versions WHERE id = $1 AND skill_id = $2',
      [versionId, skillId]
    );
    const version = versionRows[0];
    if (!version) throw new Error('Version not found');

    await this.db.query(
      `UPDATE skills SET content = $1, config_schema = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [version.content, version.config_schema, skillId]
    );

    return this.findOne(skillId);
  }

  async requestPublishToTeam(id: string) {
    const rows = await this.db.query(
      `UPDATE skills SET status = 'team_pending', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    );
    return rows[0];
  }

  async approveTeamPublish(id: string, reviewerId: string) {
    await this.db.query(
      `INSERT INTO skill_reviews (skill_id, reviewer_id, action, target) VALUES ($1, $2, 'approve', 'team')`,
      [id, reviewerId]
    );
    const rows = await this.db.query(
      `UPDATE skills SET status = 'team', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    );
    return rows[0];
  }

  async rejectTeamPublish(id: string, reviewerId: string, comment: string) {
    await this.db.query(
      `INSERT INTO skill_reviews (skill_id, reviewer_id, action, target, comment) VALUES ($1, $2, 'reject', 'team', $3)`,
      [id, reviewerId, comment]
    );
    const rows = await this.db.query(
      `UPDATE skills SET status = 'personal', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    );
    return rows[0];
  }

  async requestPublishToMarketplace(id: string) {
    const rows = await this.db.query(
      `UPDATE skills SET status = 'marketplace_pending', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    );
    return rows[0];
  }

  async approveMarketplacePublish(id: string, reviewerId: string, marketplaceId: string) {
    await this.db.query(
      `INSERT INTO skill_reviews (skill_id, reviewer_id, action, target) VALUES ($1, $2, 'approve', 'marketplace')`,
      [id, reviewerId]
    );
    const rows = await this.db.query(
      `UPDATE skills SET status = 'marketplace', marketplace_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id, marketplaceId]
    );
    return rows[0];
  }
}