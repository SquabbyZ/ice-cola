import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { DatabaseService } from '../database/database.service';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';

type SkillAccessMode = 'all' | 'users' | 'role';
type TeamMinimumRole = 'MEMBER' | 'ADMIN' | 'OWNER';
type SkillQueryParam = string | number | boolean | string[] | Record<string, unknown> | null | undefined;

type SkillReviewerRole = 'MEMBER' | 'ADMIN' | 'OWNER';

interface SkillActor {
  userId: string;
  teamId?: string | null;
  role?: SkillReviewerRole | string | null;
}

export interface TeamSkillAccessPolicy {
  mode: SkillAccessMode;
  userIds?: string[];
  minimumRole?: TeamMinimumRole;
}

export interface SkillRow {
  id: string;
  name: string;
  description?: string | null;
  version: string;
  icon?: string | null;
  category?: string | null;
  tags?: string[] | null;
  content: string;
  config?: Record<string, unknown> | null;
  team_id?: string | null;
  author_id?: string | null;
  marketplace_id?: string | null;
  status: string;
}

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

  async findAll(teamId: string, status?: string, userId?: string, role?: string | null) {
    let query = `SELECT * FROM skills WHERE (team_id = $1 OR team_id IS NULL) AND ${this.skillAccessSql('skills', 2, 3)}`;
    const params: SkillQueryParam[] = [teamId, userId || null, role || null];

    if (status) {
      query += ' AND status = $4';
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

  async findTeamSkills(teamId: string, userId?: string, role?: string | null) {
    return this.db.query(
      `SELECT * FROM skills
       WHERE (team_id = $1 OR team_id IS NULL)
         AND status IN ('team', 'team_pending', 'marketplace_pending', 'marketplace')
         AND ${this.skillAccessSql('skills', 2, 3)}
       ORDER BY created_at DESC`,
      [teamId, userId || null, role || null]
    );
  }

  async findMarketplace(teamId: string, userId?: string, role?: string | null) {
    return this.db.query(
      `SELECT * FROM skills
       WHERE (team_id = $1 OR team_id IS NULL)
         AND status IN ('team', 'marketplace')
         AND ${this.skillAccessSql('skills', 2, 3)}
       ORDER BY ratings DESC, installs DESC`,
      [teamId, userId || null, role || null]
    );
  }

  async findOne(id: string, teamId: string, userId?: string, role?: string | null) {
    const rows = await this.db.query(
      `SELECT * FROM skills
       WHERE id = $1
         AND (team_id = $2 OR team_id IS NULL)
         AND ${this.skillAccessSql('skills', 3, 4)}`,
      [id, teamId, userId || null, role || null]
    );
    return rows[0];
  }

  async update(id: string, teamId: string, dto: UpdateSkillDto, actor?: SkillActor) {
    await this.assertCanModifySkill(id, teamId, actor);
    const fieldMap: Array<[keyof UpdateSkillDto, string]> = [
      ['name', 'name'],
      ['description', 'description'],
      ['version', 'version'],
      ['icon', 'icon'],
      ['category', 'category'],
      ['tags', 'tags'],
      ['content', 'content'],
      ['configSchema', 'config_schema'],
      ['config', 'config'],
    ];
    const fields: string[] = [];
    const values: SkillQueryParam[] = [];
    let paramCount = 1;

    for (const [key, column] of fieldMap) {
      const value = dto[key];
      if (value !== undefined) {
        fields.push(`${column} = $${paramCount}`);
        values.push(key === 'config' ? this.withoutProtectedConfig(value) : value);
        paramCount++;
      }
    }

    if (fields.length === 0) {
      return this.findOne(id, teamId);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id, teamId);

    const rows = await this.db.query(
      `UPDATE skills SET ${fields.join(', ')} WHERE id = $${paramCount} AND team_id = $${paramCount + 1} RETURNING *`,
      values
    );
    return rows[0];
  }

  async delete(id: string, teamId: string, actor?: SkillActor) {
    await this.assertCanModifySkill(id, teamId, actor);
    await this.db.query('DELETE FROM skills WHERE id = $1 AND team_id = $2', [id, teamId]);
  }

  async assertConversationAccess(conversationId: string, teamId: string): Promise<void> {
    const rows = await this.db.query<{ id: string }>(
      'SELECT id FROM conversations WHERE id = $1 AND "teamId" = $2',
      [conversationId, teamId]
    );
    if (rows.length === 0) {
      throw new ForbiddenException('Conversation access denied');
    }
  }

  async findEnabledSkillsForConversation(conversationId: string, teamId: string, userId?: string, role?: string | null): Promise<SkillRow[]> {
    return this.db.query<SkillRow>(
      `SELECT s.* FROM skills s
       INNER JOIN conversation_skills cs ON cs.skill_id = s.id
       WHERE cs.conversation_id = $1
         AND cs.enabled = true
         AND (s.team_id = $2 OR s.team_id IS NULL)
         AND ${this.skillAccessSql('s', 3, 4)}
       ORDER BY cs.created_at ASC`,
      [conversationId, teamId, userId || null, role || null]
    );
  }

  async findSkillsByIdsForTeam(skillIds: string[], teamId: string, userId?: string, role?: string | null): Promise<SkillRow[]> {
    const uniqueIds = [...new Set(skillIds.filter(Boolean))];
    if (uniqueIds.length === 0) {
      return [];
    }
    return this.db.query<SkillRow>(
      `SELECT * FROM skills
       WHERE id = ANY($1)
         AND (team_id = $2 OR team_id IS NULL)
         AND ${this.skillAccessSql('skills', 3, 4)}`,
      [uniqueIds, teamId, userId || null, role || null]
    );
  }

  async getConversationSkillIds(conversationId: string, teamId: string): Promise<string[]> {
    const rows = await this.db.query<{ skill_id: string }>(
      `SELECT cs.skill_id FROM conversation_skills cs
       INNER JOIN skills s ON s.id = cs.skill_id
       WHERE cs.conversation_id = $1 AND (s.team_id = $2 OR s.team_id IS NULL)`,
      [conversationId, teamId]
    );
    return rows.map(r => r.skill_id);
  }

  async setConversationSkills(conversationId: string, teamId: string, skillIds: string[], userId?: string, role?: string | null): Promise<string[]> {
    const uniqueIds = [...new Set(skillIds.filter(Boolean))];

    if (uniqueIds.length > 0) {
      const valid = await this.db.query<{ id: string }>(
        `SELECT id FROM skills
         WHERE id = ANY($1)
           AND (team_id = $2 OR team_id IS NULL)
           AND ${this.skillAccessSql('skills', 3, 4)}`,
        [uniqueIds, teamId, userId || null, role || null]
      );
      const validIds = new Set(valid.map(v => v.id));
      const filtered = uniqueIds.filter(id => validIds.has(id));

      return this.db.transaction(async (client) => {
        await client.query('DELETE FROM conversation_skills WHERE conversation_id = $1', [conversationId]);
        for (const skillId of filtered) {
          await client.query(
            `INSERT INTO conversation_skills (conversation_id, skill_id, enabled) VALUES ($1, $2, true)
             ON CONFLICT (conversation_id, skill_id) DO UPDATE SET enabled = true, updated_at = CURRENT_TIMESTAMP`,
            [conversationId, skillId]
          );
        }
        return filtered;
      });
    }

    await this.db.query('DELETE FROM conversation_skills WHERE conversation_id = $1', [conversationId]);
    return [];
  }

  async saveVersion(skillId: string, version: string, content: string, configSchema: Record<string, unknown> | null | undefined, createdBy: string) {
    const rows = await this.db.query(
      `INSERT INTO skill_versions (skill_id, version, content, config_schema, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [skillId, version, content, configSchema, createdBy]
    );
    return rows[0];
  }

  async getVersions(skillId: string, teamId: string, actor?: SkillActor) {
    await this.assertCanModifySkill(skillId, teamId, actor);
    return this.db.query(
      `SELECT sv.*, u.name as created_by_name
       FROM skill_versions sv
       JOIN skills s ON s.id = sv.skill_id
       LEFT JOIN users u ON sv.created_by = u.id
       WHERE sv.skill_id = $1 AND s.team_id = $2
       ORDER BY sv.created_at DESC`,
      [skillId, teamId]
    );
  }

  async revertToVersion(skillId: string, versionId: string, userId: string, teamId: string, actor?: SkillActor) {
    await this.assertCanModifySkill(skillId, teamId, actor ?? { userId, teamId });
    const versionRows = await this.db.query<{ content: string; config_schema?: Record<string, unknown> | null }>(
      `SELECT sv.*
       FROM skill_versions sv
       JOIN skills s ON s.id = sv.skill_id
       WHERE sv.id = $1 AND sv.skill_id = $2 AND s.team_id = $3`,
      [versionId, skillId, teamId]
    );
    const version = versionRows[0];
    if (!version) throw new Error('Version not found');

    await this.db.query(
      'UPDATE skills SET content = $1, config_schema = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND team_id = $4',
      [version.content, version.config_schema, skillId, teamId]
    );

    return this.findOne(skillId, teamId, actor?.userId ?? userId, actor?.role);
  }

  async requestPublishToTeam(id: string, actor: SkillActor, accessPolicy: TeamSkillAccessPolicy = { mode: 'all' }) {
    return this.withClient(async (client) => {
      const skill = await this.requireSkill(id, client);
      if (skill.status !== 'personal') {
        throw new BadRequestException('只有个人 Skill 可以提交到团队');
      }
      if (!actor.teamId || !skill.team_id || skill.team_id !== actor.teamId || skill.author_id !== actor.userId) {
        throw new ForbiddenException('只能提交自己所在团队的个人 Skill');
      }

      const normalizedPolicy = this.normalizeAccessPolicy(accessPolicy);
      await this.assertAccessPolicyUsersInTeam(skill, normalizedPolicy, client);
      const config = this.withTeamAccessPolicy(skill.config, normalizedPolicy);
      const rows = await this.queryRows<SkillRow>(
        client,
        `UPDATE skills SET status = 'team_pending', config = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
        [id, config]
      );
      return rows[0];
    });
  }

  async approveTeamPublish(id: string, reviewerId: string, actor?: SkillActor) {
    return this.withClient(async (client) => {
      const skill = await this.requireSkill(id, client);
      if (skill.status !== 'team_pending') {
        throw new BadRequestException('只有待团队审批的 Skill 可以通过');
      }
      this.assertTeamReviewer(skill, actor ?? { userId: reviewerId });

      await client.query(
        `INSERT INTO skill_reviews (skill_id, reviewer_id, action, target) VALUES ($1, $2, 'approve', 'team')`,
        [id, actor?.userId ?? reviewerId]
      );
      const rows = await this.queryRows<SkillRow>(
        client,
        `UPDATE skills SET status = 'team', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
        [id]
      );
      return rows[0];
    });
  }

  async rejectTeamPublish(id: string, reviewerId: string, comment: string, actor?: SkillActor) {
    return this.withClient(async (client) => {
      const skill = await this.requireSkill(id, client);
      if (skill.status !== 'team_pending') {
        throw new BadRequestException('只有待团队审批的 Skill 可以拒绝');
      }
      this.assertTeamReviewer(skill, actor ?? { userId: reviewerId });

      await client.query(
        `INSERT INTO skill_reviews (skill_id, reviewer_id, action, target, comment) VALUES ($1, $2, 'reject', 'team', $3)`,
        [id, actor?.userId ?? reviewerId, comment]
      );
      const rows = await this.queryRows<SkillRow>(
        client,
        `UPDATE skills SET status = 'personal', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
        [id]
      );
      return rows[0];
    });
  }

  async requestPublishToMarketplace(id: string, requesterId?: string, note?: string, actor?: SkillActor) {
    return this.withClient(async (client) => {
      const skill = await this.requireSkill(id, client);
      if (skill.status !== 'team') {
        throw new BadRequestException('只有团队已发布的 Skill 可以提交到市场');
      }
      if (actor) {
        this.assertTeamReviewer(skill, actor);
      }

      const marketplaceItem = await this.createMarketplaceSkillItem(skill, client);
      const submission = await this.queryOne(
        client,
        `INSERT INTO marketplace_submissions (item_id, version, submitter_id, note, status)
         VALUES ($1, $2, $3, $4, 'pending')
         RETURNING *`,
        [marketplaceItem.id, skill.version, actor?.userId ?? requesterId ?? skill.author_id ?? null, note || null]
      );

      await client.query(
        `UPDATE skills SET status = 'marketplace_pending', marketplace_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [id, String(marketplaceItem.id)]
      );

      return { skill: await this.findOneWithClient(id, client), marketplaceItem, submission };
    });
  }

  async approveMarketplacePublish(id: string, reviewerId: string, marketplaceId: string) {
    return this.withClient(async (client) => {
      const skill = await this.requireSkill(id, client);
      if (skill.status !== 'marketplace_pending') {
        throw new BadRequestException('只有待市场审批的 Skill 可以通过');
      }

      await client.query(
        `INSERT INTO skill_reviews (skill_id, reviewer_id, action, target) VALUES ($1, $2, 'approve', 'marketplace')`,
        [id, reviewerId]
      );
      const rows = await this.queryRows<SkillRow>(
        client,
        `UPDATE skills SET status = 'marketplace', marketplace_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
        [id, marketplaceId]
      );
      return rows[0];
    });
  }

  private async requireSkill(id: string, client?: PoolClient): Promise<SkillRow> {
    const skill = client ? await this.findOneWithClient(id, client) : await this.findOneById(id) as SkillRow | undefined;
    if (!skill) {
      throw new NotFoundException('Skill 不存在');
    }
    return skill;
  }

  private normalizeAccessPolicy(accessPolicy: TeamSkillAccessPolicy): TeamSkillAccessPolicy {
    if (accessPolicy.mode === 'all') {
      return { mode: 'all' };
    }

    if (accessPolicy.mode === 'users') {
      const userIds = [...new Set(accessPolicy.userIds ?? [])].map(id => id.trim()).filter(Boolean);
      if (userIds.length === 0) {
        throw new BadRequestException('指定人可用时必须至少选择一个用户');
      }
      return { mode: 'users', userIds };
    }

    if (accessPolicy.mode === 'role') {
      const minimumRole = accessPolicy.minimumRole ?? 'MEMBER';
      if (!this.isTeamRole(minimumRole)) {
        throw new BadRequestException('最小角色必须是 MEMBER、ADMIN 或 OWNER');
      }
      return { mode: 'role', minimumRole };
    }

    throw new BadRequestException('不支持的 Skill 团队访问策略');
  }

  private withoutProtectedConfig(config: unknown): Record<string, unknown> {
    const { teamAccess, ...rest } = (config && typeof config === 'object' && !Array.isArray(config))
      ? config as Record<string, unknown>
      : {};
    return rest;
  }

  private async assertCanModifySkill(id: string, teamId: string, actor?: SkillActor): Promise<void> {
    const skill = await this.findOneById(id) as SkillRow | undefined;
    if (!skill || skill.team_id !== teamId) {
      throw new NotFoundException('Skill 不存在');
    }
    if (!actor?.teamId || actor.teamId !== teamId) {
      throw new ForbiddenException('不能修改其他团队的 Skill');
    }
    if (skill.status === 'personal' || skill.status === 'team_pending' || skill.status === 'marketplace_pending') {
      if (skill.author_id !== actor.userId) {
        throw new ForbiddenException('只能修改自己的 Skill');
      }
      return;
    }
    if (actor.role !== 'ADMIN' && actor.role !== 'OWNER') {
      throw new ForbiddenException('只有团队管理员或所有者可以修改团队 Skill');
    }
  }

  private assertTeamReviewer(skill: SkillRow, actor: SkillActor): void {
    if (!actor.teamId || !skill.team_id || actor.teamId !== skill.team_id) {
      throw new ForbiddenException('不能审批其他团队的 Skill');
    }
    if (actor.role !== 'ADMIN' && actor.role !== 'OWNER') {
      throw new ForbiddenException('只有团队管理员或所有者可以执行该操作');
    }
  }

  private isTeamRole(role: unknown): role is TeamMinimumRole {
    return role === 'MEMBER' || role === 'ADMIN' || role === 'OWNER';
  }

  private skillAccessSql(alias: string, userParam: number, roleParam: number): string {
    const configRef = alias === 'skills' ? 'config' : `${alias}.config`;
    const statusRef = alias === 'skills' ? 'status' : `${alias}.status`;
    const authorRef = alias === 'skills' ? 'author_id' : `${alias}.author_id`;
    return `(
      ${statusRef} = 'personal' AND ${authorRef} = $${userParam}
      OR ${statusRef} IN ('team', 'marketplace') AND COALESCE(${configRef}->'teamAccess'->>'mode', 'all') = 'all'
      OR ${statusRef} IN ('team', 'marketplace') AND ${configRef}->'teamAccess'->>'mode' = 'users' AND (${configRef}->'teamAccess'->'userIds') ? $${userParam}
      OR ${statusRef} IN ('team', 'marketplace') AND ${configRef}->'teamAccess'->>'mode' = 'role' AND CASE ${configRef}->'teamAccess'->>'minimumRole'
        WHEN 'OWNER' THEN $${roleParam} = 'OWNER'
        WHEN 'ADMIN' THEN $${roleParam} IN ('ADMIN', 'OWNER')
        ELSE $${roleParam} IN ('MEMBER', 'ADMIN', 'OWNER')
      END
    )`;
  }

  private async assertAccessPolicyUsersInTeam(skill: SkillRow, accessPolicy: TeamSkillAccessPolicy, client: PoolClient): Promise<void> {
    if (accessPolicy.mode !== 'users') {
      return;
    }

    const rows = await this.queryRows<{ id: string }>(
      client,
      'SELECT id FROM users WHERE id = ANY($1) AND "teamId" = $2',
      [accessPolicy.userIds, skill.team_id]
    );
    if (rows.length !== accessPolicy.userIds.length) {
      throw new BadRequestException('指定成员必须属于当前团队');
    }
  }

  private withTeamAccessPolicy(config: Record<string, unknown> | null | undefined, accessPolicy: TeamSkillAccessPolicy): Record<string, unknown> {
    return {
      ...(config ?? {}),
      teamAccess: accessPolicy,
    };
  }

  private async createMarketplaceSkillItem(skill: SkillRow, client: PoolClient): Promise<{ id: number }> {
    const existing = await this.queryOne<{ id: number }>(
      client,
      'SELECT id FROM marketplace_items WHERE source_id = $1 AND type = $2',
      [skill.id, 'skill']
    );

    if (existing) {
      await client.query(
        `UPDATE marketplace_items SET name = $1, description = $2, version = $3, icon = $4, tags = $5, metadata = $6, status = 'pending_approval', updated_at = NOW() WHERE id = $7`,
        [skill.name, skill.description || null, skill.version, skill.icon || null, skill.tags || [], JSON.stringify({ skillId: skill.id, teamId: skill.team_id }), existing.id]
      );
      return existing;
    }

    return this.queryOne(
      client,
      `INSERT INTO marketplace_items (type, name, slug, description, version, author_id, icon, tags, metadata, source_id, status)
       VALUES ('skill', $1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending_approval')
       RETURNING id`,
      [skill.name, this.createMarketplaceSlug(skill), skill.description || null, skill.version, skill.author_id || null, skill.icon || null, skill.tags || [], JSON.stringify({ skillId: skill.id, teamId: skill.team_id }), skill.id]
    );
  }

  private async findOneById(id: string): Promise<SkillRow | undefined> {
    const rows = await this.db.query<SkillRow>('SELECT * FROM skills WHERE id = $1', [id]);
    return rows[0];
  }

  private async findOneWithClient(id: string, client: PoolClient): Promise<SkillRow | undefined> {
    const rows = await this.queryRows<SkillRow>(client, 'SELECT * FROM skills WHERE id = $1', [id]);
    return rows[0];
  }

  private queryRows<T>(client: PoolClient, text: string, params?: unknown[]): Promise<T[]> {
    return client.query(text, params).then(result => result.rows as T[]);
  }

  private async queryOne<T>(client: PoolClient, text: string, params?: unknown[]): Promise<T> {
    const rows = await this.queryRows<T>(client, text, params);
    return rows[0];
  }

  private async withClient<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    return this.db.transaction(callback);
  }

  private createMarketplaceSlug(skill: SkillRow): string {
    return `skill-${skill.id}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  }
}