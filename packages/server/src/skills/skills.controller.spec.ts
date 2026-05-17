import { ForbiddenException } from '@nestjs/common';
import { SkillsController } from './skills.controller';
import { SkillsService } from './skills.service';
import type { CreateSkillDto } from './dto/create-skill.dto';
import type { UpdateSkillDto } from './dto/update-skill.dto';

type AuthenticatedRequestFixture = {
  user: {
    id: string;
    teamId: string;
    role?: string;
  };
};

type SkillFixture = {
  id: string;
  team_id: string;
  name: string;
};

describe('SkillsController team authorization', () => {
  let controller: SkillsController;
  let service: jest.Mocked<Pick<SkillsService,
    | 'create'
    | 'findAll'
    | 'findPersonal'
    | 'findTeamSkills'
    | 'findMarketplace'
    | 'findOne'
    | 'update'
    | 'delete'
    | 'getVersions'
    | 'revertToVersion'
    | 'requestPublishToTeam'
    | 'approveTeamPublish'
    | 'rejectTeamPublish'
    | 'requestPublishToMarketplace'
  >>;
  const req: AuthenticatedRequestFixture = { user: { id: 'user-1', teamId: 'team-1', role: 'ADMIN' } };

  beforeEach(() => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findPersonal: jest.fn(),
      findTeamSkills: jest.fn(),
      findMarketplace: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getVersions: jest.fn(),
      revertToVersion: jest.fn(),
      requestPublishToTeam: jest.fn(),
      approveTeamPublish: jest.fn(),
      rejectTeamPublish: jest.fn(),
      requestPublishToMarketplace: jest.fn(),
    };
    controller = new SkillsController(service as unknown as SkillsService);
  });

  it('rejects path team mismatches before reading team skills', async () => {
    await expect(controller.findAll('team-2', req)).rejects.toThrow(ForbiddenException);
    expect(service.findAll).not.toHaveBeenCalled();
  });

  it('uses authenticated team scope for skill reads', async () => {
    const skill: SkillFixture = { id: 'skill-1', team_id: 'team-1', name: 'Workflow skill' };
    service.findOne.mockResolvedValue(skill);

    await expect(controller.findOne('team-1', 'skill-1', req)).resolves.toEqual({ success: true, data: skill });
    expect(service.findOne).toHaveBeenCalledWith('skill-1', 'team-1');
  });

  it('uses authenticated team scope for skill updates', async () => {
    const skill: SkillFixture = { id: 'skill-1', team_id: 'team-1', name: 'Updated skill' };
    const body: UpdateSkillDto = { name: 'Updated skill' };
    service.update.mockResolvedValue(skill);

    await expect(controller.update('team-1', 'skill-1', body, req)).resolves.toEqual({ success: true, data: skill });
    expect(service.update).toHaveBeenCalledWith('skill-1', 'team-1', body);
  });

  it('uses authenticated team scope for skill deletes', async () => {
    service.delete.mockResolvedValue();

    await expect(controller.delete('team-1', 'skill-1', req)).resolves.toEqual({ success: true, data: null });
    expect(service.delete).toHaveBeenCalledWith('skill-1', 'team-1');
  });

  it('uses authenticated team scope for versions and reverts', async () => {
    const versions = [{ id: 'version-1', skill_id: 'skill-1' }];
    const skill: SkillFixture = { id: 'skill-1', team_id: 'team-1', name: 'Reverted skill' };
    service.getVersions.mockResolvedValue(versions);
    service.revertToVersion.mockResolvedValue(skill);

    await expect(controller.getVersions('team-1', 'skill-1', req)).resolves.toEqual({ success: true, data: versions });
    await expect(controller.revertToVersion('team-1', 'skill-1', 'version-1', req)).resolves.toEqual({ success: true, data: skill });
    expect(service.getVersions).toHaveBeenCalledWith('skill-1', 'team-1');
    expect(service.revertToVersion).toHaveBeenCalledWith('skill-1', 'version-1', 'user-1', 'team-1');
  });

  it('uses authenticated team scope for skill creation', async () => {
    const body: CreateSkillDto = { name: 'New skill', content: 'Prompt' };
    const skill: SkillFixture = { id: 'skill-1', team_id: 'team-1', name: 'New skill' };
    service.create.mockResolvedValue(skill);

    await expect(controller.create('team-1', req, body)).resolves.toEqual({ success: true, data: skill });
    expect(service.create).toHaveBeenCalledWith('team-1', 'user-1', body);
  });
});
