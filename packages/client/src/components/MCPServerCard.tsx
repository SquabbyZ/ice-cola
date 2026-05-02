import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Link2, CheckCircle2, PlugZap, Settings, ExternalLink, X, Unplug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { MCPServer } from '@/stores/mcpStore';

interface MCPServerCardProps {
  server: MCPServer;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
}

export const MCPServerCard: React.FC<MCPServerCardProps> = ({
  server,
  onConnect,
  onDisconnect,
}) => {
  const [showConfig, setShowConfig] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [isConnecting, setIsConnecting] = useState(false);

  // 初始化配置默认值
  React.useEffect(() => {
    if (server.configSchema) {
      const defaults: Record<string, string> = {};
      Object.entries(server.configSchema).forEach(([key, schema]) => {
        defaults[key] = schema.default || '';
      });
      setConfigValues(defaults);
    }
  }, [server.configSchema]);

  const handleConnect = () => {
    if (server.configSchema && Object.keys(server.configSchema).some(key => server.configSchema?.[key]?.required)) {
      setShowConfig(true);
    } else {
      performConnect();
    }
  };

  const performConnect = async () => {
    setIsConnecting(true);
    try {
      await onConnect(server.id);
    } finally {
      setIsConnecting(false);
      setShowConfig(false);
    }
  };

  const handleDisconnect = () => {
    setShowDisconnectConfirm(true);
  };

  const confirmDisconnect = () => {
    onDisconnect(server.id);
  };

  const formatInstalls = (num: number) => {
    if (num >= 10000) {
      return `${(num / 10000).toFixed(1)}万`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={i <= Math.round(rating) ? 'text-yellow-400' : 'text-gray-300'}>
          ★
        </span>
      );
    }
    return stars;
  };

  const categoryLabels: Record<string, string> = {
    data: '数据源',
    tool: '工具',
    communication: '通讯',
    development: '开发',
    productivity: '生产力',
  };

  return (
    <div className="group relative bg-white rounded-2xl border border-gray-200/80 overflow-hidden hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 transition-all duration-300 ease-out">
      {/* 顶部渐变装饰条 */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* 已连接状态徽章 */}
      {server.connected && (
        <div className="absolute top-4 right-4 z-10">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-semibold rounded-full shadow-lg shadow-emerald-500/25">
            <CheckCircle2 className="w-3.5 h-3.5" />
            已连接
          </div>
        </div>
      )}

      <div className="p-6">
        {/* Header - 图标和标题 */}
        <div className="flex items-start gap-4 mb-5">
          <div
            className="relative w-16 h-16 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0 shadow-lg transition-transform duration-300 group-hover:scale-110"
            style={{
              background: server.color
                ? `linear-gradient(135deg, ${server.color}20 0%, ${server.color}10 100%)`
                : 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
              boxShadow: server.color ? `0 8px 16px ${server.color}20` : '0 8px 16px rgba(0,0,0,0.08)',
            }}
          >
            {server.icon}
          </div>

          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-gray-900 text-xl leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                {server.name}
              </h3>
            </div>
            <p className="text-sm text-gray-500 font-medium">by {server.author}</p>
          </div>
        </div>

        {/* 分类标签 */}
        <div className="mb-3">
          <Badge variant="secondary" className="bg-gradient-to-r from-slate-50 to-slate-100 text-slate-600 border border-slate-200/50 text-xs">
            {categoryLabels[server.category] || server.category}
          </Badge>
        </div>

        {/* 描述 */}
        <div className="mb-5" title={server.description}>
          <p className="text-sm text-gray-600 leading-relaxed overflow-hidden text-ellipsis line-clamp-2 h-[2.5rem]">
            {server.description}
          </p>
        </div>

        {/* 元数据 - 评分、安装量、版本 */}
        <div className="flex items-center gap-4 mb-5 pb-5 border-b border-gray-100">
          {/* 评分 */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5">
              {renderStars(server.rating)}
            </div>
            <span className="text-sm font-semibold text-gray-900">{server.rating}</span>
          </div>

          {/* 安装量 */}
          <div className="flex items-center gap-1.5 text-gray-500">
            <Link2 className="w-4 h-4" />
            <span className="text-sm font-medium">{formatInstalls(server.installs)}</span>
          </div>

          {/* 版本 */}
          <div className="ml-auto">
            <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200 font-mono text-xs">
              v{server.version}
            </Badge>
          </div>
        </div>

        {/* 标签 */}
        <div className="flex flex-wrap gap-2 mb-6">
          {server.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-3 py-1.5 bg-gradient-to-br from-gray-50 to-gray-100 text-gray-600 text-xs font-medium rounded-lg border border-gray-200/50 hover:border-primary/30 hover:text-primary transition-all duration-200 cursor-default"
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* 操作按钮区域 */}
        <div className="flex items-center gap-2">
          {!server.connected ? (
            <Button
              size="sm"
              className="flex-1 gap-2 h-10 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-200"
              onClick={handleConnect}
              disabled={isConnecting}
            >
              <PlugZap className="w-4 h-4" />
              <span className="font-semibold">{isConnecting ? '连接中...' : '连接'}</span>
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-2 h-10 font-medium border-gray-300 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all duration-200"
                onClick={handleDisconnect}
              >
                <Unplug className="w-4 h-4" />
                <span className="font-medium">断开</span>
              </Button>

              <Button
                size="icon"
                variant="ghost"
                className="h-10 w-10 text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
                onClick={() => setShowConfig(true)}
                title="配置服务器"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </>
          )}

          {server.homepage && (
            <a
              href={server.homepage}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-10 h-10 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>

        {/* 更新时间 */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 font-medium">
            更新于 {new Date(server.updatedAt).toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>

      {/* 配置对话框 */}
      {showConfig && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            {/* 对话框头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl" style={{ background: server.color ? `${server.color}20` : '#f3f4f6' }}>
                  {server.icon}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{server.name}</h3>
                  <p className="text-xs text-gray-500">服务器配置</p>
                </div>
              </div>
              <button
                onClick={() => setShowConfig(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* 对话框内容 - 可滚动 */}
            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              {/* 描述 */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">描述</h4>
                <p className="text-sm text-gray-600 leading-relaxed">{server.description}</p>
              </div>

              {/* 使用说明 */}
              {server.instructions && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">使用说明</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">{server.instructions}</p>
                </div>
              )}

              {/* 配置字段 */}
              {server.configSchema && Object.keys(server.configSchema).length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">配置参数</h4>
                  <div className="space-y-3">
                    {Object.entries(server.configSchema).map(([key, schema]) => (
                      <div key={key}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {key}
                          {schema.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {schema.type === 'string' ? (
                          schema.description.includes('Token') || schema.description.includes('密码') || schema.description.includes('Password') || schema.description.includes('Key') || schema.description.includes('DSN') ? (
                            <input
                              type="password"
                              value={configValues[key] || ''}
                              onChange={(e) => setConfigValues({ ...configValues, [key]: e.target.value })}
                              placeholder={schema.description}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                            />
                          ) : (
                            <input
                              type="text"
                              value={configValues[key] || ''}
                              onChange={(e) => setConfigValues({ ...configValues, [key]: e.target.value })}
                              placeholder={schema.description}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                            />
                          )
                        ) : (
                          <input
                            type="text"
                            value={configValues[key] || ''}
                            onChange={(e) => setConfigValues({ ...configValues, [key]: e.target.value })}
                            placeholder={schema.description}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                          />
                        )}
                        <p className="text-xs text-gray-500 mt-1">{schema.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 标签 */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">标签</h4>
                <div className="flex flex-wrap gap-2">
                  {server.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {server.homepage && (
                <div>
                  <a
                    href={server.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    访问主页
                  </a>
                </div>
              )}
            </div>

            {/* 对话框底部 */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0 rounded-b-2xl">
              <Button
                variant="outline"
                onClick={() => setShowConfig(false)}
              >
                取消
              </Button>
              <Button
                onClick={performConnect}
                disabled={server.configSchema && Object.keys(server.configSchema).some(key => server.configSchema?.[key]?.required && !configValues[key])}
              >
                {server.connected ? '保存配置' : '连接服务器'}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <ConfirmDialog
        open={showDisconnectConfirm}
        onOpenChange={setShowDisconnectConfirm}
        title="确认断开连接"
        description={`确定要断开 "${server.name}" 的连接吗？`}
        confirmText="断开"
        cancelText="取消"
        onConfirm={confirmDisconnect}
        variant="destructive"
      />
    </div>
  );
};
