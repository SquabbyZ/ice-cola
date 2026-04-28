import React, { useEffect, useState } from 'react';
import { Search, Package, Filter, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useExtensionStore } from '@/stores/extensions';
import { ExtensionCard } from '@/components/ExtensionCard';

const CATEGORIES = ['全部', '开发工具', '生产力', '通讯', '工具', '文档'];

const Extensions: React.FC = () => {
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
    enableExtension,
    disableExtension,
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
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-2">扩展商店</h1>
              <p className="text-gray-600 text-base lg:text-lg">安装扩展插件，增强你的工作台功能</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-blue-200 px-4 py-2 text-sm font-medium">
                <Package className="w-4 h-4 mr-1.5" />
                {extensions.length} 个扩展
              </Badge>
              <Badge variant="secondary" className="bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 border-emerald-200 px-4 py-2 text-sm font-medium">
                <Star className="w-4 h-4 mr-1.5" />
                {installedExtensions.length} 已安装
              </Badge>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="mb-8 space-y-4">
          {/* Search Bar */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索扩展名称、描述或标签..."
              className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-200 placeholder:text-gray-400"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap border-2 ${
                  selectedCategory === category
                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/25 scale-105'
                    : 'bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 border-gray-200 hover:scale-105'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mb-8 bg-gray-100/50 p-1.5 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('store')}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === 'store'
                ? 'bg-white text-primary shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            扩展商店 ({filteredExtensions.length})
          </button>
          <button
            onClick={() => setActiveTab('installed')}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === 'installed'
                ? 'bg-white text-primary shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            已安装 ({installedExtensions.length})
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Extensions Grid - 响应式布局 */}
        {displayedExtensions.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center shadow-inner">
              <Package className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              {activeTab === 'store' ? '未找到匹配的扩展' : '暂无已安装的扩展'}
            </h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              {activeTab === 'store'
                ? '尝试调整搜索条件或浏览其他分类'
                : '从扩展商店安装插件来增强功能'}
            </p>
            {activeTab === 'installed' && (
              <Button onClick={() => setActiveTab('store')} size="lg" className="px-8">
                浏览扩展商店
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
            {displayedExtensions.map((extension) => (
              <ExtensionCard
                key={extension.id}
                extension={extension}
                onInstall={installExtension}
                onUninstall={uninstallExtension}
                onEnable={enableExtension}
                onDisable={disableExtension}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Extensions;
