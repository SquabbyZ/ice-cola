import { create } from 'zustand';

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
  createSkill: (teamId: string, data: Partial<Skill>) => Promise<void>;
  updateSkill: (skillId: string, data: Partial<Skill>) => Promise<void>;
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

const MOCK_SKILLS: Skill[] = [
  {
    id: 'skill-001',
    name: '代码审查助手',
    description: '专业的代码审查技能，帮助你发现潜在问题和优化建议',
    version: '1.0.0',
    icon: '🔍',
    category: '开发',
    tags: ['code', 'review', 'programming'],
    content: '# Code Review Skill\n\nThis skill helps with code review...',
    configSchema: { severity: { type: 'string', default: 'medium' } },
    config: { severity: 'medium' },
    status: 'personal',
    authorId: 'user-001',
    ratings: 4.8,
    installs: 234,
    createdAt: '2026-04-20T10:00:00Z',
    updatedAt: '2026-04-20T10:00:00Z',
  },
  {
    id: 'skill-002',
    name: '翻译助手',
    description: '支持多语言翻译，帮助你打破语言障碍',
    version: '1.2.0',
    icon: '🌐',
    category: '工具',
    tags: ['translate', 'language'],
    content: '# Translation Skill\n\nMulti-language translation...',
    status: 'team',
    authorId: 'user-002',
    teamId: 'team-001',
    ratings: 4.5,
    installs: 567,
    createdAt: '2026-04-15T10:00:00Z',
    updatedAt: '2026-04-18T10:00:00Z',
  },
];

export const useSkillsStore = create<SkillState>((set, get) => ({
  skills: [],
  personalSkills: [],
  teamSkills: [],
  marketplaceSkills: [],
  searchQuery: '',
  selectedCategory: '全部',
  isLoading: false,
  error: null,

  loadSkills: async (_teamId) => {
    set({ isLoading: true, error: null });
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      set({ skills: MOCK_SKILLS, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load skills', isLoading: false });
    }
  },

  loadPersonalSkills: async () => {
    set({ isLoading: true, error: null });
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      set({ personalSkills: MOCK_SKILLS.filter(s => s.status === 'personal'), isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load personal skills', isLoading: false });
    }
  },

  loadTeamSkills: async (_teamId) => {
    set({ isLoading: true, error: null });
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      set({ teamSkills: MOCK_SKILLS.filter(s => ['team', 'team_pending', 'marketplace_pending', 'marketplace'].includes(s.status)), isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load team skills', isLoading: false });
    }
  },

  loadMarketplaceSkills: async (_teamId) => {
    set({ isLoading: true, error: null });
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      set({ marketplaceSkills: MOCK_SKILLS.filter(s => ['team', 'marketplace'].includes(s.status)), isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load marketplace skills', isLoading: false });
    }
  },

  createSkill: async (_teamId, data) => {
    try {
      const newSkill: Skill = {
        id: `skill-${Date.now()}`,
        name: data.name || '',
        description: data.description || '',
        version: data.version || '1.0.0',
        icon: data.icon || '🛠️',
        category: data.category || '工具',
        tags: data.tags || [],
        content: data.content || '',
        configSchema: data.configSchema,
        config: data.config,
        status: 'personal',
        authorId: 'user-001',
        ratings: 0,
        installs: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      set(state => ({ personalSkills: [newSkill, ...state.personalSkills] }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to create skill' });
      throw err;
    }
  },

  updateSkill: async (skillId, data) => {
    try {
      set(state => ({
        personalSkills: state.personalSkills.map(s =>
          s.id === skillId ? { ...s, ...data, updatedAt: new Date().toISOString() } : s
        ),
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to update skill' });
      throw err;
    }
  },

  deleteSkill: async (skillId) => {
    try {
      set(state => ({
        personalSkills: state.personalSkills.filter(s => s.id !== skillId),
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to delete skill' });
      throw err;
    }
  },

  getVersions: async (_skillId) => {
    return [];
  },

  revertToVersion: async (skillId, versionId) => {
    console.log('revertToVersion', skillId, versionId);
  },

  requestPublishToTeam: async (skillId) => {
    set(state => ({
      personalSkills: state.personalSkills.map(s =>
        s.id === skillId ? { ...s, status: 'team_pending' } : s
      ),
    }));
  },

  approveTeamPublish: async (skillId) => {
    set(state => ({
      personalSkills: state.personalSkills.map(s =>
        s.id === skillId ? { ...s, status: 'team' } : s
      ),
    }));
  },

  rejectTeamPublish: async (skillId, _comment) => {
    set(state => ({
      personalSkills: state.personalSkills.map(s =>
        s.id === skillId ? { ...s, status: 'personal' } : s
      ),
    }));
  },

  requestPublishToMarketplace: async (skillId) => {
    set(state => ({
      personalSkills: state.personalSkills.map(s =>
        s.id === skillId ? { ...s, status: 'marketplace_pending' } : s
      ),
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