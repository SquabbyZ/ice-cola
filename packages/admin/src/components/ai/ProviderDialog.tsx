import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
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
import { CreateProviderDto, UpdateProviderDto } from '../../services/aiModelsApi';

interface ProviderDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProviderDto | UpdateProviderDto) => void;
  initialData?: UpdateProviderDto & { id?: string; code?: string };
  isLoading?: boolean;
}

type FormState = {
  name: string;
  code: string;
  logoUrl: string;
  websiteUrl: string;
  description: string;
  sortOrder: number;
  status: 'active' | 'inactive';
};

export function ProviderDialog({ open, onClose, onSubmit, initialData, isLoading }: ProviderDialogProps) {
  const { t } = useTranslation();
  const [form, setForm] = React.useState<FormState>({
    name: '',
    code: '',
    logoUrl: '',
    websiteUrl: '',
    description: '',
    sortOrder: 0,
    status: 'active',
  });

  React.useEffect(() => {
    if (open) {
      if (initialData) {
        setForm({
          name: initialData.name || '',
          code: initialData.code || '',
          logoUrl: initialData.logoUrl || '',
          websiteUrl: initialData.websiteUrl || '',
          description: initialData.description || '',
          sortOrder: initialData.sortOrder || 0,
          status: initialData.status || 'active',
        });
      } else {
        setForm({
          name: '',
          code: '',
          logoUrl: '',
          websiteUrl: '',
          description: '',
          sortOrder: 0,
          status: 'active',
        });
      }
    }
  }, [initialData, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (initialData?.id) {
      const updateData: UpdateProviderDto = {
        name: form.name || undefined,
        logoUrl: form.logoUrl || undefined,
        websiteUrl: form.websiteUrl || undefined,
        description: form.description || undefined,
        sortOrder: form.sortOrder || undefined,
        status: form.status,
      };
      onSubmit(updateData);
    } else {
      onSubmit(form as CreateProviderDto);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="text-lg font-semibold">
            {initialData?.id ? t('ai.providers.editProvider') : t('ai.providers.addProvider')}
          </DialogTitle>
        </DialogHeader>

        <form id="providerForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">{t('ai.providers.name')} *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="OpenAI"
              className="h-10"
            />
          </div>

          {!initialData?.id && (
            <div className="space-y-2">
              <Label htmlFor="code">{t('ai.providers.code')} *</Label>
              <Input
                id="code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                required
                placeholder="openai"
                className="h-10"
              />
              <p className="text-xs text-muted-foreground">{t('ai.providers.codeHint')}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="logoUrl">{t('ai.providers.logo')}</Label>
            <Input
              id="logoUrl"
              value={form.logoUrl}
              onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
              placeholder="https://..."
              className="h-10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="websiteUrl">{t('ai.providers.website')}</Label>
            <Input
              id="websiteUrl"
              value={form.websiteUrl}
              onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
              placeholder="https://openai.com"
              className="h-10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('ai.providers.description')}</Label>
            <textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-input rounded-md text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
              placeholder={t('ai.providers.descriptionPlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sortOrder">{t('ai.providers.sortOrder')}</Label>
            <Input
              id="sortOrder"
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
              min="0"
              className="h-10"
            />
          </div>

          {initialData?.id && (
            <div className="space-y-2">
              <Label htmlFor="status">{t('ai.providers.status')}</Label>
              <Select
                value={form.status}
                onValueChange={(val) => setForm({ ...form, status: val as 'active' | 'inactive' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t('ai.providers.active')}</SelectItem>
                  <SelectItem value="inactive">{t('ai.providers.inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </form>

        <DialogFooter className="shrink-0 px-6 py-4 border-t bg-background">
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" form="providerForm" disabled={isLoading}>
              {isLoading ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}