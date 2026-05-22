import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AlertCircle, Ban, ChevronLeft, ChevronRight, Copy, Eye, Plus, RefreshCw } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { DateTimePicker } from '../components/ui/date-time-picker';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Spinner } from '../components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Textarea } from '../components/ui/textarea';
import {
  AdminRedemptionCode,
  AdminRedemptionCodeStatus,
  AdminRedemptionCodeType,
  CreatedAdminRedemptionCode,
} from '../services/redemptionCodesApi';
import {
  useAdminRedemptionCodes,
  useCreateAdminRedemptionCode,
  useDisableAdminRedemptionCode,
} from '../hooks/useRedemptionCodes';

const ITEMS_PER_PAGE = 10;

interface CreateFormState {
  type: AdminRedemptionCodeType;
  lingqiAmount: string;
  planId: string;
  expiresAt: string;
  note: string;
}

const initialCreateForm: CreateFormState = {
  type: 'lingqi_only',
  lingqiAmount: '1000',
  planId: '',
  expiresAt: '',
  note: '',
};

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleString() : '-';
}

function statusBadge(status: AdminRedemptionCodeStatus, label: string) {
  switch (status) {
    case 'active':
      return <Badge variant="success">{label}</Badge>;
    case 'redeemed':
      return <Badge variant="info">{label}</Badge>;
    case 'expired':
      return <Badge variant="warning">{label}</Badge>;
    case 'disabled':
      return <Badge variant="secondary">{label}</Badge>;
  }
}

