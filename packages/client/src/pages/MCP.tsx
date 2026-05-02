import React, { useEffect, useState } from 'react';
import { Search, Network, Plug, Filter, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MCPServerCard } from '@/components/MCPServerCard';
import { useMCPStore, CATEGORIES } from '@/stores/mcpStore';

const MCP: React.FC = () => {
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
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-80 bg-gray-200 rounded-lg"></div>
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
              <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-2">
                MCP 市场
              </h1>
              <p className="text-gray-600 text-base lg:text-lg">发现并连接 Model Context Protocol 服务，扩展 AI 助手能力</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-blue-200 px-4 py-2 text-sm font-medium">
                <Network className="w-4 h-4 mr-1.5" />
                {servers.length} 个服务
              </Badge>
              <Badge variant="secondary" className="bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 border-emerald-200 px-4 py-2 text-sm font-medium">
                <Plug className="w-4 h-4 mr-1.5" />
                {connectedServers.length} 已连接
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
              placeholder="搜索 MCP 服务名称、描述或标签..."
              className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-200 placeholder:text-gray-400"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
            {CATEGORIES.map((category) => (
              <button
                key={category.value}
                onClick={() => setSelectedCategory(category.value)}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap border-2 ${
                  selectedCategory === category.value
                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/25 scale-105'
                    : 'bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 border-gray-200 hover:scale-105'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mb-8 bg-gray-100/50 p-1.5 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('marketplace')}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === 'marketplace'
                ? 'bg-white text-primary shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            服务市场 ({filteredServers.length})
          </button>
          <button
            onClick={() => setActiveTab('connected')}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === 'connected'
                ? 'bg-white text-primary shadow-md'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            已连接 ({connectedServers.length})
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Refresh Button */}
        <div className="flex justify-end mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              loadServers();
              loadConnectedServers();
            }}
            className="gap-2 text-gray-500 hover:text-gray-700"
          >
            <RefreshCw className="w-4 h-4" />
            刷新
          </Button>
        </div>

        {/* Servers Grid - 响应式布局 */}
        {displayedServers.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center shadow-inner">
              <Network className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              {activeTab === 'marketplace' ? '未找到匹配的 MCP 服务' : '暂无已连接的 MCP 服务'}
            </h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              {activeTab === 'marketplace'
                ? '尝试调整搜索条件或浏览其他分类'
                : '从服务市场连接 MCP 服务来扩展功能'}
            </p>
            {activeTab === 'connected' && (
              <Button onClick={() => setActiveTab('marketplace')} size="lg" className="px-8">
                浏览 MCP 市场
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
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
