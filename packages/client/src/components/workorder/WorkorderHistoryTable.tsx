import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { History, Check, X, Clock, User, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useWorkordersStore } from '@/stores/workordersStore';
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

const RESULT_CONFIG: Record<string, { bg: string; text: string; border: string; glow: string; icon: typeof Check }> = {
  approved: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-200',
    glow: 'shadow-emerald-500/20',
    icon: Check,
  },
  rejected: {
    bg: 'bg-red-50',
    text: 'text-red-600',
    border: 'border-red-200',
    glow: 'shadow-red-500/20',
    icon: X,
  },
};

export const WorkorderHistoryTable: React.FC = () => {
  const { t } = useTranslation();
  const history = useWorkordersStore(state => state.history);
  const filterType = useWorkordersStore(state => state.filterType);

  const filteredHistory = history.filter(h => {
    if (filterType !== 'all' && h.type !== filterType) return false;
    return true;
  });

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'skill': return t('workorders.typeSkill');
      case 'mcp': return t('workorders.typeMCP');
      case 'extension': return t('workorders.typeExtension');
      default: return type;
    }
  };

  if (filteredHistory.length === 0) {
    return (
      <div className="bento-tile p-16 text-center animate-fade-in-up">
        {/* Watermark */}
        <div className="relative inline-block mb-6">
          <div className="absolute inset-0 flex items-center justify-center text-zinc-100/60">
            <History className="w-20 h-20" />
          </div>
          <div className="relative z-10 w-14 h-14 rounded-2xl bg-zinc-100/80 flex items-center justify-center mx-auto shadow-inner">
            <History className="w-7 h-7 text-zinc-400" />
          </div>
        </div>
        <p className="text-sm font-medium text-zinc-500 mb-1">{t('workorders.empty.noHistory')}</p>
        <p className="text-xs text-zinc-400">{t('workorders.empty.noHistoryDesc')}</p>
      </div>
    );
  }

  return (
    <div className="bento-tile p-0 overflow-hidden animate-fade-in-up">
      {/* Enhanced table header with gradient */}
      <div className="grid grid-cols-12 gap-4 px-5 py-3.5 bg-gradient-to-r from-zinc-100/80 via-zinc-50/80 to-zinc-100/80 border-b border-zinc-200/60">
        <div className="col-span-2 flex items-center gap-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
          <div className="w-5 h-5 rounded-md bg-blue-50 flex items-center justify-center">
            <FileText className="w-3 h-3 text-blue-500" />
          </div>
          {t('workorders.table.type')}
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
          {t('workorders.table.approver')}
        </div>
        <div className="col-span-2 flex items-center gap-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
          <div className="w-5 h-5 rounded-md bg-emerald-50 flex items-center justify-center">
            <Check className="w-3 h-3 text-emerald-500" />
          </div>
          {t('workorders.table.result')}
        </div>
        <div className="col-span-2 flex items-center gap-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
          <div className="w-5 h-5 rounded-md bg-zinc-100 flex items-center justify-center">
            <FileText className="w-3 h-3 text-zinc-400" />
          </div>
          {t('workorders.table.comment')}
        </div>
        <div className="col-span-1 flex items-center gap-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
          <Clock className="w-3 h-3" />
        </div>
      </div>

      {/* Table body */}
      <div className="divide-y divide-zinc-100/60">
        {filteredHistory.map((record, index) => {
          const typeColors = TYPE_COLORS[record.type] || TYPE_COLORS.skill;
          const resultConfig = RESULT_CONFIG[record.result] || RESULT_CONFIG.approved;
          const ResultIcon = resultConfig.icon;

          return (
            <div
              key={record.id}
              className="grid grid-cols-12 gap-4 px-5 py-3.5 items-center group hover:bg-gradient-to-r hover:from-blue-50/30 hover:via-zinc-50/50 hover:to-emerald-50/30 transition-all duration-300 ease-out animate-fade-in-up"
              style={{ animationDelay: `${index * 40}ms` }}
            >
              {/* Type badge */}
              <div className="col-span-2">
                <Badge className={`${typeColors.bg} ${typeColors.text} border ${typeColors.border} font-semibold text-[10px] uppercase tracking-wider shadow-sm ${typeColors.glow}`}>
                  {getTypeLabel(record.type)}
                </Badge>
              </div>

              {/* Name with icon */}
              <div className="col-span-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-200 flex items-center justify-center shadow-sm group-hover:shadow group-hover:scale-105 transition-all duration-300">
                    <FileText className="w-4 h-4 text-zinc-500" />
                  </div>
                  <span className="font-semibold text-zinc-800 text-sm truncate group-hover:text-zinc-900 transition-colors">
                    {record.targetName}
                  </span>
                </div>
              </div>

              {/* Approver */}
              <div className="col-span-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-100 to-orange-200 flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-300">
                    <span className="text-[10px] font-bold text-rose-700">
                      {record.approverName?.charAt(0) || '?'}
                    </span>
                  </div>
                  <span className="text-sm text-zinc-600 truncate group-hover:text-zinc-800 transition-colors font-medium">
                    {record.approverName}
                  </span>
                </div>
              </div>

              {/* Result badge */}
              <div className="col-span-2">
                <Badge className={`${resultConfig.bg} ${resultConfig.text} border ${resultConfig.border} font-semibold text-[10px] uppercase tracking-wider shadow-sm ${resultConfig.glow} flex items-center gap-1.5 w-fit`}>
                  <ResultIcon className="w-3 h-3" />
                  {record.result === 'approved' ? t('workorders.approved') : t('workorders.rejected')}
                </Badge>
              </div>

              {/* Comment */}
              <div className="col-span-2">
                <span className="text-xs text-zinc-500 truncate block max-w-[120px] group-hover:text-zinc-700 transition-colors">
                  {record.comment || '-'}
                </span>
              </div>

              {/* Time */}
              <div className="col-span-1">
                <span className="text-xs text-zinc-400 font-medium tabular-nums">
                  {formatDistanceToNow(new Date(record.processedAt), {
                    addSuffix: true,
                    locale: zhCN,
                  })}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};