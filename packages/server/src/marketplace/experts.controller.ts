import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('experts')
export class ExpertsController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async list(
    @Query('teamId') teamId?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const offset = parseInt(skip || '0', 10);
    const limit = parseInt(take || '50', 10);

    let query = 'SELECT * FROM experts WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (teamId) {
      query += ` AND ("teamId" = $${paramIndex} OR "teamId" IS NULL)`;
      params.push(teamId);
      paramIndex++;
    } else {
      query += ` AND "teamId" IS NULL`;
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

    query += ` ORDER BY is_default DESC, "createdAt" DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const data = await this.db.query(query, params);
    return { code: 0, data, message: '操作成功' };
  }

  @Get('categories')
  @UseGuards(JwtAuthGuard)
  async getCategories() {
    const data = await this.db.query(
      'SELECT DISTINCT category FROM experts WHERE category IS NOT NULL ORDER BY category'
    );
    return { code: 0, data: data.map((r: any) => r.category), message: '操作成功' };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    const expert = await this.db.queryOne('SELECT * FROM experts WHERE id = $1', [id]);
    return { code: 0, data: expert, message: '操作成功' };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() body: {
    name: string;
    description?: string;
    systemPrompt?: string;
    icon?: string;
    color?: string;
    category?: string;
    teamId?: string;
    isDefault?: boolean;
  }) {
    const id = this.db.generateUUID();
    const expert = await this.db.queryOne(
      `INSERT INTO experts (id, "teamId", name, description, "systemPrompt", icon, color, category, enabled, is_default, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, NOW(), NOW())
       RETURNING *`,
      [
        id,
        body.teamId || null,
        body.name,
        body.description || null,
        body.systemPrompt || null,
        body.icon || null,
        body.color || null,
        body.category || null,
        body.isDefault ?? false,
      ]
    );
    return { code: 0, data: expert, message: '创建成功' };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() body: Record<string, any>) {
    const allowed = ['name', 'description', 'systemPrompt', 'icon', 'color', 'category', 'enabled', 'is_default'];
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(body).forEach(([key, value]) => {
      if (allowed.includes(key) && value !== undefined) {
        const column = key === 'systemPrompt' ? 'systemPrompt' : key;
        fields.push(`"${column}" = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      const expert = await this.db.queryOne('SELECT * FROM experts WHERE id = $1', [id]);
      return { code: 0, data: expert, message: '操作成功' };
    }

    fields.push('"updatedAt" = NOW()');
    values.push(id);

    const expert = await this.db.queryOne(
      `UPDATE experts SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return { code: 0, data: expert, message: '更新成功' };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string) {
    await this.db.queryOne('DELETE FROM experts WHERE id = $1 RETURNING *', [id]);
    return { code: 0, data: null, message: '删除成功' };
  }
}
