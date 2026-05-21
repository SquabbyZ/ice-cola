import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Download, Star, Users, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import type { Expert } from '@/stores/expertMarketplaceStore';

interface ExpertMarketplaceCardProps {
  expert: Expert;
  onInstall: (id: string) => void;
  onUninstall: (id: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  coding: '编程',
  writing: '写作',
  analysis: '分析',
  creative: '创意',
  business: '商业',
  education: '教育',
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
        className={i <= Math.round(rating) ? 'text-amber-400' : 'text-zinc-200'}
      >
        <Star className={`w-3 h-3 ${i <= Math.round(rating) ? 'fill-current' : ''}`} />
      </span>
    );
  }
  return stars;
};

export const ExpertMarketplaceCard: React.FC<ExpertMarketplaceCardProps> = ({
  expert,
  onInstall,
  onUninstall,
}) => {
  const { t } = useTranslation();
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

  return (
    <>
      <div className="group relative bg-white rounded-2xl border border-zinc-200/50 overflow-hidden hover:shadow-xl hover:shadow-zinc-300/30 hover:-translate-y-1 transition-all duration-300 ease-out">
        {/* Top gradient accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-zinc-400 via-zinc-500 to-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Installed status badge */}
        {expert.isInstalled && (
          <div className="absolute top-4 right-4 z-10">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-full shadow-md shadow-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {t('experts.installed', '已添加')}
            </div>
          </div>
        )}

        <div className="p-6">
          {/* Header - Icon and Title */}
          <div className="flex items-start gap-4 mb-5">
            <div
              className="relative w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0 shadow-md transition-transform duration-300 group-hover:scale-105"
              style={{
                background: expert.color
                  ? `linear-gradient(135deg, ${expert.color}25 0%, ${expert.color}10 100%)`
                  : 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
              }}
            >
              {expert.icon}
            </div>

            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-zinc-900 text-lg leading-tight line-clamp-1 group-hover:text-zinc-700 transition-colors">
                  {expert.name}
                </h3>
              </div>
              <p className="text-sm text-zinc-500 font-medium">by {expert.author}</p>
            </div>
          </div>

          {/* Category Badge */}
          <div className="mb-3">
            <Badge
              variant="secondary"
              className="bg-zinc-100 text-zinc-700 border border-zinc-200/50 text-xs font-medium"
            >
              {CATEGORY_LABELS[expert.category] || expert.category}
            </Badge>
          </div>

          {/* Description */}
          <div className="mb-5" title={expert.description}>
            <p className="text-sm text-zinc-600 leading-relaxed overflow-hidden text-ellipsis line-clamp-2 h-[2.5rem]">
              {expert.description}
            </p>
          </div>

          {/* Metadata - Rating, Usage, Version */}
          <div className="flex items-center gap-4 mb-5 pb-5 border-b border-zinc-100">
            {/* Rating */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-0.5">{renderStars(expert.rating)}</div>
              <span className="text-sm font-semibold text-zinc-900">{expert.rating}</span>
            </div>

            {/* Usage */}
            <div className="flex items-center gap-1.5 text-zinc-500">
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">{formatUses(expert.uses)}</span>
            </div>

            {/* Version */}
            <div className="ml-auto">
              <Badge
                variant="secondary"
                className="bg-zinc-100 text-zinc-600 hover:bg-zinc-200 font-mono text-xs"
              >
                v{expert.version}
              </Badge>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            {expert.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-3 py-1.5 bg-zinc-50 text-zinc-600 text-xs font-medium rounded-lg border border-zinc-200/50 hover:border-zinc-300 hover:text-zinc-700 transition-all duration-200 cursor-default"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {!expert.isInstalled ? (
              <Button
                size="sm"
                onClick={handleInstall}
                disabled={isInstalling}
                className="flex-1 gap-2 h-10 bg-zinc-700 hover:bg-zinc-800 text-white shadow-md shadow-zinc-700/20 hover:shadow-lg hover:shadow-zinc-700/25 hover:-translate-y-0.5 transition-all duration-200"
              >
                <Download className="w-4 h-4" />
                <span className="font-semibold">
                  {isInstalling ? t('common.loading', '添加中...') : t('experts.install', '添加')}
                </span>
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-2 h-10 font-medium border-zinc-300 hover:border-red-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200"
                onClick={() => onUninstall(expert.id)}
              >
                <X className="w-4 h-4" />
                <span className="font-medium">{t('experts.remove', '移除')}</span>
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              className="h-10 px-3 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
              onClick={() => setShowDetail(true)}
              title={t('experts.viewDetail', '查看详情')}
            >
              <Tag className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm"
                style={{
                  background: expert.color
                    ? `${expert.color}20`
                    : '#f3f4f6',
                }}
              >
                {expert.icon}
              </div>
              <div>
                <DialogTitle className="text-zinc-900">{expert.name}</DialogTitle>
                <DialogDescription className="text-zinc-500">Expert Details</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Category */}
            <div>
              <h4 className="text-sm font-semibold text-zinc-700 mb-2">{t('experts.category', '分类')}</h4>
              <Badge
                variant="secondary"
                className="bg-zinc-100 text-zinc-700 border border-zinc-200"
              >
                {CATEGORY_LABELS[expert.category] || expert.category}
              </Badge>
            </div>

            {/* Description */}
            <div>
              <h4 className="text-sm font-semibold text-zinc-700 mb-2">{t('experts.description', '描述')}</h4>
              <p className="text-sm text-zinc-600 leading-relaxed">
                {expert.description}
              </p>
            </div>

            {/* Statistics */}
            <div>
              <h4 className="text-sm font-semibold text-zinc-700 mb-2">{t('experts.stats', '统计')}</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-50 rounded-lg p-3 border border-zinc-100">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Star className="w-4 h-4 text-amber-500" />
                    <span className="text-xs text-zinc-500">{t('experts.rating', '评分')}</span>
                  </div>
                  <p className="text-lg font-bold text-zinc-900">{expert.rating}</p>
                </div>
                <div className="bg-zinc-50 rounded-lg p-3 border border-zinc-100">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Users className="w-4 h-4 text-blue-500" />
                    <span className="text-xs text-zinc-500">{t('experts.usage', '使用量')}</span>
                  </div>
                  <p className="text-lg font-bold text-zinc-900">{formatUses(expert.uses)}</p>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div>
              <h4 className="text-sm font-semibold text-zinc-700 mb-2">{t('experts.tags', '标签')}</h4>
              <div className="flex flex-wrap gap-2">
                {expert.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1.5 bg-zinc-100 text-zinc-700 text-xs font-medium rounded-lg border border-zinc-200"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Version */}
            <div>
              <h4 className="text-sm font-semibold text-zinc-700 mb-2">{t('experts.version', '版本')}</h4>
              <p className="text-sm text-zinc-600 font-mono">v{expert.version}</p>
            </div>

            {/* Author */}
            <div>
              <h4 className="text-sm font-semibold text-zinc-700 mb-2">{t('experts.author', '作者')}</h4>
              <p className="text-sm text-zinc-600">{expert.author}</p>
            </div>

            {/* Last Update */}
            <div>
              <h4 className="text-sm font-semibold text-zinc-700 mb-2">{t('experts.lastUpdate', '最后更新')}</h4>
              <p className="text-sm text-zinc-600">
                {new Date(expert.updatedAt).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDetail(false)}>
              {t('common.close', '关闭')}
            </Button>
            {!expert.isInstalled ? (
              <Button
                onClick={handleInstall}
                disabled={isInstalling}
                className="bg-zinc-700 hover:bg-zinc-800"
              >
                {isInstalling ? t('common.loading', '添加中...') : t('experts.addExpert', '添加此宗主')}
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={() => {
                  onUninstall(expert.id);
                  setShowDetail(false);
                }}
              >
                {t('experts.removeExpert', '移除')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
