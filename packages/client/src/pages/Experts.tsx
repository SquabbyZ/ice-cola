import React, { useEffect, useState } from 'react';
import { Bot, Plus, TrendingUp, Users, CheckCircle2, Loader2, Edit2, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useExpertStore, type ExpertPrompt } from '@/stores/experts';

const Experts: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'active' | 'all'>('active');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingExpert, setEditingExpert] = useState<ExpertPrompt | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const { prompts, loadPrompts, isLoading, error, setActiveExpert, createPrompt, updatePrompt, deletePrompt } = useExpertStore();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    systemPrompt: '',
    icon: '🤖',
    color: '#3B82F6',
  });

  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

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
    <>
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">专家系统</h1>
              <p className="text-gray-600">配置和管理你的 AI 专家助手</p>
            </div>
            <Button className="gap-2" onClick={() => setShowCreateModal(true)}>
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
                  <div className="flex items-start gap-4 flex-1">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                      style={{ backgroundColor: expert.color ? `${expert.color}20` : undefined }}
                    >
                      {expert.icon || '🤖'}
                    </div>
                    <div className="flex-1">
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
                      {expert.systemPrompt && (
                        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                          {expert.systemPrompt.substring(0, 100)}...
                        </div>
                      )}
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(expert)}
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
        )}

        {/* Available Experts Grid */}
        {activeTab === 'all' && (
          <div className="text-center py-12">
            <Bot className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">专家市场待接入</h3>
            <p className="text-gray-500 mb-4">即将推出更多预置专家模板</p>
            <Button variant="outline" size="sm">
              敬请期待
            </Button>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingExpert) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
                  onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary h-32 resize-none"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
              >
                {editingExpert ? '保存' : '创建'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>

    <ConfirmDialog
      open={deleteConfirmOpen}
      onOpenChange={(open) => {
        setDeleteConfirmOpen(open);
        if (!open) setPendingDeleteId(null);
      }}
      title="确认删除"
      description="确定要删除这个专家吗？"
      confirmText="删除"
      cancelText="取消"
      onConfirm={confirmDelete}
      variant="destructive"
    />
    </>
  );
};

export default Experts;
