import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSkillsStore, type Skill } from './skillsStore';

const skillServiceMock = vi.hoisted(() => ({
  requestPublishToTeam: vi.fn(),
  approveTeamPublish: vi.fn(),
  rejectTeamPublish: vi.fn(),
  requestPublishToMarketplace: vi.fn(),
}));

vi.mock('@/services/skill-service', () => ({
  SkillService: vi.fn(() => ({
    getAllSkills: vi.fn(),
    getMarketplaceSkills: vi.fn(),
    createSkill: vi.fn(),
    updateSkill: vi.fn(),
    deleteSkill: vi.fn(),
    getVersions: vi.fn(),
    revertToVersion: vi.fn(),
    requestPublishToTeam: skillServiceMock.requestPublishToTeam,
    approveTeamPublish: skillServiceMock.approveTeamPublish,
    rejectTeamPublish: skillServiceMock.rejectTeamPublish,
    requestPublishToMarketplace: skillServiceMock.requestPublishToMarketplace,
  })),
}));

const baseSkill: Skill = {
  id: 'skill-1',
  name: 'Test Skill',
  description: 'A test skill',
  version: '1.0.0',
  icon: '🧊',
  category: 'tools',
  tags: ['test'],
  content: 'content',
  status: 'personal',
  teamId: 'team-1',
  authorId: 'user-1',
  ratings: 0,
  installs: 0,
  createdAt: '2026-05-17T00:00:00.000Z',
  updatedAt: '2026-05-17T00:00:00.000Z',
};

describe('useSkillsStore approval flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSkillsStore.setState({
      skills: [],
      personalSkills: [],
      teamSkills: [],
      marketplaceSkills: [],
      searchQuery: '',
      selectedCategory: 'all',
      isLoading: false,
      error: null,
    });
  });

  it('moves personal skill to team pending after team publish request', async () => {
    const pendingSkill = { ...baseSkill, status: 'team_pending' as const };
    skillServiceMock.requestPublishToTeam.mockResolvedValue(pendingSkill);
    useSkillsStore.setState({ personalSkills: [baseSkill], teamSkills: [] });

    await useSkillsStore.getState().requestPublishToTeam('skill-1', { mode: 'all' });

    expect(skillServiceMock.requestPublishToTeam).toHaveBeenCalledWith('skill-1', { mode: 'all' });
    expect(useSkillsStore.getState().personalSkills).toEqual([]);
    expect(useSkillsStore.getState().teamSkills).toEqual([pendingSkill]);
  });

  it('updates team skill after team approval', async () => {
    const pendingSkill = { ...baseSkill, status: 'team_pending' as const };
    const approvedSkill = { ...baseSkill, status: 'team' as const };
    skillServiceMock.approveTeamPublish.mockResolvedValue(approvedSkill);
    useSkillsStore.setState({ teamSkills: [pendingSkill] });

    await useSkillsStore.getState().approveTeamPublish('skill-1');

    expect(skillServiceMock.approveTeamPublish).toHaveBeenCalledWith('skill-1');
    expect(useSkillsStore.getState().teamSkills).toEqual([approvedSkill]);
  });

  it('returns rejected team skill to personal skills', async () => {
    const pendingSkill = { ...baseSkill, status: 'team_pending' as const };
    const rejectedSkill = { ...baseSkill, status: 'personal' as const };
    skillServiceMock.rejectTeamPublish.mockResolvedValue(rejectedSkill);
    useSkillsStore.setState({ personalSkills: [], teamSkills: [pendingSkill] });

    await useSkillsStore.getState().rejectTeamPublish('skill-1', 'Needs changes');

    expect(skillServiceMock.rejectTeamPublish).toHaveBeenCalledWith('skill-1', 'Needs changes');
    expect(useSkillsStore.getState().personalSkills).toEqual([rejectedSkill]);
    expect(useSkillsStore.getState().teamSkills).toEqual([]);
  });

  it('marks team skill marketplace pending after marketplace submission', async () => {
    const teamSkill = { ...baseSkill, status: 'team' as const };
    const pendingSkill = { ...baseSkill, status: 'marketplace_pending' as const };
    skillServiceMock.requestPublishToMarketplace.mockResolvedValue({ skill: pendingSkill });
    useSkillsStore.setState({ teamSkills: [teamSkill] });

    await useSkillsStore.getState().requestPublishToMarketplace('skill-1', 'Ready');

    expect(skillServiceMock.requestPublishToMarketplace).toHaveBeenCalledWith('skill-1', 'Ready');
    expect(useSkillsStore.getState().teamSkills).toEqual([pendingSkill]);
  });
});
