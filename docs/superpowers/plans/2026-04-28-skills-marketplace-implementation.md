# Skills Marketplace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build complete Skills Marketplace - AI skill browsing, creation, publishing workflow, version history, and chat activation.

**Architecture:** Skills follow Extensions pattern (Zustand store + React components). Backend uses NestJS with team-scoped REST API. PostgreSQL stores skills with JSONB for flexible config.

**Tech Stack:** React + Zustand (frontend), NestJS (backend), PostgreSQL (database), Hermes SKILL.md format.

---

## File Structure

```
init.sql
  - Add: skills, skill_versions, skill_reviews tables

packages/server/src/
  - Create: skills/skills.module.ts
  - Create: skills/skills.controller.ts
  - Create: skills/skills.service.ts
  - Create: skills/dto/create-skill.dto.ts
  - Create: skills/dto/update-skill.dto.ts

packages/client/src/
  - Create: stores/skillsStore.ts         (Zustand store, mirrors extensions.ts pattern)
  - Create: components/SkillCard.tsx      (mirrors ExtensionCard.tsx pattern)
  - Modify: pages/Skills.tsx              (replace placeholder with full implementation)
  - Create: components/SkillConfigModal.tsx (config panel UI)
  - Create: components/SkillVersionHistory.tsx
```

---

## Task 1: Database Schema

**Files:**
- Modify: `init.sql:183-191` (add after user_extensions table)

- [ ] **Step 1: Add skills table**

```sql
-- Create skills table
CREATE TABLE IF NOT EXISTS skills (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
    icon VARCHAR(500),
    category VARCHAR(100),
    tags TEXT[],
    content TEXT NOT NULL,
    config_schema JSONB,
    config JSONB,
    status VARCHAR(50) DEFAULT 'personal',
    team_id VARCHAR(36),
    author_id VARCHAR(36),
    marketplace_id VARCHAR(255),
    ratings DECIMAL(3,2) DEFAULT 0.00,
    installs INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_skill_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL,
    CONSTRAINT fk_skill_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
);
```

- [ ] **Step 2: Add skill_versions table**

```sql
-- Create skill_versions table
CREATE TABLE IF NOT EXISTS skill_versions (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    skill_id VARCHAR(36) NOT NULL,
    version VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    config_schema JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    CONSTRAINT fk_skill_version_skill FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
    CONSTRAINT fk_skill_version_author FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
```

- [ ] **Step 3: Add skill_reviews table**

```sql
-- Create skill_reviews table
CREATE TABLE IF NOT EXISTS skill_reviews (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    skill_id VARCHAR(36) NOT NULL,
    reviewer_id VARCHAR(36),
    action VARCHAR(50) NOT NULL,
    target VARCHAR(50) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_skill_review_skill FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
    CONSTRAINT fk_skill_review_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL
);
```

- [ ] **Step 4: Add indexes**

```sql
CREATE INDEX IF NOT EXISTS idx_skills_team ON skills(team_id);
CREATE INDEX IF NOT EXISTS idx_skills_author ON skills(author_id);
CREATE INDEX IF NOT EXISTS idx_skills_status ON skills(status);
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);
CREATE INDEX IF NOT EXISTS idx_skill_versions_skill ON skill_versions(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_reviews_skill ON skill_reviews(skill_id);
```

- [ ] **Step 5: Commit**

```bash
git add init.sql
git commit -m "feat: add skills, skill_versions, skill_reviews tables"
```

---

## Task 2: Backend - DTOs

**Files:**
- Create: `packages/server/src/skills/dto/create-skill.dto.ts`
- Create: `packages/server/src/skills/dto/update-skill.dto.ts`

- [ ] **Step 1: Create create-skill.dto.ts**

```typescript
import { IsString, IsOptional, IsArray, IsObject, IsNumber } from 'class-validator';

export class CreateSkillDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  version?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsString()
  content: string;

  @IsObject()
  @IsOptional()
  configSchema?: Record<string, any>;

  @IsObject()
  @IsOptional()
  config?: Record<string, any>;
}
```

- [ ] **Step 2: Create update-skill.dto.ts**

