import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Crown, Gem, History, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { LingqiCostPreview } from '@/components/LingqiCostPreview';
import { LingqiModelSelector } from '@/components/LingqiModelSelector';
import { useAuthStore } from '@/stores/authStore';
import { useLingqiStore } from '@/stores/lingqi';
import { getTeamId } from '@/lib/team';
import type { LingqiLedgerEntry, LingqiStatus } from '@/services/lingqi-service';

function formatLingqiAmount(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value);
}

function getRealmName(status: LingqiStatus | null): string {
  return status?.cultivationRealm?.displayName ?? '凡人';
}

function getProgressValue(status: LingqiStatus | null): number {
  const percentage = status?.realmProgress.percentage ?? 0;
  return Math.min(Math.max(percentage, 0), 100);
}

function getLedgerDirectionLabel(entry: LingqiLedgerEntry): string {
  return entry.direction === 'grant' ? '获得' : '消耗';
}

function getLedgerTypeLabel(entry: LingqiLedgerEntry): string {
  return `${entry.transactionType} · ${entry.sourceType}`;
}

function formatLedgerDate(value: Date | string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '时间未知';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return '兑换失败，请稍后再试。';
}

export default function Lingqi() {
  const { user } = useAuthStore();
  const teamId = getTeamId(user);
  const [redeemCodeValue, setRedeemCodeValue] = useState('');
  const {
    status,
    models,
    ledger,
    selectedModel,
    estimate,
    isLoading,
    error,
    loadLingqi,
    redeemCode,
    selectModel,
    estimateCost,
    clearError,
  } = useLingqiStore();

  useEffect(() => {
    if (!teamId) {
      return;
    }

    void loadLingqi(teamId);
  }, [loadLingqi, teamId]);

  const availableModels = useMemo(
    () => models.filter((model) => model.isAvailable),
    [models],
  );

  const selectedModelId = selectedModel?.id ?? availableModels[0]?.id;

  useEffect(() => {
    if (!teamId || !selectedModelId) {
      return;
    }

    void estimateCost(teamId, {
      transactionType: 'chat_message',
      modelId: selectedModelId,
    }).catch(() => undefined);
  }, [estimateCost, selectedModelId, teamId]);

  const handleRedeem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!teamId) {
      toast.error('请先加入宗门后再兑换灵气。');
      return;
    }

    const trimmedCode = redeemCodeValue.trim();
    if (!trimmedCode) {
      toast.error('请输入兑换码。');
      return;
    }

    try {
      const grantedAmount = await redeemCode(teamId, trimmedCode);
      setRedeemCodeValue('');
      toast.success(`灵气到账 ${formatLingqiAmount(grantedAmount)}`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleSelectModel = async (modelId: string) => {
    if (!teamId || !modelId) {
      return;
    }

    try {
      await selectModel(teamId, modelId);
      await estimateCost(teamId, {
        transactionType: 'chat_message',
        modelId,
      });
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <main className="min-h-full bg-transparent p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="relative overflow-hidden rounded-[2rem] pavilion-card p-8">
          <div className="absolute right-8 top-8 h-28 w-28 rounded-full bg-amber-300/30 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal-100 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">
                <Sparkles className="h-3.5 w-3.5" />
                灵气阁 · 洞天福地
              </div>
              <h1 className="text-4xl font-black tracking-tight pavilion-text-gradient">灵气修行与模型调度</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
                灵气用于驱动问道、工具调用与宗主秘籍。保持灵气充沛，方可驾驭更高阶模型。
              </p>
            </div>
            <div className="rounded-3xl border border-amber-200/70 bg-gradient-to-br from-teal-700 to-amber-600 px-6 py-5 text-amber-50 shadow-lg shadow-amber-200/60">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-white/75">当前灵气</p>
              <p className="mt-2 text-4xl font-black tracking-tight">
                {formatLingqiAmount(status?.balance ?? 0)}
              </p>
            </div>
          </div>
        </section>

        {error && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            <div role="alert" className="flex items-center gap-2 text-left">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={clearError}
              className="rounded-md px-2 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2"
              aria-label="清除灵气错误提示"
            >
              清除
            </button>
          </div>
        )}

        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="overflow-hidden rounded-3xl border-teal-100 bg-amber-50/75 shadow-lg shadow-amber-100/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-stone-950">
                <Gem className="h-5 w-5 text-teal-600" />
                修行境界
              </CardTitle>
              <CardDescription>消耗灵气可积累修为，逐步突破更高境界。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-teal-50 p-4">
                  <p className="text-xs text-teal-700">当前境界</p>
                  <p className="mt-1 text-2xl font-bold text-stone-950">{getRealmName(status)}</p>
                </div>
                <div className="rounded-2xl bg-lime-50 p-4">
                  <p className="text-xs text-lime-700">累计获得</p>
                  <p className="mt-1 text-2xl font-bold text-stone-950">
                    {formatLingqiAmount(status?.totalGranted ?? 0)}
                  </p>
                </div>
                <div className="rounded-2xl bg-amber-50 p-4">
                  <p className="text-xs text-amber-700">累计消耗</p>
                  <p className="mt-1 text-2xl font-bold text-stone-950">
                    {formatLingqiAmount(status?.totalConsumed ?? 0)}
                  </p>
                </div>
              </div>
              <div>
                <div className="mb-2 flex justify-between text-sm text-stone-600">
                  <span>突破进度</span>
                  <span>{getProgressValue(status).toFixed(0)}%</span>
                </div>
                <Progress
                  value={getProgressValue(status)}
                  className="h-3 bg-teal-100"
                  aria-label={`突破进度 ${getProgressValue(status).toFixed(0)}%，当前境界 ${getRealmName(status)}`}
                />
                <p className="mt-2 text-xs text-stone-500">
                  {status?.nextCultivationRealm
                    ? `下境：${status.nextCultivationRealm.displayName}`
                    : '当前已达可见境界巅峰。'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-teal-100 bg-amber-50/75 shadow-lg shadow-amber-100/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-stone-950">
                <Crown className="h-5 w-5 text-amber-500" />
                仙盟契约
              </CardTitle>
              <CardDescription>当前订阅决定可用模型阶位与消耗折扣。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-teal-100 bg-gradient-to-br from-white to-teal-50 p-5">
                <p className="text-xs text-stone-500">当前套餐</p>
                <p className="mt-1 text-2xl font-black text-stone-950">
                  {status?.subscription.displayName ?? '未载入'}
                </p>
                <p className="mt-2 text-sm text-stone-600">
                  可用模型阶位：{status?.subscription.modelRankLimit ?? '-'} · 消耗倍率：
                  {status ? status.subscription.costDiscountRate : '-'}
                </p>
              </div>
              <form className="flex flex-col gap-3" onSubmit={handleRedeem}>
                <Input
                  value={redeemCodeValue}
                  onChange={(event) => setRedeemCodeValue(event.target.value)}
                  placeholder="输入灵气兑换码"
                  aria-label="灵气兑换码"
                  autoComplete="off"
                />
                <Button type="submit" disabled={isLoading} className="rounded-xl bg-teal-600 hover:bg-teal-700">
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  兑换灵气
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="rounded-3xl border-teal-100 bg-amber-50/75 shadow-lg shadow-amber-100/50">
            <CardHeader>
              <CardTitle>模型法器</CardTitle>
              <CardDescription>选择当前对话默认调用的灵气模型。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <LingqiModelSelector
                models={models}
                selectedModelId={selectedModelId}
                onSelect={handleSelectModel}
              />
              <LingqiCostPreview estimate={estimate} />
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {models.map((model) => (
              <article
                key={model.id}
                className={`rounded-3xl border p-5 shadow-sm transition ${
                  model.isAvailable
                    ? 'border-teal-100 bg-white/90 shadow-teal-100/50'
                    : 'border-zinc-200 bg-zinc-50/80 opacity-75'
                }`}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-stone-950">{model.displayName}</h2>
                    <p className="mt-1 text-xs text-stone-500">{model.modelName}</p>
                  </div>
                  <span className="rounded-full bg-teal-50 px-2 py-1 text-xs font-medium text-teal-700">
                    Rank {model.rank}
                  </span>
                </div>
                <p className="min-h-[2.5rem] text-sm leading-5 text-stone-600">
                  {model.description ?? '适用于日常问道与练功调度。'}
                </p>
                <div className="mt-4 flex items-center justify-between text-xs text-stone-500">
                  <span>消耗倍率 ×{model.costMultiplier}</span>
                  <span>{model.isAvailable ? '可用' : '需更高套餐'}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <Card className="rounded-3xl border-teal-100 bg-amber-50/75 shadow-lg shadow-amber-100/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-stone-950">
              <History className="h-5 w-5 text-teal-600" />
              近期灵气账簿
            </CardTitle>
            <CardDescription>展示最近的灵气获得与消耗记录，便于追踪模型调用与兑换来源。</CardDescription>
          </CardHeader>
          <CardContent>
            {ledger.length > 0 ? (
              <div className="space-y-3">
                {ledger.map((entry) => (
                  <article
                    key={entry.id}
                    className="flex flex-col gap-3 rounded-2xl border border-teal-100 bg-white/85 p-4 shadow-sm shadow-teal-100/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            entry.direction === 'grant'
                              ? 'bg-lime-50 text-lime-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {getLedgerDirectionLabel(entry)}
                        </span>
                        <span className="text-xs font-medium text-stone-500">
                          {getLedgerTypeLabel(entry)}
                        </span>
                      </div>
                      <p className="mt-2 truncate text-sm font-semibold text-stone-800">
                        {entry.description ?? '灵气流转记录'}
                      </p>
                      <p className="mt-1 text-xs text-stone-500">{formatLedgerDate(entry.createdAt)}</p>
                    </div>
                    <p
                      className={`text-lg font-black ${
                        entry.direction === 'grant' ? 'text-lime-700' : 'text-amber-700'
                      }`}
                    >
                      {entry.direction === 'grant' ? '+' : '-'}{formatLingqiAmount(entry.amount)} 灵气
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-teal-200 bg-white/60 px-4 py-8 text-center text-sm text-stone-500">
                {isLoading ? '正在载入灵气账簿...' : '暂无灵气账簿记录，兑换或调用模型后会在此显示。'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
