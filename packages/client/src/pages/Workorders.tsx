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
    { status: 'pending' as const, value: pendingCount, icon: Clock },
    { status: 'approved' as const, value: approvedCount, icon: CheckCircle2 },
    { status: 'rejected' as const, value: rejectedCount, icon: XCircle },
    { status: 'all' as const, value: workorders.length, icon: FileText },
  ];

  // Helper to get status label
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return t('workorders.pending');
      case 'approved': return t('workorders.approved');
      case 'rejected': return t('workorders.rejected');
      default: return t('workorders.all');
    }
  };

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

  // Get color classes based on status
  const getStatColorClasses = (status: string) => {
    const colors = {
      yellow: {
        bg: 'bg-yellow-50/80',
        icon: 'text-yellow-600',
        iconBg: 'bg-yellow-100/80',
        ring: 'ring-yellow-400/40',
        hoverRing: 'hover:ring-yellow-300/40',
        watermark: 'text-yellow-500/70',
        watermarkHover: 'group-hover:text-yellow-500/20',
      },
      green: {
        bg: 'bg-green-50/80',
        icon: 'text-green-600',
        iconBg: 'bg-green-100/80',
        ring: 'ring-green-400/40',
        hoverRing: 'hover:ring-green-300/40',
        watermark: 'text-green-500/70',
        watermarkHover: 'group-hover:text-green-500/20',
      },
      red: {
        bg: 'bg-red-50/80',
        icon: 'text-red-600',
        iconBg: 'bg-red-100/80',
        ring: 'ring-red-400/40',
        hoverRing: 'hover:ring-red-300/40',
        watermark: 'text-red-500/70',
        watermarkHover: 'group-hover:text-red-500/20',
      },
      zinc: {
        bg: 'bg-zinc-50/80',
        icon: 'text-zinc-500',
        iconBg: 'bg-zinc-100/80',
        ring: 'ring-zinc-400/40',
        hoverRing: 'hover:ring-zinc-300/40',
        watermark: 'text-zinc-400/70',
        watermarkHover: 'group-hover:text-zinc-400/20',
      },
    };
    return colors[status as keyof typeof colors] || colors.zinc;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'yellow';
      case 'approved': return 'green';
      case 'rejected': return 'red';
      default: return 'zinc';
    }
  };

  return (
    <div className="flex-1 bg-gradient-to-br from-zinc-50 via-zinc-50/80 to-zinc-100/50 overflow-y-auto">
      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
        {/* Header with asymmetric layout */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
            {/* Left-aligned title block with character */}
            <div className="relative">
              {/* Decorative accent line */}
              <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-zinc-400/40 via-zinc-300/20 to-transparent rounded-full" />
              <div className="pl-4">
                <h1 className="text-3xl lg:text-[2.25rem] font-bold tracking-tight text-zinc-900 leading-tight mb-2">
                  {t('workorders.title')}
                </h1>
                <p className="text-sm text-zinc-500 max-w-[40ch]">
                  {t('workorders.subtitle')}
                </p>
              </div>
            </div>

            {/* Optional action area - right aligned */}
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-3 animate-fade-in-up">
                <span className="text-xs text-zinc-400 font-medium">
                  {selectedIds.length} selected
                </span>
                <Button
                  onClick={handleBatchApprove}
                  className="bg-green-500 hover:bg-green-600 text-white rounded-xl shadow-md shadow-green-500/20 transition-all active:scale-[0.98]"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {t('workorders.batchApprove')}
                </Button>
                <Button
                  onClick={handleBatchReject}
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-xl transition-all active:scale-[0.98]"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  {t('workorders.batchReject')}
                </Button>
              </div>
            )}
          </div>

          {/* Stats Bento Grid - 70/30 asymmetric split on lg */}
          <div className="grid grid-cols-2 lg:grid-cols-12 gap-4">
            {/* Main stat - Pending (larger) */}
            <button
              onClick={() => setFilterStatus('pending')}
              className={`bento-tile p-5 lg:col-span-5 text-left animate-fade-in-up relative overflow-hidden group cursor-pointer transition-all ${
                filterStatus === 'pending' ? 'ring-2 ring-yellow-400/50' : 'hover:ring-2 hover:ring-yellow-300/30'
              }`}
              style={{ animationDelay: '0ms' }}
            >
              {/* Watermark */}
              <div className="absolute -right-4 -bottom-4 w-32 h-32 text-yellow-500/5 group-hover:text-yellow-500/15 transition-all duration-500 transform group-hover:scale-110">
                <Clock className="w-full h-full" />
              </div>

              <div className="flex items-start justify-between relative">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-yellow-100/80 flex items-center justify-center shadow-sm">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <div className="text-4xl lg:text-5xl font-bold text-zinc-900 font-mono tracking-tight leading-none">
                      {pendingCount}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1.5">{t('workorders.pending')}</div>
                  </div>
                </div>

                {/* Pulse indicator for pending items */}
                {pendingCount > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-yellow-500 animate-breathe" />
                    <span className="text-[10px] text-yellow-600 font-medium">Active</span>
                  </div>
                )}
              </div>
            </button>

            {/* Secondary stats row */}
            <div className="lg:col-span-7 grid grid-cols-3 gap-4">
              {statCards.slice(1).map((stat, index) => {
                const color = getStatusColor(stat.status);
                const colors = getStatColorClasses(color);
                return (
                  <button
                    key={stat.status}
                    onClick={() => setFilterStatus(stat.status as any)}
                    className={`bento-tile p-4 text-left animate-fade-in-up relative overflow-hidden group cursor-pointer transition-all ${
                      filterStatus === stat.status ? `ring-2 ${colors.ring}` : `hover:ring-2 ${colors.hoverRing}`
                    }`}
                    style={{ animationDelay: `${(index + 1) * 100}ms` }}
                  >
                    {/* Watermark */}
                    <div className={`absolute -right-2 -bottom-2 w-16 h-16 ${colors.watermark} ${colors.watermarkHover} transition-all duration-300`}>
                      <stat.icon className="w-full h-full" />
                    </div>

                    <div className={`w-8 h-8 rounded-xl ${colors.iconBg} flex items-center justify-center mb-2`}>
                      <stat.icon className={`w-4 h-4 ${colors.icon}`} />
                    </div>

                    <div className="relative">
                      <div className="text-2xl font-bold text-zinc-900 font-mono tracking-tight leading-none">
                        {stat.value}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">
                        {getStatusLabel(stat.status)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tabs - Floating pill style */}
        <div className="flex gap-2 mb-6">
          <Button
            onClick={() => setActiveTab('list')}
            variant={activeTab === 'list' ? 'default' : 'outline'}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ease-out flex items-center gap-2 shadow-sm ${
              activeTab === 'list'
                ? 'shadow-md shadow-zinc-700/30'
                : 'hover:text-zinc-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            {t('workorders.workorderList')}
          </Button>
          <Button
            onClick={() => setActiveTab('history')}
            variant={activeTab === 'history' ? 'default' : 'outline'}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ease-out flex items-center gap-2 shadow-sm ${
              activeTab === 'history'
                ? 'shadow-md shadow-zinc-700/30'
                : 'hover:text-zinc-800'
            }`}
          >
            <History className="w-4 h-4" />
            {t('workorders.approvalHistory')}
          </Button>
        </div>

        {/* Filters */}
        {activeTab === 'list' && (
          <>
            <div className="flex flex-wrap gap-2 mb-6">
              {TYPE_FILTERS.map(f => (
                <Button
                  key={f.key}
                  onClick={() => setFilterType(f.key as any)}
                  variant={filterType === f.key ? 'default' : 'outline'}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ease-out shadow-sm`}
                >
                  {t(f.labelKey)}
                </Button>
              ))}
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-28 bg-white/60 rounded-2xl animate-pulse border border-zinc-200/30"
                    style={{ animationDelay: `${i * 50}ms` }}
                  />
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
                <Button
                  key={f.key}
                  onClick={() => setFilterType(f.key as any)}
                  variant={filterType === f.key ? 'default' : 'outline'}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ease-out shadow-sm`}
                >
                  {t(f.labelKey)}
                </Button>
              ))}
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-28 bg-white/60 rounded-2xl animate-pulse border border-zinc-200/30"
                    style={{ animationDelay: `${i * 50}ms` }}
                  />
                ))}
              </div>
            ) : (
              <WorkorderHistoryTable />
            )}
          </>
        )}
      </div>

      {/* Reject Dialog */}
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
            className="w-full px-4 py-3 bg-zinc-50/50 border border-zinc-200/50 rounded-xl text-sm focus:outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-500/10 resize-none h-24 transition-all"
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