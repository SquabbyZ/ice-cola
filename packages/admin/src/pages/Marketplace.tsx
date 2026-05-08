import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Search, Eye, Archive, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Spinner } from '../components/ui/spinner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Tooltip, TooltipTrigger, TooltipContent } from '../components/ui/tooltip';
import {
  getMarketplaceItems,
  getCategories,
  syncSkillsFromSkillsSh, updateMarketplaceItem,
  type MarketplaceItem,
  type MarketplaceItemType,
  type MarketplaceItemStatus,
} from '../services/marketplaceApi';

const ITEMS_PER_PAGE = 10;

const Marketplace: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<MarketplaceItemType>('skill');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [detailItem, setDetailItem] = useState<MarketplaceItem | null>(null);
  const [archiveItem, setArchiveItem] = useState<MarketplaceItem | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['marketplace-items', activeTab, search, statusFilter, categoryFilter, page],
    queryFn: () =>
      getMarketplaceItems({
        type: activeTab,
        status: statusFilter !== 'all' ? (statusFilter as MarketplaceItemStatus) : undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        search: search || undefined,
        page,
        pageSize: ITEMS_PER_PAGE,
      }),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['marketplace-categories'],
    queryFn: getCategories,
  });

  const items = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, page: 1, limit: ITEMS_PER_PAGE };
  const totalPages = Math.max(1, Math.ceil(meta.total / meta.limit));
  const categories = categoriesData?.data ?? [];

  const handleArchive = async () => {
    if (!archiveItem) return;
    setIsArchiving(true);
    try {
      await updateMarketplaceItem(archiveItem.id, { status: 'archived' });
      setArchiveItem(null);
      refetch();
    } catch (err) {
      console.error('[Marketplace] Archive failed:', err);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncSkillsFromSkillsSh();
      refetch();
    } catch (err) {
      console.error('[Marketplace] Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusBadge = (status: MarketplaceItemStatus) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">{t('marketplace.statusActive')}</Badge>;
      case 'inactive':
        return <Badge variant="warning">{t('marketplace.statusInactive')}</Badge>;
      case 'archived':
        return <Badge variant="secondary">{t('marketplace.statusArchived')}</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">{t('marketplace.title')}</h2>
        <p className="text-gray-600">{t('marketplace.subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('marketplace.listTitle')}</CardTitle>
              <CardDescription>{t('marketplace.listDesc')}</CardDescription>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={handleSync} disabled={isSyncing} variant="outline" size="icon">
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isSyncing ? t('marketplace.syncing') : t(`marketplace.sync${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`)}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as MarketplaceItemType); setPage(1); }}>
            <TabsList>
              <TabsTrigger value="skill">{t('marketplace.tabSkill')}</TabsTrigger>
              <TabsTrigger value="mcp">{t('marketplace.tabMcp')}</TabsTrigger>
              <TabsTrigger value="plugin">{t('marketplace.tabPlugin')}</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('marketplace.searchPlaceholder')}
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder={t('marketplace.filterStatus')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('marketplace.allStatus')}</SelectItem>
                    <SelectItem value="active">{t('marketplace.statusActive')}</SelectItem>
                    <SelectItem value="inactive">{t('marketplace.statusInactive')}</SelectItem>
                    <SelectItem value="archived">{t('marketplace.statusArchived')}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder={t('marketplace.filterCategory')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('marketplace.allCategories')}</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner className="size-6" />
                </div>
              ) : items.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {t('marketplace.noItems')}
                </p>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('marketplace.name')}</TableHead>
                        <TableHead>{t('marketplace.version')}</TableHead>
                        <TableHead>{t('marketplace.author')}</TableHead>
                        <TableHead>{t('marketplace.status')}</TableHead>
                        <TableHead>{t('marketplace.installs')}</TableHead>
                        <TableHead>{t('marketplace.rating')}</TableHead>
                        <TableHead>{t('marketplace.createdAt')}</TableHead>
                        <TableHead className="text-right">{t('marketplace.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item: MarketplaceItem) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>{item.version}</TableCell>
                          <TableCell>{item.author}</TableCell>
                          <TableCell>{getStatusBadge(item.status)}</TableCell>
                          <TableCell>{item.install_count > 0 ? item.install_count.toLocaleString() : '-'}</TableCell>
                          <TableCell>{Number(item.rating).toFixed(1)}</TableCell>
                          <TableCell>
                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                title={t('marketplace.viewDetails')}
                                onClick={() => setDetailItem(item)}
                              >
                                <Eye className="h-4 w-4 text-muted-foreground" />
                              </Button>
                              {item.status !== 'archived' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title={t('marketplace.archive')}
                                  onClick={() => setArchiveItem(item)}
                                >
                                  <Archive className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-sm text-muted-foreground">
                      {t('marketplace.pagination', {
                        from: (meta.page - 1) * meta.limit + 1,
                        to: Math.min(meta.page * meta.limit, meta.total),
                        total: meta.total,
                      })}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm">
                        {page} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detailItem} onOpenChange={(open) => { if (!open) setDetailItem(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('marketplace.detailTitle')}</DialogTitle>
            <DialogDescription>{detailItem?.name}</DialogDescription>
          </DialogHeader>
          {detailItem && (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">{t('marketplace.name')}:</span>
                <span>{detailItem.name}</span>
                <span className="text-muted-foreground">{t('marketplace.version')}:</span>
                <span>{detailItem.version}</span>
                <span className="text-muted-foreground">{t('marketplace.author')}:</span>
                <span>{detailItem.author}</span>
                <span className="text-muted-foreground">{t('marketplace.status')}:</span>
                <span>{getStatusBadge(detailItem.status)}</span>
                <span className="text-muted-foreground">{t('marketplace.installs')}:</span>
                <span>{detailItem.install_count > 0 ? detailItem.install_count.toLocaleString() : '-'}</span>
                <span className="text-muted-foreground">{t('marketplace.rating')}:</span>
                <span>{Number(detailItem.rating).toFixed(1)}</span>
                <span className="text-muted-foreground">{t('marketplace.createdAt')}:</span>
                <span>{detailItem.createdAt ? new Date(detailItem.createdAt).toLocaleString() : '-'}</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t('marketplace.description')}:</p>
                <p className="text-sm">{detailItem.description || '-'}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Archive Confirm Dialog */}
      <Dialog open={!!archiveItem} onOpenChange={(open) => { if (!open) setArchiveItem(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('marketplace.confirmArchiveTitle')}</DialogTitle>
            <DialogDescription>
              {t('marketplace.confirmArchiveDesc', { name: archiveItem?.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveItem(null)}>
              {t('marketplace.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleArchive} disabled={isArchiving}>
              {isArchiving && <Spinner className="mr-2 size-4" />}
              {isArchiving ? t('marketplace.archiving') : t('marketplace.confirmArchive')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Marketplace;
