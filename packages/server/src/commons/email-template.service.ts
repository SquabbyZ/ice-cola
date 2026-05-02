import { Injectable, Logger, Global } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface EmailTemplate {
  id: string;
  key: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

@Global()
@Injectable()
export class EmailTemplateService {
  private readonly logger = new Logger(EmailTemplateService.name);

  constructor(private db: DatabaseService) {}

  async findByKey(key: string): Promise<EmailTemplate | null> {
    const template = await this.db.queryOne<any>(
      'SELECT * FROM email_templates WHERE key = $1',
      [key]
    );

    if (!template) {
      return null;
    }

    return this.mapToEmailTemplate(template);
  }

  async findAll(): Promise<EmailTemplate[]> {
    const templates = await this.db.query<any>(
      'SELECT * FROM email_templates ORDER BY key ASC'
    );

    return templates.map(t => this.mapToEmailTemplate(t));
  }

  async update(key: string, data: { subject?: string; body?: string }): Promise<EmailTemplate | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.subject !== undefined) {
      updates.push(`subject = $${paramIndex++}`);
      values.push(data.subject);
    }
    if (data.body !== undefined) {
      updates.push(`body = $${paramIndex++}`);
      values.push(data.body);
    }

    if (updates.length === 0) {
      return this.findByKey(key);
    }

    updates.push(`"updatedAt" = NOW()`);
    values.push(key);

    const result = await this.db.queryOne<any>(
      `UPDATE email_templates SET ${updates.join(', ')} WHERE key = $${paramIndex} RETURNING *`,
      values
    );

    if (!result) {
      return null;
    }

    return this.mapToEmailTemplate(result);
  }

  renderTemplate(body: string, variables: Record<string, string>): string {
    return body.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? '');
  }

  async renderByKey(key: string, variables: Record<string, string>): Promise<{ subject: string; body: string } | null> {
    const template = await this.findByKey(key);

    if (!template || !template.isActive) {
      return null;
    }

    return {
      subject: this.renderTemplate(template.subject, variables),
      body: this.renderTemplate(template.body, variables),
    };
  }

  private mapToEmailTemplate(row: any): EmailTemplate {
    let variables: string[] = [];
    if (row.variables) {
      if (typeof row.variables === 'string') {
        try {
          variables = JSON.parse(row.variables);
        } catch (e) {
          variables = [];
        }
      } else {
        variables = row.variables;
      }
    }

    return {
      id: row.id,
      key: row.key,
      name: row.name,
      subject: row.subject,
      body: row.body,
      variables,
      isActive: row.is_active,
      createdAt: row.createdat ? new Date(row.createdat).toISOString() : null,
      updatedAt: row.updatedat ? new Date(row.updatedat).toISOString() : null,
    };
  }
}