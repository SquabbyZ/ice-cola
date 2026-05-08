import { create } from 'zustand';
import { SkillService } from '@/services/skill-service';

const skillService = new SkillService();

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
  createSkill: (teamId: string, data: Partial<Skill>) => Promise<Skill>;
  updateSkill: (skillId: string, data: Partial<Skill>) => Promise<Skill>;
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
      const skills = await skillService.getAllSkills(teamId);
      set({ skills, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load skills', isLoading: false });
    }
  },

  loadPersonalSkills: async () => {
    set({ isLoading: true, error: null });
    try {
      const skills = await skillService.getAllSkills('personal');
      set({ personalSkills: skills.filter(s => s.status === 'personal'), isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load personal skills', isLoading: false });
    }
  },

  loadTeamSkills: async (teamId) => {
    set({ isLoading: true, error: null });
    try {
      const skills = await skillService.getAllSkills(teamId);
      set({ teamSkills: skills.filter(s => ['team', 'team_pending', 'marketplace_pending', 'marketplace'].includes(s.status)), isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load team skills', isLoading: false });
    }
  },

  loadMarketplaceSkills: async (_teamId) => {
    set({ isLoading: true, error: null });
    try {
      const skills = await skillService.getMarketplaceSkills();
      set({ marketplaceSkills: skills, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load marketplace skills', isLoading: false });
    }
  },

  createSkill: async (teamId, data) => {
    try {
      const newSkill = await skillService.createSkill(teamId, data.authorId || '', data);
      set(state => ({ personalSkills: [newSkill, ...state.personalSkills] }));
      return newSkill;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to create skill' });
      throw err;
    }
  },

  updateSkill: async (skillId, data) => {
    try {
      const updated = await skillService.updateSkill(skillId, data);
      set(state => ({
        personalSkills: state.personalSkills.map(s => s.id === skillId ? updated : s),
      }));
      return updated;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to update skill' });
      throw err;
    }
  },

  deleteSkill: async (skillId) => {
    try {
      await skillService.deleteSkill(skillId);
      set(state => ({
        personalSkills: state.personalSkills.filter(s => s.id !== skillId),
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to delete skill' });
      throw err;
    }
  },

  getVersions: async (skillId) => {
    const skill = await skillService.getSkill(skillId);
    return skill ? [] : [];
  },

  revertToVersion: async (skillId, versionId) => {
    console.log('revertToVersion', skillId, versionId);
  },

  requestPublishToTeam: async (skillId) => {
    const skill = await skillService.updateSkill(skillId, { status: 'team_pending' });
    set(state => ({
      personalSkills: state.personalSkills.map(s => s.id === skillId ? skill : s),
    }));
  },

  approveTeamPublish: async (skillId) => {
    const skill = await skillService.updateSkill(skillId, { status: 'team' });
    set(state => ({
      personalSkills: state.personalSkills.map(s => s.id === skillId ? skill : s),
    }));
  },

  rejectTeamPublish: async (skillId, _comment) => {
    const skill = await skillService.updateSkill(skillId, { status: 'personal' });
    set(state => ({
      personalSkills: state.personalSkills.map(s => s.id === skillId ? skill : s),
    }));
  },

  requestPublishToMarketplace: async (skillId) => {
    const skill = await skillService.updateSkill(skillId, { status: 'marketplace_pending' });
    set(state => ({
      personalSkills: state.personalSkills.map(s => s.id === skillId ? skill : s),
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