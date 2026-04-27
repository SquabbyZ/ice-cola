import React, { useEffect, useState } from 'react';
import { Bot, Plus, TrendingUp, Users, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useExpertStore, type ExpertPrompt } from '@/stores/experts';

const Experts: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'active' | 'all'>('active');
  const { prompts, loadPrompts, isLoading, error, setActiveExpert } = useExpertStore();

  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">专家系统</h1>
              <p className="text-gray-600">配置和管理你的 AI 专家助手</p>
            </div>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              创建专家
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Bot className="w-4 h-4" />
                <span className="text-sm">活跃专家</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {prompts.filter(e => e.isDefault).length}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">总调用次数</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Users className="w-4 h-4" />
                <span className="text-sm">可用专家</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {prompts.length}
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'active'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            我的专家 ({prompts.length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-primary text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            专家市场
          </button>
        </div>

        {/* My Experts List */}
        {activeTab === 'active' && (
          <div className="space-y-4">
            {prompts.length === 0 && !isLoading && (
              <div className="text-center py-12 text-gray-500">
                <Bot className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>暂无专家，请从专家市场添加或创建新专家</p>
              </div>
            )}
            {prompts.map((expert) => (
              <div
                key={expert.id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                      style={{ backgroundColor: expert.color ? `${expert.color}20` : undefined }}
                    >
                      {expert.icon || '🤖'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{expert.name}</h3>
                        {expert.isDefault && (
                          <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            默认
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{expert.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveExpert(expert.id)}
                    >
                      设为当前
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Available Experts Grid */}
        {activeTab === 'all' && (
          <div className="text-center py-12">
            <Bot className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">专家市场待接入</h3>
            <p className="text-gray-500 mb-4">即将推出，敬请期待</p>
            <Button variant="outline" size="sm">
              敬请期待
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Experts;
