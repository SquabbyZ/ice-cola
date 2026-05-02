import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class WorkordersService {
  constructor(private databaseService: DatabaseService) {}

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

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}