import { describe, expect, it } from 'vitest';
import { getTeamId } from './team';

describe('getTeamId', () => {
  it('returns team id when available', () => {
    expect(getTeamId({ team: { id: 'team-1', name: 'Team', role: 'OWNER' } } as any)).toBe('team-1');
  });

  it('returns null when user has no team', () => {
    expect(getTeamId({ team: null } as any)).toBeNull();
  });

  it('returns null when user is missing', () => {
    expect(getTeamId(null)).toBeNull();
  });
});
