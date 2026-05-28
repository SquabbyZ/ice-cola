import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Download, X, Send } from 'lucide-react';
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
  onPublishMarketplace?: (expert: Expert) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
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
  onPublishMarketplace,
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
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-zinc-400 via-zinc-500 to-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {expert.isInstalled && (
          <div className="absolute top-4 right-4 z-10">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-full shadow-md shadow-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {t('experts.installed', '已添加')}
            </div>
          </div>
        )}

        <div className="p-6">
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
              <h3 className="font-bold text-zinc-900 text-lg leading-tight line-clamp-1 group-hover:text-zinc-700 transition-colors">
                {expert.name}
              </h3>
              {expert.category && (
                <Badge
                  variant="secondary"
                  className="mt-1 bg-zinc-100 text-zinc-700 border border-zinc-200/50 text-xs font-medium"
                >
                  {CATEGORY_LABELS[expert.category] || expert.category}
                </Badge>
              )}
            </div>
          </div>

          {expert.description && (
            <div className="mb-5" title={expert.description}>
              <p className="text-sm text-zinc-600 leading-relaxed overflow-hidden text-ellipsis line-clamp-2 h-[2.5rem]">
                {expert.description}
              </p>
            </div>
          )}

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
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-2 h-10 font-medium border-zinc-300 hover:border-red-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200"
                  onClick={() => onUninstall(expert.id)}
                >
                  <X className="w-4 h-4" />
                  <span className="font-medium">{t('experts.remove', '移除')}</span>
                </Button>

                {onPublishMarketplace && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-10 w-10 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    onClick={() => onPublishMarketplace(expert)}
                    title="发布到市场"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                )}
              </>
            )}

            <Button
              size="sm"
              variant="ghost"
              className="h-10 px-3 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
              onClick={() => setShowDetail(true)}
              title={t('experts.viewDetail', '查看详情')}
            >
              {t('common.details', '详情')}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm"
                style={{
                  background: expert.color ? `${expert.color}20` : '#f3f4f6',
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
            {expert.category && (
              <div>
                <h4 className="text-sm font-semibold text-zinc-700 mb-2">{t('experts.category', '分类')}</h4>
                <Badge variant="secondary" className="bg-zinc-100 text-zinc-700 border border-zinc-200">
                  {CATEGORY_LABELS[expert.category] || expert.category}
                </Badge>
              </div>
            )}

            {expert.description && (
              <div>
                <h4 className="text-sm font-semibold text-zinc-700 mb-2">{t('experts.description', '描述')}</h4>
                <p className="text-sm text-zinc-600 leading-relaxed">{expert.description}</p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDetail(false)}>
              {t('common.close', '关闭')}
            </Button>
            {!expert.isInstalled ? (
              <Button onClick={handleInstall} disabled={isInstalling} className="bg-zinc-700 hover:bg-zinc-800">
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