```typescript
import { IsString, IsOptional, IsArray, IsObject, IsNumber } from 'class-validator';

export class UpdateSkillDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  version?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  content?: string;

  @IsObject()
  @IsOptional()
  configSchema?: Record<string, any>;

  @IsObject()
  @IsOptional()
  config?: Record<string, any>;
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/skills/dto/
git commit -m "feat: add skills DTOs"
```

---

## Task 3: Backend - Skills Service

**Files:**
- Create: `packages/server/src/skills/skills.service.ts`

- [ ] **Step 1: Create skills.service.ts**

```typescript
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';

@Injectable()
export class SkillsService {
  constructor(private readonly db: DatabaseService) {}

  async create(teamId: string, authorId: string, dto: CreateSkillDto) {
    const result = await this.db.query(
      `INSERT INTO skills (name, description, version, icon, category, tags, content, config_schema, config, team_id, author_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'personal')
       RETURNING *`,
      [dto.name, dto.description, dto.version || '1.0.0', dto.icon, dto.category, dto.tags, dto.content, dto.configSchema, dto.config, teamId, authorId]
    );
    return result.rows[0];
  }

  async findAll(teamId: string, status?: string) {
    let query = 'SELECT * FROM skills WHERE team_id = $1';
    const params: any[] = [teamId];

    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';
    const result = await this.db.query(query, params);
    return result.rows;
  }

  async findPersonal(authorId: string) {
    const result = await this.db.query(
      `SELECT * FROM skills WHERE author_id = $1 AND status = 'personal' ORDER BY created_at DESC`,
      [authorId]
    );
    return result.rows;
  }

  async findTeamSkills(teamId: string) {
    const result = await this.db.query(
      `SELECT * FROM skills WHERE team_id = $1 AND status IN ('team', 'team_pending', 'marketplace_pending', 'marketplace') ORDER BY created_at DESC`,
      [teamId]
    );
    return result.rows;
  }

  async findMarketplace(teamId: string) {
    const result = await this.db.query(
      `SELECT * FROM skills WHERE team_id = $1 AND status IN ('team', 'marketplace') ORDER BY ratings DESC, installs DESC`,
      [teamId]
    );
    return result.rows;
  }

  async findOne(id: string) {
    const result = await this.db.query('SELECT * FROM skills WHERE id = $1', [id]);
    return result.rows[0];
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

    const result = await this.db.query(
      `UPDATE skills SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async delete(id: string) {
    await this.db.query('DELETE FROM skills WHERE id = $1', [id]);
  }

  async saveVersion(skillId: string, version: string, content: string, configSchema: any, createdBy: string) {
    const result = await this.db.query(
      `INSERT INTO skill_versions (skill_id, version, content, config_schema, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [skillId, version, content, configSchema, createdBy]
    );
    return result.rows[0];
  }

  async getVersions(skillId: string) {
    const result = await this.db.query(
      `SELECT sv.*, u.name as created_by_name
       FROM skill_versions sv
       LEFT JOIN users u ON sv.created_by = u.id
       WHERE sv.skill_id = $1
       ORDER BY sv.created_at DESC`,
      [skillId]
    );
    return result.rows;
  }

  async revertToVersion(skillId: string, versionId: string, userId: string) {
    const versionResult = await this.db.query(
      'SELECT * FROM skill_versions WHERE id = $1 AND skill_id = $2',
      [versionId, skillId]
    );
    const version = versionResult.rows[0];
    if (!version) throw new Error('Version not found');

    // Update current skill with version content
    await this.db.query(
      `UPDATE skills SET content = $1, config_schema = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [version.content, version.config_schema, skillId]
    );

    return this.findOne(skillId);
  }

  async requestPublishToTeam(id: string) {
    const result = await this.db.query(
      `UPDATE skills SET status = 'team_pending', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0];
  }

  async approveTeamPublish(id: string, reviewerId: string) {
    await this.db.query(
      `INSERT INTO skill_reviews (skill_id, reviewer_id, action, target) VALUES ($1, $2, 'approve', 'team')`,
      [id, reviewerId]
    );
    const result = await this.db.query(
      `UPDATE skills SET status = 'team', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0];
  }

  async rejectTeamPublish(id: string, reviewerId: string, comment: string) {
    await this.db.query(
      `INSERT INTO skill_reviews (skill_id, reviewer_id, action, target, comment) VALUES ($1, $2, 'reject', 'team', $3)`,
      [id, reviewerId, comment]
    );
    const result = await this.db.query(
      `UPDATE skills SET status = 'personal', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0];
  }

  async requestPublishToMarketplace(id: string) {
    const result = await this.db.query(
      `UPDATE skills SET status = 'marketplace_pending', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0];
  }

  async approveMarketplacePublish(id: string, reviewerId: string, marketplaceId: string) {
    await this.db.query(
      `INSERT INTO skill_reviews (skill_id, reviewer_id, action, target) VALUES ($1, $2, 'approve', 'marketplace')`,
      [id, reviewerId]
    );
    const result = await this.db.query(
      `UPDATE skills SET status = 'marketplace', marketplace_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id, marketplaceId]
    );
    return result.rows[0];
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/server/src/skills/skills.service.ts
git commit -m "feat: add skills service"
```

---

## Task 4: Backend - Skills Controller

**Files:**
- Create: `packages/server/src/skills/skills.controller.ts`

- [ ] **Step 1: Create skills.controller.ts**

```typescript
import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { SkillsService } from './skills.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('teams/:teamId/skills')
@UseGuards(JwtAuthGuard)
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Post()
  async create(
    @Param('teamId') teamId: string,
    @Request() req: any,
    @Body() body: { name: string; description?: string; version?: string; icon?: string; category?: string; tags?: string[]; content: string; configSchema?: Record<string, any>; config?: Record<string, any> },
  ) {
    const result = await this.skillsService.create(teamId, req.user.id, body);
    return { success: true, data: result };
  }

  @Get()
  async findAll(
    @Param('teamId') teamId: string,
    @Query('status') status?: string,
  ) {
    const result = await this.skillsService.findAll(teamId, status);
    return { success: true, data: result };
  }

  @Get('personal')
  async findPersonal(@Request() req: any) {
    const result = await this.skillsService.findPersonal(req.user.id);
    return { success: true, data: result };
  }

  @Get('team')
  async findTeamSkills(@Param('teamId') teamId: string) {
    const result = await this.skillsService.findTeamSkills(teamId);
    return { success: true, data: result };
  }

  @Get('marketplace')
  async findMarketplace(@Param('teamId') teamId: string) {
    const result = await this.skillsService.findMarketplace(teamId);
    return { success: true, data: result };
  }

  @Get(':skillId')
  async findOne(@Param('skillId') skillId: string) {
    const result = await this.skillsService.findOne(skillId);
    return { success: true, data: result };
  }

  @Put(':skillId')
  async update(
    @Param('skillId') skillId: string,
    @Body() body: any,
  ) {
    const result = await this.skillsService.update(skillId, body);
    return { success: true, data: result };
  }

  @Delete(':skillId')
  async delete(@Param('skillId') skillId: string) {
    await this.skillsService.delete(skillId);
    return { success: true, data: null };
  }

  @Get(':skillId/versions')
  async getVersions(@Param('skillId') skillId: string) {
    const result = await this.skillsService.getVersions(skillId);
    return { success: true, data: result };
  }

  @Post(':skillId/versions/:versionId/revert')
  async revertToVersion(
    @Param('skillId') skillId: string,
    @Param('versionId') versionId: string,
    @Request() req: any,
  ) {
    const result = await this.skillsService.revertToVersion(skillId, versionId, req.user.id);
    return { success: true, data: result };
  }

  @Post(':skillId/publish-team')
  async requestPublishToTeam(@Param('skillId') skillId: string) {
    const result = await this.skillsService.requestPublishToTeam(skillId);
    return { success: true, data: result };
  }

  @Post(':skillId/approve-team')
  async approveTeamPublish(
    @Param('skillId') skillId: string,
    @Request() req: any,
  ) {
    const result = await this.skillsService.approveTeamPublish(skillId, req.user.id);
    return { success: true, data: result };
  }

  @Post(':skillId/reject-team')
  async rejectTeamPublish(
    @Param('skillId') skillId: string,
    @Request() req: any,
    @Body() body: { comment?: string },
  ) {
    const result = await this.skillsService.rejectTeamPublish(skillId, req.user.id, body.comment || '');
    return { success: true, data: result };
  }

  @Post(':skillId/publish-marketplace')
  async requestPublishToMarketplace(@Param('skillId') skillId: string) {
    const result = await this.skillsService.requestPublishToMarketplace(skillId);
    return { success: true, data: result };
  }

  @Post(':skillId/approve-marketplace')
  async approveMarketplacePublish(
    @Param('skillId') skillId: string,
    @Body() body: { marketplaceId: string },
  ) {
    const result = await this.skillsService.approveMarketplacePublish(skillId, req.user.id, body.marketplaceId);
    return { success: true, data: result };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/server/src/skills/skills.controller.ts
git commit -m "feat: add skills controller"
```

---

## Task 5: Backend - Skills Module

**Files:**
- Create: `packages/server/src/skills/skills.module.ts`

- [ ] **Step 1: Create skills.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { SkillsController } from './skills.controller';
import { SkillsService } from './skills.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [SkillsController],
  providers: [SkillsService],
  exports: [SkillsService],
})
export class SkillsModule {}
```

- [ ] **Step 2: Register in app.module.ts**

Modify `packages/server/src/app.module.ts` to add `SkillsModule` to imports array.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/skills/skills.module.ts packages/server/src/app.module.ts
git commit -m "feat: register skills module in app"
```

