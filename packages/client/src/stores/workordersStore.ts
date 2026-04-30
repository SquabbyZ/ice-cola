import { create } from 'zustand';

export interface Workorder {
  id: string;
  type: 'skill' | 'mcp' | 'extension';
  targetId: string;
  targetName: string;
  targetIcon: string;
  applicantId: string;
  applicantName: string;
  approvers: { id: string; name: string }[];
  teamId: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  note?: string;
}

export interface WorkorderHistory {
  id: string;
  workorderId: string;
  type: 'skill' | 'mcp' | 'extension';
  targetName: string;
  approverId: string;
  approverName: string;
  result: 'approved' | 'rejected';
  comment?: string;
  processedAt: string;
}

interface WorkordersState {
  workorders: Workorder[];
  history: WorkorderHistory[];
  filterType: 'all' | 'skill' | 'mcp' | 'extension';
  filterStatus: 'pending' | 'approved' | 'rejected' | 'all';
  selectedIds: string[];
  isLoading: boolean;
  error: string | null;

  loadWorkorders: () => Promise<void>;
  loadHistory: () => Promise<void>;
  approve: (id: string, comment?: string) => Promise<void>;
  reject: (id: string, comment: string) => Promise<void>;
  batchApprove: (ids: string[]) => Promise<void>;
  batchReject: (ids: string[], comment: string) => Promise<void>;
  setFilterType: (type: 'all' | 'skill' | 'mcp' | 'extension') => void;
  setFilterStatus: (status: 'pending' | 'approved' | 'rejected' | 'all') => void;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  getFilteredWorkorders: () => Workorder[];
}

const MOCK_WORKORDERS: Workorder[] = [
  {
    id: 'wo-001',
    type: 'skill',
    targetId: 'skill-001',
    targetName: '代码审查助手',
    targetIcon: '🔍',
    applicantId: 'user-001',
    applicantName: '张三',
    approvers: [
      { id: 'admin-001', name: '管理员' },
      { id: 'admin-002', name: '超级管理员' },
    ],
    teamId: 'team-001',
    submittedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    status: 'pending',
    note: '希望发布到团队让更多人使用',
  },
  {
    id: 'wo-002',
    type: 'skill',
    targetId: 'skill-002',
    targetName: '翻译助手',
    targetIcon: '🌐',
    applicantId: 'user-002',
    applicantName: '李四',
    approvers: [{ id: 'admin-001', name: '管理员' }],
    teamId: 'team-001',
    submittedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    status: 'pending',
  },
];

const MOCK_HISTORY: WorkorderHistory[] = [
  {
    id: 'hist-001',
    workorderId: 'wo-000',
    type: 'skill',
    targetName: '代码审查助手',
    approverId: 'admin-001',
    approverName: '管理员',
    result: 'approved',
    processedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
];

export const useWorkordersStore = create<WorkordersState>((set, get) => ({
  workorders: [],
  history: [],
  filterType: 'all',
  filterStatus: 'pending',
  selectedIds: [],
  isLoading: false,
  error: null,

  loadWorkorders: async () => {
    set({ isLoading: true, error: null });
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      set({ workorders: MOCK_WORKORDERS, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load', isLoading: false });
    }
  },

  loadHistory: async () => {
    set({ isLoading: true, error: null });
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      set({ history: MOCK_HISTORY, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load', isLoading: false });
    }
  },

  approve: async (id, comment) => {
    const { workorders } = get();
    const workorder = workorders.find(w => w.id === id);
    if (!workorder) return;

    const newHistory: WorkorderHistory = {
      id: `hist-${Date.now()}`,
      workorderId: id,
      type: workorder.type,
      targetName: workorder.targetName,
      approverId: 'current-user',
      approverName: '当前用户',
      result: 'approved',
      comment,
      processedAt: new Date().toISOString(),
    };

    set(state => ({
      workorders: state.workorders.map(w =>
        w.id === id ? { ...w, status: 'approved' as const } : w
      ),
      history: [newHistory, ...state.history],
      selectedIds: state.selectedIds.filter(sid => sid !== id),
    }));
  },

  reject: async (id, comment) => {
    const { workorders } = get();
    const workorder = workorders.find(w => w.id === id);
    if (!workorder) return;

    const newHistory: WorkorderHistory = {
      id: `hist-${Date.now()}`,
      workorderId: id,
      type: workorder.type,
      targetName: workorder.targetName,
      approverId: 'current-user',
      approverName: '当前用户',
      result: 'rejected',
      comment,
      processedAt: new Date().toISOString(),
    };

    set(state => ({
      workorders: state.workorders.map(w =>
        w.id === id ? { ...w, status: 'rejected' as const } : w
      ),
      history: [newHistory, ...state.history],
      selectedIds: state.selectedIds.filter(sid => sid !== id),
    }));
  },

  batchApprove: async (ids) => {
    for (const id of ids) {
      await get().approve(id);
    }
  },

  batchReject: async (ids, comment) => {
    for (const id of ids) {
      await get().reject(id, comment);
    }
  },

  setFilterType: (type) => set({ filterType: type }),
  setFilterStatus: (status) => set({ filterStatus: status }),

  toggleSelect: (id) => set(state => ({
    selectedIds: state.selectedIds.includes(id)
      ? state.selectedIds.filter(sid => sid !== id)
      : [...state.selectedIds, id],
  })),

  selectAll: () => set(state => ({
    selectedIds: state.workorders
      .filter(w => w.status === 'pending')
      .map(w => w.id),
  })),

  clearSelection: () => set({ selectedIds: [] }),

  getFilteredWorkorders: () => {
    const { workorders, filterType, filterStatus } = get();
    return workorders.filter(w => {
      if (filterType !== 'all' && w.type !== filterType) return false;
      if (filterStatus !== 'all' && w.status !== filterStatus) return false;
      return true;
    });
  },
}));