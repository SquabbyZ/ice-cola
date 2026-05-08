import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useQuotaStore } from '@/stores/quota';
import { toast } from 'sonner';
import { Save, Eye, EyeOff, Key, TrendingUp, Shield, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { GatewayRpcService } from '@/services/gateway-rpc';
import { ApiKeyService } from '@/services/apikey-service';
import { getServiceContainer } from '@/services/service-container';

const Settings: React.FC = () => {
  const { t } = useTranslation();
  const { config, status, loadConfig, updateConfig, refreshStatus } = useQuotaStore();

  const [apiKeyService, setApiKeyService] = useState<ApiKeyService | null>(null);

  useEffect(() => {
    const client = getServiceContainer().gatewayClient;
    const rpc = new GatewayRpcService(client);
    const apiKeySvc = new ApiKeyService(rpc);
    setApiKeyService(apiKeySvc);
  }, []);

  const [apiKeys, setApiKeys] = useState<Record<string, string>>({
    openai: '',
    anthropic: '',
    google: '',
    minimax: '',
  });
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({
    openai: false,
    anthropic: false,
    google: false,
    minimax: false,
  });
  const [saving, setSaving] = useState<Record<string, boolean>>({
    openai: false,
    anthropic: false,
    google: false,
    minimax: false,
  });
  const [testResults, setTestResults] = useState<Record<string, { valid?: boolean; error?: string; loading?: boolean }>>({});
  const [savedApiKeys, setSavedApiKeys] = useState<Set<string>>(new Set());
  const [showMasked, setShowMasked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (apiKeyService) {
      const loadSavedStatus = async () => {
        try {
          const providers = ['openai', 'anthropic', 'google', 'minimax'];
          for (const provider of providers) {
            const hasKey = await apiKeyService.hasApiKey(provider);
            if (hasKey) {
              setSavedApiKeys(prev => new Set(prev).add(provider));
              setShowMasked(prev => ({ ...prev, [provider]: true }));
            }
          }
        } catch (error) {
          console.error(t('settings.loadSavedKeyStatusFailed'), error);
        }
      };
      loadSavedStatus();
    }
  }, [apiKeyService]);

  useEffect(() => {
    loadConfig();
    refreshStatus();
  }, []);

  const handleSaveApiKey = async (provider: string, value: string) => {
    if (!value.trim()) return;

    setSaving(prev => ({ ...prev, [provider]: true }));

    try {
      if (!apiKeyService) {
        throw new Error(t('settings.apiKeyServiceNotInitialized'));
      }

      await apiKeyService.saveApiKey(provider, value);

      setSavedApiKeys(prev => new Set(prev).add(provider));
      setShowMasked(prev => ({ ...prev, [provider]: true }));
      setApiKeys(prev => ({ ...prev, [provider]: '' }));

      toast.success(t('common.success'), {
        description: `${provider.toUpperCase()} API Key ${t('settings.saved')}`,
      });

      setTimeout(() => {
        toast.warning(t('settings.restartGateway'), {
          description: t('settings.restartGatewayDesc'),
          duration: 8000,
        });
      }, 1000);
    } catch (error) {
      toast.error(t('common.error'), {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSaving(prev => ({ ...prev, [provider]: false }));
    }
  };

  const toggleKeyVisibility = (provider: string) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  const handleTestApiKey = async (provider: string) => {
    if (!apiKeyService) {
      toast.error(t('common.error'), {
        description: t('settings.serviceNotReady'),
      });
      return;
    }

    setTestResults(prev => ({ ...prev, [provider]: { loading: true } as any }));

    try {
      const result = await apiKeyService.testApiKey(provider);
      setTestResults(prev => ({ ...prev, [provider]: result }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [provider]: { valid: false, error: String(error) }
      }));
    }
  };

  const handleUpdateQuota = async (updates: { monthlyBudget?: number; warningThreshold?: number; hardLimit?: boolean }) => {
    if (config) {
      await updateConfig(updates);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-50/50">
      <div className="max-w-[1200px] mx-auto p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-zinc-900 tracking-tight mb-2">
            {t('settings.title')}
          </h1>
          <p className="text-zinc-500 text-sm lg:text-base">
            {t('settings.subtitle')}
          </p>
        </div>

        {/* API Keys */}
        <div className="bento-tile p-6 mb-6 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-zinc-100/80 flex items-center justify-center">
              <Key className="w-5 h-5 text-zinc-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">{t('settings.apiKeys')}</h2>
              <p className="text-sm text-zinc-500">{t('settings.manageApiKeys')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {['openai', 'anthropic', 'google', 'minimax'].map((provider, index) => (
              <div
                key={provider}
                className="p-5 bg-zinc-50/50 rounded-2xl border border-zinc-100/50 animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <Label className="capitalize text-sm font-medium text-zinc-700">
                    {provider} {t('settings.apiKey')}
                  </Label>
                  {testResults[provider] && (
                    <span className="text-xs flex items-center gap-1">
                      {testResults[provider].loading ? (
                        <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                      ) : testResults[provider].valid ? (
                        <CheckCircle className="w-3 h-3 text-green-500" />
                      ) : (
                        <XCircle className="w-3 h-3 text-red-500" />
                      )}
                      {testResults[provider].loading ? t('settings.connectionTesting') :
                       testResults[provider].valid ? t('settings.connectionValid') :
                       testResults[provider].error || t('settings.connectionInvalid')}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    {showMasked[provider] ? (
                      <div className="flex items-center h-11 px-4 rounded-xl bg-white border border-zinc-200/50">
                        <span className="flex-1 text-zinc-400 font-mono tracking-widest">••••••••••••••••</span>
                        <span className="text-xs text-green-600 font-medium">{t('settings.saved')}</span>
                      </div>
                    ) : (
                      <>
                        <Input
                          type={showKeys[provider] ? 'text' : 'password'}
                          value={apiKeys[provider]}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiKeys(prev => ({ ...prev, [provider]: e.target.value }))}
                          placeholder={`${t('settings.enterApiKey')} ${provider.toUpperCase()}`}
                          className="h-11 pr-12 bg-white border-zinc-200/50 rounded-xl"
                        />
                        <button
                          type="button"
                          onClick={() => toggleKeyVisibility(provider)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                        >
                          {showKeys[provider] ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </>
                    )}
                  </div>

                  {showMasked[provider] ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowMasked(prev => ({ ...prev, [provider]: false }));
                          setApiKeys(prev => ({ ...prev, [provider]: '' }));
                        }}
                        className="rounded-xl border-zinc-200/50 hover:bg-zinc-100"
                      >
                        {t('common.modify')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTestApiKey(provider)}
                        className="rounded-xl border-zinc-200/50 hover:bg-zinc-100"
                      >
                        {t('settings.testConnection')}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSaveApiKey(provider, apiKeys[provider])}
                        disabled={saving[provider] || !apiKeys[provider].trim()}
                        className="rounded-xl border-zinc-200/50 hover:bg-zinc-100"
                      >
                        {saving[provider] ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTestApiKey(provider)}
                        disabled={!savedApiKeys.has(provider)}
                        className="rounded-xl border-zinc-200/50 hover:bg-zinc-100"
                      >
                        {t('settings.testConnection')}
                      </Button>
                    </>
                  )}
                </div>

                <p className="text-xs text-zinc-400 mt-3 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  {t('settings.encryptedStorage')}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Quota Settings */}
        <div className="bento-tile p-6 mb-6 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-zinc-100/80 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-zinc-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">{t('settings.quota')}</h2>
              <p className="text-sm text-zinc-500">{t('settings.quotaDesc')}</p>
            </div>
          </div>

          {config && (
            <div className="space-y-6">
              {/* Monthly Budget */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-zinc-700">{t('settings.monthlyBudget')}</Label>
                <Input
                  type="number"
                  value={config.monthlyBudget}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdateQuota({ monthlyBudget: parseFloat(e.target.value) })}
                  min={0}
                  step={0.01}
                  className="max-w-xs bg-white border-zinc-200/50 rounded-xl h-11"
                />
              </div>

              {/* Warning Threshold */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-zinc-700">{t('settings.warningThreshold')}</Label>
                  <span className="text-sm font-mono text-zinc-500">{config.warningThreshold * 100}%</span>
                </div>
                <Slider
                  value={[config.warningThreshold * 100]}
                  onValueChange={([value]: number[]) => handleUpdateQuota({ warningThreshold: value / 100 })}
                  min={50}
                  max={100}
                  step={5}
                  className="max-w-xs"
                />
                <p className="text-xs text-zinc-400">
                  {t('settings.warningDesc')}
                </p>
              </div>

              {/* Hard Limit */}
              <div className="flex items-center justify-between p-4 bg-zinc-50/50 rounded-xl">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium text-zinc-700">{t('settings.hardLimit')}</Label>
                  <p className="text-xs text-zinc-400">
                    {t('settings.hardLimitDesc')}
                  </p>
                </div>
                <Switch
                  checked={config.hardLimit}
                  onCheckedChange={(checked: boolean) => handleUpdateQuota({ hardLimit: checked })}
                />
              </div>

              {/* Current Status */}
              {status && (
                <div className="flex items-center gap-3 p-4 bg-green-50/50 rounded-xl border border-green-100/50">
                  <div className="w-8 h-8 rounded-lg bg-green-100/80 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-zinc-700">{t('settings.currentUsage')}</p>
                    <p className="text-xs text-zinc-500">
                      ${status.currentCost.toFixed(2)} / ${status.budget.toFixed(2)}
                    </p>
                  </div>
                  <div className="w-24 h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${Math.min((status.currentCost / status.budget) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Other Settings Placeholder */}
        <div className="bento-tile p-6 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-zinc-100/80 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-zinc-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">{t('settings.otherSettings')}</h2>
              <p className="text-sm text-zinc-500">{t('settings.moreComingSoon')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
