import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
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
import { LingqiDirection } from '../services/redemptionCodesApi';
import { useAdminLingqiLedger } from '../hooks/useRedemptionCodes';

const ITEMS_PER_PAGE = 10;

type DirectionFilter = LingqiDirection | 'all';

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function directionBadge(direction: string, label: string) {
  return direction === 'grant' ? <Badge variant="success">{label}</Badge> : <Badge variant="warning">{label}</Badge>;
}

function directionLabel(direction: string, labels: Record<LingqiDirection, string>): string {
  return direction === 'grant' || direction === 'consume' ? labels[direction] : direction;
}

export default function LingqiLedger() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [teamId, setTeamId] = useState('');
  const [userId, setUserId] = useState('');
  const [direction, setDirection] = useState<DirectionFilter>('all');
  const [transactionType, setTransactionType] = useState('');

  const query = {
    teamId: teamId.trim() || undefined,
    userId: userId.trim() || undefined,
    direction: direction === 'all' ? undefined : direction,
    transactionType: transactionType.trim() || undefined,
    limit: ITEMS_PER_PAGE,
    offset: (page - 1) * ITEMS_PER_PAGE,
  };
  const { data, isError, isLoading, refetch } = useAdminLingqiLedger(query);
  const entries = data?.items ?? [];
  const total = data?.total ?? 0;
  const limit = data?.limit ?? ITEMS_PER_PAGE;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const directionLabels: Record<LingqiDirection, string> = {
    grant: t('lingqiLedger.directions.grant'),
    consume: t('lingqiLedger.directions.consume'),
  };

  const handleFilterChange = (update: () => void) => {
    update();
    setPage(1);
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{t('lingqiLedger.title')}</h2>
          <p className="text-gray-600">{t('lingqiLedger.subtitle')}</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('lingqiLedger.refresh')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('lingqiLedger.filtersTitle')}</CardTitle>
          <CardDescription>{t('lingqiLedger.filtersDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="lingqi-ledger-team-id">{t('lingqiLedger.labels.teamId')}</Label>
            <Input id="lingqi-ledger-team-id" value={teamId} onChange={(event) => handleFilterChange(() => setTeamId(event.target.value))} placeholder={t('lingqiLedger.placeholders.teamId')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lingqi-ledger-user-id">{t('lingqiLedger.labels.userId')}</Label>
            <Input id="lingqi-ledger-user-id" value={userId} onChange={(event) => handleFilterChange(() => setUserId(event.target.value))} placeholder={t('lingqiLedger.placeholders.userId')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lingqi-ledger-direction">{t('lingqiLedger.labels.direction')}</Label>
            <Select value={direction} onValueChange={(value) => handleFilterChange(() => setDirection(value as DirectionFilter))}>
              <SelectTrigger id="lingqi-ledger-direction">
                <SelectValue placeholder={t('lingqiLedger.placeholders.direction')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('lingqiLedger.directions.all')}</SelectItem>
                <SelectItem value="grant">{directionLabels.grant}</SelectItem>
                <SelectItem value="consume">{directionLabels.consume}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lingqi-ledger-transaction-type">{t('lingqiLedger.labels.transactionType')}</Label>
            <Input id="lingqi-ledger-transaction-type" value={transactionType} onChange={(event) => handleFilterChange(() => setTransactionType(event.target.value))} placeholder={t('lingqiLedger.placeholders.transactionType')} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('lingqiLedger.recordsTitle')}</CardTitle>
          <CardDescription>{t('lingqiLedger.recordsDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner className="size-6" />
            </div>
          ) : isError ? (
            <div className="flex items-start justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
              <span>{t('lingqiLedger.errors.loadFailed')}</span>
              <Button variant="outline" size="sm" onClick={() => refetch()}>{t('lingqiLedger.refresh')}</Button>
            </div>
          ) : entries.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">{t('lingqiLedger.empty')}</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('lingqiLedger.table.time')}</TableHead>
                    <TableHead>{t('lingqiLedger.table.team')}</TableHead>
                    <TableHead>{t('lingqiLedger.table.user')}</TableHead>
                    <TableHead>{t('lingqiLedger.table.direction')}</TableHead>
                    <TableHead>{t('lingqiLedger.table.amount')}</TableHead>
                    <TableHead>{t('lingqiLedger.table.transactionType')}</TableHead>
                    <TableHead>{t('lingqiLedger.table.source')}</TableHead>
                    <TableHead>{t('lingqiLedger.table.description')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{formatDate(entry.createdAt)}</TableCell>
                      <TableCell className="max-w-[140px] truncate font-mono text-xs">{entry.teamId}</TableCell>
                      <TableCell className="max-w-[140px] truncate font-mono text-xs">{entry.userId ?? '-'}</TableCell>
                      <TableCell>{directionBadge(entry.direction, directionLabel(entry.direction, directionLabels))}</TableCell>
                      <TableCell className="font-medium">{entry.amount.toLocaleString()}</TableCell>
                      <TableCell>{entry.transactionType}</TableCell>
                      <TableCell className="max-w-[180px] truncate text-xs">
                        {entry.sourceType}{entry.sourceId ? ` / ${entry.sourceId}` : ''}
                      </TableCell>
                      <TableCell className="max-w-[240px] truncate">{entry.description ?? '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">
                  {t('lingqiLedger.pagination', { range: total === 0 ? '0' : `${(page - 1) * limit + 1}-${Math.min(page * limit, total)}`, total })}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} aria-label={t('lingqiLedger.previousPage')} title={t('lingqiLedger.previousPage')}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">{page} / {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} aria-label={t('lingqiLedger.nextPage')} title={t('lingqiLedger.nextPage')}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
