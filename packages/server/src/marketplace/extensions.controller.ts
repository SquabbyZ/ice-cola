import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('extensions')
export class ExtensionsController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async list(
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const offset = parseInt(skip || '0', 10);
    const limit = parseInt(take || '50', 10);

    let query = 'SELECT * FROM extensions WHERE enabled = true';
    const params: any[] = [];
    let paramIndex = 1;

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

    query += ` ORDER BY downloads DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const data = await this.db.query(query, params);
    return { code: 0, data, message: '操作成功' };
  }

  @Get('categories')
  @UseGuards(JwtAuthGuard)
  async getCategories() {
    const data = await this.db.query(
      'SELECT DISTINCT category FROM extensions WHERE category IS NOT NULL AND enabled = true ORDER BY category'
    );
    return { code: 0, data: data.map((r: any) => r.category), message: '操作成功' };
  }

  @Get('installed')
  @UseGuards(JwtAuthGuard)
  async getInstalled(@Request() req: any) {
    const userId = req.user.sub || req.user.id;
    const data = await this.db.query(
      `SELECT e.*, ue.enabled as user_enabled, ue.config, ue."installedAt"
       FROM extensions e
       INNER JOIN user_extensions ue ON e.id = ue."extensionId"
       WHERE ue."userId" = $1
       ORDER BY ue."installedAt" DESC`,
      [userId]
    );
    return { code: 0, data, message: '操作成功' };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    const ext = await this.db.queryOne('SELECT * FROM extensions WHERE id = $1', [id]);
    return { code: 0, data: ext, message: '操作成功' };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() body: {
    name: string;
    description?: string;
    version?: string;
    author?: string;
    category?: string;
    icon?: string;
    color?: string;
    homepage?: string;
    repository?: string;
    configSchema?: any;
    instructions?: string;
  }) {
    const id = this.db.generateUUID();
    const ext = await this.db.queryOne(
      `INSERT INTO extensions (id, name, description, version, author, category, icon, color, homepage, repository, config_schema, instructions, enabled, downloads, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, 0, NOW(), NOW())
       RETURNING *`,
      [
        id,
        body.name,
        body.description || null,
        body.version || '1.0.0',
        body.author || null,
        body.category || null,
        body.icon || null,
        body.color || null,
        body.homepage || null,
        body.repository || null,
        body.configSchema ? JSON.stringify(body.configSchema) : null,
        body.instructions || null,
      ]
    );
    return { code: 0, data: ext, message: '创建成功' };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() body: Record<string, any>) {
    const allowed = ['name', 'description', 'version', 'author', 'category', 'icon', 'color', 'homepage', 'repository', 'config_schema', 'instructions', 'enabled'];
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(body).forEach(([key, value]) => {
      if (allowed.includes(key) && value !== undefined) {
        fields.push(`"${key}" = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      const ext = await this.db.queryOne('SELECT * FROM extensions WHERE id = $1', [id]);
      return { code: 0, data: ext, message: '操作成功' };
    }

    fields.push('"updatedAt" = NOW()');
    values.push(id);

    const ext = await this.db.queryOne(
      `UPDATE extensions SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return { code: 0, data: ext, message: '更新成功' };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string) {
    await this.db.queryOne('DELETE FROM extensions WHERE id = $1 RETURNING *', [id]);
    return { code: 0, data: null, message: '删除成功' };
  }

  @Post(':id/install')
  @UseGuards(JwtAuthGuard)
  async install(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.sub || req.user.id;
    const installId = this.db.generateUUID();
    const result = await this.db.queryOne(
      `INSERT INTO user_extensions (id, "extensionId", "userId", enabled, config)
       VALUES ($1, $2, $3, true, null)
       ON CONFLICT ("extensionId", "userId") DO UPDATE SET enabled = true, "updatedAt" = NOW()
       RETURNING *`,
      [installId, id, userId]
    );
    await this.db.queryOne(
      'UPDATE extensions SET downloads = downloads + 1, "updatedAt" = NOW() WHERE id = $1 RETURNING *',
      [id]
    );
    return { code: 0, data: result, message: '安装成功' };
  }

  @Delete(':id/install')
  @UseGuards(JwtAuthGuard)
  async uninstall(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.sub || req.user.id;
    await this.db.queryOne(
      'DELETE FROM user_extensions WHERE "extensionId" = $1 AND "userId" = $2 RETURNING *',
      [id, userId]
    );
    return { code: 0, data: null, message: '卸载成功' };
  }
}
