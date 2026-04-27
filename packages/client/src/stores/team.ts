import { create } from 'zustand';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
  tokenQuota: number;
  tokenUsed: number;
  isActive: boolean;
}

interface TeamState {
  members: TeamMember[];
  totalQuota: number;
  usedQuota: number;
  onlineCount: number;
  setMembers: (members: TeamMember[]) => void;
  setTeamStats: (totalQuota: number, usedQuota: number, onlineCount: number) => void;
  addMember: (member: Omit<TeamMember, 'id'>) => void;
  removeMember: (id: string) => void;
  updateMemberQuota: (id: string, quota: number) => void;
}

export const useTeamStore = create<TeamState>((set) => ({
  members: [],
  totalQuota: 0,
  usedQuota: 0,
  onlineCount: 0,
  setMembers: (members) => {
    const usedQuota = members.reduce((sum, m) => sum + m.tokenUsed, 0);
    const onlineCount = members.filter((m) => m.isActive).length;
    set({ members, usedQuota, onlineCount });
  },
  setTeamStats: (totalQuota, usedQuota, onlineCount) =>
    set({ totalQuota, usedQuota, onlineCount }),
  addMember: (memberData) =>
    set((state) => {
      const newMember: TeamMember = {
        ...memberData,
        id: Date.now().toString(),
        tokenUsed: 0,
      };
      return {
        members: [...state.members, newMember],
        totalQuota: state.totalQuota + newMember.tokenQuota,
      };
    }),
  removeMember: (id) =>
    set((state) => {
      const member = state.members.find((m) => m.id === id);
      if (!member) return state;
      return {
        members: state.members.filter((m) => m.id !== id),
        totalQuota: state.totalQuota - member.tokenQuota,
        usedQuota: state.usedQuota - member.tokenUsed,
      };
    }),
  updateMemberQuota: (id, quota) =>
    set((state) => ({
      members: state.members.map((m) =>
        m.id === id ? { ...m, tokenQuota: quota } : m
      ),
      totalQuota: state.members.reduce(
        (sum, m) => sum + (m.id === id ? quota : m.tokenQuota),
        0
      ),
    })),
}));
