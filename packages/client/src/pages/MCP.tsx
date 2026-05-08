import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Network, Plug, Filter, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MCPServerCard } from '@/components/MCPServerCard';
import { useMCPStore, CATEGORIES } from '@/stores/mcpStore';

const MCP: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'marketplace' | 'connected'>('marketplace');
  const {
    servers,
    connectedServers,
    searchQuery,
    selectedCategory,
    isLoading,
    error,
    loadServers,
    loadConnectedServers,
    connectServer,
    disconnectServer,
    setSearchQuery,
    setSelectedCategory,
    getFilteredServers,
  } = useMCPStore();

  useEffect(() => {
    loadServers();
    loadConnectedServers();
  }, [loadServers, loadConnectedServers]);

  const filteredServers = getFilteredServers();
  const displayedServers = activeTab === 'marketplace' ? filteredServers : connectedServers;

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto bg-zinc-50/50">
        <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
          <div className="space-y-4">
            <div className="h-10 bg-zinc-200/50 rounded-xl w-1/4 animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-80 bg-zinc-200/50 rounded-3xl animate-pulse" />
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
                {t('mcp.title')}
              </h1>
              <p className="text-zinc-500 text-sm lg:text-base">
                {t('mcp.subtitle')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-zinc-100/80 text-zinc-600 border-zinc-200/50 px-4 py-2">
                <Network className="w-4 h-4 mr-1.5" />
                {servers.length} {t('mcp.serversCount')}
              </Badge>
              <Badge className="bg-green-500/10 text-green-600 border-green-200/50 px-4 py-2">
                <Plug className="w-4 h-4 mr-1.5" />
                {connectedServers.length} {t('mcp.connectedCount')}
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
              placeholder={t('mcp.searchPlaceholder')}
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-zinc-200/50 rounded-xl text-sm focus:outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-500/10 transition-all duration-200 placeholder:text-zinc-400"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <Filter className="w-4 h-4 text-zinc-400 flex-shrink-0" />
            {CATEGORIES.map((category) => (
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

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('marketplace')}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'marketplace'
                ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-300/50'
                : 'bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200/50'
            }`}
          >
            {t('mcp.marketplace')} ({filteredServers.length})
          </button>
          <button
            onClick={() => setActiveTab('connected')}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'connected'
                ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-300/50'
                : 'bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200/50'
            }`}
          >
            {t('mcp.connected')} ({connectedServers.length})
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 glass-panel rounded-xl border-red-200/50 text-red-600">
            {error}
          </div>
        )}

        {/* Refresh Button */}
        <div className="flex justify-end mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              loadServers();
              loadConnectedServers();
            }}
            className="gap-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl"
          >
            <RefreshCw className="w-4 h-4" />
            {t('common.refresh')}
          </Button>
        </div>

        {/* Servers Grid */}
        {displayedServers.length === 0 ? (
          <div className="bento-tile p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-zinc-100/80 flex items-center justify-center">
              <Network className="w-8 h-8 text-zinc-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">
              {activeTab === 'marketplace' ? t('mcp.noMatch') : t('mcp.noConnected')}
            </h3>
            <p className="text-zinc-500 mb-6 max-w-md mx-auto text-sm">
              {activeTab === 'marketplace'
                ? t('mcp.tryAdjust')
                : t('mcp.connectToEnhance')}
            </p>
            {activeTab === 'connected' && (
              <Button onClick={() => setActiveTab('marketplace')} className="btn-ice px-6">
                {t('mcp.browseMarketplace')}
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {displayedServers.map((server) => (
              <MCPServerCard
                key={server.id}
                server={server}
                onConnect={connectServer}
                onDisconnect={disconnectServer}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MCP;
