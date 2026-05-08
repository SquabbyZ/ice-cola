import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { QueryItemsDto } from './dto/query-items.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class MarketplaceService {
  constructor(private readonly db: DatabaseService) {}

  // ============================================================
  // Marketplace Items
  // ============================================================

  async findItems(query: QueryItemsDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    let where = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (query.type) {
      where += ` AND mi.type = $${paramIndex++}`;
      params.push(query.type);
    }

    if (query.status) {
      where += ` AND mi.status = $${paramIndex++}`;
      params.push(query.status);
    } else {
      // Default: only show approved items for public listing
      where += ` AND mi.status = 'approved'`;
    }

    if (query.category) {
      where += ` AND mc.slug = $${paramIndex++}`;
      params.push(query.category);
    }

    if (query.search) {
      where += ` AND (mi.name ILIKE $${paramIndex} OR mi.description ILIKE $${paramIndex})`;
      params.push(`%${query.search}%`);
      paramIndex++;
    }

    const countResult = await this.db.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM marketplace_items mi
       LEFT JOIN marketplace_categories mc ON mi.category_id = mc.id
       ${where}`,
      params,
    );
    const total = parseInt(countResult?.count || '0', 10);

    params.push(limit);
    params.push(offset);

    const items = await this.db.query(
      `SELECT mi.*, mc.name as category_name, mc.slug as category_slug,
              u.name as author_name
       FROM marketplace_items mi
       LEFT JOIN marketplace_categories mc ON mi.category_id = mc.id
       LEFT JOIN users u ON mi.author_id = u.id
       ${where}
       ORDER BY mi.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      params,
    );

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findItemById(id: number) {
    const item = await this.db.queryOne(
      `SELECT mi.*, mc.name as category_name, mc.slug as category_slug,
              u.name as author_name
       FROM marketplace_items mi
       LEFT JOIN marketplace_categories mc ON mi.category_id = mc.id
       LEFT JOIN users u ON mi.author_id = u.id
       WHERE mi.id = $1`,
      [id],
    );
    if (!item) {
      throw new NotFoundException('市场项不存在');
    }
    return item;
  }

  async createItem(authorId: string, dto: CreateItemDto) {
    // Check slug uniqueness within type
    const existing = await this.db.queryOne(
      'SELECT id FROM marketplace_items WHERE slug = $1 AND type = $2',
      [dto.slug, dto.type],
    );
    if (existing) {
      throw new BadRequestException('同一类型下 slug 已存在');
    }

    const item = await this.db.queryOne(
      `INSERT INTO marketplace_items (type, name, slug, description, version, author_id, icon, color, category_id, tags, metadata, source_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        dto.type,
        dto.name,
        dto.slug,
        dto.description || null,
        dto.version || '1.0.0',
        authorId,
        dto.icon || null,
        dto.color || null,
        dto.categoryId || null,
        dto.tags || [],
        dto.metadata ? JSON.stringify(dto.metadata) : null,
        dto.sourceId || null,
      ],
    );
    return item;
  }

  async updateItem(id: number, userId: string, dto: UpdateItemDto) {
    const item = await this.findItemById(id);

    // Only the author can edit, and only draft items
    if (item.author_id !== userId) {
      throw new ForbiddenException('只有作者可以编辑市场项');
    }
    if (item.status !== 'draft') {
      throw new ForbiddenException('只有草稿状态的市场项可以编辑');
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const fieldMap: Record<string, string> = {
      name: 'name',
      description: 'description',
      version: 'version',
      icon: 'icon',
      color: 'color',
      categoryId: 'category_id',
      tags: 'tags',
      metadata: 'metadata',
    };

    for (const [key, dbKey] of Object.entries(fieldMap)) {
      const value = (dto as any)[key];
      if (value !== undefined) {
        fields.push(`${dbKey} = $${paramIndex++}`);
        values.push(key === 'metadata' ? JSON.stringify(value) : value);
      }
    }

    if (fields.length === 0) {
      return item;
    }

    fields.push('updated_at = NOW()');
    values.push(id);

    const updated = await this.db.queryOne(
      `UPDATE marketplace_items SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );
    return updated;
  }

  async deleteItem(id: number, userId: string) {
    const item = await this.findItemById(id);

    if (item.author_id !== userId) {
      throw new ForbiddenException('只有作者可以删除市场项');
    }
    if (item.status !== 'draft') {
      throw new ForbiddenException('只有草稿状态的市场项可以删除');
    }

    await this.db.query('DELETE FROM marketplace_items WHERE id = $1', [id]);
    return null;
  }

  // ============================================================
  // Submissions
  // ============================================================

  async submitItem(itemId: number, userId: string, note?: string) {
    const item = await this.findItemById(itemId);

    if (item.author_id !== userId) {
      throw new ForbiddenException('只有作者可以提交发布申请');
    }
    if (item.status !== 'draft' && item.status !== 'rejected') {
      throw new ForbiddenException('只有草稿或被拒绝状态的市场项可以提交');
    }

    // Create submission record
    const submission = await this.db.queryOne(
      `INSERT INTO marketplace_submissions (item_id, version, submitter_id, note, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [itemId, item.version, userId, note || null],
    );

    // Update item status
    await this.db.query(
      `UPDATE marketplace_items SET status = 'pending_approval', updated_at = NOW() WHERE id = $1`,
      [itemId],
    );

    return submission;
  }

  async findSubmissions(status?: string) {
    let where = '';
    const params: any[] = [];

    if (status) {
      where = 'WHERE ms.status = $1';
      params.push(status);
    }

    return this.db.query(
      `SELECT ms.*, mi.name as item_name, mi.type as item_type, mi.slug as item_slug,
              u.name as submitter_name
       FROM marketplace_submissions ms
       JOIN marketplace_items mi ON ms.item_id = mi.id
       JOIN users u ON ms.submitter_id = u.id
       ${where}
       ORDER BY ms.created_at DESC`,
      params,
    );
  }

  async findMySubmissions(userId: string) {
    return this.db.query(
      `SELECT ms.*, mi.name as item_name, mi.type as item_type, mi.slug as item_slug
       FROM marketplace_submissions ms
       JOIN marketplace_items mi ON ms.item_id = mi.id
       WHERE ms.submitter_id = $1
       ORDER BY ms.created_at DESC`,
      [userId],
    );
  }

  async findSubmissionById(id: number) {
    const submission = await this.db.queryOne(
      `SELECT ms.*, mi.name as item_name, mi.type as item_type
       FROM marketplace_submissions ms
       JOIN marketplace_items mi ON ms.item_id = mi.id
       WHERE ms.id = $1`,
      [id],
    );
    if (!submission) {
      throw new NotFoundException('提交记录不存在');
    }
    return submission;
  }

  // ============================================================
  // Approvals
  // ============================================================

  async approveSubmission(submissionId: number, approverId: string, comment?: string) {
    const submission = await this.findSubmissionById(submissionId);

    if (submission.status !== 'pending') {
      throw new BadRequestException('该提交已处理');
    }

    // Create approval record
    const approval = await this.db.queryOne(
      `INSERT INTO marketplace_approvals (submission_id, item_id, approver_id, result, comment)
       VALUES ($1, $2, $3, 'approved', $4)
       RETURNING *`,
      [submissionId, submission.item_id, approverId, comment || null],
    );

    // Update submission status
    await this.db.query(
      `UPDATE marketplace_submissions SET status = 'approved', updated_at = NOW() WHERE id = $1`,
      [submissionId],
    );

    // Update item status to approved
    await this.db.query(
      `UPDATE marketplace_items SET status = 'approved', updated_at = NOW() WHERE id = $1`,
      [submission.item_id],
    );

    return approval;
  }

  async rejectSubmission(submissionId: number, approverId: string, comment?: string) {
    const submission = await this.findSubmissionById(submissionId);

    if (submission.status !== 'pending') {
      throw new BadRequestException('该提交已处理');
    }

    // Create approval record (with rejected result)
    const approval = await this.db.queryOne(
      `INSERT INTO marketplace_approvals (submission_id, item_id, approver_id, result, comment)
       VALUES ($1, $2, $3, 'rejected', $4)
       RETURNING *`,
      [submissionId, submission.item_id, approverId, comment || null],
    );

    // Update submission status
    await this.db.query(
      `UPDATE marketplace_submissions SET status = 'rejected', updated_at = NOW() WHERE id = $1`,
      [submissionId],
    );

    // Update item status back to rejected
    await this.db.query(
      `UPDATE marketplace_items SET status = 'rejected', updated_at = NOW() WHERE id = $1`,
      [submission.item_id],
    );

    return approval;
  }

  async findApprovals() {
    return this.db.query(
      `SELECT ma.*, mi.name as item_name, mi.type as item_type,
              au.name as approver_name
       FROM marketplace_approvals ma
       JOIN marketplace_items mi ON ma.item_id = mi.id
       JOIN admin_users au ON ma.approver_id = au.id
       ORDER BY ma.created_at DESC`,
    );
  }

  // ============================================================
  // Installations
  // ============================================================

  async installItem(itemId: number, userId: string, config?: Record<string, any>) {
    const item = await this.findItemById(itemId);

    if (item.status !== 'approved') {
      throw new ForbiddenException('只能安装已通过审批的市场项');
    }

    // Upsert installation
    const installation = await this.db.queryOne(
      `INSERT INTO marketplace_installations (item_id, user_id, enabled, config)
       VALUES ($1, $2, true, $3)
       ON CONFLICT (item_id, user_id) DO UPDATE SET enabled = true, config = $3, updated_at = NOW()
       RETURNING *`,
      [itemId, userId, config ? JSON.stringify(config) : null],
    );

    // Increment install count
    await this.db.query(
      `UPDATE marketplace_items SET install_count = install_count + 1, updated_at = NOW() WHERE id = $1`,
      [itemId],
    );

    return installation;
  }

  async uninstallItem(itemId: number, userId: string) {
    const result = await this.db.queryOne(
      'DELETE FROM marketplace_installations WHERE item_id = $1 AND user_id = $2 RETURNING *',
      [itemId, userId],
    );
    if (!result) {
      throw new NotFoundException('未安装该市场项');
    }

    // Decrement install count
    await this.db.query(
      `UPDATE marketplace_items SET install_count = GREATEST(install_count - 1, 0), updated_at = NOW() WHERE id = $1`,
      [itemId],
    );

    return null;
  }

  async findMyInstallations(userId: string) {
    return this.db.query(
      `SELECT mi.*, mp.name, mp.type, mp.slug, mp.description, mp.icon, mp.color,
              mp.version, mp.author_id, mp.install_count, mp.rating,
              u.name as author_name
       FROM marketplace_installations mi
       JOIN marketplace_items mp ON mi.item_id = mp.id
       LEFT JOIN users u ON mp.author_id = u.id
       WHERE mi.user_id = $1
       ORDER BY mi.installed_at DESC`,
      [userId],
    );
  }

  // ============================================================
  // Categories
  // ============================================================

  async findCategories(itemType?: string) {
    let where = '';
    const params: any[] = [];

    if (itemType) {
      where = 'WHERE item_type = $1 OR item_type IS NULL';
      params.push(itemType);
    }

    return this.db.query(
      `SELECT * FROM marketplace_categories ${where} ORDER BY sort_order ASC, name ASC`,
      params,
    );
  }

  async createCategory(dto: CreateCategoryDto) {
    const existing = await this.db.queryOne(
      'SELECT id FROM marketplace_categories WHERE slug = $1',
      [dto.slug],
    );
    if (existing) {
      throw new BadRequestException('分类 slug 已存在');
    }

    return this.db.queryOne(
      `INSERT INTO marketplace_categories (name, slug, description, icon, item_type, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [dto.name, dto.slug, dto.description || null, dto.icon || null, dto.itemType || null, dto.sortOrder || 0],
    );
  }

  async updateCategory(id: number, dto: UpdateCategoryDto) {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const fieldMap: Record<string, string> = {
      name: 'name',
      description: 'description',
      icon: 'icon',
      itemType: 'item_type',
      sortOrder: 'sort_order',
    };

    for (const [key, dbKey] of Object.entries(fieldMap)) {
      const value = (dto as any)[key];
      if (value !== undefined) {
        fields.push(`${dbKey} = $${paramIndex++}`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      return this.findCategoryById(id);
    }

    fields.push('updated_at = NOW()');
    values.push(id);

    const updated = await this.db.queryOne(
      `UPDATE marketplace_categories SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );
    if (!updated) {
      throw new NotFoundException('分类不存在');
    }
    return updated;
  }

  async deleteCategory(id: number) {
    const result = await this.db.queryOne(
      'DELETE FROM marketplace_categories WHERE id = $1 RETURNING *',
      [id],
    );
    if (!result) {
      throw new NotFoundException('分类不存在');
    }
    return null;
  }

  private async findCategoryById(id: number) {
    const category = await this.db.queryOne(
      'SELECT * FROM marketplace_categories WHERE id = $1',
      [id],
    );
    if (!category) {
      throw new NotFoundException('分类不存在');
    }
    return category;
  }
}
