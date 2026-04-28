import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Download, CheckCircle2, Power, Settings, ExternalLink, Download as DownloadIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { Extension } from '@/stores/extensions';

interface ExtensionCardProps {
  extension: Extension;
  onInstall: (id: string) => void;
  onUninstall: (id: string) => void;
  onEnable: (id: string) => void;
  onDisable: (id: string) => void;
}

export const ExtensionCard: React.FC<ExtensionCardProps> = ({
  extension,
  onInstall,
  onUninstall,
  onEnable,
  onDisable,
}) => {
  const [showConfig, setShowConfig] = useState(false);
  const [showUninstallConfirm, setShowUninstallConfirm] = useState(false);

  const handleUninstall = () => {
    setShowUninstallConfirm(true);
  };

  const confirmUninstall = () => {
    onUninstall(extension.id);
  };

  const handleConfig = () => {
    setShowConfig(true);
  };
  const formatDownloads = (num: number) => {
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
        <span key={i} className={i <= rating ? 'text-yellow-400' : 'text-gray-300'}>
          ★
        </span>
      );
    }
    return stars;
  };

  return (
    <div className="group relative bg-white rounded-2xl border border-gray-200/80 overflow-hidden hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 transition-all duration-300 ease-out">
      {/* 顶部渐变装饰条 */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* 已安装状态徽章 */}
      {extension.installed && (
        <div className="absolute top-4 right-4 z-10">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-semibold rounded-full shadow-lg shadow-emerald-500/25">
            <CheckCircle2 className="w-3.5 h-3.5" />
            已安装
          </div>
        </div>
      )}

      <div className="p-6">
        {/* Header - 图标和标题 */}
        <div className="flex items-start gap-4 mb-5">
          <div
            className="relative w-16 h-16 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0 shadow-lg transition-transform duration-300 group-hover:scale-110"
            style={{ 
              background: extension.color 
                ? `linear-gradient(135deg, ${extension.color}20 0%, ${extension.color}10 100%)`
                : 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
              boxShadow: extension.color ? `0 8px 16px ${extension.color}20` : '0 8px 16px rgba(0,0,0,0.08)'
            }}
          >
            {extension.icon}
          </div>
          
          <div className="flex-1 min-w-0 pt-1">
            <h3 className="font-bold text-gray-900 text-xl leading-tight mb-1.5 line-clamp-1 group-hover:text-primary transition-colors">
              {extension.name}
            </h3>
            <p className="text-sm text-gray-500 font-medium">by {extension.author}</p>
          </div>
        </div>

        {/* 描述 */}
        <div className="mb-5" title={extension.description}>
          <p className="text-sm text-gray-600 leading-relaxed overflow-hidden text-ellipsis line-clamp-2 h-[2.5rem]">
            {extension.description}
          </p>
        </div>

        {/* 元数据 - 评分、下载量、版本 */}
        <div className="flex items-center gap-4 mb-5 pb-5 border-b border-gray-100">
          {/* 评分 */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5">
              {renderStars(extension.rating)}
            </div>
            <span className="text-sm font-semibold text-gray-900">{extension.rating}</span>
          </div>
          
          {/* 下载量 */}
          <div className="flex items-center gap-1.5 text-gray-500">
            <DownloadIcon className="w-4 h-4" />
            <span className="text-sm font-medium">{formatDownloads(extension.downloads)}</span>
          </div>
          
          {/* 版本 */}
          <div className="ml-auto">
            <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200 font-mono text-xs">
              v{extension.version}
            </Badge>
          </div>
        </div>

        {/* 标签 */}
        <div className="flex flex-wrap gap-2 mb-6">
          {extension.tags.slice(0, 3).map((tag) => (
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
          {!extension.installed ? (
            <Button
              size="sm"
              className="flex-1 gap-2 h-10 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-200"
              onClick={() => onInstall(extension.id)}
            >
              <Download className="w-4 h-4" />
              <span className="font-semibold">安装扩展</span>
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant={extension.enabled ? "outline" : "secondary"}
                className={`flex-1 gap-2 h-10 font-medium transition-all duration-200 ${
                  extension.enabled 
                    ? 'border-gray-300 hover:border-primary hover:text-primary hover:bg-primary/5' 
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
                onClick={() => extension.enabled ? onDisable(extension.id) : onEnable(extension.id)}
              >
                <Power className="w-4 h-4" />
                <span className="font-medium">{extension.enabled ? '禁用' : '启用'}</span>
              </Button>
              
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-10 w-10 text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
                onClick={handleConfig}
                title="配置扩展"
              >
                <Settings className="w-4 h-4" />
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                className="h-10 px-3 text-red-600 hover:text-red-700 hover:bg-red-50 font-medium transition-all duration-200"
                onClick={handleUninstall}
              >
                卸载
              </Button>
            </>
          )}
          
          {extension.homepage && (
            <a
              href={extension.homepage}
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
            更新于 {new Date(extension.updatedAt).toLocaleDateString('zh-CN', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
      </div>

      {/* 配置对话框 - 使用 Portal 渲染到 body */}
      {showConfig && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            {/* 对话框头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl" style={{ background: extension.color ? `${extension.color}20` : '#f3f4f6' }}>
                  {extension.icon}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{extension.name}</h3>
                  <p className="text-xs text-gray-500">扩展配置</p>
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
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">基本信息</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-1.5 border-b border-gray-100">
                    <span className="text-gray-500">版本</span>
                    <span className="font-mono text-gray-900">v{extension.version}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-gray-100">
                    <span className="text-gray-500">作者</span>
                    <span className="text-gray-900">{extension.author}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-gray-100">
                    <span className="text-gray-500">状态</span>
                    <span className={`font-medium ${extension.enabled ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {extension.enabled ? '已启用' : '已禁用'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">描述</h4>
                <p className="text-sm text-gray-600 leading-relaxed">{extension.description}</p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">标签</h4>
                <div className="flex flex-wrap gap-2">
                  {extension.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {extension.homepage && (
                <div>
                  <a
                    href={extension.homepage}
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
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end flex-shrink-0 rounded-b-2xl">
              <Button
                onClick={() => setShowConfig(false)}
                className="px-6"
              >
                关闭
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
      <ConfirmDialog
        open={showUninstallConfirm}
        onOpenChange={setShowUninstallConfirm}
        title="确认卸载"
        description={`确定要卸载 "${extension.name}" 吗？\n\n此操作将移除该扩展及其所有配置数据。`}
        confirmText="卸载"
        cancelText="取消"
        onConfirm={confirmUninstall}
        variant="destructive"
      />
    </div>
  );
};
