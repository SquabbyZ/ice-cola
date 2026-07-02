// Slice 2026-07-02-gateway-split-extensions: skills / extensions /
// marketplace / experts cluster extracted from GatewayService. Methods
// moved verbatim from gateway.service.ts with identical signatures and
// identical behavior. `private` access modifiers widened to `public`
// (or kept `private` for cluster-internal helpers like `toGatewayExpert`)
// so GatewayService can delegate to them via constructor injection.
//
// Scope:
//   - Extensions: getAllExtensions, getInstalledExtensions, installExtension,
//     uninstallExtension, enableExtension, disableExtension, updateExtensionConfig
//   - Skills: listSkills, getSkill, createSkill, updateSkill,
//     requestPublishSkillToTeam, approveTeamSkillPublish, rejectTeamSkillPublish,
//     requestPublishSkillToMarketplace, deleteSkill
//   - Marketplace: listMarketplaceSkills
//   - Experts: listExperts, getExpert, createExpert, updateExpert, deleteExpert,
//     setActiveExpert, recordExpertUsage, getExpertStats, getExpertCategories,
//     rateExpert, plus the private `toGatewayExpert` helper
//
// `SkillsService` is constructed ad-hoc inside each skills method to preserve
// the verbatim body copy (same dynamic import + `new SkillsService(this.db)`
// pattern as the original gateway.service.ts code). When the 7-arg spec
// constructor form is invoked (no DI for this cluster), GatewayService
// builds a default GatewayExtensionsService bound to the existing
// `db` / `skillsService` fields via Object.create + closure (see
// `buildDefaultExtensionsService` in gateway.service.ts).
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { SkillsService } from '../skills/skills.service';
import { CreateSkillDto } from '../skills/dto/create-skill.dto';
import { UpdateSkillDto } from '../skills/dto/update-skill.dto';

@Injectable()
export class GatewayExtensionsService {
  constructor(private db: DatabaseService) {}

  // ===== Extensions =====

  async getAllExtensions(): Promise<unknown[]> {
    return this.db.findAllExtensions();
  }

  async getInstalledExtensions(params: { userId: string }): Promise<unknown[]> {
    return this.db.findUserInstalledExtensions(params.userId);
  }

  async installExtension(params: { extensionId: string; userId: string; config?: Record<string, unknown> }): Promise<unknown> {
    return this.db.installExtension(params.userId, params.extensionId, params.config);
  }

  async uninstallExtension(params: { extensionId: string; userId: string }): Promise<unknown> {
    return this.db.uninstallExtension(params.userId, params.extensionId);
  }

  async enableExtension(params: { extensionId: string; userId: string }): Promise<unknown> {
    return this.db.enableUserExtension(params.userId, params.extensionId);
  }

  async disableExtension(params: { extensionId: string; userId: string }): Promise<unknown> {
    return this.db.disableUserExtension(params.userId, params.extensionId);
  }

  async updateExtensionConfig(params: { extensionId: string; userId: string; config: Record<string, unknown> }): Promise<unknown> {
    return this.db.updateUserExtensionConfig(params.userId, params.extensionId, params.config);
  }

  // ===== Skills =====

  async listSkills(params: { teamId: string; userId: string; role?: string; status?: string }): Promise<unknown[]> {
    const service = new SkillsService(this.db);
    return service.findAll(params.teamId, params.status, params.userId, params.role);
  }

  async getSkill(params: { id: string; teamId: string; userId: string; role?: string }): Promise<unknown> {
    const service = new SkillsService(this.db);
    return service.findOne(params.id, params.teamId, params.userId, params.role);
  }

  async createSkill(params: { teamId: string; authorId: string; name: string; description?: string; content: string; icon?: string; category?: string; tags?: string[]; config?: Record<string, unknown>; configSchema?: Record<string, unknown> }): Promise<unknown> {
    const service = new SkillsService(this.db);
    const dto = new CreateSkillDto();
    dto.name = params.name;
    dto.description = params.description;
    dto.content = params.content;
    dto.icon = params.icon;
    dto.category = params.category;
    dto.tags = params.tags;
    dto.config = params.config;
    dto.configSchema = params.configSchema;
    return service.create(params.teamId, params.authorId, dto);
  }

