import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Activity } from 'lucide-react';
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
  useEndpoints,
} from '../../hooks/useAiModels';
import { useAuthStore } from '../../stores/authStore';
import { ProviderCard } from '../../components/ai/ProviderCard';
import { AddProviderDialog } from '../../components/ai/AddProviderDialog';
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
  const { data: usageStats } = useUsageStats({ period: 'month' });
  const { data: endpoints } = useEndpoints();

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

  const handleEditKey = (id: string, keyName: string) => {
    const key = apiKeys?.find(k => k.id === id);
    if (key) {
      const endpoint = endpoints?.find(e => e.providerId === key.providerId && e.isDefault);
      // Fetch decrypted key for echo-back
      decryptKey.mutate(id, {
        onSuccess: (decrypted) => {
          setEditingKey({ id, keyName, endpointUrl: endpoint?.baseUrl, decryptedKey: decrypted || '••••••••••' });
        },
        onError: () => {
          setEditingKey({ id, keyName, endpointUrl: endpoint?.baseUrl, decryptedKey: '••••••••••' });
        },
      });
    } else {
      setEditingKey({ id, keyName, endpointUrl: undefined });
    }
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
      onSuccess: () => {
        alert(t('ai.settings.testConnectionSuccess'));
        updateProvider.mutate(
          { id: providerId, data: { status: 'active' } },
          {
            onSettled: () => setTestingConnectionId(null),
          },
        );
      },
      onError: (error: unknown) => {
        const err = error as { response?: { data?: { message?: string } } };
        alert(err.response?.data?.message || t('ai.settings.testConnectionFailed'));
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

      {/* Usage Stats */}
      {usageStats && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">{t('ai.settings.usageTitle')}</h3>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-muted/50 rounded-lg px-4 py-3">
                <div className="text-2xl font-bold">
                  {usageStats.totalTokens?.toLocaleString() || 0}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t('ai.settings.tokens')} ({t('ai.settings.thisMonth')})
                </div>
              </div>
              <div className="bg-muted/50 rounded-lg px-4 py-3">
                <div className="text-2xl font-bold">
                  {usageStats.totalRequests?.toLocaleString() || 0}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t('ai.settings.requests')} ({t('ai.settings.thisMonth')})
                </div>
              </div>
              <div className="bg-muted/50 rounded-lg px-4 py-3">
                <div className="text-2xl font-bold">
                  ${usageStats.totalCost?.toFixed(4) || '0.0000'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t('ai.settings.cost')} ({t('ai.settings.thisMonth')})
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
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
                defaultValue={editingKey?.decryptedKey}
              />
              <p className="text-xs text-muted-foreground">{t('ai.apiKeys.keyRevealed')}</p>
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
    </div>
  );
}
