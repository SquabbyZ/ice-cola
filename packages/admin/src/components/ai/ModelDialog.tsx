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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { CreateModelDto, UpdateModelDto } from '../../services/aiModelsApi';

type ModelType = 'chat' | 'vision' | 'embedding' | 'text';

interface ModelDialogInitialData {
  id?: string;
  providerId?: string;
  name?: string;
  modelId?: string;
  modelType?: string;
  displayName?: string;
  rank?: number;
  costMultiplier?: number;
  requiredPlanLevel?: number;
  isCatalogVisible?: boolean;
  description?: string;
  contextWindow?: number;
  inputPricePer1m?: number;
  outputPricePer1m?: number;
  sortOrder?: number;
  capabilities?: string[];
}

interface ModelDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateModelDto | UpdateModelDto) => void;
  initialData?: ModelDialogInitialData;
  providers: { id: string; name: string }[];
  isLoading?: boolean;
}

type FormState = {
  providerId: string;
  name: string;
  modelId: string;
  modelType: ModelType;
  displayName: string;
  rank: string;
  costMultiplier: string;
  requiredPlanLevel: string;
  isCatalogVisible: boolean;
  description: string;
  contextWindow: string;
  inputPricePer1m: string;
  outputPricePer1m: string;
  sortOrder: string;
  capabilities: string[];
};

const MODEL_TYPES: ModelType[] = ['chat', 'vision', 'embedding', 'text'];

const MODEL_TYPE_LABEL_KEYS: Record<ModelType, string> = {
  chat: 'ai.models.typeChat',
  vision: 'ai.models.typeVision',
  embedding: 'ai.models.typeEmbedding',
  text: 'ai.models.typeText',
};

const isModelType = (value: string | undefined): value is ModelType => (
  value !== undefined && MODEL_TYPES.includes(value as ModelType)
);

const numberToInputValue = (value: number | undefined, defaultValue: number): string => (
  String(value ?? defaultValue)
);

const parseOptionalInteger = (value: string): number | undefined => {
  const parsedValue = Number.parseInt(value, 10);
  return Number.isNaN(parsedValue) ? undefined : parsedValue;
};

const parseOptionalFloat = (value: string): number | undefined => {
  const parsedValue = Number.parseFloat(value);
  return Number.isNaN(parsedValue) ? undefined : parsedValue;
};

const parseIntegerWithDefault = (value: string, defaultValue: number): number => (
  parseOptionalInteger(value) ?? defaultValue
);

const parseFloatWithDefault = (value: string, defaultValue: number): number => (
  parseOptionalFloat(value) ?? defaultValue
);

const createEmptyForm = (providerId: string): FormState => ({
  providerId,
  name: '',
  modelId: '',
  modelType: 'chat',
  displayName: '',
  rank: '1',
  costMultiplier: '1',
  requiredPlanLevel: '0',
  isCatalogVisible: true,
  description: '',
  contextWindow: '0',
  inputPricePer1m: '0',
  outputPricePer1m: '0',
  sortOrder: '0',
  capabilities: [],
});