  async updateSkill(params: { id: string; teamId: string; userId: string; role?: string; name?: string; description?: string; version?: string; content?: string; icon?: string; category?: string; tags?: string[]; config?: Record<string, unknown>; configSchema?: Record<string, unknown> }): Promise<unknown> {
    const service = new SkillsService(this.db);
    const dto = new UpdateSkillDto();
    dto.name = params.name;
    dto.description = params.description;
    dto.version = params.version;
    dto.content = params.content;
    dto.icon = params.icon;
    dto.category = params.category;
    dto.tags = params.tags;
    dto.config = params.config;
    dto.configSchema = params.configSchema;
    return service.update(params.id, params.teamId, dto, {
      userId: params.userId,
      teamId: params.teamId,
      role: params.role,
    });
  }

  async requestPublishSkillToTeam(params: { id: string; accessPolicy?: { mode: 'all' | 'users' | 'role'; userIds?: string[]; minimumRole?: 'MEMBER' | 'ADMIN' | 'OWNER' } }, actor: { userId: string; teamId: string; role: string }): Promise<unknown> {
    const service = new SkillsService(this.db);
    return service.requestPublishToTeam(params.id, actor, params.accessPolicy);
  }

  async approveTeamSkillPublish(params: { id: string }, actor: { userId: string; teamId: string; role: string }): Promise<unknown> {
    const service = new SkillsService(this.db);
    return service.approveTeamPublish(params.id, actor.userId, actor);
  }

  async rejectTeamSkillPublish(params: { id: string; comment?: string }, actor: { userId: string; teamId: string; role: string }): Promise<unknown> {
    const service = new SkillsService(this.db);
    return service.rejectTeamPublish(params.id, actor.userId, params.comment || '', actor);
  }

  async requestPublishSkillToMarketplace(params: { id: string; note?: string }, actor: { userId: string; teamId: string; role: string }): Promise<unknown> {
    const service = new SkillsService(this.db);
    return service.requestPublishToMarketplace(params.id, actor.userId, params.note, actor);
  }

  async deleteSkill(params: { id: string; teamId: string; userId: string; role?: string }): Promise<void> {
    const service = new SkillsService(this.db);
    return service.delete(params.id, params.teamId, {
      userId: params.userId,
      teamId: params.teamId,
      role: params.role,
    });
  }

  // ===== Marketplace =====

  async listMarketplaceSkills(params: { teamId: string }): Promise<unknown[]> {
    const result = await this.db.query(
      `SELECT mi.*, mc.name as category_name, mc.slug as category_slug
       FROM marketplace_items mi
       LEFT JOIN marketplace_categories mc ON mi.category_id = mc.id
       WHERE mi.type = 'skill' AND mi.status = 'approved'
       ORDER BY mi.install_count DESC, mi.rating DESC
       LIMIT 100`
    );
    return result;
  }

  // ===== Experts =====

  async listExperts(params: { teamId?: string; skip?: number; take?: number; category?: string } = {}) {
    const skip = params.skip || 0;
    const take = params.take || 50;

    const experts = await this.db.listExperts(params.teamId, skip, take, params.category);
    const total = await this.db.countExperts(params.teamId, params.category);

    return {
      ok: true,
      experts: experts.map((e: any) => this.toGatewayExpert(e)),
      total,
    };
  }

  async getExpert(params: { id: string; teamId?: string }) {
    const expert = await this.db.findExpertByIdForTeam(params.id, params.teamId);
    if (!expert) {
      throw new Error('Expert not found');
    }

    return {
      ok: true,
      expert: this.toGatewayExpert(expert),
    };
  }

  async createExpert(params: {
    name: string;
    description?: string;
    systemPrompt?: string;
    icon?: string;
    color?: string;
    category?: string;
    teamId?: string;
    isDefault?: boolean;
  }) {
    if (!params.name) {
      throw new Error('Expert name is required');
    }

    const expert = await this.db.createExpert({
      teamId: params.teamId,
      name: params.name,
      description: params.description,
      systemPrompt: params.systemPrompt,
      icon: params.icon || '🤖',
      color: params.color || '#3B82F6',
      category: params.category,
      isDefault: params.isDefault,
    });

    return {
      ok: true,
      expert: this.toGatewayExpert(expert),
    };
  }

  async updateExpert(params: {
    id: string;
    name?: string;
    description?: string;
    systemPrompt?: string;
    icon?: string;
    color?: string;
    category?: string;
    teamId?: string;
    enabled?: boolean;
    isDefault?: boolean;
    callCount?: number;
    rating?: number;
  }) {
    if (!params.teamId) {
      throw new Error('Authentication required');
    }

    const existing = await this.db.findTeamExpertById(params.id, params.teamId);
    if (!existing) {
      throw new Error('Expert not found');
    }

    // Build updates object with only provided fields
    const updates: any = {};
    if (params.name !== undefined) updates.name = params.name;
    if (params.description !== undefined) updates.description = params.description;
    if (params.systemPrompt !== undefined) updates.systemPrompt = params.systemPrompt;
    if (params.icon !== undefined) updates.icon = params.icon;
    if (params.color !== undefined) updates.color = params.color;
    if (params.category !== undefined) updates.category = params.category;

    const updated = await this.db.updateExpert(params.id, updates);

    return {
      ok: true,
      expert: this.toGatewayExpert(updated),
    };
  }

