import React from 'react';
import { Clock, Plus, Play, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge';

const Tasks: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">定时任务</h1>
              <p className="text-gray-600">管理和调度自动化任务</p>
            </div>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              新建任务
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Play className="w-4 h-4" />
                <span className="text-sm">运行中</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">-</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm">已完成</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">-</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-sm">总执行次数</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">-</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Loader2 className="w-4 h-4" />
                <span className="text-sm">平均成功率</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">-</p>
            </div>
          </div>
        </div>

        {/* Empty State */}
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Clock className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">定时任务待接入</h3>
          <p className="text-gray-500 mb-6">自动化任务调度功能即将推出</p>
          <Button variant="outline">
            敬请期待
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Tasks;