export function ModelDialog({ open, onClose, onSubmit, initialData, providers, isLoading }: ModelDialogProps) {
  const { t } = useTranslation();
  const [form, setForm] = React.useState<FormState>(createEmptyForm(''));

  React.useEffect(() => {
    if (!open) {
      return;
    }

    if (!initialData) {
      setForm(createEmptyForm(providers[0]?.id || ''));
      return;
    }

    setForm({
      providerId: initialData.providerId || '',
      name: initialData.name || '',
      modelId: initialData.modelId || '',
      modelType: isModelType(initialData.modelType) ? initialData.modelType : 'chat',
      displayName: initialData.displayName || '',
      rank: numberToInputValue(initialData.rank, 1),
      costMultiplier: numberToInputValue(initialData.costMultiplier, 1),
      requiredPlanLevel: numberToInputValue(initialData.requiredPlanLevel, 0),
      isCatalogVisible: initialData.isCatalogVisible ?? true,
      description: initialData.description || '',
      contextWindow: numberToInputValue(initialData.contextWindow, 0),
      inputPricePer1m: numberToInputValue(initialData.inputPricePer1m, 0),
      outputPricePer1m: numberToInputValue(initialData.outputPricePer1m, 0),
      sortOrder: numberToInputValue(initialData.sortOrder, 0),
      capabilities: initialData.capabilities || [],
    });
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
        name: form.name,
        displayName: form.displayName,
        description: form.description,
        contextWindow: parseOptionalInteger(form.contextWindow),
        inputPricePer1m: parseOptionalFloat(form.inputPricePer1m),
        outputPricePer1m: parseOptionalFloat(form.outputPricePer1m),
        sortOrder: parseOptionalInteger(form.sortOrder),
        rank: parseIntegerWithDefault(form.rank, 1),
        costMultiplier: parseFloatWithDefault(form.costMultiplier, 1),
        requiredPlanLevel: parseIntegerWithDefault(form.requiredPlanLevel, 0),
        isCatalogVisible: form.isCatalogVisible,
        capabilities: form.capabilities,
      };
      onSubmit(updateData);
      return;
    }

    const createData: CreateModelDto = {
      providerId: form.providerId,
      name: form.name,
      modelId: form.modelId,
      modelType: form.modelType,
      displayName: form.displayName || undefined,
      rank: parseIntegerWithDefault(form.rank, 1),
      costMultiplier: parseFloatWithDefault(form.costMultiplier, 1),
      requiredPlanLevel: parseIntegerWithDefault(form.requiredPlanLevel, 0),
      isCatalogVisible: form.isCatalogVisible,
      description: form.description || undefined,
      contextWindow: parseOptionalInteger(form.contextWindow),
      inputPricePer1m: parseOptionalFloat(form.inputPricePer1m),
      outputPricePer1m: parseOptionalFloat(form.outputPricePer1m),
      sortOrder: parseOptionalInteger(form.sortOrder),
      capabilities: form.capabilities,
    };
    onSubmit(createData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="text-lg font-semibold">
            {initialData?.id ? t('ai.models.editModel') : t('ai.models.addModel')}
          </DialogTitle>
          <DialogDescription>{t('ai.models.dialogDescription')}</DialogDescription>
        </DialogHeader>

        <form id="modelForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          <div className="space-y-2">
            <Label id="providerIdLabel" htmlFor="providerId">{t('ai.models.provider')} *</Label>
            <Select
              value={form.providerId}
              onValueChange={(val) => setForm({ ...form, providerId: val })}
              disabled={!!initialData?.id}
            >
              <SelectTrigger id="providerId" aria-labelledby="providerIdLabel" className="w-full">
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
              <Label id="modelTypeLabel" htmlFor="modelType">{t('ai.models.type')} *</Label>
              <Select
                value={form.modelType}
                onValueChange={(val) => {
                  if (isModelType(val)) {
                    setForm({ ...form, modelType: val });
                  }
                }}
              >
                <SelectTrigger id="modelType" aria-labelledby="modelTypeLabel" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODEL_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{t(MODEL_TYPE_LABEL_KEYS[type])}</SelectItem>
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
              onChange={(e) => setForm(prev => ({
                ...prev,
                contextWindow: e.target.value,
              }))}
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
                onChange={(e) => setForm(prev => ({
                  ...prev,
                  inputPricePer1m: e.target.value,
                }))}
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
                onChange={(e) => setForm(prev => ({
                  ...prev,
                  outputPricePer1m: e.target.value,
                }))}
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
                <Button
                  key={key}
                  type="button"
                  variant={form.capabilities.includes(key) ? 'default' : 'outline'}
                  size="sm"
                  aria-pressed={form.capabilities.includes(key)}
                  onClick={() => handleCapabilityToggle(key)}
                  className="rounded-full"
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-4 rounded-lg border p-4">
            <div>
              <h3 className="text-sm font-medium">{t('ai.models.clientCatalog')}</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">{t('ai.models.displayName')}</Label>
                <Input
                  id="displayName"
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  placeholder={t('ai.models.displayNamePlaceholder')}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rank">{t('ai.models.rank')}</Label>
                <Input
                  id="rank"
                  type="number"
                  value={form.rank}
                  onChange={(e) => setForm(prev => ({
                    ...prev,
                    rank: e.target.value,
                  }))}
                  className="h-10"
                />
                <p className="text-xs text-muted-foreground">{t('ai.models.rankHint')}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="costMultiplier">{t('ai.models.costMultiplier')}</Label>
                <Input
                  id="costMultiplier"
                  type="number"
                  step="0.1"
                  value={form.costMultiplier}
                  onChange={(e) => setForm(prev => ({
                    ...prev,
                    costMultiplier: e.target.value,
                  }))}
                  className="h-10"
                />
                <p className="text-xs text-muted-foreground">{t('ai.models.costMultiplierHint')}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="requiredPlanLevel">{t('ai.models.requiredPlanLevel')}</Label>
                <Input
                  id="requiredPlanLevel"
                  type="number"
                  value={form.requiredPlanLevel}
                  onChange={(e) => setForm(prev => ({
                    ...prev,
                    requiredPlanLevel: e.target.value,
                  }))}
                  className="h-10"
                />
                <p className="text-xs text-muted-foreground">{t('ai.models.requiredPlanLevelHint')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="isCatalogVisible"
                type="checkbox"
                checked={form.isCatalogVisible}
                onChange={(e) => setForm({ ...form, isCatalogVisible: e.target.checked })}
                className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
              />
              <Label htmlFor="isCatalogVisible">{t('ai.models.isCatalogVisible')}</Label>
              <span className="text-xs text-muted-foreground">
                {form.isCatalogVisible ? t('ai.models.visible') : t('ai.models.hidden')}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('ai.models.description')}</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="resize-none"
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
