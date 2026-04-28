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

const TYPE_COLORS = {
  skill: 'bg-blue-100 text-blue-700',
  mcp: 'bg-purple-100 text-purple-700',
  extension: 'bg-green-100 text-green-700',
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
                <Badge className={TYPE_COLORS[record.type]}>
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