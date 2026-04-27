/**
 * 配额进度条组件
 *
 * 显示月度配额使用情况,包含警告和超限提示
 * 可展开显示今日/本周/本月的详细用量
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useQuotaStore } from '@/stores/quota';
import { useUsageStore } from '@/stores/usage';
import { AlertCircle, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';

export function QuotaProgressBar() {
  const [showDetails, setShowDetails] = useState(false);
  const { status, config } = useQuotaStore();
  const { stats } = useUsageStore();

  // 计算实际值，即使 status 为 null 也显示 0
  const currentCost = status?.currentCost ?? 0;
  const budget = status?.budget ?? config?.monthlyBudget ?? 200;
  const utilization = status?.utilization ?? 0;
  const isWarning = status?.isWarning ?? false;
  const isExceeded = status?.isExceeded ?? false;

  if (!config) {
    return (
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            月度配额使用情况
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getColor = () => {
    if (isExceeded) return 'bg-red-500';
    if (isWarning) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <Card className="bg-white border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5 text-primary" />
            月度配额使用情况
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="gap-1 text-gray-500 hover:text-gray-700"
          >
            {showDetails ? (
              <>
                收起详情
                <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                查看详情
                <ChevronDown className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* 用量信息 */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">
              ${currentCost.toFixed(2)} / ${budget.toFixed(2)}
            </span>
            <span className={`font-semibold ${
              isExceeded ? 'text-red-600' :
              isWarning ? 'text-yellow-600' :
              'text-green-600'
            }`}>
              {(utilization * 100).toFixed(0)}%
            </span>
          </div>

          {/* 进度条 */}
          <Progress
            value={utilization * 100}
            className={`h-3 ${getColor()}`}
          />

          {/* 警告信息 */}
          {isWarning && (
            <Alert variant="warning">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                用量已达到 {(utilization * 100).toFixed(0)}%，请注意控制使用
              </AlertDescription>
            </Alert>
          )}

          {/* 超限信息 */}
          {isExceeded && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                已超出预算上限 (${config.monthlyBudget.toFixed(2)})，{config.hardLimit ? '无法发送新请求' : '请谨慎使用'}
              </AlertDescription>
            </Alert>
          )}

          {/* 配置信息 */}
          {!isWarning && !isExceeded && (
            <div className="text-xs text-gray-500">
              <p>预警阈值: {(config.warningThreshold * 100).toFixed(0)}%</p>
              <p>{config.hardLimit ? '硬限制已启用' : '软限制模式'}</p>
            </div>
          )}

          {/* 展开的详细用量 */}
          {showDetails && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-3 gap-4">
                {/* 今日 */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-2">今日</div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">成本</span>
                      <span className="font-medium">${stats.today.totalCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Token</span>
                      <span className="font-medium">
                        {(stats.today.totalInputTokens + stats.today.totalOutputTokens).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">请求数</span>
                      <span className="font-medium">{stats.today.requestCount}</span>
                    </div>
                  </div>
                </div>

                {/* 本周 */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-2">本周</div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">成本</span>
                      <span className="font-medium">${stats.week.totalCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Token</span>
                      <span className="font-medium">
                        {(stats.week.totalInputTokens + stats.week.totalOutputTokens).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">请求数</span>
                      <span className="font-medium">{stats.week.requestCount}</span>
                    </div>
                  </div>
                </div>

                {/* 本月 */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-2">本月</div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">成本</span>
                      <span className="font-medium">${stats.month.totalCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Token</span>
                      <span className="font-medium">
                        {(stats.month.totalInputTokens + stats.month.totalOutputTokens).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">请求数</span>
                      <span className="font-medium">{stats.month.requestCount}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}