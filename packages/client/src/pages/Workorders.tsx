import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, History, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkordersStore } from '@/stores/workordersStore';
import { WorkorderTable } from '@/components/workorder/WorkorderTable';
import { WorkorderHistoryTable } from '@/components/workorder/WorkorderHistoryTable';
import { ConfirmDialog } from '@/components/ConfirmDialog';

const TYPE_FILTERS = [
  { key: 'all', labelKey: 'workorders.all' },
  { key: 'skill', labelKey: 'workorders.typeSkill' },
  { key: 'mcp', labelKey: 'workorders.typeMCP' },
  { key: 'extension', labelKey: 'workorders.typeExtension' },
];

const Workorders: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'list' | 'history'>('list');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState('');

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

  const statCards = [
    { label: t('workorders.pending'), value: pendingCount, icon: Clock, status: 'pending' as const },
    { label: t('workorders.approved'), value: approvedCount, icon: CheckCircle2, status: 'approved' as const },
    { label: t('workorders.rejected'), value: rejectedCount, icon: XCircle, status: 'rejected' as const },
    { label: t('workorders.all'), value: workorders.length, icon: FileText, status: 'all' as const },
  ];

  const handleBatchApprove = async () => {
    if (selectedIds.length === 0) return;
    await batchApprove(selectedIds);
    clearSelection();
  };

  const handleBatchReject = () => {
    if (selectedIds.length === 0) return;
    setRejectDialogOpen(true);
  };

  const confirmReject = async () => {
    if (rejectComment.trim().length >= 10) {
      await batchReject(selectedIds, rejectComment);
      setRejectComment('');
      clearSelection();
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-50/50">
      <div className="max-w-[1400px] mx-auto p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-zinc-900 tracking-tight mb-2">
                {t('workorders.title')}
              </h1>
              <p className="text-zinc-500 text-sm lg:text-base">
                {t('workorders.subtitle')}
              </p>
            </div>
          </div>

          {/* Stats - Bento Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat, index) => (
              <button
                key={stat.label}
                onClick={() => setFilterStatus(stat.status)}
                className={`bento-tile p-5 text-left animate-fade-in-up transition-all ${
                  filterStatus === stat.status
                    ? 'ring-2 ring-zinc-400/50'
                    : 'hover:ring-2 hover:ring-zinc-300/50'
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100/80 flex items-center justify-center">
                    <stat.icon className="w-5 h-5 text-zinc-500" />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-3xl font-bold text-zinc-900 font-mono tracking-tight">
                    {stat.value}
                  </span>
                  <span className="text-sm text-zinc-500 mt-1">{stat.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'list'
                ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-300/50'
                : 'bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200/50'
            }`}
          >
            {t('workorders.workorderList')}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-300/50'
                : 'bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200/50'
            }`}
          >
            <History className="w-4 h-4 inline mr-2" />
            {t('workorders.approvalHistory')}
          </button>
        </div>

        {/* Filters */}
        {activeTab === 'list' && (
          <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
              <div className="flex flex-wrap gap-2">
                {TYPE_FILTERS.map(f => (
                  <button
                    key={f.key}
                    onClick={() => setFilterType(f.key as any)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      filterType === f.key
                        ? 'bg-zinc-900 text-white shadow-md'
                        : 'bg-white text-zinc-600 hover:bg-zinc-50 border border-zinc-200/50'
                    }`}
                  >
                    {t(f.labelKey)}
                  </button>
                ))}
              </div>

              {selectedIds.length > 0 && (
                <div className="flex gap-2 ml-auto">
                  <Button
                    onClick={handleBatchApprove}
                    className="bg-green-600 hover:bg-green-700 text-white rounded-xl"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {t('workorders.batchApprove')} ({selectedIds.length})
                  </Button>
                  <Button
                    onClick={handleBatchReject}
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-xl"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    {t('workorders.batchReject')} ({selectedIds.length})
                  </Button>
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-32 bg-zinc-200/50 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : (
              <WorkorderTable />
            )}
          </>
        )}

        {activeTab === 'history' && (
          <>
            <div className="flex flex-wrap gap-2 mb-6">
              {TYPE_FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilterType(f.key as any)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    filterType === f.key
                      ? 'bg-zinc-900 text-white shadow-md'
                      : 'bg-white text-zinc-600 hover:bg-zinc-50 border border-zinc-200/50'
                  }`}
                >
                  {t(f.labelKey)}
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-32 bg-zinc-200/50 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : (
              <WorkorderHistoryTable />
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={rejectDialogOpen}
        onOpenChange={(open) => {
          setRejectDialogOpen(open);
          if (!open) setRejectComment('');
        }}
        title={t('workorders.batchReject')}
        description={t('workorders.rejectReason')}
        confirmText={t('common.confirm')}
        cancelText={t('common.cancel')}
        onConfirm={confirmReject}
        variant="destructive"
      >
        <div className="mt-4">
          <textarea
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            placeholder={t('workorders.rejectReasonPlaceholder')}
            className="w-full px-4 py-3 bg-zinc-50/50 border border-zinc-200/50 rounded-xl text-sm focus:outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-500/10 resize-none h-24"
          />
          {rejectComment.length > 0 && rejectComment.length < 10 && (
            <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {t('workorders.reasonTooShort')}
            </p>
          )}
        </div>
      </ConfirmDialog>
    </div>
  );
};

export default Workorders;