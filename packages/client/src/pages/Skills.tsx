import React from 'react';
import { Search, Package, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Skills: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Skill 市场</h1>
          <p className="text-gray-600">发现并安装强大的 Skill，扩展你的 AI 助手能力</p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索 Skill..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>

        {/* Empty State */}
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Package className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Skill 市场待接入</h3>
          <p className="text-gray-500 mb-6">强大的 AI 技能即将推出</p>
          <Button variant="outline">
            敬请期待
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Skills;
