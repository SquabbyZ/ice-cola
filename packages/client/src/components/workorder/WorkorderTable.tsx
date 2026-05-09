import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Check, X, FileText, User, Users, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWorkordersStore } from '@/stores/workordersStore';
import { WorkorderActionDialog } from './WorkorderActionDialog';
import { useTranslation } from 'react-i18next';

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  skill: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-200',
    glow: 'shadow-blue-500/20',
  },
  mcp: {
    bg: 'bg-violet-50',
    text: 'text-violet-600',
    border: 'border-violet-200',
    glow: 'shadow-violet-500/20',
  },
  extension: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-200',
    glow: 'shadow-emerald-500/20',
  },
};

export const WorkorderTable: React.FC = () => {
  const { t } = useTranslation();
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
      reject(actionDialog.workorderId, comment || t('workorders.rejectReasonPlaceholder'));
    }
  };

  if (filterStatus !== 'pending' && filterStatus !== 'all') {
    return null;
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'skill': return t('workorders.typeSkill');
      case 'mcp': return t('workorders.typeMCP');
      case 'extension': return t('workorders.typeExtension');
      default: return type;
    }
  };

  return (
    <>
      {/* Bento-style table container */}
      <div className="bento-tile p-0 overflow-hidden animate-fade-in-up">
        {/* Enhanced table header with gradient */}
        <div className="grid grid-cols-12 gap-4 px-5 py-3.5 bg-gradient-to-r from-zinc-100/80 via-zinc-50/80 to-zinc-100/80 border-b border-zinc-200/60">
          <div className="col-span-1 flex items-center">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => allSelected ? clearSelection() : selectAll()}
              className="w-4 h-4 rounded border-zinc-300 bg-white cursor-pointer accent-zinc-700"
            />
          </div>
          <div className="col-span-2 flex items-center gap-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
            <div className="w-5 h-5 rounded-md bg-blue-50 flex items-center justify-center">
              <FileText className="w-3 h-3 text-blue-500" />
            </div>
            {t('workorders.typeSkill')}
          </div>
          <div className="col-span-3 flex items-center gap-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
            <div className="w-5 h-5 rounded-md bg-amber-50 flex items-center justify-center">
              <FileText className="w-3 h-3 text-amber-600" />
            </div>
            {t('workorders.table.name')}
          </div>
          <div className="col-span-2 flex items-center gap-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
            <div className="w-5 h-5 rounded-md bg-rose-50 flex items-center justify-center">
              <User className="w-3 h-3 text-rose-500" />
            </div>
            {t('profile.teamMembers')}
          </div>
          <div className="col-span-2 flex items-center gap-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
            <div className="w-5 h-5 rounded-md bg-violet-50 flex items-center justify-center">
              <Users className="w-3 h-3 text-violet-500" />
            </div>
            <span className="hidden sm:inline">{t('workorders.table.approvers')}</span>
          </div>
          <div className="col-span-2 flex items-center gap-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
            <div className="w-5 h-5 rounded-md bg-zinc-100 flex items-center justify-center">
              <Clock className="w-3 h-3 text-zinc-400" />
            </div>
            {t('workorders.table.time')}
          </div>
        </div>

        {/* Table body */}
        <div className="divide-y divide-zinc-100/60">
          {pendingWorkorders.length === 0 ? (
            <div className="px-5 py-16 text-center">
              {/* Empty state with watermark */}
              <div className="relative inline-block">
                <div className="absolute inset-0 flex items-center justify-center text-zinc-100/60">
                  <FileText className="w-16 h-16" />
                </div>
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-100/80 flex items-center justify-center mx-auto mb-4 shadow-inner">
                    <FileText className="w-6 h-6 text-zinc-400" />
                  </div>
                  <p className="text-sm font-medium text-zinc-500 mb-1">{t('workorders.empty.noPending')}</p>
                  <p className="text-xs text-zinc-400">{t('workorders.empty.noPendingDesc')}</p>
                </div>
              </div>
            </div>
          ) : (
            pendingWorkorders.map((workorder, index) => {
              const colors = TYPE_COLORS[workorder.type] || TYPE_COLORS.skill;
              return (
                <div
                  key={workorder.id}
                  className="grid grid-cols-12 gap-4 px-5 py-3.5 items-center group hover:bg-gradient-to-r hover:from-blue-50/30 hover:via-zinc-50/50 hover:to-violet-50/30 transition-all duration-300 ease-out animate-fade-in-up cursor-pointer"
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  {/* Checkbox */}
                  <div className="col-span-1">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(workorder.id)}
                      onChange={() => toggleSelect(workorder.id)}
                      className="w-4 h-4 rounded border-zinc-300 bg-white cursor-pointer accent-zinc-700"
                    />
                  </div>

                  {/* Type badge */}
                  <div className="col-span-2">
                    <Badge className={`${colors.bg} ${colors.text} border ${colors.border} font-semibold text-[10px] uppercase tracking-wider shadow-sm ${colors.glow}`}>
                      {getTypeLabel(workorder.type)}
                    </Badge>
                  </div>

                  {/* Name with icon */}
                  <div className="col-span-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-200 flex items-center justify-center text-base shadow-sm group-hover:shadow group-hover:scale-105 transition-all duration-300">
                        {workorder.targetIcon}
                      </div>
                      <span className="font-semibold text-zinc-800 text-sm truncate group-hover:text-zinc-900 transition-colors">
                        {workorder.targetName}
                      </span>
                    </div>
                  </div>

                  {/* Applicant */}
                  <div className="col-span-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-100 to-orange-200 flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-300">
                        <span className="text-[10px] font-bold text-amber-700">
                          {workorder.applicantName.charAt(0)}
                        </span>
                      </div>
                      <span className="text-sm text-zinc-600 truncate group-hover:text-zinc-800 transition-colors font-medium">
                        {workorder.applicantName}
                      </span>
                    </div>
                  </div>

                  {/* Approvers */}
                  <div className="col-span-2">
                    <div className="flex items-center">
                      {workorder.approvers.slice(0, 2).map((approver, i) => (
                        <div
                          key={i}
                          className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-100 to-purple-200 flex items-center justify-center border-2 border-white shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all duration-300 -ml-1.5 first:ml-0"
                          title={approver.name}
                        >
                          <span className="text-[8px] font-bold text-violet-700">
                            {approver.name.charAt(0)}
                          </span>
                        </div>
                      ))}
                      {workorder.approvers.length > 2 && (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-zinc-100 to-zinc-200 flex items-center justify-center border-2 border-white shadow-sm -ml-1.5">
                          <span className="text-[8px] font-bold text-zinc-600">
                            +{workorder.approvers.length - 2}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Time */}
                  <div className="col-span-2 flex items-center justify-between">
                    <span className="text-xs text-zinc-400 font-medium tabular-nums">
                      {formatDistanceToNow(new Date(workorder.submittedAt), {
                        addSuffix: true,
                        locale: zhCN,
                      })}
                    </span>

                    {/* Enhanced action buttons */}
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-300 ease-out">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-8 h-8 p-0 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700 rounded-xl shadow-sm hover:shadow-md hover:shadow-emerald-500/20 transition-all active:scale-95"
                        onClick={() => handleAction(workorder.id, workorder.targetName, 'approve')}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-8 h-8 p-0 bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600 rounded-xl shadow-sm hover:shadow-md hover:shadow-red-500/20 transition-all active:scale-95"
                        onClick={() => handleAction(workorder.id, workorder.targetName, 'reject')}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Table footer with selection count */}
        {selectedIds.length > 0 && (
          <div className="px-5 py-3 bg-gradient-to-r from-zinc-50 to-zinc-100/50 border-t border-zinc-200/60 flex items-center justify-between">
            <span className="text-xs text-zinc-600 font-semibold">
              {selectedIds.length} selected
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={clearSelection}
                className="text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/50 rounded-lg transition-all"
              >
                {t('common.clear')}
              </Button>
            </div>
          </div>
        )}
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