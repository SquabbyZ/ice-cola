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
  DialogFooter,
} from '../ui/dialog';
import { CreateApiKeyDto } from '../../services/aiModelsApi';

interface Provider {
  id: string;
  name: string;
}

interface ApiKeyDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateApiKeyDto) => void;
  providers: Provider[];
  isLoading?: boolean;
}

type FormState = {
  providerId: string;
  keyName: string;
  apiKey: string;
  expiresAt: string;
};

const defaultForm: FormState = {
  providerId: '',
  keyName: '',
  apiKey: '',
  expiresAt: '',
};

export function ApiKeyDialog({ open, onClose, onSubmit, providers, isLoading }: ApiKeyDialogProps) {
  const { t } = useTranslation();
  const [form, setForm] = React.useState<FormState>(defaultForm);

  React.useEffect(() => {
    if (open) {
      setForm(defaultForm);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: CreateApiKeyDto = {
      providerId: form.providerId,
      keyName: form.keyName,
      apiKey: form.apiKey,
      expiresAt: form.expiresAt || undefined,
    };
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="text-lg font-semibold">
            {t('ai.apiKeys.addKey')}
          </DialogTitle>
        </DialogHeader>

        <form id="apiKeyForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="providerId">{t('ai.apiKeys.provider')} *</Label>
            <Select
              value={form.providerId}
              onValueChange={(val) => setForm({ ...form, providerId: val })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('ai.apiKeys.selectProvider')} />
              </SelectTrigger>
              <SelectContent>
                {providers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="keyName">{t('ai.apiKeys.keyName')} *</Label>
            <Input
              id="keyName"
              value={form.keyName}
              onChange={(e) => setForm({ ...form, keyName: e.target.value })}
              required
              placeholder="Production Key"
              className="h-10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">{t('ai.apiKeys.apiKey')} *</Label>
            <textarea
              id="apiKey"
              value={form.apiKey}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
              required
              placeholder={t('ai.apiKeys.apiKeyPlaceholder')}
              className="w-full px-3 py-2 border border-input rounded-md text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiresAt">{t('ai.apiKeys.expiresAt')}</Label>
            <Input
              id="expiresAt"
              type="date"
              value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              className="h-10"
            />
          </div>
        </form>

        <DialogFooter className="shrink-0 px-6 py-4 border-t bg-background">
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" form="apiKeyForm" disabled={isLoading || !form.providerId || !form.keyName || !form.apiKey}>
              {isLoading && <Spinner className="mr-2 size-4" />}
              {isLoading ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