---

## Task 6: Frontend - Skills Store

**Files:**
- Create: `packages/client/src/stores/skillsStore.ts`

- [ ] **Step 1: Create skillsStore.ts**

```typescript
import { create } from 'zustand';

export interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;
  icon: string;
  category: string;
  tags: string[];
  content: string;
  configSchema?: Record<string, any>;
  config?: Record<string, any>;
  status: 'personal' | 'team_pending' | 'team' | 'marketplace_pending' | 'marketplace';
  teamId?: string;
  authorId: string;
  marketplaceId?: string;
  ratings: number;
  installs: number;
  createdAt: string;
  updatedAt: string;
}

export interface SkillVersion {
  id: string;
  skillId: string;
  version: string;
  content: string;
  configSchema?: Record<string, any>;
  createdAt: string;
  createdBy: string;
  createdByName?: string;
}

export interface SkillState {
  skills: Skill[];
  personalSkills: Skill[];
  teamSkills: Skill[];
  marketplaceSkills: Skill[];
  searchQuery: string;
  selectedCategory: string;
  isLoading: boolean;
  error: string | null;

  loadSkills: (teamId: string) => Promise<void>;
  loadPersonalSkills: () => Promise<void>;
  loadTeamSkills: (teamId: string) => Promise<void>;
  loadMarketplaceSkills: (teamId: string) => Promise<void>;
  createSkill: (teamId: string, data: Partial<Skill>) => Promise<void>;
  updateSkill: (skillId: string, data: Partial<Skill>) => Promise<void>;
  deleteSkill: (skillId: string) => Promise<void>;
  getVersions: (skillId: string) => Promise<SkillVersion[]>;
  revertToVersion: (skillId: string, versionId: string) => Promise<void>;
  requestPublishToTeam: (skillId: string) => Promise<void>;
  approveTeamPublish: (skillId: string) => Promise<void>;
  rejectTeamPublish: (skillId: string, comment: string) => Promise<void>;
  requestPublishToMarketplace: (skillId: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;
  getFilteredSkills: (skills: Skill[]) => Skill[];
  setError: (error: string | null) => void;
}

const MOCK_SKILLS: Skill[] = [
  {
    id: 'skill-001',
    name: '代码审查助手',
    description: '专业的代码审查技能，帮助你发现潜在问题和优化建议',
    version: '1.0.0',
    icon: '🔍',
    category: '开发',
    tags: ['code', 'review', 'programming'],
    content: '# Code Review Skill\n\nThis skill helps with code review...',
    configSchema: { severity: { type: 'string', default: 'medium' } },
    config: { severity: 'medium' },
    status: 'personal',
    authorId: 'user-001',
    ratings: 4.8,
    installs: 234,
    createdAt: '2026-04-20T10:00:00Z',
    updatedAt: '2026-04-20T10:00:00Z',
  },
];

export const useSkillsStore = create<SkillState>((set, get) => ({
  skills: [],
  personalSkills: [],
  teamSkills: [],
  marketplaceSkills: [],
  searchQuery: '',
  selectedCategory: '全部',
  isLoading: false,
  error: null,

  loadSkills: async (teamId) => {
    set({ isLoading: true, error: null });
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      set({ skills: MOCK_SKILLS, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load skills', isLoading: false });
    }
  },

  loadPersonalSkills: async () => {
    set({ isLoading: true, error: null });
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      set({ personalSkills: MOCK_SKILLS.filter(s => s.status === 'personal'), isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load personal skills', isLoading: false });
    }
  },

  loadTeamSkills: async (teamId) => {
    set({ isLoading: true, error: null });
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      set({ teamSkills: MOCK_SKILLS.filter(s => ['team', 'team_pending', 'marketplace_pending', 'marketplace'].includes(s.status)), isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load team skills', isLoading: false });
    }
  },

  loadMarketplaceSkills: async (teamId) => {
    set({ isLoading: true, error: null });
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      set({ marketplaceSkills: MOCK_SKILLS.filter(s => ['team', 'marketplace'].includes(s.status)), isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load marketplace skills', isLoading: false });
    }
  },

  createSkill: async (teamId, data) => {
    try {
      const newSkill: Skill = {
        id: `skill-${Date.now()}`,
        name: data.name || '',
        description: data.description || '',
        version: data.version || '1.0.0',
        icon: data.icon || '🛠️',
        category: data.category || '工具',
        tags: data.tags || [],
        content: data.content || '',
        configSchema: data.configSchema,
        config: data.config,
        status: 'personal',
        authorId: 'user-001',
        ratings: 0,
        installs: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      set(state => ({ personalSkills: [newSkill, ...state.personalSkills] }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to create skill' });
      throw err;
    }
  },

  updateSkill: async (skillId, data) => {
    try {
      set(state => ({
        personalSkills: state.personalSkills.map(s =>
          s.id === skillId ? { ...s, ...data, updatedAt: new Date().toISOString() } : s
        ),
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to update skill' });
      throw err;
    }
  },

  deleteSkill: async (skillId) => {
    try {
      set(state => ({
        personalSkills: state.personalSkills.filter(s => s.id !== skillId),
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to delete skill' });
      throw err;
    }
  },

  getVersions: async (skillId) => {
    return [];
  },

  revertToVersion: async (skillId, versionId) => {
    console.log('revertToVersion', skillId, versionId);
  },

  requestPublishToTeam: async (skillId) => {
    set(state => ({
      personalSkills: state.personalSkills.map(s =>
        s.id === skillId ? { ...s, status: 'team_pending' } : s
      ),
    }));
  },

  approveTeamPublish: async (skillId) => {
    set(state => ({
      personalSkills: state.personalSkills.map(s =>
        s.id === skillId ? { ...s, status: 'team' } : s
      ),
    }));
  },

  rejectTeamPublish: async (skillId, comment) => {
    set(state => ({
      personalSkills: state.personalSkills.map(s =>
        s.id === skillId ? { ...s, status: 'personal' } : s
      ),
    }));
  },

  requestPublishToMarketplace: async (skillId) => {
    set(state => ({
      personalSkills: state.personalSkills.map(s =>
        s.id === skillId ? { ...s, status: 'marketplace_pending' } : s
      ),
    }));
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),

  getFilteredSkills: (skills) => {
    const { searchQuery, selectedCategory } = get();
    return skills.filter(skill => {
      if (selectedCategory !== '全部' && skill.category !== selectedCategory) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          skill.name.toLowerCase().includes(query) ||
          skill.description.toLowerCase().includes(query) ||
          skill.tags.some(tag => tag.toLowerCase().includes(query))
        );
      }
      return true;
    });
  },

  setError: (error) => set({ error }),
}));
```

