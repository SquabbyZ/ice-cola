import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Spinner } from '../components/ui/spinner';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  getSubmissions,
  approveSubmission,
  rejectSubmission,
  type Submission,
} from '../services/marketplaceApi';

const ITEMS_PER_PAGE = 10;

type ApprovalAction = 'approve' | 'reject' | null;

const ApprovalCenter: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [pendingPage, setPendingPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [actionTarget, setActionTarget] = useState<{ submission: Submission; action: ApprovalAction }>({ submission: null as unknown as Submission, action: null });
  const [rejectReason, setRejectReason] = useState('');

  // Pending submissions
  const { data: pendingData, isLoading: isLoadingPending } = useQuery({
    queryKey: ['marketplace-submissions', 'pending', pendingPage],
    queryFn: () =>
      getSubmissions({
        status: 'pending',
        page: pendingPage,
        pageSize: ITEMS_PER_PAGE,
      }),
  });

  // Reviewed submissions (approved + rejected)
  const { data: reviewedData, isLoading: isLoadingReviewed } = useQuery({
    queryKey: ['marketplace-submissions', 'reviewed', historyPage],
    queryFn: async () => {
      const [approved, rejected] = await Promise.all([
        getSubmissions({ status: 'approved', page: historyPage, pageSize: ITEMS_PER_PAGE }),
        getSubmissions({ status: 'rejected', page: historyPage, pageSize: ITEMS_PER_PAGE }),
      ]);
      const merged = [...approved.data, ...rejected.data].sort(
        (a, b) => new Date(b.reviewedAt || b.createdAt).getTime() - new Date(a.reviewedAt || a.createdAt).getTime()
      );
      return {
        data: merged,
        meta: { total: approved.meta.total + rejected.meta.total, page: historyPage, limit: ITEMS_PER_PAGE },
      };
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveSubmission(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-submissions'] });
      setActionTarget({ submission: null as unknown as Submission, action: null });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectSubmission(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-submissions'] });
      setActionTarget({ submission: null as unknown as Submission, action: null });
      setRejectReason('');
    },
  });

  const pendingItems = pendingData?.data ?? [];
  const pendingMeta = pendingData?.meta ?? { total: 0, page: 1, limit: ITEMS_PER_PAGE };
  const pendingTotalPages = Math.max(1, Math.ceil(pendingMeta.total / pendingMeta.limit));

  const reviewedItems = reviewedData?.data ?? [];
  const reviewedMeta = reviewedData?.meta ?? { total: 0, page: 1, limit: ITEMS_PER_PAGE };
  const reviewedTotalPages = Math.max(1, Math.ceil(reviewedMeta.total / reviewedMeta.limit));

  const handleConfirm = () => {
    if (!actionTarget.submission) return;
    if (actionTarget.action === 'approve') {
      approveMutation.mutate(actionTarget.submission.id);
    } else if (actionTarget.action === 'reject') {
      rejectMutation.mutate({ id: actionTarget.submission.id, reason: rejectReason });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="success">{t('approval.statusApproved')}</Badge>;
      case 'rejected':
        return <Badge variant="destructive">{t('approval.statusRejected')}</Badge>;
      default:
        return <Badge variant="warning">{t('approval.statusPending')}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">{t('approval.title')}</h2>
        <p className="text-gray-600">{t('approval.subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('approval.listTitle')}</CardTitle>
          <CardDescription>{t('approval.listDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending">
            <TabsList>
              <TabsTrigger value="pending">{t('approval.tabPending')}</TabsTrigger>
              <TabsTrigger value="reviewed">{t('approval.tabReviewed')}</TabsTrigger>
            </TabsList>

            {/* Pending Tab */}
            <TabsContent value="pending" className="space-y-4">
              {isLoadingPending ? (
                <div className="flex justify-center py-8">
                  <Spinner className="size-6" />
                </div>
              ) : pendingItems.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {t('approval.noPending')}
                </p>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('approval.itemName')}</TableHead>
                        <TableHead>{t('approval.itemType')}</TableHead>
                        <TableHead>{t('approval.submitter')}</TableHead>
                        <TableHead>{t('approval.version')}</TableHead>
                        <TableHead>{t('approval.description')}</TableHead>
                        <TableHead>{t('approval.submittedAt')}</TableHead>
                        <TableHead className="text-right">{t('approval.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingItems.map((sub) => (
                        <TableRow key={sub.id}>
                          <TableCell className="font-medium">{sub.itemName}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{t(`marketplace.type${sub.itemType.charAt(0).toUpperCase() + sub.itemType.slice(1)}`)}</Badge>
                          </TableCell>
                          <TableCell>{sub.submitter}</TableCell>
                          <TableCell>{sub.version}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{sub.description}</TableCell>
                          <TableCell>
                            {new Date(sub.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                title={t('approval.approve')}
                                onClick={() => setActionTarget({ submission: sub, action: 'approve' })}
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title={t('approval.reject')}
                                onClick={() => setActionTarget({ submission: sub, action: 'reject' })}
                              >
                                <XCircle className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="flex items-center justify-between pt-2">
                    <p className="text-sm text-muted-foreground">
                      {t('marketplace.pagination', {
                        from: (pendingMeta.page - 1) * pendingMeta.limit + 1,
                        to: Math.min(pendingMeta.page * pendingMeta.limit, pendingMeta.total),
                        total: pendingMeta.total,
                      })}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pendingPage <= 1}
                        onClick={() => setPendingPage((p) => p - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm">
                        {pendingPage} / {pendingTotalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pendingPage >= pendingTotalPages}
                        onClick={() => setPendingPage((p) => p + 1)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* Reviewed Tab */}
            <TabsContent value="reviewed" className="space-y-4">
              {isLoadingReviewed ? (
                <div className="flex justify-center py-8">
                  <Spinner className="size-6" />
                </div>
              ) : reviewedItems.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {t('approval.noReviewed')}
                </p>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('approval.itemName')}</TableHead>
                        <TableHead>{t('approval.itemType')}</TableHead>
                        <TableHead>{t('approval.submitter')}</TableHead>
                        <TableHead>{t('approval.version')}</TableHead>
                        <TableHead>{t('approval.result')}</TableHead>
                        <TableHead>{t('approval.reviewNote')}</TableHead>
                        <TableHead>{t('approval.reviewer')}</TableHead>
                        <TableHead>{t('approval.reviewedAt')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reviewedItems.map((sub) => (
                        <TableRow key={sub.id}>
                          <TableCell className="font-medium">{sub.itemName}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{t(`marketplace.type${sub.itemType.charAt(0).toUpperCase() + sub.itemType.slice(1)}`)}</Badge>
                          </TableCell>
                          <TableCell>{sub.submitter}</TableCell>
                          <TableCell>{sub.version}</TableCell>
                          <TableCell>{getStatusBadge(sub.status)}</TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {sub.reviewNote || '-'}
                          </TableCell>
                          <TableCell>{sub.reviewer || '-'}</TableCell>
                          <TableCell>
                            {sub.reviewedAt
                              ? new Date(sub.reviewedAt).toLocaleDateString()
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="flex items-center justify-between pt-2">
                    <p className="text-sm text-muted-foreground">
                      {t('marketplace.pagination', {
                        from: (reviewedMeta.page - 1) * reviewedMeta.limit + 1,
                        to: Math.min(reviewedMeta.page * reviewedMeta.limit, reviewedMeta.total),
                        total: reviewedMeta.total,
                      })}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={historyPage <= 1}
                        onClick={() => setHistoryPage((p) => p - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm">
                        {historyPage} / {reviewedTotalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={historyPage >= reviewedTotalPages}
                        onClick={() => setHistoryPage((p) => p + 1)}
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

      {/* Approve Confirm Dialog */}
      <Dialog
        open={actionTarget.action === 'approve'}
        onOpenChange={(open) => {
          if (!open) setActionTarget({ submission: null as unknown as Submission, action: null });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('approval.confirmApproveTitle')}</DialogTitle>
            <DialogDescription>
              {t('approval.confirmApproveDesc', { name: actionTarget.submission?.itemName })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionTarget({ submission: null as unknown as Submission, action: null })}
            >
              {t('approval.cancel')}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending && <Spinner className="mr-2 size-4" />}
              {approveMutation.isPending ? t('approval.approving') : t('approval.confirmApprove')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog
        open={actionTarget.action === 'reject'}
        onOpenChange={(open) => {
          if (!open) {
            setActionTarget({ submission: null as unknown as Submission, action: null });
            setRejectReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('approval.confirmRejectTitle')}</DialogTitle>
            <DialogDescription>
              {t('approval.confirmRejectDesc', { name: actionTarget.submission?.itemName })}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder={t('approval.rejectReasonPlaceholder')}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActionTarget({ submission: null as unknown as Submission, action: null });
                setRejectReason('');
              }}
            >
              {t('approval.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={rejectMutation.isPending || !rejectReason.trim()}
            >
              {rejectMutation.isPending && <Spinner className="mr-2 size-4" />}
              {rejectMutation.isPending ? t('approval.rejecting') : t('approval.confirmReject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApprovalCenter;
