import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { filterAndSortExperts } from '@/lib/expert-filter-sort';
import {
  Bot,
  Plus,
  TrendingUp,
  CheckCircle2,
  Edit2,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  Zap,
  Sparkles,
  X,
  Palette,
  Droplets,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Drawer,
  DrawerContent,
} from '@/components/ui/drawer';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ExpertMarketplaceCard } from '@/components/ExpertMarketplaceCard';
import AIGenerationPanel from '@/components/AIGenerationPanel';
import { useExpertStore, type ExpertPrompt } from '@/stores/experts';
import {
  useExpertMarketplaceStore,
  EXPERT_CATEGORIES,
} from '@/stores/expertMarketplaceStore';
import { useGateway } from '@/hooks/useGateway';
import { useWorkordersStore } from '@/stores/workordersStore';
import { useAuthStore } from '@/stores/authStore';
import type { Expert } from '@/stores/expertMarketplaceStore';

const COLOR_PRESETS = [
  { color: '#3B82F6', label: 'Blue' },
  { color: '#8B5CF6', label: 'Violet' },
  { color: '#EC4899', label: 'Pink' },
  { color: '#EF4444', label: 'Red' },
  { color: '#F97316', label: 'Orange' },
  { color: '#EAB308', label: 'Yellow' },
  { color: '#22C55E', label: 'Green' },
  { color: '#14B8A6', label: 'Teal' },
  { color: '#06B6D4', label: 'Cyan' },
  { color: '#6366F1', label: 'Indigo' },
  { color: '#A855F7', label: 'Purple' },
  { color: '#F43F5E', label: 'Rose' },
];

const EMOJI_ICONS = [
  { emoji: '🤖', label: 'Robot' },
  { emoji: '💻', label: 'Laptop' },
  { emoji: '🔧', label: 'Wrench' },
  { emoji: '📝', label: 'Memo' },
  { emoji: '📊', label: 'Chart' },
  { emoji: '🎯', label: 'Target' },
  { emoji: '💡', label: 'Bulb' },
  { emoji: '⚡', label: 'Lightning' },
  { emoji: '🔮', label: 'Crystal' },
  { emoji: '📚', label: 'Books' },
  { emoji: '🎨', label: 'Palette' },
  { emoji: '🏆', label: 'Trophy' },
  { emoji: '🚀', label: 'Rocket' },
  { emoji: '🌟', label: 'Star' },
  { emoji: '💼', label: 'Briefcase' },
  { emoji: '🎮', label: 'Game' },
  { emoji: '🎭', label: 'Masks' },
  { emoji: '🎪', label: 'Circus' },
  { emoji: '🌈', label: 'Rainbow' },
  { emoji: '🔥', label: 'Fire' },
];

