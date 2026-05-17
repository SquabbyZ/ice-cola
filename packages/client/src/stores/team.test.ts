/**
 * Team Store 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useTeamStore } from './team';

describe('useTeamStore', () => {
  beforeEach(() => {
    useTeamStore.setState({
      members: [],
      totalQuota: 0,
      usedQuota: 0,
      onlineCount: 0,
    });
  });

  describe('initial state', () => {
    it('has empty members array', () => {
      expect(useTeamStore.getState().members).toEqual([]);
    });

    it('has zero totalQuota', () => {
      expect(useTeamStore.getState().totalQuota).toBe(0);
    });

    it('has zero usedQuota', () => {
      expect(useTeamStore.getState().usedQuota).toBe(0);
    });

    it('has zero onlineCount', () => {
      expect(useTeamStore.getState().onlineCount).toBe(0);
    });
  });

  describe('setMembers', () => {
    it('sets members and calculates usedQuota and onlineCount', () => {
      const members = [
        { id: '1', name: 'Alice', email: 'alice@test.com', role: 'admin' as const, tokenQuota: 1000, tokenUsed: 200, isActive: true },
        { id: '2', name: 'Bob', email: 'bob@test.com', role: 'member' as const, tokenQuota: 500, tokenUsed: 100, isActive: false },
      ];

      useTeamStore.getState().setMembers(members);

      const state = useTeamStore.getState();
      expect(state.members).toEqual(members);
      expect(state.usedQuota).toBe(300); // 200 + 100
      expect(state.onlineCount).toBe(1); // only Alice is active
    });

    it('handles empty members array', () => {
      useTeamStore.getState().setMembers([]);

      const state = useTeamStore.getState();
      expect(state.members).toEqual([]);
      expect(state.usedQuota).toBe(0);
      expect(state.onlineCount).toBe(0);
    });
  });

  describe('setTeamStats', () => {
    it('sets team stats directly', () => {
      useTeamStore.getState().setTeamStats(5000, 1500, 3);

      const state = useTeamStore.getState();
      expect(state.totalQuota).toBe(5000);
      expect(state.usedQuota).toBe(1500);
      expect(state.onlineCount).toBe(3);
    });
  });

  describe('addMember', () => {
    it('adds a new member with generated id and zero tokenUsed', () => {
      const memberData = {
        name: 'Charlie',
        email: 'charlie@test.com',
        role: 'member' as const,
        tokenQuota: 800,
        tokenUsed: 0,
        isActive: false,
      };

      useTeamStore.getState().addMember(memberData);

      const state = useTeamStore.getState();
      expect(state.members).toHaveLength(1);
      expect(state.members[0].name).toBe('Charlie');
      expect(state.members[0].tokenUsed).toBe(0);
      expect(state.members[0].id).toBeDefined();
      expect(state.totalQuota).toBe(800);
    });

    it('accumulates totalQuota when adding members', () => {
      useTeamStore.getState().addMember({
        name: 'Alice',
        email: 'alice@test.com',
        role: 'admin',
        tokenQuota: 1000,
        tokenUsed: 0,
        isActive: true,
      });

      useTeamStore.getState().addMember({
        name: 'Bob',
        email: 'bob@test.com',
        role: 'member',
        tokenQuota: 500,
        tokenUsed: 0,
        isActive: false,
      });

      expect(useTeamStore.getState().totalQuota).toBe(1500);
    });
  });

  describe('removeMember', () => {
    it('removes member and subtracts their quota', () => {
      // setMembers only updates usedQuota/onlineCount, not totalQuota
      // So we need setTeamStats to set initial totalQuota first
      useTeamStore.getState().setTeamStats(1500, 300, 1);
      const members = [
        { id: '1', name: 'Alice', email: 'alice@test.com', role: 'admin' as const, tokenQuota: 1000, tokenUsed: 200, isActive: true },
        { id: '2', name: 'Bob', email: 'bob@test.com', role: 'member' as const, tokenQuota: 500, tokenUsed: 100, isActive: false },
      ];
      useTeamStore.getState().setMembers(members);

      useTeamStore.getState().removeMember('1');

      const state = useTeamStore.getState();
      expect(state.members).toHaveLength(1);
      expect(state.members[0].name).toBe('Bob');
      expect(state.totalQuota).toBe(500); // 1500 - 1000
      // setMembers calculated usedQuota as 200+100=300, then removeMember subtracts Alice's 200
      expect(state.usedQuota).toBe(100); // 300 - 200 (Bob remains with 100 tokenUsed)
    });

    it('does nothing when member id not found', () => {
      useTeamStore.getState().addMember({
        name: 'Alice',
        email: 'alice@test.com',
        role: 'admin',
        tokenQuota: 1000,
        tokenUsed: 0,
        isActive: true,
      });

      const initialState = useTeamStore.getState();
      useTeamStore.getState().removeMember('nonexistent');

      const state = useTeamStore.getState();
      expect(state.members).toEqual(initialState.members);
      expect(state.totalQuota).toEqual(initialState.totalQuota);
    });
  });

  describe('updateMemberQuota', () => {
    it('updates member quota and recalculates totalQuota', () => {
      const members = [
        { id: '1', name: 'Alice', email: 'alice@test.com', role: 'admin' as const, tokenQuota: 1000, tokenUsed: 200, isActive: true },
        { id: '2', name: 'Bob', email: 'bob@test.com', role: 'member' as const, tokenQuota: 500, tokenUsed: 100, isActive: false },
      ];
      useTeamStore.getState().setMembers(members);

      useTeamStore.getState().updateMemberQuota('1', 1500);

      const state = useTeamStore.getState();
      expect(state.members.find((m) => m.id === '1')?.tokenQuota).toBe(1500);
      expect(state.totalQuota).toBe(2000); // 1500 + 500
    });

    it('does not affect other members', () => {
      const members = [
        { id: '1', name: 'Alice', email: 'alice@test.com', role: 'admin' as const, tokenQuota: 1000, tokenUsed: 200, isActive: true },
        { id: '2', name: 'Bob', email: 'bob@test.com', role: 'member' as const, tokenQuota: 500, tokenUsed: 100, isActive: false },
      ];
      useTeamStore.getState().setMembers(members);

      useTeamStore.getState().updateMemberQuota('1', 1500);

      const state = useTeamStore.getState();
      expect(state.members.find((m) => m.id === '2')?.tokenQuota).toBe(500);
    });
  });
});