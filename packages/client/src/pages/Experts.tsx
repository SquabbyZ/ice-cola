import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'my' | 'marketplace'>('my');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingExpert, setEditingExpert] = useState<ExpertPrompt | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useGateway({ autoConnect: true });

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

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    systemPrompt: '',
    icon: '🤖',
    color: '#3B82F6',
  });

  const filteredMarketplaceExperts = getFilteredExperts();

  const statCards = [
    { label: t('experts.stats.marketplace'), value: experts.length, icon: Zap },
    { label: t('experts.stats.installed'), value: installedExperts.length, icon: TrendingUp },
    { label: t('experts.stats.myExperts'), value: prompts.length, icon: Bot },
  ];

  if (myExpertsLoading && activeTab === 'my') {
    return (
      <div className="flex-1 overflow-y-auto bg-zinc-50/50">
        <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
          <div className="space-y-4">
            <div className="h-10 bg-zinc-200/50 rounded-xl w-1/4 animate-pulse" />
            <div className="grid grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-zinc-200/50 rounded-2xl animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto bg-zinc-50/50">
        <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-zinc-900 tracking-tight mb-2">
                  {t('experts.title')}
                </h1>
                <p className="text-zinc-500 text-sm lg:text-base">
                  {t('experts.subtitle')}
                </p>
              </div>
            </div>

            {/* Stats - Bento Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {statCards.map((stat, index) => (
                <div
                  key={stat.label}
                  className="bento-tile p-5 animate-fade-in-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-100/80 flex items-center justify-center">
                      <stat.icon className="w-5 h-5 text-zinc-600" />
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-3xl font-bold text-zinc-900 font-mono tracking-tight">
                      {stat.value}
                    </span>
                    <span className="text-sm text-zinc-500 mt-1">{stat.label}</span>
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <div className="p-4 glass-panel rounded-xl border-red-200/50 text-red-600 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-8">
            {[
              { id: 'marketplace' as const, label: t('experts.marketplace'), count: experts.length },
              { id: 'my' as const, label: t('experts.myExperts'), count: prompts.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-300/50'
                    : 'bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200/50'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* My Experts Tab */}
          {activeTab === 'my' && (
            <>
              <div className="flex justify-end mb-6">
                <Button
                  className="btn-ice gap-2 px-5"
                  onClick={() => setShowCreateModal(true)}
                >
                  <Plus className="w-4 h-4" />
                  {t('experts.create')}
                </Button>
              </div>

              <div className="grid gap-4">
                {prompts.length === 0 && !myExpertsLoading && (
                  <div className="bento-tile p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-zinc-100/80 flex items-center justify-center">
                      <Bot className="w-8 h-8 text-zinc-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-zinc-900 mb-2">{t('experts.noExperts')}</h3>
                    <p className="text-zinc-500 mb-6 max-w-md mx-auto text-sm">
                      {t('experts.createFirst')}
                    </p>
                    <Button
                      onClick={() => setActiveTab('marketplace')}
                      className="btn-ice px-6"
                    >
                      {t('experts.browseMarketplace')}
                    </Button>
                  </div>
                )}
                {prompts.map((expert, index) => (
                  <div
                    key={expert.id}
                    className="bento-tile p-5 group hover-lift animate-fade-in-up"
                    style={{ animationDelay: `${(index + 1) * 100}ms` }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                          style={{
                            backgroundColor: expert.color ? `${expert.color}15` : '#f3f4f6',
                          }}
                        >
                          {expert.icon || '🤖'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold text-zinc-900 text-base">
                              {expert.name}
                            </h3>
                            {expert.isDefault && (
                              <Badge className="bg-green-500/10 text-green-600 border-green-200/50">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                {t('experts.default')}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-zinc-500 mb-3">{expert.description}</p>
                          {expert.systemPrompt && (
                            <div className="text-xs text-zinc-400 bg-zinc-50/80 p-3 rounded-lg border border-zinc-100/50 font-mono">
                              {expert.systemPrompt.substring(0, 120)}
                              {expert.systemPrompt.length > 120 ? '...' : ''}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveExpert(expert.id)}
                          className="border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:border-zinc-300 rounded-xl"
                        >
                          {t('experts.setActive')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(expert)}
                          className="text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        {!expert.isDefault && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(expert.id)}
                            className="text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
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
              <div className="mb-6 space-y-4">
                {/* Search Bar */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="w-5 h-5 text-zinc-400 group-focus-within:text-zinc-600 transition-colors" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('experts.searchPlaceholder')}
                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-zinc-200/50 rounded-xl text-sm focus:outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-500/10 transition-all duration-200 placeholder:text-zinc-400"
                  />
                </div>

                {/* Category Filter */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  <Filter className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                  {EXPERT_CATEGORIES.map((category) => (
                    <button
                      key={category.value}
                      onClick={() => setSelectedCategory(category.value)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                        selectedCategory === category.value
                          ? 'bg-zinc-900 text-white shadow-md'
                          : 'bg-white text-zinc-600 hover:bg-zinc-50 border border-zinc-200/50'
                      }`}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Refresh Button */}
              <div className="flex justify-end mb-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    loadExperts();
                    loadInstalledExperts();
                  }}
                  className="gap-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl"
                >
                  <RefreshCw className="w-4 h-4" />
                  {t('common.refresh')}
                </Button>
              </div>

              {/* Marketplace Loading */}
              {marketplaceLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="h-80 bg-zinc-200/30 rounded-3xl animate-pulse"
                    />
                  ))}
                </div>
              ) : filteredMarketplaceExperts.length === 0 ? (
                <div className="bento-tile p-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-zinc-100/80 flex items-center justify-center">
                    <Bot className="w-8 h-8 text-zinc-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-900 mb-2">
                    {t('experts.noMatch')}
                  </h3>
                  <p className="text-zinc-500 mb-6 max-w-md mx-auto text-sm">
                    {t('experts.tryAdjust')}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                    }}
                    className="border-zinc-200 hover:bg-zinc-50 rounded-xl px-6"
                  >
                    {t('experts.clearFilter')}
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-zinc-100/50 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-semibold text-zinc-900">
                {editingExpert ? t('experts.edit') : t('experts.create')}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingExpert(null);
                  resetForm();
                }}
                className="rounded-xl"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-6 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  {t('experts.expertName')} *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-zinc-50/50 border border-zinc-200/50 rounded-xl text-sm focus:outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-500/10 transition-all"
                  placeholder={t('experts.namePlaceholder')}
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  {t('experts.expertDescription')}
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 bg-zinc-50/50 border border-zinc-200/50 rounded-xl text-sm focus:outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-500/10 transition-all"
                  placeholder={t('experts.descriptionPlaceholder')}
                />
              </div>

              {/* System Prompt */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  {t('experts.systemPrompt')}
                </label>
                <textarea
                  value={formData.systemPrompt}
                  onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-50/50 border border-zinc-200/50 rounded-xl text-sm focus:outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-500/10 transition-all h-32 resize-none font-mono"
                  placeholder={t('experts.systemPromptPlaceholder')}
                />
                <p className="text-xs text-zinc-400 mt-2">
                  {t('experts.systemPromptHint')}
                </p>
              </div>

              {/* Icon and Color */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">
                    {t('experts.icon')}
                  </label>
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-50/50 border border-zinc-200/50 rounded-xl text-sm focus:outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-500/10 transition-all"
                    placeholder="🤖"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">
                    {t('experts.color')}
                  </label>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full h-12 border border-zinc-200/50 rounded-xl cursor-pointer bg-zinc-50/50"
                  />
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white/80 backdrop-blur-xl border-t border-zinc-100/50 px-6 py-4 flex justify-end gap-3 rounded-b-2xl">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingExpert(null);
                  resetForm();
                }}
                className="border-zinc-200 hover:bg-zinc-50 rounded-xl"
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={editingExpert ? handleUpdate : handleCreate}
                disabled={!formData.name.trim()}
                className="btn-ice rounded-xl px-6"
              >
                {editingExpert ? t('common.save') : t('experts.create')}
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
        title={t('experts.confirmDeleteTitle')}
        description={t('experts.confirmDeleteDesc')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </>
  );
};

export default Experts;
