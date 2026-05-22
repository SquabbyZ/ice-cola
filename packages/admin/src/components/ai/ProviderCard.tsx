import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  RefreshCw,
  Eye,
  EyeOff,
  Power,
  Trash2,
  Star,
  Copy,
  Check,
  Globe,
  Key,
  Wifi,
  Pencil,
} from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Spinner } from '../ui/spinner';
import { ApiKey, Model, DefaultModel } from '../../services/aiModelsApi';

function getSafeExternalUrl(url: string | undefined): string | undefined {
  if (!url) {
    return undefined;
  }

  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:' ? parsedUrl.href : undefined;
  } catch {
    return undefined;
  }
}

interface ProviderCardProps {
  provider: {
    id: string;
    name: string;
    code: string;
    logoUrl?: string;
    websiteUrl?: string;
    status: string;
  };
  apiKeys: ApiKey[];
  models: Model[];
  defaultModels: DefaultModel[];
  onFetchModels: (providerId: string) => void;
  onToggleKey: (keyId: string, isActive: boolean) => void;
  onDeleteKey: (keyId: string) => void;
  onViewKey: (keyId: string) => void;
  onEditKey: (keyId: string, keyName: string) => void;
  onSetDefault: (modelId: string, providerId: string) => void;
  onTestConnection: (providerId: string) => void;
  isTestingConnection: boolean;
  isFetchingModels: boolean;
  togglingKeyId: string | null;
  canEdit: boolean;
  decryptedKey?: string;
  viewingKeyId: string | null;
  onCopyKey: () => void;
  copied: boolean;
}

export function ProviderCard({
  provider,
  apiKeys,
  models,
  defaultModels,
  onFetchModels,
  onToggleKey,
  onDeleteKey,
  onViewKey,
  onEditKey,
  onSetDefault,
  onTestConnection,
  isTestingConnection,
  isFetchingModels,
  togglingKeyId,
  canEdit,
  decryptedKey,
  viewingKeyId,
  onCopyKey,
  copied,
}: ProviderCardProps) {
  const { t } = useTranslation();

  const defaultModelId = React.useMemo(() => {
    const dm = defaultModels.find((d) => d.providerId === provider.id);
    return dm?.modelId;
  }, [defaultModels, provider.id]);

  const safeWebsiteUrl = getSafeExternalUrl(provider.websiteUrl);

  const maskApiKey = (keyId: string) => {
    if (viewingKeyId === keyId && decryptedKey) {
      return decryptedKey;
    }
    return '••••••••';
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {provider.logoUrl ? (
              <img
                src={provider.logoUrl}
                alt={provider.name}
                className="w-10 h-10 rounded-lg object-contain border bg-background p-1"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                {provider.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h3 className="text-lg font-semibold">{provider.name}</h3>
              {safeWebsiteUrl && (
                <a
                  href={safeWebsiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                >
                  <Globe className="h-3 w-3" />
                  {safeWebsiteUrl.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                provider.status === 'active'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {provider.status === 'active' ? t('ai.settings.active') : t('ai.settings.inactive')}
            </span>
          </div>
        </div>

        {/* API Key Section */}
        {apiKeys.length > 0 ? (
          <div className="space-y-3 mb-4">
            {apiKeys.map((key) => (
              <div
                key={key.id}
                className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg px-3 py-2"
              >
                <Key className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">{key.keyName}:</span>
                <code className="font-mono text-xs flex-1 truncate">
                  {maskApiKey(key.id)}
                </code>
                {viewingKeyId === key.id && decryptedKey && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={onCopyKey}
                    title={t('ai.apiKeys.copyKey')}
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${
                    key.isActive
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {key.isActive ? t('ai.settings.enabled') : t('ai.settings.disabled')}
                </span>
                {canEdit && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onViewKey(key.id)}
                      title={t('ai.apiKeys.viewKey')}
                    >
                      {viewingKeyId === key.id ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onEditKey(key.id, key.keyName)}
                      title={t('ai.apiKeys.editKey')}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onToggleKey(key.id, key.isActive)}
                      disabled={togglingKeyId === key.id}
                      title={
                        key.isActive
                          ? t('ai.apiKeys.deactivate')
                          : t('ai.apiKeys.activate')
                      }
                    >
                      {togglingKeyId === key.id ? (
                        <Spinner className="h-3.5 w-3.5" />
                      ) : (
                        <Power
                          className={`h-3.5 w-3.5 ${
                            key.isActive ? 'text-green-600' : 'text-muted-foreground'
                          }`}
                        />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onTestConnection(provider.id)}
                      disabled={isTestingConnection}
                      title={t('ai.settings.testConnection')}
                    >
                      {isTestingConnection ? (
                        <Spinner className="h-3.5 w-3.5" />
                      ) : (
                        <Wifi className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => onDeleteKey(key.id)}
                      title={t('common.delete')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground mb-4 bg-muted/50 rounded-lg px-3 py-3 text-center">
            {t('ai.settings.noKeys')}
          </div>
        )}

        {/* Models Section */}
        <div className="border-t pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              {t('ai.settings.modelsCount', { count: models.length })}
            </span>
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onFetchModels(provider.id)}
                disabled={isFetchingModels}
                className="h-7 text-xs"
              >
                {isFetchingModels ? (
                  <Spinner className="h-3 w-3 mr-1.5" />
                ) : (
                  <RefreshCw className="h-3 w-3 mr-1.5" />
                )}
                {isFetchingModels
                  ? t('ai.settings.fetchingModels')
                  : t('ai.settings.refreshModels')}
              </Button>
            )}
          </div>
          {models.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {models.map((model) => (
                <button
                  key={model.id}
                  onClick={() => canEdit && onSetDefault(model.id, provider.id)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    defaultModelId === model.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  } ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}
                  title={
                    canEdit
                      ? t('ai.settings.setDefault')
                      : model.name
                  }
                >
                  {defaultModelId === model.id && (
                    <Star className="h-3 w-3 fill-current" />
                  )}
                  {model.name || model.modelId}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {t('ai.settings.noModels')}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
