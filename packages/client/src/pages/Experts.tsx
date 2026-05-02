import React, { useEffect, useState } from 'react';
import {
  Bot,
  Plus,
  TrendingUp,
  CheckCircle2,
  Edit2,
  Trash2,
  X,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ExpertMarketplaceCard } from '@/components/ExpertMarketplaceCard';
import { useExpertStore, type ExpertPrompt } from '@/stores/experts';
import {
  useExpertMarketplaceStore,
  EXPERT_CATEGORIES,
} from '@/stores/expertMarketplaceStore';
import { useGateway } from '@/hooks/useGateway';

const Experts: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'my' | 'marketplace'>('my');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingExpert, setEditingExpert] = useState<ExpertPrompt | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Gateway connection for expert installation
  useGateway({ autoConnect: true });

  // My Experts store
  const {
    prompts,
    loadPrompts,
    isLoading: myExpertsLoading,
    error,
    setActiveExpert,
    createPrompt,
    updatePrompt,
    deletePrompt,
  } = useExpertStore();

  // Expert Marketplace store
  const {
    experts,
    installedExperts,
    searchQuery,
    selectedCategory,
    isLoading: marketplaceLoading,
    loadExperts,
    loadInstalledExperts,
    installExpert,
    uninstallExpert,
    setSearchQuery,
    setSelectedCategory,
    getFilteredExperts,
  } = useExpertMarketplaceStore();

  useEffect(() => {
    loadPrompts();
    loadExperts();
    loadInstalledExperts();
  }, [loadPrompts, loadExperts, loadInstalledExperts]);

  const handleCreate = async () => {
    try {
      await createPrompt({ ...formData, isDefault: false });
      setShowCreateModal(false);
      resetForm();
    } catch (err) {
      console.error('Failed to create expert:', err);
    }
  };

  const handleUpdate = async () => {
    if (!editingExpert) return;
    try {
      await updatePrompt(editingExpert.id, formData);
      setEditingExpert(null);
      resetForm();
    } catch (err) {
      console.error('Failed to update expert:', err);
    }
  };

  const handleDelete = async (id: string) => {
    setPendingDeleteId(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      await deletePrompt(pendingDeleteId);
    } catch (err) {
      console.error('Failed to delete expert:', err);
    } finally {
      setPendingDeleteId(null);
    }
  };

  const openEditModal = (expert: ExpertPrompt) => {
    setEditingExpert(expert);
    setFormData({
      name: expert.name,
      description: expert.description || '',
      systemPrompt: expert.systemPrompt || '',
      icon: expert.icon || '🤖',
      color: expert.color || '#3B82F6',
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      systemPrompt: '',
      icon: '🤖',
      color: '#3B82F6',
    });
  };

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    systemPrompt: '',
    icon: '🤖',
    color: '#3B82F6',
  });

  const filteredMarketplaceExperts = getFilteredExperts();

  if (myExpertsLoading && activeTab === 'my') {
    return (
      <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 via-white to-gray-50">
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
    <>
      <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="p-6 lg:p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-2">
                  专家系统
                </h1>
                <p className="text-gray-600 text-base lg:text-lg">
                  配置和管理你的 AI 专家助手，发现并添加来自市场的专家
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-sm">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <Zap className="w-4 h-4" />
                  <span className="text-sm">市场专家</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{experts.length}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-sm">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm">已添加</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{installedExperts.length}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-sm">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <Bot className="w-4 h-4" />
                  <span className="text-sm">我的专家</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{prompts.length}</p>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-3 mb-8 bg-gray-100/50 p-1.5 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('marketplace')}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === 'marketplace'
                  ? 'bg-white text-indigo-600 shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              专家市场 ({experts.length})
            </button>
            <button
              onClick={() => setActiveTab('my')}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === 'my'
                  ? 'bg-white text-indigo-600 shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              我的专家 ({prompts.length})
            </button>
          </div>

          {/* My Experts Tab */}
          {activeTab === 'my' && (
            <>
              <div className="flex justify-end mb-4">
                <Button
                  className="gap-2 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 shadow-lg shadow-indigo-500/25"
                  onClick={() => setShowCreateModal(true)}
                >
                  <Plus className="w-4 h-4" />
                  创建专家
                </Button>
              </div>

              <div className="space-y-4">
                {prompts.length === 0 && !myExpertsLoading && (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-2xl flex items-center justify-center shadow-inner">
                      <Bot className="w-10 h-10 text-indigo-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">暂无专家</h3>
                    <p className="text-gray-500 mb-8 max-w-md mx-auto">
                      从专家市场添加，或创建你自己的专属专家
                    </p>
                    <Button
                      onClick={() => setActiveTab('marketplace')}
                      className="px-8 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600"
                    >
                      浏览专家市场
                    </Button>
                  </div>
                )}
                {prompts.map((expert) => (
                  <div
                    key={expert.id}
                    className="bg-white rounded-xl border border-gray-200/80 p-6 hover:shadow-lg hover:shadow-gray-200/50 hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div
                          className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0"
                          style={{
                            backgroundColor: expert.color
                              ? `${expert.color}15`
                              : '#fef3c7',
                          }}
                        >
                          {expert.icon || '🤖'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900 text-lg">
                              {expert.name}
                            </h3>
                            {expert.isDefault && (
                              <Badge
                                variant="secondary"
                                className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                默认
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{expert.description}</p>
                          {expert.systemPrompt && (
                            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100">
                              <code className="text-xs">
                                {expert.systemPrompt.substring(0, 120)}
                                {expert.systemPrompt.length > 120 ? '...' : ''}
                              </code>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveExpert(expert.id)}
                          className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300"
                        >
                          设为当前
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(expert)}
                          className="text-gray-500 hover:text-indigo-600 hover:bg-indigo-50"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        {!expert.isDefault && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(expert.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Expert Marketplace Tab */}
          {activeTab === 'marketplace' && (
            <>
              {/* Search and Filter */}
              <div className="mb-8 space-y-4">
                {/* Search Bar */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜索专家名称、描述、标签或作者..."
                    className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200 placeholder:text-gray-400"
                  />
                </div>

                {/* Category Filter */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  {EXPERT_CATEGORIES.map((category) => (
                    <button
                      key={category.value}
                      onClick={() => setSelectedCategory(category.value)}
                      className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap border-2 ${
                        selectedCategory === category.value
                          ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white border-transparent shadow-lg shadow-indigo-500/25 scale-105'
                          : 'bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 border-gray-200 hover:scale-105'
                      }`}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Refresh Button */}
              <div className="flex justify-end mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    loadExperts();
                    loadInstalledExperts();
                  }}
                  className="gap-2 text-gray-500 hover:text-gray-700"
                >
                  <RefreshCw className="w-4 h-4" />
                  刷新
                </Button>
              </div>

              {/* Marketplace Loading */}
              {marketplaceLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="h-96 bg-gray-200 rounded-2xl animate-pulse"
                    />
                  ))}
                </div>
              ) : filteredMarketplaceExperts.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center shadow-inner">
                    <Bot className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    未找到匹配的专家
                  </h3>
                  <p className="text-gray-500 mb-8 max-w-md mx-auto">
                    尝试调整搜索条件或浏览其他分类
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                    }}
                    className="px-8"
                  >
                    清除筛选
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
                  {filteredMarketplaceExperts.map((expert) => (
                    <ExpertMarketplaceCard
                      key={expert.id}
                      expert={expert}
                      onInstall={installExpert}
                      onUninstall={uninstallExpert}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingExpert) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingExpert ? '编辑专家' : '创建专家'}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingExpert(null);
                  resetForm();
                }}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  专家名称 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  placeholder="例如：代码审查专家"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  描述
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  placeholder="简短描述这个专家的用途"
                />
              </div>

              {/* System Prompt */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  系统提示词
                </label>
                <textarea
                  value={formData.systemPrompt}
                  onChange={(e) =>
                    setFormData({ ...formData, systemPrompt: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all h-32 resize-none"
                  placeholder="定义专家的行为和角色..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  这将作为 system message 发送给 AI
                </p>
              </div>

              {/* Icon and Color */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    图标
                  </label>
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    placeholder="🤖"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    颜色
                  </label>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingExpert(null);
                  resetForm();
                }}
              >
                取消
              </Button>
              <Button
                onClick={editingExpert ? handleUpdate : handleCreate}
                disabled={!formData.name.trim()}
                className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600"
              >
                {editingExpert ? '保存' : '创建'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          setDeleteConfirmOpen(open);
          if (!open) setPendingDeleteId(null);
        }}
        title="确认删除"
        description="确定要删除这个专家吗？此操作不可撤销。"
        confirmText="删除"
        cancelText="取消"
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </>
  );
};

export default Experts;
