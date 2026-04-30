import React, { useState } from 'react';
import { format } from 'date-fns';
import { Check, X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWorkordersStore, type Workorder } from '@/stores/workordersStore';
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

const STATUS_LABELS: Record<string, string> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '已拒绝',
  all: '工单',
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

  const workorders = useWorkordersStore(state => state.workorders);
  const filterStatus = useWorkordersStore(state => state.filterStatus);
  const filterType = useWorkordersStore(state => state.filterType);

  const filteredWorkorders = workorders.filter(w => {
    if (filterStatus !== 'all' && w.status !== filterStatus) return false;
    if (filterType !== 'all' && w.type !== filterType) return false;
    return true;
  });

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

  const renderRow = (workorder: Workorder) => (
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
      <td className="px-4 py-3 text-gray-500 text-sm" title={new Date(workorder.submittedAt).toLocaleString('zh-CN')}>
        {format(new Date(workorder.submittedAt), 'yyyy-MM-dd HH:mm:ss')}
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
  );

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
            {filteredWorkorders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>暂无{STATUS_LABELS[filterStatus] || ''}工单</p>
                </td>
              </tr>
            ) : (
              filteredWorkorders.map(renderRow)
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
