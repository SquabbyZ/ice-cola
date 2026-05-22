import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Spinner } from '../components/ui/spinner';
import { AdminRedemptionCodeStatus, AdminRedemptionCodeType } from '../services/redemptionCodesApi';
import { useAdminRedemptionCode } from '../hooks/useRedemptionCodes';

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

interface DetailItemProps {
  label: string;
  value: React.ReactNode;
}

function DetailItem({ label, value }: DetailItemProps) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm font-medium break-all">{value}</div>
    </div>
  );
}

export default function RedemptionCodeDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { data: code, isLoading } = useAdminRedemptionCode(id);
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

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{t('redemptionCodeDetail.title')}</h2>
          <p className="text-gray-600">{t('redemptionCodeDetail.subtitle')}</p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/redemption-codes">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('redemptionCodeDetail.backToList')}
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner className="size-6" />
        </div>
      ) : !code ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">{t('redemptionCodeDetail.notFound')}</CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>{t('redemptionCodeDetail.basicTitle')}</CardTitle>
              <CardDescription>{t('redemptionCodeDetail.basicDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <DetailItem label={t('redemptionCodeDetail.fields.preview')} value={<span className="font-mono">{code.codePreview}</span>} />
              <DetailItem label={t('redemptionCodeDetail.fields.status')} value={statusBadge(code.status, statusLabels[code.status])} />
              <DetailItem label={t('redemptionCodeDetail.fields.type')} value={typeLabels[code.type]} />
              <DetailItem label={t('redemptionCodeDetail.fields.lingqiAmount')} value={code.lingqiAmount.toLocaleString()} />
              <DetailItem label={t('redemptionCodeDetail.fields.planId')} value={code.planId ?? '-'} />
              <DetailItem label={t('redemptionCodeDetail.fields.usage')} value={`${code.usedCount} / ${code.maxUses}`} />
              <DetailItem label={t('redemptionCodeDetail.fields.expiresAt')} value={formatDate(code.expiresAt)} />
              <DetailItem label={t('redemptionCodeDetail.fields.createdAt')} value={formatDate(code.createdAt)} />
              <DetailItem label={t('redemptionCodeDetail.fields.updatedAt')} value={formatDate(code.updatedAt)} />
              <DetailItem label={t('redemptionCodeDetail.fields.createdBy')} value={code.createdByUserId ?? '-'} />
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('redemptionCodeDetail.redemptionTitle')}</CardTitle>
                <CardDescription>{t('redemptionCodeDetail.redemptionDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <DetailItem label={t('redemptionCodeDetail.fields.redeemedTeam')} value={code.redeemedTeamId ?? '-'} />
                <DetailItem label={t('redemptionCodeDetail.fields.redeemedUser')} value={code.redeemedUserId ?? '-'} />
                <DetailItem label={t('redemptionCodeDetail.fields.redeemedAt')} value={formatDate(code.redeemedAt)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('redemptionCodeDetail.disabledTitle')}</CardTitle>
                <CardDescription>{t('redemptionCodeDetail.disabledDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <DetailItem label={t('redemptionCodeDetail.fields.disabledAt')} value={formatDate(code.disabledAt)} />
                <DetailItem label={t('redemptionCodeDetail.fields.disabledBy')} value={code.disabledByUserId ?? '-'} />
                <DetailItem label={t('redemptionCodeDetail.fields.disabledReason')} value={code.disabledReason ?? '-'} />
              </CardContent>
            </Card>
          </div>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t('redemptionCodeDetail.noteTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{code.note || t('redemptionCodeDetail.emptyNote')}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
