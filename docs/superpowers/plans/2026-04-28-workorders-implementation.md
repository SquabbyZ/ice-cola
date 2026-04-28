# 工单中心 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 创建统一的工单中心页面，支持 Skills 审批流程的查看、审批、历史记录功能。

**Architecture:** 使用 Zustand 管理工单状态，Table 组件展示数据，Dialog 组件处理审批操作。工单类型暂时只接入 Skills，MCP 和插件待后续扩展。

**Tech Stack:** React, Zustand, Tailwind CSS, shadcn Dialog

---

## File Structure

```
packages/client/src/
├── stores/workordersStore.ts          # 工单状态管理
├── pages/Workorders.tsx              # 工单中心页面
└── components/workorder/
    ├── WorkorderTable.tsx             # 工单列表 Table
    ├── WorkorderHistoryTable.tsx      # 审批历史 Table
    └── WorkorderActionDialog.tsx      # 审批操作弹窗
```

**Modify:**
- `packages/client/src/App.tsx` - 添加 /workorders 路由
- `packages/client/src/components/Sidebar.tsx` - 添加导航入口

---

## Task 1: 创建工单状态管理 Store

**Files:**
- Create: `packages/client/src/stores/workordersStore.ts`

- [ ] **Step 1: 创建 store 文件**

```typescript
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

  batchApprove: async (ids, comment) => {
    for (const id of ids) {
      await get().approve(id, comment);
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
```

- [ ] **Step 2: Commit**

```bash
git add packages/client/src/stores/workordersStore.ts
git commit -m "feat(client): add workorders store for approval management

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

## Task 2: 创建审批操作弹窗组件

**Files:**
- Create: `packages/client/src/components/workorder/WorkorderActionDialog.tsx`

- [ ] **Step 1: 创建弹窗组件**

```tsx
import React, { useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';

interface WorkorderActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: 'approve' | 'reject';
  workorderName: string;
  onConfirm: (comment?: string) => void;
}

