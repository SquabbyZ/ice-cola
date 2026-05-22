import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Spinner } from '../ui/spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Provider } from '../../services/aiModelsApi';

const MINIMAX_PLACEHOLDER_API_KEY = '123';

const defaultProviderUrls: Record<string, string> = {
  openai: 'https://api.openai.com',
  anthropic: 'https://api.anthropic.com',
  minimax: 'https://api.minimaxi.com/anthropic',
  deepseek: 'https://api.deepseek.com',
  google: 'https://generativelanguage.googleapis.com',
  moonshot: 'https://api.moonshot.cn',
  zhipu: 'https://open.bigmodel.cn',
  baichuan: 'https://api.baichuan-ai.com',
  alibaba: 'https://dashscope.aliyuncs.com',
  baidu: 'https://aip.baidubce.com',
  siliconflow: 'https://api.siliconflow.cn',
  together: 'https://api.together.xyz',
  groq: 'https://api.groq.com',
  cerebras: 'https://api.cerebras.ai',
  cohere: 'https://api.cohere.com',
  mistral: 'https://api.mistral.ai',
  fireworks: 'https://api.fireworks.ai',
  xai: 'https://api.x.ai',
  ollama: 'http://localhost:11434',
  openrouter: 'https://openrouter.ai',
};

interface AddProviderDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    providerId: string;
    keyName: string;
    apiKey: string;
    endpointUrl?: string;
  }) => void;
  providers: Provider[];
  existingProviderIds: string[];
  isLoading?: boolean;
}

export function AddProviderDialog({
  open,
  onClose,
  onSubmit,
  providers,
  existingProviderIds,
  isLoading,
}: AddProviderDialogProps) {
  const { t } = useTranslation();
  const [providerId, setProviderId] = React.useState('');
  const [keyName, setKeyName] = React.useState('');
  const [apiKey, setApiKey] = React.useState('');
  const [endpointUrl, setEndpointUrl] = React.useState('');
  const [showEndpoint, setShowEndpoint] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setProviderId('');
      setKeyName('');
      setApiKey('');
      setEndpointUrl('');
      setShowEndpoint(false);
    }
  }, [open]);

  const availableProviders = React.useMemo(
    () => providers.filter((p) => !existingProviderIds.includes(p.id)),
    [providers, existingProviderIds],
  );

  const selectedProvider = providers.find((p) => p.id === providerId);

  React.useEffect(() => {
    if (selectedProvider) {
      const defaultUrl = defaultProviderUrls[selectedProvider.code];
      setEndpointUrl(defaultUrl || '');
      setApiKey(selectedProvider.code === 'minimax' ? MINIMAX_PLACEHOLDER_API_KEY : '');
    }
  }, [selectedProvider]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      providerId,
      keyName,
      apiKey,
      endpointUrl: endpointUrl || undefined,
    });
  };

  const isValid = providerId && keyName.trim() && apiKey.trim();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="text-lg font-semibold">
            {t('ai.settings.addProvider')}
          </DialogTitle>
          <DialogDescription>{t('ai.apiKeys.description')}</DialogDescription>
        </DialogHeader>

        <form
          id="addProviderForm"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 py-4 space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor="provider">{t('ai.apiKeys.provider')} *</Label>
            <Select value={providerId} onValueChange={setProviderId}>
              <SelectTrigger>
                <SelectValue placeholder={t('ai.apiKeys.selectProvider')} />
              </SelectTrigger>
              <SelectContent>
                {availableProviders.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="keyName">{t('ai.apiKeys.keyName')} *</Label>
            <Input
              id="keyName"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              required
              placeholder="Production Key"
              className="h-10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">{t('ai.apiKeys.apiKey')} *</Label>
            <textarea
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
              placeholder={t('ai.apiKeys.apiKeyPlaceholder')}
              className="w-full px-3 py-2 border border-input rounded-md text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring font-mono"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="endpointUrl">{t('ai.settings.endpointUrl')}</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => setShowEndpoint(!showEndpoint)}
              >
                {showEndpoint ? t('ai.settings.hideEndpoint') : t('ai.settings.showEndpoint')}
              </Button>
            </div>
            {showEndpoint && (
              <Input
                id="endpointUrl"
                value={endpointUrl}
                onChange={(e) => setEndpointUrl(e.target.value)}
                placeholder="https://api.example.com"
                className="h-10"
              />
            )}
            {!showEndpoint && selectedProvider && (
              <p className="text-xs text-muted-foreground">
                {defaultProviderUrls[selectedProvider.code]
                  ? t('ai.settings.usingDefaultEndpoint', { url: defaultProviderUrls[selectedProvider.code] })
                  : t('ai.settings.noDefaultEndpoint')}
              </p>
            )}
          </div>
        </form>

        <DialogFooter className="shrink-0 px-6 py-4 border-t bg-background">
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              form="addProviderForm"
              disabled={isLoading || !isValid}
            >
              {isLoading && <Spinner className="mr-2 size-4" />}
              {isLoading ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
