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
import { CreateModelDto, UpdateModelDto } from '../../services/aiModelsApi';

interface ModelDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateModelDto | UpdateModelDto) => void;
  initialData?: UpdateModelDto & { id?: string; providerId?: string };
  providers: { id: string; name: string }[];
  isLoading?: boolean;
}

type FormState = {
  providerId: string;
  name: string;
  modelId: string;
  modelType: 'chat' | 'vision' | 'embedding' | 'text';
  description: string;
  contextWindow: number;
  inputPricePer1m: number;
  outputPricePer1m: number;
  sortOrder: number;
  capabilities: string[];
};

const MODEL_TYPES = ['chat', 'vision', 'embedding', 'text'] as const;

export function ModelDialog({ open, onClose, onSubmit, initialData, providers, isLoading }: ModelDialogProps) {
  const { t } = useTranslation();
  const [form, setForm] = React.useState<FormState>({
    providerId: '',
    name: '',
    modelId: '',
    modelType: 'chat',
    description: '',
    contextWindow: 0,
    inputPricePer1m: 0,
    outputPricePer1m: 0,
    sortOrder: 0,
    capabilities: [],
  });

  React.useEffect(() => {
    if (open) {
      if (initialData) {
        setForm({
          providerId: initialData.providerId || '',
          name: initialData.name || '',
          modelId: (initialData as any).modelId || '',
          modelType: (initialData as any).modelType as 'chat' | 'vision' | 'embedding' | 'text' || 'chat',
          description: initialData.description || '',
          contextWindow: initialData.contextWindow || 0,
          inputPricePer1m: initialData.inputPricePer1m || 0,
          outputPricePer1m: initialData.outputPricePer1m || 0,
          sortOrder: initialData.sortOrder || 0,
          capabilities: initialData.capabilities || [],
        });
      } else {
        setForm({
          providerId: providers[0]?.id || '',
          name: '',
          modelId: '',
          modelType: 'chat',
          description: '',
          contextWindow: 0,
          inputPricePer1m: 0,
          outputPricePer1m: 0,
          sortOrder: 0,
          capabilities: [],
        });
      }
    }
  }, [initialData, open, providers]);

  const handleCapabilityToggle = (cap: string) => {
    setForm(prev => ({
      ...prev,
      capabilities: prev.capabilities.includes(cap)
        ? prev.capabilities.filter(c => c !== cap)
        : [...prev.capabilities, cap],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (initialData?.id) {
      const updateData: UpdateModelDto = {
        name: form.name || undefined,
        description: form.description || undefined,
        contextWindow: form.contextWindow || undefined,
        inputPricePer1m: form.inputPricePer1m || undefined,
        outputPricePer1m: form.outputPricePer1m || undefined,
        sortOrder: form.sortOrder || undefined,
        capabilities: form.capabilities || undefined,
      };
      onSubmit(updateData);
    } else {
      onSubmit(form as CreateModelDto);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="text-lg font-semibold">
            {initialData?.id ? t('ai.models.editModel') : t('ai.models.addModel')}
          </DialogTitle>
        </DialogHeader>

        <form id="modelForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="providerId">{t('ai.models.provider')} *</Label>
            <Select
              value={form.providerId}
              onValueChange={(val) => setForm({ ...form, providerId: val })}
              disabled={!!initialData?.id}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('ai.models.selectProvider')} />
              </SelectTrigger>
              <SelectContent>
                {providers.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('ai.models.name')} *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="GPT-4o"
                className="h-10"
              />
            </div>
            {!initialData?.id && (
              <div className="space-y-2">
                <Label htmlFor="modelId">{t('ai.models.modelId')} *</Label>
                <Input
                  id="modelId"
                  value={form.modelId}
                  onChange={(e) => setForm({ ...form, modelId: e.target.value })}
                  required
                  placeholder="gpt-4o"
                  className="h-10"
                />
              </div>
            )}
          </div>

          {!initialData?.id && (
            <div className="space-y-2">
              <Label htmlFor="modelType">{t('ai.models.type')} *</Label>
              <Select
              value={form.modelType}
              onValueChange={(val) => setForm({ ...form, modelType: val as 'chat' | 'vision' | 'embedding' | 'text' })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODEL_TYPES.map(type => (
                  <SelectItem key={type} value={type}>{t(`ai.models.type${type.charAt(0).toUpperCase() + type.slice(1)}` as any)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="contextWindow">{t('ai.models.contextWindow')}</Label>
            <Input
              id="contextWindow"
              type="number"
              value={form.contextWindow}
              onChange={(e) => setForm({ ...form, contextWindow: parseInt(e.target.value) || 0 })}
              placeholder="128000"
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">{t('ai.models.contextWindowHint')}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inputPrice">{t('ai.models.inputPrice')}</Label>
              <Input
                id="inputPrice"
                type="number"
                step="0.01"
                value={form.inputPricePer1m}
                onChange={(e) => setForm({ ...form, inputPricePer1m: parseFloat(e.target.value) || 0 })}
                placeholder="5.00"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="outputPrice">{t('ai.models.outputPrice')}</Label>
              <Input
                id="outputPrice"
                type="number"
                step="0.01"
                value={form.outputPricePer1m}
                onChange={(e) => setForm({ ...form, outputPricePer1m: parseFloat(e.target.value) || 0 })}
                placeholder="15.00"
                className="h-10"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>{t('ai.models.capabilities')}</Label>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'chat', label: t('ai.models.capChat') },
                { key: 'vision', label: t('ai.models.capVision') },
                { key: 'function_calling', label: t('ai.models.capFunctionCalling') },
                { key: 'json_mode', label: t('ai.models.capJsonMode') },
                { key: 'streaming', label: t('ai.models.capStreaming') },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleCapabilityToggle(key)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    form.capabilities.includes(key)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-input hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('ai.models.description')}</Label>
            <textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-input rounded-md text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
              placeholder={t('ai.models.descriptionPlaceholder')}
            />
          </div>
        </form>

        <DialogFooter className="shrink-0 px-6 py-4 border-t bg-background">
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" form="modelForm" disabled={isLoading}>
              {isLoading ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}