export default function RedemptionCodes() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<AdminRedemptionCodeStatus | 'all'>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>(initialCreateForm);
  const [createdCode, setCreatedCode] = useState<CreatedAdminRedemptionCode | null>(null);
  const [disableTarget, setDisableTarget] = useState<AdminRedemptionCode | null>(null);
  const [disableReason, setDisableReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [disableError, setDisableError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const query = {
    status: status === 'all' ? undefined : status,
    limit: ITEMS_PER_PAGE,
    offset: (page - 1) * ITEMS_PER_PAGE,
  };
  const { data, isError, isLoading, refetch } = useAdminRedemptionCodes(query);
  const createMutation = useCreateAdminRedemptionCode();
  const disableMutation = useDisableAdminRedemptionCode();

  const codes = data?.items ?? [];
  const total = data?.total ?? 0;
  const limit = data?.limit ?? ITEMS_PER_PAGE;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const statusLabels: Record<AdminRedemptionCodeStatus, string> = {
    active: t('redemptionCodes.status.active'),
    redeemed: t('redemptionCodes.status.redeemed'),
    expired: t('redemptionCodes.status.expired'),
    disabled: t('redemptionCodes.status.disabled'),
  };
  const typeLabels: Record<AdminRedemptionCodeType, string> = {
    lingqi_only: t('redemptionCodes.type.lingqiOnly'),
    plan_with_lingqi: t('redemptionCodes.type.planWithLingqi'),
  };

  const updateCreateForm = (patch: Partial<CreateFormState>) => {
    setCreateForm((current) => ({ ...current, ...patch }));
  };

  const handleCreate = () => {
    const lingqiAmount = Number(createForm.lingqiAmount);
    setFormError(null);

    if (!Number.isInteger(lingqiAmount) || lingqiAmount <= 0) {
      setFormError(t('redemptionCodes.validation.lingqiPositiveInteger'));
      return;
    }

    if (createForm.type === 'plan_with_lingqi' && !createForm.planId.trim()) {
      setFormError(t('redemptionCodes.validation.planRequired'));
      return;
    }

    const expiresAt = createForm.expiresAt ? new Date(createForm.expiresAt) : null;

    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      setFormError(t('redemptionCodes.validation.invalidExpiresAt'));
      return;
    }

    createMutation.mutate(
      {
        type: createForm.type,
        lingqiAmount,
        planId: createForm.type === 'plan_with_lingqi' ? createForm.planId.trim() : undefined,
        expiresAt: expiresAt ? expiresAt.toISOString() : undefined,
        note: createForm.note.trim() || undefined,
      },
      {
        onSuccess: (code) => {
          setCreateOpen(false);
          setCreateForm(initialCreateForm);
          setFormError(null);
          setCreatedCode(code);
        },
        onError: () => {
          setFormError(t('redemptionCodes.errors.createFailed'));
        },
      },
    );
  };

  const handleCopyCreatedCode = async () => {
    if (!createdCode) return;

    try {
      setCopyError(null);
      await navigator.clipboard.writeText(createdCode.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(t('redemptionCodes.errors.copyFailed'));
    }
  };

  const clearCreatedCode = () => {
    setCreatedCode(null);
    setCopied(false);
    setCopyError(null);
    createMutation.reset();
  };

  const openDisableDialog = (code: AdminRedemptionCode) => {
    setDisableReason('');
    setDisableError(null);
    setDisableTarget(code);
  };

  const closeDisableDialog = () => {
    setDisableTarget(null);
    setDisableReason('');
    setDisableError(null);
  };

  const handleDisable = () => {
    if (!disableTarget) return;
    setDisableError(null);
    disableMutation.mutate(
      { id: disableTarget.id, reason: disableReason.trim() || undefined },
      {
        onSuccess: () => {
          setDisableTarget(null);
          setDisableReason('');
          setDisableError(null);
        },
        onError: () => {
          setDisableError(t('redemptionCodes.errors.disableFailed'));
        },
      },
    );
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{t('redemptionCodes.title')}</h2>
          <p className="text-gray-600">{t('redemptionCodes.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('redemptionCodes.refresh')}
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('redemptionCodes.create')}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>{t('redemptionCodes.recordsTitle')}</CardTitle>
              <CardDescription>{t('redemptionCodes.recordsDescription')}</CardDescription>
            </div>
            <Select value={status} onValueChange={(value) => { setStatus(value as AdminRedemptionCodeStatus | 'all'); setPage(1); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t('redemptionCodes.statusPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('redemptionCodes.allStatuses')}</SelectItem>
                <SelectItem value="active">{statusLabels.active}</SelectItem>
                <SelectItem value="redeemed">{statusLabels.redeemed}</SelectItem>
                <SelectItem value="expired">{statusLabels.expired}</SelectItem>
                <SelectItem value="disabled">{statusLabels.disabled}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner className="size-6" />
            </div>
          ) : isError ? (
            <div className="flex items-start justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
              <span>{t('redemptionCodes.errors.loadFailed')}</span>
              <Button variant="outline" size="sm" onClick={() => refetch()}>{t('redemptionCodes.refresh')}</Button>
            </div>
          ) : codes.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">{t('redemptionCodes.empty')}</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('redemptionCodes.table.preview')}</TableHead>
                    <TableHead>{t('redemptionCodes.table.type')}</TableHead>
                    <TableHead>{t('redemptionCodes.table.lingqi')}</TableHead>
                    <TableHead>{t('redemptionCodes.table.status')}</TableHead>
                    <TableHead>{t('redemptionCodes.table.redeemedTeam')}</TableHead>
                    <TableHead>{t('redemptionCodes.table.expiresAt')}</TableHead>
                    <TableHead>{t('redemptionCodes.table.createdAt')}</TableHead>
                    <TableHead className="text-right">{t('redemptionCodes.table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codes.map((code) => (
                    <TableRow key={code.id}>
                      <TableCell className="font-mono font-medium">{code.codePreview}</TableCell>
                      <TableCell>{typeLabels[code.type]}</TableCell>
                      <TableCell>{code.lingqiAmount.toLocaleString()}</TableCell>
                      <TableCell>{statusBadge(code.status, statusLabels[code.status])}</TableCell>
                      <TableCell className="max-w-[160px] truncate">{code.redeemedTeamId ?? '-'}</TableCell>
                      <TableCell>{formatDate(code.expiresAt)}</TableCell>
                      <TableCell>{formatDate(code.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" asChild title={t('redemptionCodes.viewDetails')}>
                            <Link to={`/redemption-codes/${code.id}`}>
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            </Link>
                          </Button>
                          {code.status === 'active' && (
                            <Button variant="ghost" size="icon" title={t('redemptionCodes.disable')} onClick={() => openDisableDialog(code)}>
                              <Ban className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">
                  {t('redemptionCodes.pagination', { range: total === 0 ? '0' : `${(page - 1) * limit + 1}-${Math.min(page * limit, total)}`, total })}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} aria-label={t('redemptionCodes.previousPage')} title={t('redemptionCodes.previousPage')}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">{page} / {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} aria-label={t('redemptionCodes.nextPage')} title={t('redemptionCodes.nextPage')}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('redemptionCodes.createDialog.title')}</DialogTitle>
            <DialogDescription>{t('redemptionCodes.createDialog.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {formError && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
                <span>{formError}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="redemption-code-type">{t('redemptionCodes.createDialog.type')}</Label>
              <Select value={createForm.type} onValueChange={(value) => updateCreateForm({ type: value as AdminRedemptionCodeType })}>
                <SelectTrigger id="redemption-code-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lingqi_only">{typeLabels.lingqi_only}</SelectItem>
                  <SelectItem value="plan_with_lingqi">{typeLabels.plan_with_lingqi}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {createForm.type === 'plan_with_lingqi' && (
              <div className="space-y-2">
                <Label htmlFor="redemption-plan-id">{t('redemptionCodes.createDialog.planId')}</Label>
                <Input id="redemption-plan-id" value={createForm.planId} onChange={(event) => updateCreateForm({ planId: event.target.value })} placeholder="subscription plan id" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="redemption-lingqi-amount">{t('redemptionCodes.createDialog.lingqiAmount')}</Label>
              <Input id="redemption-lingqi-amount" type="number" min={1} step={1} value={createForm.lingqiAmount} onChange={(event) => updateCreateForm({ lingqiAmount: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="redemption-expires-at">{t('redemptionCodes.createDialog.expiresAt')}</Label>
              <DateTimePicker id="redemption-expires-at" value={createForm.expiresAt} onChange={(expiresAt) => updateCreateForm({ expiresAt })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="redemption-note">{t('redemptionCodes.createDialog.note')}</Label>
              <Textarea id="redemption-note" value={createForm.note} onChange={(event) => updateCreateForm({ note: event.target.value })} placeholder={t('redemptionCodes.createDialog.notePlaceholder')} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>{t('redemptionCodes.createDialog.cancel')}</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending && <Spinner className="mr-2 size-4" />}
              {t('redemptionCodes.createDialog.generate')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!createdCode} onOpenChange={(open) => { if (!open) clearCreatedCode(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('redemptionCodes.createdDialog.title')}</DialogTitle>
            <DialogDescription>{t('redemptionCodes.createdDialog.description')}</DialogDescription>
          </DialogHeader>
          {createdCode && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border bg-muted/40 p-3 font-mono text-sm break-all">
                {createdCode.code}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">{t('redemptionCodes.createdDialog.preview')}</span>
                <span>{createdCode.codePreview}</span>
                <span className="text-muted-foreground">{t('redemptionCodes.createdDialog.lingqi')}</span>
                <span>{createdCode.lingqiAmount.toLocaleString()}</span>
              </div>
              {copyError && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
                  <span>{copyError}</span>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={clearCreatedCode}>{t('redemptionCodes.createdDialog.close')}</Button>
            <Button onClick={handleCopyCreatedCode}>
              <Copy className="mr-2 h-4 w-4" />
              {copied ? t('redemptionCodes.createdDialog.copied') : t('redemptionCodes.createdDialog.copy')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!disableTarget} onOpenChange={(open) => { if (!open) closeDisableDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('redemptionCodes.disableDialog.title')}</DialogTitle>
            <DialogDescription>{t('redemptionCodes.disableDialog.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {disableError && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
                <span>{disableError}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="disable-reason">{t('redemptionCodes.disableDialog.reason')}</Label>
              <Textarea id="disable-reason" value={disableReason} onChange={(event) => setDisableReason(event.target.value)} placeholder={t('redemptionCodes.disableDialog.reasonPlaceholder')} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDisableDialog}>{t('common.cancel')}</Button>
            <Button variant="destructive" onClick={handleDisable} disabled={disableMutation.isPending}>
              {disableMutation.isPending && <Spinner className="mr-2 size-4" />}
              {t('redemptionCodes.disableDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
