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