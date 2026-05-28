import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { SkillsService } from '../skills/skills.service';
import { MarketplaceService } from '../marketplace/marketplace.service';

@Injectable()
export class WorkordersService {
  private readonly logger = new Logger(WorkordersService.name);

  constructor(
    private databaseService: DatabaseService,
    private skillsService: SkillsService,
    private marketplaceService: MarketplaceService,
  ) {}

  async create(data: {
    type: string;
    targetId: string;
    targetName: string;
    targetIcon?: string;
    applicantId: string;
    applicantName: string;
    teamId: string;
    note?: string;
    visibilityScope?: any;
  }) {
    const id = this.generateUUID();
    const notePayload = JSON.stringify({
      message: data.note || null,
      visibilityScope: data.visibilityScope || null,
    });
    const result = await this.databaseService.queryOne(
      `INSERT INTO workorders (id, type, target_id, target_name, target_icon, applicant_id, applicant_name, team_id, status, note, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, NOW(), NOW())
       RETURNING *`,
      [id, data.type, data.targetId, data.targetName, data.targetIcon || null,
       data.applicantId, data.applicantName, data.teamId, notePayload]
    );
    return result;
  }

  async findAll(teamId: string) {
    return this.databaseService.query(
      `SELECT * FROM workorders WHERE team_id = $1 ORDER BY "createdAt" DESC`,
      [teamId]
    );
  }

  async findHistory(teamId: string) {
    return this.databaseService.query(
      `SELECT * FROM workorder_history WHERE "teamId" = $1 ORDER BY "processedAt" DESC`,
      [teamId]
    );
  }

  async approve(workorderId: string, approverId: string, comment?: string) {
    const result = await this.databaseService.queryOne(
      `UPDATE workorders SET status = 'approved', "updatedAt" = NOW() WHERE id = $1 RETURNING *`,
      [workorderId]
    );

    if (result) {
      await this.databaseService.query(
        `INSERT INTO workorder_history (id, "workorderId", "teamId", type, "targetName", "approverId", "approverName", result, comment, "processedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'approved', $8, NOW())`,
        [this.generateUUID(), workorderId, result.team_id, result.type, result.target_name, approverId, '审批人', comment || null]
      );

      // Parse note to extract message and visibilityScope
      let noteMessage: string | undefined;
      let visibilityScope: any;
      try {
        const noteData = JSON.parse(result.note || '{}');
        noteMessage = noteData.message || undefined;
        visibilityScope = noteData.visibilityScope || undefined;
      } catch {
        noteMessage = result.note || undefined;
      }

      // Trigger marketplace submission based on type
      if (result.type === 'skill') {
        try {
          await this.skillsService.requestPublishToMarketplace(
            result.target_id,
            approverId,
            noteMessage,
          );
          this.logger.log(`Skill ${result.target_id} submitted to marketplace after workorder approval`);
        } catch (err) {
          this.logger.error(`Failed to submit skill ${result.target_id} to marketplace: ${err}`);
        }
      } else if (result.type === 'mcp' || result.type === 'extension' || result.type === 'expert') {
        try {
          await this.submitToMarketplace(result.type, result.target_id, approverId, noteMessage);
          this.logger.log(`${result.type} ${result.target_id} submitted to marketplace after workorder approval`);
        } catch (err) {
          this.logger.error(`Failed to submit ${result.type} ${result.target_id} to marketplace: ${err}`);
        }
      }
    }

    return result;
  }

  async reject(workorderId: string, approverId: string, comment: string) {
    const result = await this.databaseService.queryOne(
      `UPDATE workorders SET status = 'rejected', "updatedAt" = NOW() WHERE id = $1 RETURNING *`,
      [workorderId]
    );

    if (result) {
      await this.databaseService.query(
        `INSERT INTO workorder_history (id, "workorderId", "teamId", type, "targetName", "approverId", "approverName", result, comment, "processedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'rejected', $8, NOW())`,
        [this.generateUUID(), workorderId, result.team_id, result.type, result.target_name, approverId, '审批人', comment]
      );
    }

    return result;
  }

  async batchApprove(workorderIds: string[], approverId: string, comment?: string) {
    const results = [];
    for (const id of workorderIds) {
      const result = await this.approve(id, approverId, comment);
      results.push(result);
    }
    return results;
  }

  async batchReject(workorderIds: string[], approverId: string, comment: string) {
    const results = [];
    for (const id of workorderIds) {
      const result = await this.reject(id, approverId, comment);
      results.push(result);
    }
    return results;
  }

  private async submitToMarketplace(type: string, sourceId: string, submitterId: string, note?: string) {
    // Look up source data based on type
    let sourceData: any;
    if (type === 'mcp') {
      sourceData = await this.databaseService.queryOne(
        `SELECT * FROM mcp_servers WHERE id = $1`, [sourceId]
      );
    } else if (type === 'extension') {
      sourceData = await this.databaseService.queryOne(
        `SELECT * FROM extensions WHERE id = $1`, [sourceId]
      );
    } else if (type === 'expert') {
      sourceData = await this.databaseService.queryOne(
        `SELECT * FROM experts WHERE id = $1`, [sourceId]
      );
    } else {
      return;
    }

    if (!sourceData) {
      this.logger.warn(`Source ${type} ${sourceId} not found, skipping marketplace submission`);
      return;
    }

    const marketplaceId = this.generateUUID();
    const slug = `${type}-${marketplaceId.substring(0, 8)}`;

    // Create marketplace item with pending_approval status
    const item = await this.databaseService.queryOne(
      `INSERT INTO marketplace_items (type, name, slug, description, version, author_id, icon, color, category_id, tags, metadata, source_id, config_schema, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL, $9, $10, $11, $12, 'pending_approval')
       RETURNING *`,
      [
        type,
        sourceData.name,
        slug,
        sourceData.description || null,
        sourceData.version || '1.0.0',
        submitterId,
        sourceData.icon || null,
        sourceData.color || null,
        JSON.stringify(sourceData.tags || []),
        sourceData.instructions ? JSON.stringify({ instructions: sourceData.instructions }) : null,
        sourceId,
        sourceData.config_schema ? (typeof sourceData.config_schema === 'string' ? sourceData.config_schema : JSON.stringify(sourceData.config_schema)) : null,
      ]
    );

    // Create submission record
    const submission = await this.databaseService.queryOne(
      `INSERT INTO marketplace_submissions (item_id, version, submitter_id, note, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [item.id, sourceData.version || '1.0.0', submitterId, note || null]
    );

    return { item, submission };
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}