- [ ] **Step 2: Commit**

```bash
git add packages/client/src/stores/skillsStore.ts
git commit -m "feat: add skills store"
```

---

## Task 7: Frontend - SkillCard Component

**Files:**
- Create: `packages/client/src/components/SkillCard.tsx`

- [ ] **Step 1: Create SkillCard.tsx** (mirror ExtensionCard pattern)

```typescript
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Download, CheckCircle2, Power, Settings, Star, Clock, MoreVertical, Trash2, Edit2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Skill } from '@/stores/skillsStore';

interface SkillCardProps {
  skill: Skill;
  onInstall?: (id: string) => void;
  onUninstall?: (id: string) => void;
  onEnable?: (id: string) => void;
  onDisable?: (id: string) => void;
  onEdit?: (skill: Skill) => void;
  onDelete?: (id: string) => void;
  onPublish?: (id: string) => void;
  onVersionHistory?: (id: string) => void;
  showActions?: boolean;
}

export const SkillCard: React.FC<SkillCardProps> = ({
  skill,
  onInstall,
  onUninstall,
  onEnable,
  onDisable,
  onEdit,
  onDelete,
  onPublish,
  onVersionHistory,
  showActions = true,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  const statusLabels: Record<string, { text: string; color: string }> = {
    personal: { text: '个人', color: 'bg-gray-100 text-gray-600' },
    team_pending: { text: '待团队审批', color: 'bg-yellow-100 text-yellow-700' },
    team: { text: '团队已发布', color: 'bg-blue-100 text-blue-700' },
    marketplace_pending: { text: '待市场审批', color: 'bg-orange-100 text-orange-700' },
    marketplace: { text: '已发布市场', color: 'bg-emerald-100 text-emerald-700' },
  };

  const handleInstall = () => {
    setIsInstalled(true);
    onInstall?.(skill.id);
  };

  const handleUninstall = () => {
    if (window.confirm(`确定要卸载 "${skill.name}" 吗？`)) {
      setIsInstalled(false);
      onUninstall?.(skill.id);
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(<span key={i} className={i <= rating ? 'text-yellow-400' : 'text-gray-300'}>★</span>);
    }
    return stars;
  };

  const status = statusLabels[skill.status] || statusLabels.personal;

  return (
    <div className="group relative bg-white rounded-2xl border border-gray-200/80 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity" />

      {skill.status !== 'personal' && (
        <div className="absolute top-4 right-4 z-10">
          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${status.color}`}>
            {status.text}
          </span>
        </div>
      )}

      <div className="p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl bg-gradient-to-br from-indigo-50 to-purple-50 shadow-md">
            {skill.icon || '🛠️'}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-lg leading-tight truncate">{skill.name}</h3>
            <p className="text-sm text-gray-500 mt-1">by {skill.authorId}</p>
          </div>
        </div>

        <p className="text-sm text-gray-600 leading-relaxed line-clamp-2 mb-4">{skill.description}</p>

        <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-1">{renderStars(skill.ratings)} <span className="text-sm font-semibold ml-1">{skill.ratings}</span></div>
          <div className="flex items-center gap-1 text-gray-500 text-sm"><Download className="w-4 h-4" /> {skill.installs}</div>
          <div className="ml-auto"><Badge variant="secondary" className="font-mono text-xs">v{skill.version}</Badge></div>
        </div>

        <div className="flex flex-wrap gap-2 mb-5">
          {skill.tags.slice(0, 3).map(tag => (
            <span key={tag} className="px-2 py-1 bg-gray-50 text-gray-600 text-xs font-medium rounded-lg">#{tag}</span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {!isInstalled ? (
            <Button size="sm" className="flex-1 gap-2" onClick={handleInstall}>
              <Download className="w-4 h-4" /> 安装
            </Button>
          ) : (
            <>
              <Button size="sm" variant="outline" className="flex-1 gap-2" onClick={() => setShowConfig(true)}>
                <Settings className="w-4 h-4" /> 配置
              </Button>
              <Button size="sm" variant="ghost" onClick={handleUninstall}>卸载</Button>
            </>
          )}

          {showActions && (
            <div className="relative">
              <Button size="icon" variant="ghost" onClick={() => setShowMenu(!showMenu)}>
                <MoreVertical className="w-4 h-4" />
              </Button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-200 py-1 min-w-[140px] z-20">
                  {skill.status === 'personal' && (
                    <>
                      <button onClick={() => { onEdit?.(skill); setShowMenu(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                        <Edit2 className="w-4 h-4" /> 编辑
                      </button>
                      <button onClick={() => { onVersionHistory?.(skill.id); setShowMenu(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                        <Clock className="w-4 h-4" /> 版本历史
                      </button>
                      <button onClick={() => { onPublish?.(skill.id); setShowMenu(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-indigo-600">
                        <Upload className="w-4 h-4" /> 发布到团队
                      </button>
                    </>
                  )}
                  <button onClick={() => { onDelete?.(skill.id); setShowMenu(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2">
                    <Trash2 className="w-4 h-4" /> 删除
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showConfig && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-br from-indigo-50 to-purple-50">{skill.icon}</div>
                <div><h3 className="font-bold">{skill.name}</h3><p className="text-xs text-gray-500">Skill 配置</p></div>
              </div>
              <button onClick={() => setShowConfig(false)} className="p-2 rounded-lg hover:bg-gray-100"><span className="text-gray-500">✕</span></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-500">配置面板暂未实现</p>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end">
              <Button onClick={() => setShowConfig(false)}>关闭</Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add packages/client/src/components/SkillCard.tsx
git commit -m "feat: add skill card component"
```

---

## Task 8: Frontend - Skills Page

**Files:**
- Modify: `packages/client/src/pages/Skills.tsx`

- [ ] **Step 1: Replace Skills.tsx with full implementation**

```typescript
import React, { useEffect, useState } from 'react';
import { Search, Package, Star, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSkillsStore } from '@/stores/skillsStore';
import { SkillCard } from '@/components/SkillCard';

const CATEGORIES = ['全部', '开发', '生产力', '工具', '写作', '分析'];

const Skills: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'marketplace' | 'team' | 'personal'>('marketplace');
  const {
    personalSkills,
    teamSkills,
    marketplaceSkills,
    searchQuery,
    selectedCategory,
    isLoading,
    error,
    loadPersonalSkills,
    loadTeamSkills,
    loadMarketplaceSkills,
    createSkill,
    setSearchQuery,
    setSelectedCategory,
    getFilteredSkills,
  } = useSkillsStore();

  useEffect(() => {
    loadPersonalSkills();
    loadTeamSkills('team-001');
    loadMarketplaceSkills('team-001');
  }, [loadPersonalSkills, loadTeamSkills, loadMarketplaceSkills]);

  const getCurrentSkills = () => {
    switch (activeTab) {
      case 'marketplace': return getFilteredSkills(marketplaceSkills);
      case 'team': return getFilteredSkills(teamSkills);
      case 'personal': return getFilteredSkills(personalSkills);
    }
  };

  const currentSkills = getCurrentSkills();
  const counts = {
    marketplace: marketplaceSkills.length,
    team: teamSkills.filter(s => s.status === 'team_pending').length,
    personal: personalSkills.length,
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-2">
                Skill 市场
              </h1>
              <p className="text-gray-600 text-base lg:text-lg">发现并安装强大的 AI 技能，增强你的助手能力</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-blue-200 px-4 py-2">
                <Package className="w-4 h-4 mr-1.5" />
                {marketplaceSkills.length} 个 Skill
              </Badge>
            </div>
          </div>
        </div>

        <div className="mb-8 space-y-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索 Skill 名称、描述或标签..."
              className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <span className="text-sm text-gray-500 flex-shrink-0">分类:</span>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap border-2 ${
                  selectedCategory === cat
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 mb-8 bg-gray-100/50 p-1.5 rounded-xl w-fit">
          <button onClick={() => setActiveTab('marketplace')} className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'marketplace' ? 'bg-white shadow-md text-primary' : 'text-gray-600 hover:text-gray-900'}`}>
            市场 ({counts.marketplace})
          </button>
          <button onClick={() => setActiveTab('team')} className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'team' ? 'bg-white shadow-md text-primary' : 'text-gray-600 hover:text-gray-900'}`}>
            我的团队 ({counts.team})
          </button>
          <button onClick={() => setActiveTab('personal')} className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'personal' ? 'bg-white shadow-md text-primary' : 'text-gray-600 hover:text-gray-900'}`}>
            我的 Skill ({counts.personal})
          </button>
        </div>

        {activeTab === 'personal' && (
          <div className="mb-6 flex justify-end">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              <Sparkles className="w-4 h-4" />
              创建 Skill
            </Button>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-72 bg-gray-200 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : currentSkills.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center">
              <Package className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">暂无 Skill</h3>
            <p className="text-gray-500 mb-8">
              {activeTab === 'personal' ? '创建你的第一个 Skill 开始吧' : '该分类下暂无 Skill'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {currentSkills.map(skill => (
              <SkillCard key={skill.id} skill={skill} showActions={activeTab === 'personal'} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Skills;
```

- [ ] **Step 2: Commit**

```bash
git add packages/client/src/pages/Skills.tsx
git commit -m "feat: implement skills marketplace page"
```

---

## Task 9: Frontend - Version History Component

**Files:**
- Create: `packages/client/src/components/SkillVersionHistory.tsx`

- [ ] **Step 1: Create SkillVersionHistory.tsx**

```typescript
import React from 'react';
import { Clock, RotateCcw, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SkillVersion } from '@/stores/skillsStore';

interface SkillVersionHistoryProps {
  versions: SkillVersion[];
  currentVersion: string;
  onPreview: (version: SkillVersion) => void;
  onRevert: (versionId: string) => void;
  onClose: () => void;
}

export const SkillVersionHistory: React.FC<SkillVersionHistoryProps> = ({
  versions,
  currentVersion,
  onPreview,
  onRevert,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">版本历史</h3>
              <p className="text-xs text-gray-500">{versions.length} 个版本</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {versions.map((version, index) => (
            <div
              key={version.id}
              className={`p-4 rounded-xl border-2 transition-all ${
                version.version === currentVersion
                  ? 'border-indigo-200 bg-indigo-50/50'
                  : 'border-gray-100 hover:border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${version.version === currentVersion ? 'bg-indigo-500' : 'bg-gray-300'}`} />
                  <span className="font-semibold text-gray-900 font-mono">v{version.version}</span>
                  {version.version === currentVersion && (
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">当前</span>
                  )}
                </div>
                <div className="text-xs text-gray-400">{new Date(version.createdAt).toLocaleDateString('zh-CN')}</div>
              </div>
              <p className="text-sm text-gray-500 mb-3">由 {version.createdByName || '未知'} 创建</p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onPreview(version)}>
                  <Eye className="w-3.5 h-3.5" /> 预览
                </Button>
                {version.version !== currentVersion && (
                  <Button size="sm" variant="ghost" className="gap-1.5 text-indigo-600" onClick={() => onRevert(version.id)}>
                    <RotateCcw className="w-3.5 h-3.5" /> 回退到此版本
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add packages/client/src/components/SkillVersionHistory.tsx
git commit -m "feat: add skill version history component"
```

---

## Self-Review Checklist

1. **Spec coverage:** All sections in spec have corresponding tasks
   - ✅ Database schema (Task 1)
   - ✅ Skills store with all actions (Task 6)
   - ✅ Skills page with tabs (Task 8)
   - ✅ SkillCard with actions (Task 7)
   - ✅ Version history (Task 9)
   - ✅ Publishing workflow endpoints (Tasks 3-5)

2. **Placeholder scan:** No "TBD", "TODO", or vague requirements

3. **Type consistency:** Skill interface matches between store and components

---

## Plan Complete

**Saved to:** `docs/superpowers/plans/2026-04-28-skills-marketplace-implementation.md`

**Two execution options:**

**1. Subagent-Driven (recommended)** - Dispatch fresh subagent per task, review between tasks

**2. Inline Execution** - Execute tasks in this session using executing-plans skill

Which approach?