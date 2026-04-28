import { create } from 'zustand';
import { workorderService, type Workorder, type WorkorderHistory } from '@/services/workorder-service';

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
  batchApprove: (ids: string[], comment?: string) => Promise<void>;
  batchReject: (ids: string[], comment: string) => Promise<void>;
  setFilterType: (type: 'all' | 'skill' | 'mcp' | 'extension') => void;
  setFilterStatus: (status: 'pending' | 'approved' | 'rejected' | 'all') => void;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  getFilteredWorkorders: () => Workorder[];
}

const TEAM_ID = 'team-001'; // TODO: 从用户上下文获取

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
      const data = await workorderService.getList(TEAM_ID);
      set({ workorders: data, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load workorders', isLoading: false });
    }
  },

  loadHistory: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await workorderService.getHistory(TEAM_ID);
      set({ history: data, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load history', isLoading: false });
    }
  },

  approve: async (id, comment) => {
    try {
      await workorderService.approve(id, comment);
      set(state => ({
        workorders: state.workorders.map(w =>
          w.id === id ? { ...w, status: 'approved' as const } : w
        ),
        selectedIds: state.selectedIds.filter(sid => sid !== id),
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to approve' });
      throw err;
    }
  },

  reject: async (id, comment) => {
    try {
      await workorderService.reject(id, comment);
      set(state => ({
        workorders: state.workorders.map(w =>
          w.id === id ? { ...w, status: 'rejected' as const } : w
        ),
        selectedIds: state.selectedIds.filter(sid => sid !== id),
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to reject' });
      throw err;
    }
  },

  batchApprove: async (ids, comment) => {
    try {
      await workorderService.batchApprove(ids, comment);
      set(state => ({
        workorders: state.workorders.map(w =>
          ids.includes(w.id) ? { ...w, status: 'approved' as const } : w
        ),
        selectedIds: [],
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to batch approve' });
      throw err;
    }
  },

  batchReject: async (ids, comment) => {
    try {
      await workorderService.batchReject(ids, comment);
      set(state => ({
        workorders: state.workorders.map(w =>
          ids.includes(w.id) ? { ...w, status: 'rejected' as const } : w
        ),
        selectedIds: [],
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to batch reject' });
      throw err;
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