const Experts: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'my' | 'marketplace'>('my');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingExpert, setEditingExpert] = useState<ExpertPrompt | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [mySearchQuery, setMySearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'default-first'>('default-first');
  const [publishDialog, setPublishDialog] = useState<{ open: boolean; expert: Expert | null }>({ open: false, expert: null });
  const [publishNote, setPublishNote] = useState('');
  const [showAIPanel, setShowAIPanel] = useState(false);

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

  const { createWorkorder } = useWorkordersStore();
  const { user } = useAuthStore();
  const teamId = user?.team?.id || '';

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
      setDeleteConfirmOpen(false);
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

  const handleAIApply = (config: Record<string, unknown>) => {
    setFormData((prev) => ({
      ...prev,
      name: (config.name as string) || prev.name,
      description: (config.description as string) || prev.description,
      systemPrompt: (config.systemPrompt as string) || prev.systemPrompt,
      icon: (config.icon as string) || prev.icon,
      color: (config.color as string) || prev.color,
    }));
    setShowAIPanel(false);
  };

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    systemPrompt: '',
    icon: '🤖',
    color: '#3B82F6',
  });

  const filteredMarketplaceExperts = getFilteredExperts();

  const handlePublishMarketplace = (expert: Expert) => {
    setPublishDialog({ open: true, expert });
    setPublishNote('');
  };

  const handlePublishConfirm = async () => {
    if (!publishDialog.expert || !teamId) return;
    try {
      await createWorkorder({
        type: 'expert',
        targetId: publishDialog.expert.id,
        targetName: publishDialog.expert.name,
        targetIcon: publishDialog.expert.icon,
        teamId,
        note: publishNote.trim() || undefined,
      });
      setPublishDialog({ open: false, expert: null });
      setPublishNote('');
    } catch (err) {
      console.error('Failed to create workorder:', err);
    }
  };

  const filteredMyExperts = React.useMemo(
    () => filterAndSortExperts(prompts, mySearchQuery, sortBy),
    [prompts, mySearchQuery, sortBy]
  );

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
      <div className="flex-1 overflow-y-auto bg-gradient-to-br from-zinc-50 via-zinc-50/80 to-zinc-100/50">
        <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
          {/* Header with asymmetric layout */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
              {/* Left-aligned title block with character */}
              <div className="relative">
                {/* Decorative accent line */}
                <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-zinc-400/40 via-zinc-300/20 to-transparent rounded-full" />
                <div className="pl-4">
                  <h1 className="text-3xl lg:text-[2.25rem] font-bold tracking-tight text-zinc-900 leading-tight mb-2">
                    {t('experts.title')}
                  </h1>
                  <p className="text-sm text-zinc-500 max-w-[40ch]">
                    {t('experts.subtitle')}
                  </p>
                </div>
              </div>

              {/* Optional action area */}
              {activeTab === 'my' && (
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="btn-ice gap-2 px-5"
                >
                  <Plus className="w-4 h-4" />
                  {t('experts.create')}
                </Button>
              )}
            </div>

            {/* Stats Bento Grid - asymmetric 70/30 split on lg */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4">
              {/* Main stat - Marketplace (larger) */}
              <div
                className="bento-tile p-5 lg:col-span-5 animate-fade-in-up relative overflow-hidden group"
                style={{ animationDelay: '0ms' }}
              >
                {/* Watermark */}
                <div className="absolute -right-4 -bottom-4 w-32 h-32 text-zinc-500/5 group-hover:text-zinc-500/10 transition-all duration-500 transform group-hover:scale-110">
                  <Zap className="w-full h-full" />
                </div>

                <div className="flex items-start justify-between relative">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-100/80 flex items-center justify-center shadow-sm">
                      <Zap className="w-6 h-6 text-zinc-600" />
                    </div>
                    <div>
                      <div className="text-4xl lg:text-5xl font-bold text-zinc-900 font-mono tracking-tight leading-none">
                        {experts.length}
                      </div>
                      <div className="text-xs text-zinc-500 mt-1.5">{t('experts.stats.marketplace')}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Secondary stats row */}
              <div className="lg:col-span-7 grid grid-cols-2 gap-4">
                <div
                  className="bento-tile p-4 animate-fade-in-up relative overflow-hidden group"
                  style={{ animationDelay: '100ms' }}
                >
                  <div className="absolute -right-2 -bottom-2 w-16 h-16 text-emerald-500/5 group-hover:text-emerald-500/10 transition-all duration-300">
                    <TrendingUp className="w-full h-full" />
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center mb-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="relative">
                    <div className="text-2xl font-bold text-zinc-900 font-mono tracking-tight leading-none">
                      {installedExperts.length}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">{t('experts.stats.installed')}</div>
                  </div>
                </div>

                <div
                  className="bento-tile p-4 animate-fade-in-up relative overflow-hidden group"
                  style={{ animationDelay: '200ms' }}
                >
                  <div className="absolute -right-2 -bottom-2 w-16 h-16 text-blue-500/5 group-hover:text-blue-500/10 transition-all duration-300">
                    <Bot className="w-full h-full" />
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center mb-2">
                    <Bot className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="relative">
                    <div className="text-2xl font-bold text-zinc-900 font-mono tracking-tight leading-none">
                      {prompts.length}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">{t('experts.stats.myExperts')}</div>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 glass-panel rounded-xl border-red-200/50 text-red-600 text-sm mt-4">
                {error}
              </div>
            )}
          </div>

          {/* Tabs - Using shadcn Button with variant */}
          <div className="flex gap-2 mb-6">
            <Button
              onClick={() => setActiveTab('my')}
              variant={activeTab === 'my' ? 'default' : 'outline'}
              className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ease-out flex items-center gap-2 shadow-sm"
            >
              <Bot className="w-4 h-4" />
              {t('experts.myExperts')} ({prompts.length})
            </Button>
            <Button
              onClick={() => setActiveTab('marketplace')}
              variant={activeTab === 'marketplace' ? 'default' : 'outline'}
              className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ease-out flex items-center gap-2 shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              {t('experts.marketplace')} ({experts.length})
            </Button>
          </div>

          {/* My Experts Tab */}
          {activeTab === 'my' && (
            <>
              {/* Search + Sort controls — visible when there are experts or a search is active */}
              {(prompts.length > 0 || mySearchQuery) && (
                <div className="mb-6 flex items-center gap-3">
                  {/* Search */}
                  <div className="relative flex-1 group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Search className="w-4 h-4 text-zinc-400 group-focus-within:text-zinc-600 transition-colors" />
                    </div>
                    <input
                      type="text"
                      value={mySearchQuery}
                      onChange={(e) => setMySearchQuery(e.target.value)}
                      placeholder={t('experts.mySearchPlaceholder')}
                      aria-label={t('experts.mySearchPlaceholder')}
                      className="w-full pl-11 pr-4 py-3 bg-white/80 backdrop-blur-sm border border-zinc-200/60 rounded-xl text-sm focus:outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-500/10 transition-all duration-200 placeholder:text-zinc-400 shadow-sm"
                    />
                    {mySearchQuery && (
                      <button
                        onClick={() => setMySearchQuery('')}
                        aria-label={t('experts.clearFilter')}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-400 hover:text-zinc-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Sort */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        const next = sortBy === 'default-first' ? 'name-asc' : sortBy === 'name-asc' ? 'name-desc' : 'default-first';
                        setSortBy(next);
                      }}
                      aria-label={t(`experts.sort.${sortBy}`)}
                      className="flex items-center gap-2 px-4 py-3 bg-white/80 backdrop-blur-sm border border-zinc-200/60 rounded-xl text-sm text-zinc-600 hover:border-zinc-400 hover:ring-4 hover:ring-zinc-500/10 transition-all duration-200 shadow-sm whitespace-nowrap"
                    >
                      {sortBy === 'name-asc' && <ArrowUp className="w-4 h-4" />}
                      {sortBy === 'name-desc' && <ArrowDown className="w-4 h-4" />}
                      {sortBy === 'default-first' && <ArrowUpDown className="w-4 h-4" />}
                      <span className="hidden sm:inline">{t(`experts.sort.${sortBy}`)}</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="grid gap-4">
                {prompts.length === 0 && !myExpertsLoading && !mySearchQuery && (
                  <div className="bento-tile p-12 text-center animate-fade-in-up">
                    {/* Watermark */}
                    <div className="relative inline-block mb-6">
                      <div className="absolute inset-0 flex items-center justify-center text-zinc-100/60">
                        <Bot className="w-20 h-20" />
                      </div>
                      <div className="relative z-10 w-14 h-14 rounded-2xl bg-zinc-100/80 flex items-center justify-center mx-auto shadow-inner">
                        <Bot className="w-7 h-7 text-zinc-400" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-zinc-900 mb-2">{t('experts.noExperts')}</h3>
                    <p className="text-sm text-zinc-500 mb-6 max-w-md mx-auto">
                      {t('experts.createFirst')}
                    </p>
                    <Button
                      onClick={() => setActiveTab('marketplace')}
                      className="btn-ice px-6"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      {t('experts.browseMarketplace')}
                    </Button>
                  </div>
                )}
                {filteredMyExperts.length === 0 && prompts.length > 0 && mySearchQuery && (
                  <div className="bento-tile p-12 text-center animate-fade-in-up">
                    <div className="relative inline-block mb-6">
                      <div className="absolute inset-0 flex items-center justify-center text-zinc-100/60">
                        <Search className="w-16 h-16" />
                      </div>
                      <div className="relative z-10 w-14 h-14 rounded-2xl bg-zinc-100/80 flex items-center justify-center mx-auto shadow-inner">
                        <Search className="w-7 h-7 text-zinc-400" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-zinc-900 mb-2">{t('experts.noMyMatch')}</h3>
                    <p className="text-sm text-zinc-500 mb-6 max-w-md mx-auto">
                      {t('experts.tryAdjustMy')}
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setMySearchQuery('')}
                      className="border-zinc-200 hover:bg-zinc-50 rounded-xl px-6"
                    >
                      {t('experts.clearFilter')}
                    </Button>
                  </div>
                )}
                {filteredMyExperts.map((expert, index) => (
                  <div
                    key={expert.id}
                    className="bento-tile p-5 group hover-lift animate-fade-in-up"
                    style={{ animationDelay: `${(index + 1) * 100}ms` }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 shadow-md group-hover:shadow-lg transition-all duration-300 group-hover:scale-105"
                          style={{
                            background: expert.color
                              ? `linear-gradient(135deg, ${expert.color}20 0%, ${expert.color}10 100%)`
                              : 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                          }}
                        >
                          {expert.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold text-zinc-900 text-base">
                              {expert.name}
                            </h3>
                            {expert.isDefault && (
                              <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200/50 shadow-sm">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                {t('experts.default')}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-zinc-500 mb-3">{expert.description}</p>
                          {expert.systemPrompt && (
                            <div className="text-xs text-zinc-400 bg-zinc-50/80 p-3 rounded-lg border border-zinc-100/50 font-mono max-w-[500px] truncate">
                              {expert.systemPrompt.substring(0, 80)}
                              {expert.systemPrompt.length > 80 ? '...' : ''}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveExpert(expert.id)}
                          className="border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:border-zinc-300 rounded-xl transition-all active:scale-[0.98]"
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
                {/* Search Bar with glass effect */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="w-5 h-5 text-zinc-400 group-focus-within:text-zinc-600 transition-colors" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('experts.searchPlaceholder')}
                    className="w-full pl-12 pr-4 py-3.5 bg-white/80 backdrop-blur-sm border border-zinc-200/60 rounded-xl text-sm focus:outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-500/10 transition-all duration-200 placeholder:text-zinc-400 shadow-sm"
                  />
                </div>

                {/* Category Filter - using shadcn Button */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  <Filter className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                  {EXPERT_CATEGORIES.map((category) => (
                    <Button
                      key={category.value}
                      onClick={() => setSelectedCategory(category.value)}
                      variant={selectedCategory === category.value ? 'default' : 'outline'}
                      className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap"
                    >
                      {category.label}
                    </Button>
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
                <div className="bento-tile p-12 text-center animate-fade-in-up">
                  {/* Watermark */}
                  <div className="relative inline-block mb-6">
                    <div className="absolute inset-0 flex items-center justify-center text-zinc-100/60">
                      <Bot className="w-20 h-20" />
                    </div>
                    <div className="relative z-10 w-14 h-14 rounded-2xl bg-zinc-100/80 flex items-center justify-center mx-auto shadow-inner">
                      <Bot className="w-7 h-7 text-zinc-400" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-900 mb-2">
                    {t('experts.noMatch')}
                  </h3>
                  <p className="text-sm text-zinc-500 mb-6 max-w-md mx-auto">
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
                      onPublishMarketplace={activeTab === 'marketplace' ? handlePublishMarketplace : undefined}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create/Edit Drawer - Slides from right */}
      <Drawer
        open={showCreateModal || !!editingExpert}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateModal(false);
            setEditingExpert(null);
            resetForm();
          }
        }}
      >
        <DrawerContent onClose={() => {
          setShowCreateModal(false);
          setEditingExpert(null);
          resetForm();
        }}>
          {/* Header */}
          <div className="px-6 py-5 border-b border-zinc-100/50 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-zinc-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
                    {editingExpert ? t('experts.edit') : t('experts.create')}
                  </h2>
                  <p className="text-sm text-zinc-500">
                    {editingExpert ? t('experts.edit') : t('experts.createFirst')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!editingExpert && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAIPanel(!showAIPanel)}
                    className="gap-1.5 border-violet-200 text-violet-600 hover:bg-violet-50 hover:border-violet-300"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    AI 生成
                  </Button>
                )}
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingExpert(null);
                    resetForm();
                    setShowAIPanel(false);
                  }}
                  className="w-10 h-10 rounded-xl p-0 flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-all duration-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto px-6 py-6 relative">
            {showAIPanel && (
              <div className="absolute inset-0 z-10 bg-white">
                <AIGenerationPanel
                  type="expert"
                  onApply={handleAIApply}
                  onClose={() => setShowAIPanel(false)}
                />
              </div>
            )}
            <div className="space-y-6">
              {/* Name Field */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-zinc-700 tracking-tight">
                  {t('experts.expertName')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3.5 bg-zinc-50/80 border border-zinc-200/60 rounded-xl text-sm focus:outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-500/10 transition-all placeholder:text-zinc-400"
                  placeholder={t('experts.namePlaceholder')}
                  required
                />
              </div>

              {/* Description Field */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-zinc-700 tracking-tight">
                  {t('experts.expertDescription')}
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-50/80 border border-zinc-200/60 rounded-xl text-sm focus:outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-500/10 transition-all placeholder:text-zinc-400"
                  placeholder={t('experts.descriptionPlaceholder')}
                />
              </div>

              {/* System Prompt Field */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-zinc-700 tracking-tight">
                  {t('experts.systemPrompt')}
                </label>
                <textarea
                  value={formData.systemPrompt}
                  onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-50/80 border border-zinc-200/60 rounded-xl text-sm focus:outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-500/10 transition-all h-32 resize-none font-mono text-zinc-700 placeholder:text-zinc-400"
                  placeholder={t('experts.systemPromptPlaceholder')}
                />
                <p className="text-xs text-zinc-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {t('experts.systemPromptHint')}
                </p>
              </div>

              {/* Icon & Color Section - Beautified */}
              <div className="space-y-5">
                {/* Section Label */}
                <label className="text-sm font-semibold text-zinc-700 tracking-tight flex items-center gap-2">
                  <Palette className="w-4 h-4 text-zinc-400" />
                  {t('experts.icon')} & {t('experts.color')}
                </label>

                {/* Color Presets */}
                <div className="space-y-2.5">
                  <p className="text-xs text-zinc-400 font-medium">{t('experts.color') || 'Background Color'}</p>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: preset.color })}
                        aria-label={preset.label}
                        aria-pressed={formData.color === preset.color}
                        className={cn(
                          "group relative w-8 h-8 rounded-full transition-all duration-200 hover:scale-110",
                          formData.color === preset.color
                            ? "ring-2 ring-offset-2 ring-zinc-800 shadow-lg"
                            : "hover:shadow-md"
                        )}
                        style={{ backgroundColor: preset.color }}
                      >
                        {formData.color === preset.color && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-white absolute inset-0 m-auto drop-shadow-sm" />
                        )}
                      </button>
                    ))}
                    {/* Custom color picker trigger */}
                    <label
                      aria-label="Custom color"
                      className={cn(
                        "w-8 h-8 rounded-full border-2 border-dashed border-zinc-300 flex items-center justify-center cursor-pointer transition-all hover:border-zinc-400 hover:bg-zinc-50",
                        !COLOR_PRESETS.some(p => p.color === formData.color) && "border-solid border-zinc-400 bg-zinc-50"
                      )}
                    >
                      <input
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="sr-only"
                      />
                      <Droplets className="w-3.5 h-3.5 text-zinc-400" />
                    </label>
                    <span className="text-xs text-zinc-400 font-mono self-center ml-1">{formData.color}</span>
                  </div>
                </div>

                {/* Icon Grid */}
                <div className="space-y-2.5">
                  <p className="text-xs text-zinc-400 font-medium">{t('experts.icon') || 'Icon'}</p>
                  <div className="grid grid-cols-10 gap-1.5">
                    {EMOJI_ICONS.map(({ emoji, label }) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon: emoji })}
                        aria-label={label}
                        aria-pressed={formData.icon === emoji}
                        className={cn(
                          "w-full aspect-square rounded-lg flex items-center justify-center text-lg transition-all duration-200",
                          formData.icon === emoji
                            ? "bg-zinc-100 ring-2 ring-zinc-800 shadow-sm scale-105"
                            : "bg-zinc-50 hover:bg-zinc-100 hover:scale-105 active:scale-95"
                        )}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Preview - Enhanced */}
                <div
                  className="relative rounded-2xl overflow-hidden p-5 transition-all duration-300"
                  style={{
                    background: `linear-gradient(135deg, ${formData.color}18 0%, ${formData.color}08 100%)`,
                    border: `1px solid ${formData.color}25`,
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-lg transition-all duration-300"
                      style={{
                        background: `linear-gradient(135deg, ${formData.color} 0%, ${formData.color}BB 100%)`,
                      }}
                    >
                      {formData.icon || '🤖'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-zinc-900 truncate">
                        {formData.name || t('experts.expertName')}
                      </p>
                      <p className="text-sm text-zinc-500 truncate">
                        {formData.description || t('experts.expertDescription')}
                      </p>
                    </div>
                    <div
                      className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${formData.color}15` }}
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: formData.color }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-5 border-t border-zinc-100/50 bg-white flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                setEditingExpert(null);
                resetForm();
              }}
              className="px-6 py-2.5 border-zinc-200/60 hover:bg-zinc-100 rounded-xl font-medium text-zinc-600 transition-all duration-200"
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={editingExpert ? handleUpdate : handleCreate}
              disabled={!formData.name.trim()}
              className="px-8 py-2.5 bg-zinc-700 hover:bg-zinc-800 text-white rounded-xl font-medium shadow-md shadow-zinc-700/20 hover:shadow-lg hover:shadow-zinc-700/25 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingExpert ? t('common.save') : t('experts.create')}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

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

      {/* Publish to Marketplace Dialog */}
      <Dialog open={publishDialog.open} onOpenChange={(open) => setPublishDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>发布到市场</DialogTitle>
            <DialogDescription>
              将 "{publishDialog.expert?.name}" 提交到市场，需要团队管理员和平台管理员审批。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-zinc-700 mb-1.5 block">备注（可选）</label>
              <textarea
                value={publishNote}
                onChange={(e) => setPublishNote(e.target.value)}
                placeholder="添加发布说明..."
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none h-20"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPublishDialog({ open: false, expert: null })}>
              取消
            </Button>
            <Button onClick={handlePublishConfirm} disabled={!teamId}>
              提交申请
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Experts;
