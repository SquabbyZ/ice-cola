import { create } from 'zustand';
import { SkillService } from '@/services/skill-service';

const skillService = new SkillService();

function transformMarketplaceSkill(item: Record<string, unknown>): Skill {
  const configSchema = (item.config_schema ?? {}) as Record<string, unknown>;
  return {
    id: String(item.id ?? ''),
    name: String(item.name ?? ''),
    description: String(item.description ?? ''),
    content: String((configSchema.content as string) ?? ''),
    configSchema,
    config: (item.config ?? {}) as Record<string, unknown>,
    status: 'marketplace',
    icon: String(item.icon ?? ''),
    category: String(item.category ?? 'general'),
    tags: Array.isArray(item.tags) ? (item.tags as string[]) : [],
    authorId: String(item.author_id ?? item.authorId ?? ''),
    ratings: Number(item.ratings ?? 0),
    installs: Number(item.installs ?? 0),
    version: String(item.version ?? '1'),
    createdAt: String(item.created_at ?? item.createdAt ?? new Date().toISOString()),
    updatedAt: String(item.updated_at ?? item.updatedAt ?? new Date().toISOString()),
  };
}

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
  isMarketplaceLoading: boolean;
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
  requestPublishToTeam: (skillId: string, accessPolicy?: import('@/services/skill-service').TeamSkillAccessPolicy) => Promise<void>;
  approveTeamPublish: (skillId: string) => Promise<void>;
  rejectTeamPublish: (skillId: string, comment: string) => Promise<void>;
  requestPublishToMarketplace: (skillId: string, note?: string) => Promise<void>;
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
  selectedCategory: 'all',
  isLoading: false,
  isMarketplaceLoading: false,
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
    set({ isMarketplaceLoading: true });
    try {
      const items = await skillService.getMarketplaceSkillsFromApi();
      const skills = items.map(transformMarketplaceSkill);
      set({ marketplaceSkills: skills, isMarketplaceLoading: false });
    } catch (error) {
      console.error('[SkillsStore] Failed to load marketplace skills:', error);
      set({ isMarketplaceLoading: false });
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
    try {
      return await skillService.getVersions(skillId);
    } catch {
      return [];
    }
  },

  revertToVersion: async (skillId, versionId) => {
    try {
      const updated = await skillService.revertToVersion(skillId, versionId);
      set(state => ({
        personalSkills: state.personalSkills.map(s => s.id === skillId ? updated : s),
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to revert version' });
      throw err;
    }
  },

  requestPublishToTeam: async (skillId, accessPolicy = { mode: 'all' }) => {
    try {
      const skill = await skillService.requestPublishToTeam(skillId, accessPolicy);
      set(state => ({
        personalSkills: state.personalSkills.map(s => s.id === skillId ? skill : s).filter(s => s.status === 'personal'),
        teamSkills: [skill, ...state.teamSkills.filter(s => s.id !== skillId)],
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to request team publish' });
      throw err;
    }
  },

  approveTeamPublish: async (skillId) => {
    try {
      const skill = await skillService.approveTeamPublish(skillId);
      set(state => ({
        teamSkills: state.teamSkills.map(s => s.id === skillId ? skill : s),
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to approve team publish' });
      throw err;
    }
  },

  rejectTeamPublish: async (skillId, comment) => {
    try {
      const skill = await skillService.rejectTeamPublish(skillId, comment);
      set(state => ({
        personalSkills: [skill, ...state.personalSkills.filter(s => s.id !== skillId)],
        teamSkills: state.teamSkills.filter(s => s.id !== skillId),
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to reject team publish' });
      throw err;
    }
  },

  requestPublishToMarketplace: async (skillId, note) => {
    try {
      const result = await skillService.requestPublishToMarketplace(skillId, note);
      set(state => ({
        teamSkills: state.teamSkills.map(s => s.id === skillId ? result.skill : s),
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to request marketplace publish' });
      throw err;
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),

  getFilteredSkills: (skills) => {
    const { searchQuery, selectedCategory } = get();
    return skills.filter(skill => {
      if (selectedCategory !== 'all' && skill.category !== selectedCategory) return false;
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