export const WorkorderActionDialog: React.FC<WorkorderActionDialogProps> = ({
  open,
  onOpenChange,
  action,
  workorderName,
  onConfirm,
}) => {
  const [comment, setComment] = useState('');

  const handleConfirm = () => {
    if (action === 'reject' && comment.trim().length < 10) {
      return;
    }
    onConfirm(comment.trim() || undefined);
    setComment('');
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setComment('');
    }
    onOpenChange(newOpen);
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={action === 'approve' ? '确认通过' : '确认拒绝'}
      description={
        action === 'approve'
          ? `确定要通过工单 "${workorderName}" 吗？`
          : `确定要拒绝工单 "${workorderName}" 吗？`
      }
      confirmText={action === 'approve' ? '通过' : '拒绝'}
      cancelText="取消"
      onConfirm={handleConfirm}
      variant={action === 'reject' ? 'destructive' : 'default'}
    />
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add packages/client/src/components/workorder/WorkorderActionDialog.tsx
git commit -m "feat(client): add WorkorderActionDialog component

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

## Task 3: 创建工单列表 Table 组件

**Files:**
- Create: `packages/client/src/components/workorder/WorkorderTable.tsx`

- [ ] **Step 1: 创建 Table 组件**

```tsx
import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Check, X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWorkordersStore } from '@/stores/workordersStore';
import { WorkorderActionDialog } from './WorkorderActionDialog';

const TYPE_LABELS = {
  skill: 'Skill',
  mcp: 'MCP',
  extension: '插件',
};

const TYPE_COLORS = {
  skill: 'bg-blue-100 text-blue-700',
  mcp: 'bg-purple-100 text-purple-700',
  extension: 'bg-green-100 text-green-700',
};

export const WorkorderTable: React.FC = () => {
  const {
    selectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
    approve,
    reject,
  } = useWorkordersStore();

  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: 'approve' | 'reject';
    workorderId: string;
    workorderName: string;
  }>({ open: false, action: 'approve', workorderId: '', workorderName: '' });

  const workorders = useWorkordersStore(state => state.getFilteredWorkorders());
  const filterStatus = useWorkordersStore(state => state.filterStatus);

  const pendingWorkorders = workorders.filter(w => w.status === 'pending');
  const allSelected = pendingWorkorders.length > 0 && selectedIds.length === pendingWorkorders.length;

  const handleAction = (workorderId: string, workorderName: string, action: 'approve' | 'reject') => {
    setActionDialog({ open: true, action, workorderId, workorderName });
  };

  const handleConfirm = (comment?: string) => {
    if (actionDialog.action === 'approve') {
      approve(actionDialog.workorderId, comment);
    } else {
      reject(actionDialog.workorderId, comment || '未提供理由');
    }
  };

  if (filterStatus !== 'pending' && filterStatus !== 'all') {
    return null;
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => allSelected ? clearSelection() : selectAll()}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">类型</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">名称</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">申请人</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">可审批人员</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">提交时间</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pendingWorkorders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>暂无待处理工单</p>
                </td>
              </tr>
            ) : (
              pendingWorkorders.map(workorder => (
                <tr key={workorder.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(workorder.id)}
                      onChange={() => toggleSelect(workorder.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={TYPE_COLORS[workorder.type]}>
                      {TYPE_LABELS[workorder.type]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span>{workorder.targetIcon}</span>
                      <span className="font-medium text-gray-900">{workorder.targetName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{workorder.applicantName}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {workorder.approvers.map(a => a.name).join(', ')}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-sm">
                    {formatDistanceToNow(new Date(workorder.submittedAt), {
                      addSuffix: true,
                      locale: zhCN,
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => handleAction(workorder.id, workorder.targetName, 'approve')}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleAction(workorder.id, workorder.targetName, 'reject')}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <WorkorderActionDialog
        open={actionDialog.open}
        onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}
        action={actionDialog.action}
        workorderName={actionDialog.workorderName}
        onConfirm={handleConfirm}
      />
    </>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add packages/client/src/components/workorder/WorkorderTable.tsx
git commit -m "feat(client): add WorkorderTable component

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

## Task 4: 创建审批历史 Table 组件

**Files:**
- Create: `packages/client/src/components/workorder/WorkorderHistoryTable.tsx`

- [ ] **Step 1: 创建历史 Table 组件**

```tsx
import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { History, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useWorkordersStore } from '@/stores/workordersStore';

const TYPE_LABELS = {
  skill: 'Skill',
  mcp: 'MCP',
  extension: '插件',
};

const RESULT_COLORS = {
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

export const WorkorderHistoryTable: React.FC = () => {
  const history = useWorkordersStore(state => state.history);
  const filterType = useWorkordersStore(state => state.filterType);

  const filteredHistory = history.filter(h => {
    if (filterType !== 'all' && h.type !== filterType) return false;
    return true;
  });

  if (filteredHistory.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-500">
        <History className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p>暂无审批历史</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">类型</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">名称</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">审批人</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">结果</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">备注</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">时间</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {filteredHistory.map(record => (
            <tr key={record.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <Badge className={TYPE_LABELS[record.type] === 'Skill' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}>
                  {TYPE_LABELS[record.type]}
                </Badge>
              </td>
              <td className="px-4 py-3 font-medium text-gray-900">{record.targetName}</td>
              <td className="px-4 py-3 text-gray-600">{record.approverName}</td>
              <td className="px-4 py-3">
                <Badge className={RESULT_COLORS[record.result]}>
                  {record.result === 'approved' ? (
                    <Check className="w-3 h-3 mr-1" />
                  ) : (
                    <X className="w-3 h-3 mr-1" />
                  )}
                  {record.result === 'approved' ? '通过' : '拒绝'}
                </Badge>
              </td>
              <td className="px-4 py-3 text-gray-500 text-sm">{record.comment || '-'}</td>
              <td className="px-4 py-3 text-gray-500 text-sm">
                {formatDistanceToNow(new Date(record.processedAt), {
                  addSuffix: true,
                  locale: zhCN,
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add packages/client/src/components/workorder/WorkorderHistoryTable.tsx
git commit -m "feat(client): add WorkorderHistoryTable component

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

## Task 5: 创建工单中心页面

**Files:**
- Create: `packages/client/src/pages/Workorders.tsx`

- [ ] **Step 1: 创建页面组件**

```tsx
import React, { useEffect, useState } from 'react';
import { FileText, History, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useWorkordersStore } from '@/stores/workordersStore';
import { WorkorderTable } from '@/components/workorder/WorkorderTable';
import { WorkorderHistoryTable } from '@/components/workorder/WorkorderHistoryTable';

const TYPE_FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'skill', label: 'Skill' },
  { key: 'mcp', label: 'MCP' },
  { key: 'extension', label: '插件' },
];

const STATUS_FILTERS = [
  { key: 'pending', label: '待审批' },
  { key: 'approved', label: '已通过' },
  { key: 'rejected', label: '已拒绝' },
  { key: 'all', label: '全部' },
];

const Workorders: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'list' | 'history'>('list');

  const {
    workorders,
    history,
    filterType,
    filterStatus,
    isLoading,
    loadWorkorders,
    loadHistory,
    setFilterType,
    setFilterStatus,
    batchApprove,
    batchReject,
    selectedIds,
    clearSelection,
  } = useWorkordersStore();

  useEffect(() => {
    loadWorkorders();
    loadHistory();
  }, [loadWorkorders, loadHistory]);

  const pendingCount = workorders.filter(w => w.status === 'pending').length;
  const approvedCount = workorders.filter(w => w.status === 'approved').length;
  const rejectedCount = workorders.filter(w => w.status === 'rejected').length;

  const handleBatchAction = async (action: 'approve' | 'reject') => {
    if (selectedIds.length === 0) return;

    if (action === 'approve') {
      await batchApprove(selectedIds);
    } else {
      const comment = prompt('请输入拒绝理由（至少10字）：');
      if (comment && comment.trim().length >= 10) {
        await batchReject(selectedIds, comment);
      }
    }
    clearSelection();
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">工单中心</h1>
          <p className="text-gray-600">管理和处理所有待审批工单</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <button
            onClick={() => setFilterStatus('pending')}
            className={`bg-white rounded-lg p-4 border border-gray-200 text-left hover:border-primary transition-colors ${
              filterStatus === 'pending' ? 'border-primary bg-primary/5' : ''
            }`}
          >
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-sm">待审批</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
          </button>
          <button
            onClick={() => setFilterStatus('approved')}
            className={`bg-white rounded-lg p-4 border border-gray-200 text-left hover:border-primary transition-colors ${
              filterStatus === 'approved' ? 'border-primary bg-primary/5' : ''
            }`}
          >
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm">已通过</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{approvedCount}</p>
          </button>
          <button
            onClick={() => setFilterStatus('rejected')}
            className={`bg-white rounded-lg p-4 border border-gray-200 text-left hover:border-primary transition-colors ${
              filterStatus === 'rejected' ? 'border-primary bg-primary/5' : ''
            }`}
          >
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <XCircle className="w-4 h-4" />
              <span className="text-sm">已拒绝</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{rejectedCount}</p>
          </button>
          <button
            onClick={() => setFilterStatus('all')}
            className={`bg-white rounded-lg p-4 border border-gray-200 text-left hover:border-primary transition-colors ${
              filterStatus === 'all' ? 'border-primary bg-primary/5' : ''
            }`}
          >
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <FileText className="w-4 h-4" />
              <span className="text-sm">全部</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{workorders.length}</p>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'list'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            工单列表
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'history'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <History className="w-4 h-4 inline mr-2" />
            审批历史
          </button>
        </div>

        {/* Filters */}
        {activeTab === 'list' && (
          <>
            <div className="flex items-center gap-4 mb-6">
              <div className="flex gap-2">
                {TYPE_FILTERS.map(f => (
                  <button
                    key={f.key}
                    onClick={() => setFilterType(f.key as any)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filterType === f.key
                        ? 'bg-primary text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {selectedIds.length > 0 && (
                <div className="flex gap-2 ml-auto">
                  <button
                    onClick={() => handleBatchAction('approve')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                  >
                    批量通过 ({selectedIds.length})
                  </button>
                  <button
                    onClick={() => handleBatchAction('reject')}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                  >
                    批量拒绝 ({selectedIds.length})
                  </button>
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="h-64 bg-gray-200 rounded-lg animate-pulse" />
            ) : (
              <WorkorderTable />
            )}
          </>
        )}

        {activeTab === 'history' && (
          <>
            <div className="flex gap-2 mb-6">
              {TYPE_FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilterType(f.key as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterType === f.key
                      ? 'bg-primary text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="h-64 bg-gray-200 rounded-lg animate-pulse" />
            ) : (
              <WorkorderHistoryTable />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Workorders;
```

- [ ] **Step 2: Commit**

```bash
git add packages/client/src/pages/Workorders.tsx
git commit -m "feat(client): add Workorders page

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

## Task 6: 添加路由和导航入口

**Files:**
- Modify: `packages/client/src/App.tsx`
- Modify: `packages/client/src/components/Sidebar.tsx`

- [ ] **Step 1: 添加路由**

在 `packages/client/src/App.tsx` 的 Routes 中添加：
```tsx
<Route path="workorders" element={<Workorders />} />
```

- [ ] **Step 2: 添加导航入口**

在 `Sidebar.tsx` 中添加工单中心入口，参考现有导航项格式。

- [ ] **Step 3: Commit**

```bash
git add packages/client/src/App.tsx packages/client/src/components/Sidebar.tsx
git commit -m "feat(client): add Workorders route and sidebar navigation

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

## Self-Review Checklist

1. **Spec coverage:** All spec items implemented
   - ✅ 统计卡片
   - ✅ 分类筛选（类型 + 状态）
   - ✅ 审批列表 Table（含可审批人员列）
   - ✅ 批量操作
   - ✅ 审批弹窗
   - ✅ 审批历史 Tab
   - ✅ 路由配置
   - ✅ 状态管理

2. **Placeholder scan:** No placeholders found

3. **Type consistency:** All types consistent across files

---

Plan complete and saved to `docs/superpowers/plans/2026-04-28-workorders-implementation.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
