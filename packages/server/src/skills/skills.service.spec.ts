import { Test, TestingModule } from '@nestjs/testing';
import type { PoolClient } from 'pg';
import { SkillsService } from './skills.service';
import { DatabaseService } from '../database/database.service';
import type { UpdateSkillDto } from './dto/update-skill.dto';

describe('SkillsService', () => {
  let service: SkillsService;
  let db: jest.Mocked<DatabaseService>;
  let transactionClient: Pick<PoolClient, 'query'>;

  const mockSkill = {
    id: 'skill-1',
    name: 'Test Skill',
    description: 'A test skill',
    version: '1.0.0',
    icon: null,
    category: 'AI',
    tags: ['test', 'demo'],
    content: 'Skill content here',
    config_schema: null,
    config: null,
    team_id: 'team-1',
    author_id: 'user-1',
    status: 'personal',
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkillsService,
        {
          provide: DatabaseService,
          useValue: {
            query: jest.fn(),
            queryOne: jest.fn(),
            transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SkillsService>(SkillsService);
    db = module.get(DatabaseService);
    transactionClient = { query: jest.fn() };
    jest.mocked(transactionClient.query).mockImplementation(async (text, params) => ({ rows: await db.query(String(text), params as unknown[]) }));
    db.transaction.mockImplementation(async (callback) => callback(transactionClient as PoolClient));
  });

  describe('create', () => {
    it('creates a new skill', async () => {
      db.query.mockResolvedValue([mockSkill]);

      const result = await service.create('team-1', 'user-1', {
        name: 'Test Skill',
        description: 'A test skill',
        content: 'Skill content here',
      });

      expect(result).toEqual(mockSkill);
      expect(db.query).toHaveBeenCalled();
    });

    it('creates skill with all fields', async () => {
      db.query.mockResolvedValue([mockSkill]);

      const dto = {
        name: 'Test Skill',
        description: 'A test skill',
        version: '2.0.0',
        icon: 'icon.png',
        category: 'AI',
        tags: ['test'],
        content: 'Content',
        configSchema: {},
        config: {},
      };

      await service.create('team-1', 'user-1', dto);

      expect(db.query).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('returns all skills for team', async () => {
      db.query.mockResolvedValue([mockSkill]);

      const result = await service.findAll('team-1');

      expect(result).toEqual([mockSkill]);
    });

    it('filters by status', async () => {
      db.query.mockResolvedValue([mockSkill]);

      await service.findAll('team-1', 'personal');

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('AND status = $2'),
        expect.any(Array)
      );
    });
  });

  describe('findPersonal', () => {
    it('returns personal skills for author', async () => {
      db.query.mockResolvedValue([mockSkill]);

      const result = await service.findPersonal('user-1');

      expect(result).toEqual([mockSkill]);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'personal'"),
        ['user-1']
      );
    });
  });

  describe('findTeamSkills', () => {
    it('returns team skills', async () => {
      db.query.mockResolvedValue([mockSkill]);

      const result = await service.findTeamSkills('team-1');

      expect(result).toEqual([mockSkill]);
    });
  });

  describe('findMarketplace', () => {
    it('returns marketplace skills', async () => {
      db.query.mockResolvedValue([mockSkill]);

      const result = await service.findMarketplace('team-1');

      expect(result).toEqual([mockSkill]);
    });
  });

  describe('findOne', () => {
    it('returns skill by id scoped to team', async () => {
      db.query.mockResolvedValue([mockSkill]);

      const result = await service.findOne('skill-1', 'team-1');

      expect(result).toEqual(mockSkill);
      expect(db.query).toHaveBeenCalledWith(
        'SELECT * FROM skills WHERE id = $1 AND team_id = $2',
        ['skill-1', 'team-1']
      );
    });

    it('returns undefined when not found', async () => {
      db.query.mockResolvedValue([]);

      const result = await service.findOne('nonexistent', 'team-1');

      expect(result).toBeUndefined();
    });
  });

  describe('update', () => {
    it('updates skill fields', async () => {
      db.query.mockResolvedValue([{ ...mockSkill, name: 'Updated Skill' }]);

      const result = await service.update('skill-1', 'team-1', { name: 'Updated Skill' });

      expect(result.name).toBe('Updated Skill');
    });

    it('handles empty update', async () => {
      db.query.mockResolvedValue([mockSkill]);

      const result = await service.update('skill-1', 'team-1', {});

      expect(result).toEqual(mockSkill);
    });

    it('does not allow status updates through generic update', async () => {
      db.query.mockResolvedValue([mockSkill]);

      await service.update('skill-1', 'team-1', { name: 'Safe Update', status: 'marketplace' } as UpdateSkillDto);

      expect(db.query).toHaveBeenCalledWith(
        expect.not.stringContaining('status'),
        ['Safe Update', 'skill-1', 'team-1']
      );
    });

    it('strips protected team access from generic config updates', async () => {
      db.query.mockResolvedValue([mockSkill]);

      await service.update('skill-1', 'team-1', { config: { teamAccess: { mode: 'all' }, theme: 'dark' } });

      expect(db.query).toHaveBeenCalledWith(
        expect.any(String),
        [{ theme: 'dark' }, 'skill-1', 'team-1']
      );
    });
  });

  describe('delete', () => {
    it('deletes skill', async () => {
      db.query.mockResolvedValue(null);

      await service.delete('skill-1', 'team-1');

      expect(db.query).toHaveBeenCalledWith(
        'DELETE FROM skills WHERE id = $1 AND team_id = $2',
        ['skill-1', 'team-1']
      );
    });
  });

  describe('saveVersion', () => {
    it('saves skill version', async () => {
      const mockVersion = {
        id: 'version-1',
        skill_id: 'skill-1',
        version: '1.0.0',
        content: 'Version content',
        config_schema: {},
        created_by: 'user-1',
      };
      db.query.mockResolvedValue([mockVersion]);

      const result = await service.saveVersion(
        'skill-1',
        '1.0.0',
        'Version content',
        {},
        'user-1'
      );

      expect(result).toEqual(mockVersion);
    });
  });

  describe('getVersions', () => {
    it('returns skill versions', async () => {
      const mockVersions = [
        { id: 'v1', skill_id: 'skill-1', version: '1.0.0' },
        { id: 'v2', skill_id: 'skill-1', version: '2.0.0' },
      ];
      db.query.mockResolvedValue(mockVersions);

      const result = await service.getVersions('skill-1', 'team-1');

      expect(result).toEqual(mockVersions);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('JOIN skills s ON s.id = sv.skill_id'),
        ['skill-1', 'team-1']
      );
    });
  });

  describe('revertToVersion', () => {
    it('reverts skill to version', async () => {
      const mockVersion = {
        id: 'v1',
        skill_id: 'skill-1',
        version: '1.0.0',
        content: 'Old content',
        config_schema: {},
      };
      db.query
        .mockResolvedValueOnce([mockVersion])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([mockSkill]);

      const result = await service.revertToVersion('skill-1', 'v1', 'user-1', 'team-1');

      expect(result).toEqual(mockSkill);
      expect(db.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('JOIN skills s ON s.id = sv.skill_id'),
        ['v1', 'skill-1', 'team-1']
      );
      expect(db.query).toHaveBeenNthCalledWith(
        2,
        'UPDATE skills SET content = $1, config_schema = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND team_id = $4',
        [mockVersion.content, mockVersion.config_schema, 'skill-1', 'team-1']
      );
    });

    it('throws when version not found', async () => {
      db.query.mockResolvedValue([]);

      await expect(
        service.revertToVersion('skill-1', 'nonexistent', 'user-1', 'team-1')
      ).rejects.toThrow('Version not found');
    });
  });

  describe('requestPublishToTeam', () => {
    it('updates skill status to team_pending with access policy', async () => {
      const updated = { ...mockSkill, status: 'team_pending' };
      db.query
        .mockResolvedValueOnce([mockSkill])
        .mockResolvedValueOnce([updated]);

      const result = await service.requestPublishToTeam('skill-1', { userId: 'user-1', teamId: 'team-1', role: 'MEMBER' }, { mode: 'role', minimumRole: 'ADMIN' });

      expect(result.status).toBe('team_pending');
      expect(db.query).toHaveBeenLastCalledWith(
        expect.stringContaining("status = 'team_pending'"),
        ['skill-1', { teamAccess: { mode: 'role', minimumRole: 'ADMIN' } }]
      );
    });

    it('rejects publishing non-personal skills to team', async () => {
      db.query.mockResolvedValueOnce([{ ...mockSkill, status: 'team' }]);

      await expect(service.requestPublishToTeam('skill-1', { userId: 'user-1', teamId: 'team-1', role: 'MEMBER' })).rejects.toThrow('只有个人 Skill 可以提交到团队');
    });

    it('requires users when access policy targets selected users', async () => {
      db.query.mockResolvedValueOnce([mockSkill]);

      await expect(service.requestPublishToTeam('skill-1', { userId: 'user-1', teamId: 'team-1', role: 'MEMBER' }, { mode: 'users', userIds: [] })).rejects.toThrow('指定人可用时必须至少选择一个用户');
    });

    it('requires selected users to belong to the skill team', async () => {
      db.query
        .mockResolvedValueOnce([mockSkill])
        .mockResolvedValueOnce([{ id: 'user-1' }]);

      await expect(service.requestPublishToTeam('skill-1', { userId: 'user-1', teamId: 'team-1', role: 'MEMBER' }, { mode: 'users', userIds: ['user-1', 'user-2'] })).rejects.toThrow('指定成员必须属于当前团队');
    });

    it('rejects publishing another author personal skill to team', async () => {
      db.query.mockResolvedValueOnce([mockSkill]);

      await expect(service.requestPublishToTeam('skill-1', { userId: 'user-2', teamId: 'team-1', role: 'MEMBER' })).rejects.toThrow('只能提交自己所在团队的个人 Skill');
    });

    it('rejects publishing personal skill from another team', async () => {
      db.query.mockResolvedValueOnce([mockSkill]);

      await expect(service.requestPublishToTeam('skill-1', { userId: 'user-1', teamId: 'team-2', role: 'MEMBER' })).rejects.toThrow('只能提交自己所在团队的个人 Skill');
    });
  });

  describe('approveTeamPublish', () => {
    it('approves and sets status to team', async () => {
      const approved = { ...mockSkill, status: 'team' };
      db.query
        .mockResolvedValueOnce([{ ...mockSkill, status: 'team_pending' }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([approved]);

      const result = await service.approveTeamPublish('skill-1', 'reviewer-1', { userId: 'reviewer-1', teamId: 'team-1', role: 'ADMIN' });

      expect(result.status).toBe('team');
    });

    it('rejects approving skills outside team_pending', async () => {
      db.query.mockResolvedValueOnce([mockSkill]);

      await expect(service.approveTeamPublish('skill-1', 'reviewer-1', { userId: 'reviewer-1', teamId: 'team-1', role: 'ADMIN' })).rejects.toThrow('只有待团队审批的 Skill 可以通过');
    });

    it('rejects team approval from non-admin members', async () => {
      db.query.mockResolvedValueOnce([{ ...mockSkill, status: 'team_pending' }]);

      await expect(service.approveTeamPublish('skill-1', 'reviewer-1', { userId: 'reviewer-1', teamId: 'team-1', role: 'MEMBER' })).rejects.toThrow('只有团队管理员或所有者可以执行该操作');
    });

    it('rejects team approval when actor team is missing', async () => {
      db.query.mockResolvedValueOnce([{ ...mockSkill, status: 'team_pending' }]);

      await expect(service.approveTeamPublish('skill-1', 'reviewer-1', { userId: 'reviewer-1', role: 'ADMIN' })).rejects.toThrow('不能审批其他团队的 Skill');
    });
  });

  describe('rejectTeamPublish', () => {
    it('rejects and reverts status to personal', async () => {
      const rejected = { ...mockSkill, status: 'personal' };
      db.query
        .mockResolvedValueOnce([{ ...mockSkill, status: 'team_pending' }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([rejected]);

      const result = await service.rejectTeamPublish('skill-1', 'reviewer-1', 'Not ready', { userId: 'reviewer-1', teamId: 'team-1', role: 'ADMIN' });

      expect(result.status).toBe('personal');
    });

    it('rejects rejecting skills outside team_pending', async () => {
      db.query.mockResolvedValueOnce([mockSkill]);

      await expect(service.rejectTeamPublish('skill-1', 'reviewer-1', 'Not ready', { userId: 'reviewer-1', teamId: 'team-1', role: 'ADMIN' })).rejects.toThrow('只有待团队审批的 Skill 可以拒绝');
    });
  });

  describe('requestPublishToMarketplace', () => {
    it('creates a pending marketplace submission only for team skills', async () => {
      const teamSkill = { ...mockSkill, status: 'team' };
      const pending = { ...mockSkill, status: 'marketplace_pending', marketplace_id: '7' };
      const marketplaceItem = { id: 7 };
      const submission = { id: 11, status: 'pending' };
      db.query
        .mockResolvedValueOnce([teamSkill])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([marketplaceItem])
        .mockResolvedValueOnce([submission])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([pending]);

      const result = await service.requestPublishToMarketplace('skill-1', 'user-1', undefined, { userId: 'user-1', teamId: 'team-1', role: 'ADMIN' });

      expect(result.skill.status).toBe('marketplace_pending');
      expect(result.marketplaceItem).toEqual(marketplaceItem);
      expect(result.submission).toEqual(submission);
    });

    it('rejects direct personal skill marketplace submission', async () => {
      db.query.mockResolvedValueOnce([mockSkill]);

      await expect(service.requestPublishToMarketplace('skill-1', 'user-1', undefined, { userId: 'user-1', teamId: 'team-1', role: 'ADMIN' })).rejects.toThrow('只有团队已发布的 Skill 可以提交到市场');
    });

    it('rejects marketplace submission from non-admin members', async () => {
      db.query.mockResolvedValueOnce([{ ...mockSkill, status: 'team' }]);

      await expect(service.requestPublishToMarketplace('skill-1', 'user-1', undefined, { userId: 'user-1', teamId: 'team-1', role: 'MEMBER' })).rejects.toThrow('只有团队管理员或所有者可以执行该操作');
    });
  });

  describe('approveMarketplacePublish', () => {
    it('approves marketplace publish with marketplace id', async () => {
      const approved = { ...mockSkill, status: 'marketplace', marketplace_id: 'mp-1' };
      db.query
        .mockResolvedValueOnce([{ ...mockSkill, status: 'marketplace_pending' }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([approved]);

      const result = await service.approveMarketplacePublish('skill-1', 'reviewer-1', 'mp-1');

      expect(result.status).toBe('marketplace');
      expect(result.marketplace_id).toBe('mp-1');
    });

    it('rejects approving skills outside marketplace_pending', async () => {
      db.query.mockResolvedValueOnce([{ ...mockSkill, status: 'team' }]);

      await expect(service.approveMarketplacePublish('skill-1', 'reviewer-1', 'mp-1')).rejects.toThrow('只有待市场审批的 Skill 可以通过');
    });
  });
});