  async deleteExpert(params: { id: string; teamId?: string }) {
    if (!params.teamId) {
      throw new Error('Authentication required');
    }

    const existing = await this.db.findTeamExpertById(params.id, params.teamId);
    if (!existing) {
      throw new Error('Expert not found');
    }

    await this.db.deleteExpert(params.id);

    return {
      ok: true,
      message: 'Expert deleted successfully',
    };
  }

  async setActiveExpert(params: { id: string; teamId?: string; userId?: string }) {
    // This would typically update a user preference or session state
    // For now, we just return success
    const expert = await this.db.findExpertByIdForTeam(params.id, params.teamId);
    if (!expert) {
      throw new Error('Expert not found');
    }

    return {
      ok: true,
      activeExpert: {
        id: expert.id,
        name: expert.name,
        systemPrompt: expert.systemPrompt ?? expert.systemprompt,
      },
    };
  }

  async recordExpertUsage(params: {
    expertId: string;
    userId: string;
    teamId?: string;
    tokens?: number;
    duration?: number;
  }) {
    const expert = await this.db.findExpertByIdForTeam(params.expertId, params.teamId);
    if (!expert) {
      throw new Error('Expert not found');
    }

    // Record the usage
    await this.db.createExpertUsage({
      expertId: params.expertId,
      userId: params.userId,
      teamId: params.teamId,
      tokens: params.tokens,
      duration: params.duration,
    });

    // Increment call count
    await this.db.incrementExpertCallCount(params.expertId);

    return {
      ok: true,
    };
  }

  async getExpertStats(params: { id: string; teamId?: string }) {
    const expert = await this.db.findExpertByIdForTeam(params.id, params.teamId);
    if (!expert) {
      throw new Error('Expert not found');
    }

    const stats = await this.db.getExpertStats(params.id);

    const [dailyStats, weeklyStats, monthlyStats] = await Promise.all([
      this.db.getExpertUsageStats(params.id, 'day'),
      this.db.getExpertUsageStats(params.id, 'week'),
      this.db.getExpertUsageStats(params.id, 'month'),
    ]);

    return {
      ok: true,
      stats: {
        ...stats,
        daily: dailyStats,
        weekly: weeklyStats,
        monthly: monthlyStats,
      },
    };
  }

  async getExpertCategories(params: { teamId?: string }) {
    // Get distinct categories from experts
    let query = 'SELECT DISTINCT category FROM experts WHERE category IS NOT NULL';
    const paramsArray: any[] = [];

    if (params.teamId) {
      query += ' AND ("teamId" = $1 OR "teamId" IS NULL)';
      paramsArray.push(params.teamId);
    } else {
      query += ' AND "teamId" IS NULL';
    }

    query += ' ORDER BY category';

    const results = await this.db.query(query, paramsArray);

    return {
      ok: true,
      categories: results.map((r: any) => r.category),
    };
  }

  async rateExpert(params: { id: string; rating: number; teamId?: string }) {
    if (params.rating < 1 || params.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }
    if (!params.teamId) {
      throw new Error('Authentication required');
    }

    const existing = await this.db.findTeamExpertById(params.id, params.teamId);
    if (!existing) {
      throw new Error('Expert not found');
    }

    const expert = await this.db.updateExpertRating(params.id, params.rating);

    return {
      ok: true,
      expert: {
        id: expert.id,
        rating: expert.rating,
      },
    };
  }

  private toGatewayExpert(expert: any) {
    return {
      id: expert.id,
      name: expert.name,
      description: expert.description || '',
      systemPrompt: expert.systemPrompt ?? expert.systemprompt ?? '',
      icon: expert.icon || '🤖',
      color: expert.color || '#3B82F6',
      category: expert.category || null,
      sourceId: expert.source_id || null,
      marketplaceId: expert.marketplace_id || null,
      isDefault: expert.is_default || false,
      enabled: expert.enabled ?? true,
      callCount: expert.call_count || 0,
      rating: expert.rating || 0,
      teamId: expert.teamId ?? expert.teamid ?? null,
      createdAt: expert.createdAt ?? expert.createdat,
      updatedAt: expert.updatedAt ?? expert.updatedat,
    };
  }
}
