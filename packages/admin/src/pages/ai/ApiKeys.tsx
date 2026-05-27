import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import {
  useApiKeys,
  useProviders,
  useModels,
  useDefaultModels,
  useCreateApiKey,
  useCreateEndpoint,
  useUpdateApiKeyStatus,
  useUpdateApiKey,
  useDecryptApiKey,
  useDeleteApiKey,
  useFetchModelsFromProvider,
  useCreateDefaultModel,
  useUsageStats,
  useTestConnection,
  useUpdateProvider,
} from '../../hooks/useAiModels';
import { useAuthStore } from '../../stores/authStore';
import { ProviderCard } from '../../components/ai/ProviderCard';
import { AddProviderDialog } from '../../components/ai/AddProviderDialog';
import { aiModelsApi } from '../../services/aiModelsApi';
import { Button } from '../../components/ui/button';
import { PasswordInput } from '../../components/ui/password-input';
import { Spinner } from '../../components/ui/spinner';
import { Card, CardContent } from '../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';

export default function ApiKeys() {
  const { t } = useTranslation();
  const { data: apiKeys, isLoading: keysLoading } = useApiKeys();
  const { data: providers } = useProviders();
  const { data: allModels } = useModels();
  const { data: defaultModels } = useDefaultModels();
  const createApiKey = useCreateApiKey();
  const createEndpoint = useCreateEndpoint();
  const updateStatus = useUpdateApiKeyStatus();
  const updateApiKey = useUpdateApiKey();
  const decryptKey = useDecryptApiKey();
  const deleteApiKey = useDeleteApiKey();
  const fetchModels = useFetchModelsFromProvider();
  const setDefaultModel = useCreateDefaultModel();
  const { data: _usageStats } = useUsageStats({ period: 'month' });

  const currentUser = useAuthStore((state) => state.user);
  const canEdit = currentUser?.role === 'OWNER' || currentUser?.role === 'ADMIN';

  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [deleteKeyId, setDeleteKeyId] = React.useState<string | null>(null);
  const [editingKey, setEditingKey] = React.useState<{ id: string; keyName: string; endpointUrl?: string; decryptedKey?: string } | null>(null);
  const [viewKeyId, setViewKeyId] = React.useState<string | null>(null);
  const [decryptedKeyValue, setDecryptedKeyValue] = React.useState('');
  const [copied, setCopied] = React.useState(false);
  const [togglingId, setTogglingId] = React.useState<string | null>(null);
  const [testingConnectionId, setTestingConnectionId] = React.useState<string | null>(null);
  const [testConnectionResult, setTestConnectionResult] = React.useState<{
    success: boolean;
    message: string;
    modelCount?: number;
    sampleModelId?: string | null;
    baseUrl?: string;
  } | null>(null);
  const testConnection = useTestConnection();
  const updateProvider = useUpdateProvider();

  const providerMap = React.useMemo(() => {
    const map: Record<string, { name: string; code: string; logoUrl?: string; websiteUrl?: string; status: string }> = {};
    providers?.forEach((p) => {
      map[p.id] = { name: p.name, code: p.code, logoUrl: p.logoUrl, websiteUrl: p.websiteUrl, status: p.status };
    });
    return map;
  }, [providers]);

  const existingProviderIds = React.useMemo(
    () => [...new Set(apiKeys?.map((k) => k.providerId) || [])],
    [apiKeys],
  );

  const providerGroups = React.useMemo(() => {
    const groups: Record<
      string,
      {
        provider: { id: string; name: string; code: string; logoUrl?: string; websiteUrl?: string; status: string };
        apiKeys: typeof apiKeys;
        models: typeof allModels;
      }
    > = {};
    apiKeys?.forEach((key) => {
      const pid = key.providerId;
      if (!groups[pid]) {
        const info = providerMap[pid];
        groups[pid] = {
          provider: {
            id: pid,
            name: info?.name || pid,
            code: info?.code || '',
            logoUrl: info?.logoUrl,
            websiteUrl: info?.websiteUrl,
            status: info?.status || 'inactive',
          },
          apiKeys: [],
          models: [],
        };
      }
      groups[pid].apiKeys?.push(key);
    });
    allModels?.forEach((model) => {
      if (groups[model.providerId]) {
        groups[model.providerId].models?.push(model);
      }
    });
    return Object.values(groups);
  }, [apiKeys, allModels, providerMap]);

  const handleAddProvider = (data: { providerId: string; keyName: string; apiKey: string; endpointUrl?: string }) => {
    createApiKey.mutate(
      { providerId: data.providerId, keyName: data.keyName, apiKey: data.apiKey },
      {
        onSuccess: () => {
          if (data.endpointUrl) {
            createEndpoint.mutate({
              providerId: data.providerId,
              name: 'Default',
              baseUrl: data.endpointUrl,
              isDefault: true,
            });
          }
          setAddDialogOpen(false);
        },
      },
    );
  };

  const handleToggleStatus = (id: string, currentActive: boolean) => {
    setTogglingId(id);
    updateStatus.mutate(
      { id, isActive: !currentActive },
      { onSettled: () => setTogglingId(null) },
    );
  };

  const handleViewKey = (id: string) => {
    if (viewKeyId === id) {
      setViewKeyId(null);
      setDecryptedKeyValue('');
      return;
    }
    setViewKeyId(id);
    setDecryptedKeyValue('');
    setCopied(false);
    decryptKey.mutate(id, {
      onSuccess: (key) => setDecryptedKeyValue(key || ''),
    });
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(decryptedKeyValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = (id: string) => {
    setDeleteKeyId(id);
  };

  const handleEditKey = async (id: string, keyName: string) => {
    const key = apiKeys?.find(k => k.id === id);
    if (!key) {
      setEditingKey({ id, keyName, endpointUrl: undefined });
      return;
    }
    // Fetch this provider's endpoints directly (cached useEndpoints may not
    // have data for the provider, and admin policy forbids decrypting the
    // stored API key, so we never echo plaintext back).
    let endpointUrl: string | undefined;
    try {
      const res = await aiModelsApi.getEndpoints(key.providerId);
      const providerEndpoints = res.data?.data ?? [];
      const defaultEndpoint = providerEndpoints.find((e) => e.isDefault) ?? providerEndpoints[0];
      endpointUrl = defaultEndpoint?.baseUrl;
    } catch {
      endpointUrl = undefined;
    }
    setEditingKey({ id, keyName, endpointUrl, decryptedKey: undefined });
  };

  const confirmDelete = () => {
    if (deleteKeyId) {
      deleteApiKey.mutate(deleteKeyId);
      setDeleteKeyId(null);
    }
  };

  const handleFetchModels = (providerId: string) => {
    fetchModels.mutate(providerId);
  };

  const handleSetDefault = (modelId: string, providerId: string) => {
    setDefaultModel.mutate({
      providerId,
      modelId,
      useCase: 'general',
    });
  };

  const handleTestConnection = (providerId: string) => {
    setTestingConnectionId(providerId);
    testConnection.mutate(providerId, {
      onSuccess: (result) => {
        setTestConnectionResult({
          success: result?.success ?? true,
          message: result?.message || t('ai.apiKeys.testConnectionSuccess'),
          modelCount: result?.modelCount,
          sampleModelId: result?.sampleModelId,
          baseUrl: result?.baseUrl,
        });
        if (result?.success) {
          updateProvider.mutate(
            { id: providerId, data: { status: 'active' } },
            {
              onSettled: () => setTestingConnectionId(null),
            },
          );
        } else {
          setTestingConnectionId(null);
        }
      },
      onError: (error: unknown) => {
        const err = error as { response?: { data?: { message?: string } } };
        setTestConnectionResult({
          success: false,
          message: err.response?.data?.message || t('ai.apiKeys.testConnectionFailed'),
        });
        setTestingConnectionId(null);
      },
    });
  };

  if (keysLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{t('ai.settings.title')}</h2>
          <p className="text-muted-foreground mt-1">{t('ai.settings.description')}</p>
        </div>
        {canEdit && (
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('ai.settings.addProvider')}
          </Button>
        )}
      </div>

      {/* Provider Cards */}
      {providerGroups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t('ai.settings.noProviders')}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {providerGroups.map((group) => (
            <ProviderCard
              key={group.provider.id}
              provider={group.provider}
              apiKeys={group.apiKeys || []}
              models={group.models || []}
              defaultModels={defaultModels || []}
              onFetchModels={handleFetchModels}
              onToggleKey={handleToggleStatus}
              onDeleteKey={handleDelete}
              onViewKey={handleViewKey}
              onEditKey={handleEditKey}
              onSetDefault={handleSetDefault}
              onTestConnection={handleTestConnection}
              isTestingConnection={testingConnectionId === group.provider.id}
              isFetchingModels={fetchModels.isPending && fetchModels.variables === group.provider.id}
              togglingKeyId={togglingId}
              canEdit={canEdit}
              decryptedKey={decryptedKeyValue}
              viewingKeyId={viewKeyId}
              onCopyKey={handleCopyKey}
              copied={copied}
            />
          ))}
        </div>
      )}

      {/* Add Provider Dialog */}
      <AddProviderDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onSubmit={handleAddProvider}
        providers={providers || []}
        existingProviderIds={existingProviderIds}
        isLoading={createApiKey.isPending}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!deleteKeyId} onOpenChange={() => setDeleteKeyId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('ai.apiKeys.confirmDelete')}</DialogTitle>
            <DialogDescription>{t('ai.apiKeys.deleteWarning')}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteKeyId(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit API Key Dialog */}
      <Dialog open={!!editingKey} onOpenChange={() => setEditingKey(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('ai.apiKeys.editKey')}</DialogTitle>
            <DialogDescription>{t('ai.apiKeys.editKeyDescription')}</DialogDescription>
          </DialogHeader>
          <form
            key={editingKey?.id ?? 'edit-key-form'}
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const apiKeyValue = formData.get('apiKey') as string;
              updateApiKey.mutate(
                {
                  id: editingKey!.id,
                  data: {
                    keyName: formData.get('keyName') as string,
                    apiKey: apiKeyValue || undefined,
                    endpointUrl: formData.get('endpointUrl') as string || undefined,
                  },
                },
                {
                  onSuccess: () => setEditingKey(null),
                },
              );
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label htmlFor="keyName" className="text-sm font-medium">
                {t('ai.apiKeys.keyName')}
              </label>
              <input
                id="keyName"
                name="keyName"
                defaultValue={editingKey?.keyName}
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="apiKey" className="text-sm font-medium">
                {t('ai.apiKeys.apiKey')} ({t('common.optional')})
              </label>
              <PasswordInput
                id="apiKey"
                name="apiKey"
                autoComplete="new-password"
                placeholder={t('ai.apiKeys.keyEditHint')}
                defaultValue=""
              />
              <p className="text-xs text-muted-foreground">{t('ai.apiKeys.keyEditHint')}</p>
            </div>
            <div className="space-y-2">
              <label htmlFor="endpointUrl" className="text-sm font-medium">
                {t('ai.apiKeys.endpointUrl')} ({t('common.optional')})
              </label>
              <input
                id="endpointUrl"
                name="endpointUrl"
                defaultValue={editingKey?.endpointUrl}
                placeholder="https://api.example.com"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingKey(null)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={updateApiKey.isPending}>
                {updateApiKey.isPending ? <Spinner className="h-4 w-4" /> : t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={testConnectionResult !== null}
        onOpenChange={(open) => { if (!open) setTestConnectionResult(null); }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{t('ai.apiKeys.testConnectionResultTitle')}</DialogTitle>
            <DialogDescription>
              {testConnectionResult?.success
                ? t('ai.apiKeys.testConnectionResultSuccess')
                : t('ai.apiKeys.testConnectionResultFailure')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm">
            <div
              className={
                testConnectionResult?.success
                  ? 'rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100'
                  : 'rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100'
              }
            >
              {testConnectionResult?.message}
            </div>
            {testConnectionResult?.success && (
              <dl className="space-y-1.5">
                {typeof testConnectionResult.modelCount === 'number' && (
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-muted-foreground">{t('ai.apiKeys.testConnectionModelCount')}</dt>
                    <dd className="font-medium">{testConnectionResult.modelCount}</dd>
                  </div>
                )}
                {testConnectionResult.sampleModelId && (
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-muted-foreground">{t('ai.apiKeys.testConnectionSampleModel')}</dt>
                    <dd className="font-mono text-xs">{testConnectionResult.sampleModelId}</dd>
                  </div>
                )}
                {testConnectionResult.baseUrl && (
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-muted-foreground">{t('ai.apiKeys.testConnectionBaseUrl')}</dt>
                    <dd className="break-all font-mono text-xs">{testConnectionResult.baseUrl}</dd>
                  </div>
                )}
              </dl>
            )}
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setTestConnectionResult(null)}>
              {t('ai.apiKeys.testConnectionClose')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
