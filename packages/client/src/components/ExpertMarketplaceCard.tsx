import React, { useState } from 'react';
import { CheckCircle2, Download, Star, Users, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Expert } from '@/stores/expertMarketplaceStore';

interface ExpertMarketplaceCardProps {
  expert: Expert;
  onInstall: (id: string) => void;
  onUninstall: (id: string) => void;
}

const categoryLabels: Record<string, string> = {
  coding: '编程',
  writing: '写作',
  analysis: '分析',
  creative: '创意',
  business: '商业',
  education: '教育',
};

export const ExpertMarketplaceCard: React.FC<ExpertMarketplaceCardProps> = ({
  expert,
  onInstall,
  onUninstall,
}) => {
  const [showDetail, setShowDetail] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      await onInstall(expert.id);
    } finally {
      setIsInstalling(false);
    }
  };

  const formatUses = (num: number) => {
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
        <span
          key={i}
          className={i <= Math.round(rating) ? 'text-yellow-400' : 'text-gray-300'}
        >
          ★
        </span>
      );
    }
    return stars;
  };

  return (
    <>
      <div className="group relative bg-white rounded-2xl border border-gray-200/80 overflow-hidden hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 transition-all duration-300 ease-out">
        {/* 顶部渐变装饰条 */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* 已安装状态徽章 */}
        {expert.isInstalled && (
          <div className="absolute top-4 right-4 z-10">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-semibold rounded-full shadow-lg shadow-emerald-500/25">
              <CheckCircle2 className="w-3.5 h-3.5" />
              已添加
            </div>
          </div>
        )}

        <div className="p-6">
          {/* Header - 图标和标题 */}
          <div className="flex items-start gap-4 mb-5">
            <div
              className="relative w-16 h-16 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0 shadow-lg transition-transform duration-300 group-hover:scale-110"
              style={{
                background: expert.color
                  ? `linear-gradient(135deg, ${expert.color}20 0%, ${expert.color}10 100%)`
                  : 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                boxShadow: expert.color ? `0 8px 16px ${expert.color}20` : '0 8px 16px rgba(251, 191, 36, 0.2)',
              }}
            >
              {expert.icon}
            </div>

            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-gray-900 text-xl leading-tight line-clamp-1 group-hover:text-indigo-600 transition-colors">
                  {expert.name}
                </h3>
              </div>
              <p className="text-sm text-gray-500 font-medium">by {expert.author}</p>
            </div>
          </div>

          {/* 分类标签 */}
          <div className="mb-3">
            <Badge
              variant="secondary"
              className="bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-700 border border-indigo-200/50 text-xs"
            >
              {categoryLabels[expert.category] || expert.category}
            </Badge>
          </div>

          {/* 描述 */}
          <div className="mb-5" title={expert.description}>
            <p className="text-sm text-gray-600 leading-relaxed overflow-hidden text-ellipsis line-clamp-2 h-[2.5rem]">
              {expert.description}
            </p>
          </div>

          {/* 元数据 - 评分、使用量、版本 */}
          <div className="flex items-center gap-4 mb-5 pb-5 border-b border-gray-100">
            {/* 评分 */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-0.5">{renderStars(expert.rating)}</div>
              <span className="text-sm font-semibold text-gray-900">{expert.rating}</span>
            </div>

            {/* 使用量 */}
            <div className="flex items-center gap-1.5 text-gray-500">
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">{formatUses(expert.uses)}</span>
            </div>

            {/* 版本 */}
            <div className="ml-auto">
              <Badge
                variant="secondary"
                className="bg-gray-100 text-gray-700 hover:bg-gray-200 font-mono text-xs"
              >
                v{expert.version}
              </Badge>
            </div>
          </div>

          {/* 标签 */}
          <div className="flex flex-wrap gap-2 mb-6">
            {expert.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-3 py-1.5 bg-gradient-to-br from-gray-50 to-gray-100 text-gray-600 text-xs font-medium rounded-lg border border-gray-200/50 hover:border-indigo-300 hover:text-indigo-600 transition-all duration-200 cursor-default"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* 操作按钮区域 */}
          <div className="flex items-center gap-2">
            {!expert.isInstalled ? (
              <Button
                size="sm"
                className="flex-1 gap-2 h-10 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all duration-200"
                onClick={handleInstall}
                disabled={isInstalling}
              >
                <Download className="w-4 h-4" />
                <span className="font-semibold">
                  {isInstalling ? '添加中...' : '添加'}
                </span>
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-2 h-10 font-medium border-gray-300 hover:border-red-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200"
                onClick={() => onUninstall(expert.id)}
              >
                <X className="w-4 h-4" />
                <span className="font-medium">移除</span>
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              className="h-10 px-3 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              onClick={() => setShowDetail(true)}
              title="查看详情"
            >
              <Tag className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 详情对话框 */}
      {showDetail && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            {/* 对话框头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-violet-50 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{
                    background: expert.color
                      ? `${expert.color}20`
                      : '#fef3c7',
                  }}
                >
                  {expert.icon}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{expert.name}</h3>
                  <p className="text-xs text-gray-500">专家详情</p>
                </div>
              </div>
              <button
                onClick={() => setShowDetail(false)}
                className="p-2 rounded-lg hover:bg-white/50 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* 对话框内容 - 可滚动 */}
            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              {/* 分类 */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">分类</h4>
                <Badge
                  variant="secondary"
                  className="bg-indigo-50 text-indigo-700 border border-indigo-200"
                >
                  {categoryLabels[expert.category] || expert.category}
                </Badge>
              </div>

              {/* 描述 */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">描述</h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {expert.description}
                </p>
              </div>

              {/* 统计信息 */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">统计</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="text-xs text-gray-500">评分</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">{expert.rating}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Users className="w-4 h-4 text-blue-500" />
                      <span className="text-xs text-gray-500">使用量</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">{formatUses(expert.uses)}</p>
                  </div>
                </div>
              </div>

              {/* 标签 */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">标签</h4>
                <div className="flex flex-wrap gap-2">
                  {expert.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-lg border border-indigo-200"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* 版本信息 */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">版本</h4>
                <p className="text-sm text-gray-600 font-mono">v{expert.version}</p>
              </div>

              {/* 作者 */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">作者</h4>
                <p className="text-sm text-gray-600">{expert.author}</p>
              </div>

              {/* 更新时间 */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">最后更新</h4>
                <p className="text-sm text-gray-600">
                  {new Date(expert.updatedAt).toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {/* 对话框底部 */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0 rounded-b-2xl">
              <Button variant="outline" onClick={() => setShowDetail(false)}>
                关闭
              </Button>
              {!expert.isInstalled ? (
                <Button
                  onClick={handleInstall}
                  disabled={isInstalling}
                  className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600"
                >
                  {isInstalling ? '添加中...' : '添加此专家'}
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  onClick={() => {
                    onUninstall(expert.id);
                    setShowDetail(false);
                  }}
                >
                  移除
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
