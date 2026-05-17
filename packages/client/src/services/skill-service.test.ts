import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SkillService } from './skill-service';

const send = vi.fn();

vi.mock('./service-container', () => ({
  getServiceContainer: () => ({
    gatewayClient: { send },
  }),
}));

describe('SkillService approval flow', () => {
  let service: SkillService;

  beforeEach(() => {
    service = new SkillService();
    send.mockReset();
  });

  it('requests team publish through dedicated RPC with access policy', async () => {
    send.mockResolvedValue({ id: 'skill-1', status: 'team_pending' });

    await service.requestPublishToTeam('skill-1', { mode: 'role', minimumRole: 'ADMIN' });

    expect(send).toHaveBeenCalledWith('skills.publishTeam', {
      id: 'skill-1',
      accessPolicy: { mode: 'role', minimumRole: 'ADMIN' },
    });
  });

  it('approves team publish through dedicated RPC without client identity', async () => {
    send.mockResolvedValue({ id: 'skill-1', status: 'team' });

    await service.approveTeamPublish('skill-1');

    expect(send).toHaveBeenCalledWith('skills.approveTeam', {
      id: 'skill-1',
    });
  });

  it('rejects team publish through dedicated RPC without client identity', async () => {
    send.mockResolvedValue({ id: 'skill-1', status: 'personal' });

    await service.rejectTeamPublish('skill-1', 'Needs changes');

    expect(send).toHaveBeenCalledWith('skills.rejectTeam', {
      id: 'skill-1',
      comment: 'Needs changes',
    });
  });

  it('requests marketplace publish through dedicated RPC without client identity', async () => {
    send.mockResolvedValue({ skill: { id: 'skill-1', status: 'marketplace_pending' } });

    await service.requestPublishToMarketplace('skill-1', 'Ready');

    expect(send).toHaveBeenCalledWith('skills.publishMarketplace', {
      id: 'skill-1',
      note: 'Ready',
    });
  });
});
