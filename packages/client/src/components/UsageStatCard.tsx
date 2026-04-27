/**
 * 用量统计卡片组件
 * 
 * 显示指定时间段（今日/本周/本月）的 Token 使用量、成本和请求数
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUsageStore } from '@/stores/usage';

interface UsageStatCardProps {
  period: 'today' | 'week' | 'month';
}

export function UsageStatCard({ period }: UsageStatCardProps) {
  const { stats, isLoading } = useUsageStore();
  const stat = stats?.[period];

  const labels = {
    today: '今日',
    week: '本周',
    month: '本月',
  };

  // 加载中或数据不存在时显示骨架屏
  if (isLoading || !stat) {
    return (
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-sm text-gray-500">{labels[period]}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="bg-white border-gray-200 hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="text-sm text-gray-500">{labels[period]}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">成本</span>
            <span className="font-semibold text-gray-900">${stat.totalCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Token</span>
            <span className="font-semibold text-gray-900">
              {(stat.totalInputTokens + stat.totalOutputTokens).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">请求数</span>
            <span className="font-semibold text-gray-900">{stat.requestCount}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
