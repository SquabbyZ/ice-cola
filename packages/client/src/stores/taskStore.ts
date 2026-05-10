import { create } from 'zustand';

export interface Task {
  id: string;
  name: string;
  description: string;
  status: 'running' | 'completed' | 'failed' | 'pending';
  triggerType: 'manual' | 'scheduled' | 'event';
  lastRunAt?: string;
  nextRunAt?: string;
  runCount: number;
  successCount: number;
  createdAt: string;
  updatedAt: string;
}

interface TaskState {
  tasks: Task[];
  filterStatus: 'all' | 'running' | 'completed' | 'failed' | 'pending';
  searchQuery: string;
  isLoading: boolean;
  error: string | null;

  loadTasks: () => Promise<void>;
  createTask: (data: Partial<Task>) => Promise<Task>;
  updateTask: (id: string, data: Partial<Task>) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  runTask: (id: string) => Promise<void>;
  setFilterStatus: (status: 'all' | 'running' | 'completed' | 'failed' | 'pending') => void;
  setSearchQuery: (query: string) => void;
  getFilteredTasks: () => Task[];
}

const MOCK_TASKS: Task[] = [
  {
    id: 'task-001',
    name: '每日数据备份',
    description: '每天凌晨 2 点自动备份数据库到云端存储',
    status: 'completed',
    triggerType: 'scheduled',
    lastRunAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    nextRunAt: new Date(Date.now() + 16 * 60 * 60 * 1000).toISOString(),
    runCount: 42,
    successCount: 41,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'task-002',
    name: '代码质量扫描',
    description: '每周一对主分支代码执行静态分析和安全扫描',
    status: 'running',
    triggerType: 'scheduled',
    lastRunAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    runCount: 12,
    successCount: 11,
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: 'task-003',
    name: 'API 文档生成',
    description: '从代码注释自动生成 OpenAPI 文档并发布到内部站点',
    status: 'pending',
    triggerType: 'manual',
    runCount: 8,
    successCount: 7,
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'task-004',
    name: '依赖安全审计',
    description: '检测项目依赖中的已知安全漏洞并生成报告',
    status: 'failed',
    triggerType: 'event',
    lastRunAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    runCount: 15,
    successCount: 13,
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  filterStatus: 'all',
  searchQuery: '',
  isLoading: false,
  error: null,

  loadTasks: async () => {
    set({ isLoading: true, error: null });
    try {
      // Mock: simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      set({ tasks: MOCK_TASKS, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load tasks', isLoading: false });
    }
  },

  createTask: async (data) => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      name: data.name || '未命名任务',
      description: data.description || '',
      status: 'pending',
      triggerType: data.triggerType || 'manual',
      runCount: 0,
      successCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set(state => ({ tasks: [newTask, ...state.tasks] }));
    return newTask;
  },

  updateTask: async (id, data) => {
    let updated: Task | null = null;
    set(state => ({
      tasks: state.tasks.map(t => {
        if (t.id === id) {
          updated = { ...t, ...data, updatedAt: new Date().toISOString() };
          return updated;
        }
        return t;
      }),
    }));
    if (!updated) throw new Error('Task not found');
    return updated;
  },

  deleteTask: async (id) => {
    set(state => ({ tasks: state.tasks.filter(t => t.id !== id) }));
  },

  runTask: async (id) => {
    // Simulate running a task
    set(state => ({
      tasks: state.tasks.map(t =>
        t.id === id
          ? {
              ...t,
              status: 'running' as const,
              lastRunAt: new Date().toISOString(),
              runCount: t.runCount + 1,
            }
          : t
      ),
    }));
    // Simulate completion after 2s
    setTimeout(() => {
      set(state => ({
        tasks: state.tasks.map(t =>
          t.id === id
            ? {
                ...t,
                status: 'completed' as const,
                successCount: t.successCount + 1,
                updatedAt: new Date().toISOString(),
              }
            : t
        ),
      }));
    }, 2000);
  },

  setFilterStatus: (status) => set({ filterStatus: status }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  getFilteredTasks: () => {
    const { tasks, filterStatus, searchQuery } = get();
    return tasks.filter(t => {
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
      }
      return true;
    });
  },
}));
