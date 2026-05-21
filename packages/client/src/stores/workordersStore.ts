import { create } from 'zustand';
import { workorderService } from '@/services/workorder-service';

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

  loadWorkorders: (teamId?: string) => Promise<void>;
  loadHistory: (teamId?: string) => Promise<void>;
  approve: (id: string, comment?: string) => Promise<void>;
  reject: (id: string, comment: string) => Promise<void>;
  batchApprove: (ids: string[]) => Promise<void>;
  batchReject: (ids: string[], comment: string) => Promise<void>;
  setFilterType: (type: 'all' | 'skill' | 'mcp' | 'extension') => void;
  setFilterStatus: (status: 'pending' | 'approved' | 'rejected' | 'all') => void;
  toggleSelect: (id: string) => void;
  selectAll: (ids?: string[]) => void;
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
    note: '希望发布到宗门让更多人使用',
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

  loadWorkorders: async (teamId) => {
    if (!teamId) return;

    set({ isLoading: true, error: null });
    try {
      const data = await workorderService.getList(teamId);
      set({ workorders: data, isLoading: false });
    } catch {
      set({ workorders: MOCK_WORKORDERS, isLoading: false });
    }
  },

  loadHistory: async (teamId) => {
    if (!teamId) return;

    set({ isLoading: true, error: null });
    try {
      const data = await workorderService.getHistory(teamId);
      set({ history: data, isLoading: false });
    } catch {
      set({ history: MOCK_HISTORY, isLoading: false });
    }
  },

  approve: async (id, comment) => {
    await workorderService.approve(id, comment);
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
    await workorderService.reject(id, comment);
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
    try {
      await workorderService.batchApprove(ids);
    } catch {
      // Fallback to individual calls
      for (const id of ids) {
        await get().approve(id);
      }
      return;
    }
    // Update local state for all approved items
    const now = new Date().toISOString();
    set(state => {
      const newHistoryEntries = state.workorders
        .filter(w => ids.includes(w.id))
        .map(w => ({
          id: `hist-${Date.now()}-${w.id}`,
          workorderId: w.id,
          type: w.type,
          targetName: w.targetName,
          approverId: 'current-user',
          approverName: '当前用户',
          result: 'approved' as const,
          processedAt: now,
        }));
      return {
        workorders: state.workorders.map(w =>
          ids.includes(w.id) ? { ...w, status: 'approved' as const } : w
        ),
        history: [...newHistoryEntries, ...state.history],
        selectedIds: state.selectedIds.filter(sid => !ids.includes(sid)),
      };
    });
  },

  batchReject: async (ids, comment) => {
    try {
      await workorderService.batchReject(ids, comment);
    } catch {
      // Fallback to individual calls
      for (const id of ids) {
        await get().reject(id, comment);
      }
      return;
    }
    // Update local state for all rejected items
    const now = new Date().toISOString();
    set(state => {
      const newHistoryEntries = state.workorders
        .filter(w => ids.includes(w.id))
        .map(w => ({
          id: `hist-${Date.now()}-${w.id}`,
          workorderId: w.id,
          type: w.type,
          targetName: w.targetName,
          approverId: 'current-user',
          approverName: '当前用户',
          result: 'rejected' as const,
          comment,
          processedAt: now,
        }));
      return {
        workorders: state.workorders.map(w =>
          ids.includes(w.id) ? { ...w, status: 'rejected' as const } : w
        ),
        history: [...newHistoryEntries, ...state.history],
        selectedIds: state.selectedIds.filter(sid => !ids.includes(sid)),
      };
    });
  },

  setFilterType: (type) => set({ filterType: type }),
  setFilterStatus: (status) => set({ filterStatus: status }),

  toggleSelect: (id) => set(state => ({
    selectedIds: state.selectedIds.includes(id)
      ? state.selectedIds.filter(sid => sid !== id)
      : [...state.selectedIds, id],
  })),

  selectAll: (ids) => set(state => ({
    selectedIds: ids ?? state.workorders
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