import { Test, TestingModule } from '@nestjs/testing';
import { SkillsService } from './skills.service';
import { DatabaseService } from '../database/database.service';

describe('SkillsService', () => {
  let service: SkillsService;
  let db: jest.Mocked<DatabaseService>;

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
          },
        },
      ],
    }).compile();

    service = module.get<SkillsService>(SkillsService);
    db = module.get(DatabaseService);
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
    it('returns skill by id', async () => {
      db.query.mockResolvedValue([mockSkill]);

      const result = await service.findOne('skill-1');

      expect(result).toEqual(mockSkill);
    });

    it('returns undefined when not found', async () => {
      db.query.mockResolvedValue([]);

      const result = await service.findOne('nonexistent');

      expect(result).toBeUndefined();
    });
  });

  describe('update', () => {
    it('updates skill fields', async () => {
      db.query.mockResolvedValue([{ ...mockSkill, name: 'Updated Skill' }]);

      const result = await service.update('skill-1', { name: 'Updated Skill' });

      expect(result.name).toBe('Updated Skill');
    });

    it('handles empty update', async () => {
      db.query.mockResolvedValue([mockSkill]);

      const result = await service.update('skill-1', {});

      expect(result).toEqual(mockSkill);
    });
  });

  describe('delete', () => {
    it('deletes skill', async () => {
      db.query.mockResolvedValue(null);

      await service.delete('skill-1');

      expect(db.query).toHaveBeenCalledWith(
        'DELETE FROM skills WHERE id = $1',
        ['skill-1']
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

      const result = await service.getVersions('skill-1');

      expect(result).toEqual(mockVersions);
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
        .mockResolvedValueOnce([mockVersion]) // SELECT version
        .mockResolvedValueOnce([]) // UPDATE skill
        .mockResolvedValueOnce([mockSkill]); // findOne after revert

      const result = await service.revertToVersion('skill-1', 'v1', 'user-1');

      expect(result).toEqual(mockSkill);
    });

    it('throws when version not found', async () => {
      db.query.mockResolvedValue([]);

      await expect(
        service.revertToVersion('skill-1', 'nonexistent', 'user-1')
      ).rejects.toThrow('Version not found');
    });
  });

  describe('requestPublishToTeam', () => {
    it('updates skill status to team_pending', async () => {
      const updated = { ...mockSkill, status: 'team_pending' };
      db.query.mockResolvedValue([updated]);

      const result = await service.requestPublishToTeam('skill-1');

      expect(result.status).toBe('team_pending');
    });
  });

  describe('approveTeamPublish', () => {
    it('approves and sets status to team', async () => {
      const approved = { ...mockSkill, status: 'team' };
      db.query
        .mockResolvedValueOnce([]) // INSERT review
        .mockResolvedValueOnce([approved]); // UPDATE skill

      const result = await service.approveTeamPublish('skill-1', 'reviewer-1');

      expect(result.status).toBe('team');
    });
  });

  describe('rejectTeamPublish', () => {
    it('rejects and reverts status to personal', async () => {
      const rejected = { ...mockSkill, status: 'personal' };
      db.query
        .mockResolvedValueOnce([]) // INSERT review
        .mockResolvedValueOnce([rejected]); // UPDATE skill

      const result = await service.rejectTeamPublish('skill-1', 'reviewer-1', 'Not ready');

      expect(result.status).toBe('personal');
    });
  });

  describe('requestPublishToMarketplace', () => {
    it('updates skill status to marketplace_pending', async () => {
      const pending = { ...mockSkill, status: 'marketplace_pending' };
      db.query.mockResolvedValue([pending]);

      const result = await service.requestPublishToMarketplace('skill-1');

      expect(result.status).toBe('marketplace_pending');
    });
  });

  describe('approveMarketplacePublish', () => {
    it('approves marketplace publish with marketplace id', async () => {
      const approved = { ...mockSkill, status: 'marketplace', marketplace_id: 'mp-1' };
      db.query
        .mockResolvedValueOnce([]) // INSERT review
        .mockResolvedValueOnce([approved]); // UPDATE skill

      const result = await service.approveMarketplacePublish('skill-1', 'reviewer-1', 'mp-1');

      expect(result.status).toBe('marketplace');
      expect(result.marketplace_id).toBe('mp-1');
    });
  });
});