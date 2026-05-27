import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Package, Filter, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useExtensionStore } from '@/stores/extensions';
import { ExtensionCard } from '@/components/ExtensionCard';

const CATEGORIES = [
  { key: 'all', labelKey: 'common.all' },
  { key: 'development', labelKey: 'extensions.categoryDevelopment' },
  { key: 'productivity', labelKey: 'extensions.categoryProductivity' },
  { key: 'communication', labelKey: 'extensions.categoryCommunication' },
  { key: 'tools', labelKey: 'common.tools' },
  { key: 'docs', labelKey: 'extensions.categoryDocs' },
];

const Extensions: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'store' | 'installed'>('store');
  const {
    extensions,
    installedExtensions,
    searchQuery,
    selectedCategory,
    isLoading,
    error,
    loadExtensions,
    loadInstalledExtensions,
    installExtension,
    uninstallExtension,
    setSearchQuery,
    setSelectedCategory,
    getFilteredExtensions,
  } = useExtensionStore();

  useEffect(() => {
    loadExtensions();
    loadInstalledExtensions();
  }, [loadExtensions, loadInstalledExtensions]);

  const filteredExtensions = getFilteredExtensions();
  const displayedExtensions = activeTab === 'store' ? filteredExtensions : installedExtensions;

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto bg-zinc-50/50">
        <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
          <div className="space-y-4">
            <div className="h-10 bg-zinc-200/50 rounded-xl w-1/4 animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 bg-zinc-200/50 rounded-2xl animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-50/50">
      <div className="max-w-[1400px] mx-auto p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-zinc-900 tracking-tight mb-2">
                {t('extensions.title')}
              </h1>
              <p className="text-zinc-500 text-sm lg:text-base">
                {t('extensions.subtitle')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-zinc-100/80 text-zinc-600 border-zinc-200/50 px-4 py-2 text-sm font-medium">
                <Package className="w-4 h-4 mr-1.5" />
                {extensions.length} {t('extensions.extensionsCount')}
              </Badge>
              <Badge className="bg-green-500/10 text-green-600 border-green-200/50 px-4 py-2 text-sm font-medium">
                <Star className="w-4 h-4 mr-1.5" />
                {installedExtensions.length} {t('extensions.installedCount')}
              </Badge>
            </div>
          </div>
        </div>

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
              placeholder={t('extensions.searchPlaceholder')}
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-zinc-200/50 rounded-xl text-sm focus:outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-500/10 transition-all duration-200 placeholder:text-zinc-400"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <Filter className="w-4 h-4 text-zinc-400 flex-shrink-0" />
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  selectedCategory === cat.key
                    ? 'bg-zinc-900 text-white shadow-md'
                    : 'bg-white text-zinc-600 hover:bg-zinc-50 border border-zinc-200/50'
                }`}
              >
                {t(cat.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setActiveTab('store')}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === 'store'
                ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-300/50'
                : 'bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200/50'
            }`}
          >
            {t('extensions.store')} ({filteredExtensions.length})
          </button>
          <button
            onClick={() => setActiveTab('installed')}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === 'installed'
                ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-300/50'
                : 'bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200/50'
            }`}
          >
            {t('extensions.installed')} ({installedExtensions.length})
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 glass-panel rounded-xl border-red-200/50 text-red-600">
            {error}
          </div>
        )}

        {/* Extensions Grid */}
        {displayedExtensions.length === 0 ? (
          <div className="bento-tile p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-zinc-100/80 flex items-center justify-center">
              <Package className="w-8 h-8 text-zinc-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">
              {activeTab === 'store' ? t('extensions.noMatch') : t('extensions.noInstalled')}
            </h3>
            <p className="text-zinc-500 mb-6 max-w-md mx-auto text-sm">
              {activeTab === 'store'
                ? t('extensions.tryAdjust')
                : t('extensions.installToEnhance')}
            </p>
            {activeTab === 'installed' && (
              <Button onClick={() => setActiveTab('store')} className="btn-ice px-6">
                {t('extensions.browseStore')}
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {displayedExtensions.map((extension, index) => (
              <div
                key={extension.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <ExtensionCard
                  extension={extension}
                  isInstalled={installedExtensions.some(e => e.id === extension.id)}
                  onInstall={installExtension}
                  onUninstall={uninstallExtension}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Extensions;
