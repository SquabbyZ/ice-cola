import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Spinner } from '../ui/spinner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  updateMarketplaceItem,
  type MarketplaceItem,
  type MarketplaceItemStatus,
  type UpdateMarketplaceItemDto,
} from '../../services/marketplaceApi';

interface EditItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: MarketplaceItem | null;
  onSuccess: () => void;
}

const STATUS_OPTIONS: MarketplaceItemStatus[] = ['draft', 'pending_approval', 'approved', 'archived', 'rejected'];

export default function EditItemDialog({ open, onOpenChange, item, onSuccess }: EditItemDialogProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<UpdateMarketplaceItemDto>({});
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (item && open) {
      const raw = item as any;
      let tags: string[] = [];
      if (Array.isArray(raw.tags)) {
        tags = raw.tags;
      } else if (typeof raw.tags === 'string') {
        try { tags = JSON.parse(raw.tags); } catch { tags = []; }
      }
      setForm({
        name: item.name,
        version: item.version,
        description: item.description,
        category: item.category,
        status: item.status,
        tags,
        icon: raw.icon ?? '',
        color: raw.color ?? '#6366f1',
      });
    }
  }, [item, open]);

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !(form.tags ?? []).includes(tag)) {
      setForm((prev: UpdateMarketplaceItemDto) => ({ ...prev, tags: [...(prev.tags ?? []), tag] }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setForm((prev: UpdateMarketplaceItemDto) => ({ ...prev, tags: (prev.tags ?? []).filter((t) => t !== tag) }));
  };

  const handleSubmit = async () => {
    if (!item) return;
    setIsSubmitting(true);
    try {
      await updateMarketplaceItem(item.id, form);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      console.error('[EditItemDialog] Update failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('marketplace.editTitle')}</DialogTitle>
        </DialogHeader>

        {item && (
          <div className="space-y-4 py-2">
            {/* Status */}
            <div className="space-y-2">
              <Label>{t('marketplace.status')}</Label>
              <Select
                value={form.status ?? item.status}
                onValueChange={(v) => setForm((prev: UpdateMarketplaceItemDto) => ({ ...prev, status: v as MarketplaceItemStatus }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label>{t('marketplace.name')}</Label>
              <Input
                value={form.name ?? ''}
                onChange={(e) => setForm((prev: UpdateMarketplaceItemDto) => ({ ...prev, name: e.target.value }))}
              />
            </div>

            {/* Version */}
            <div className="space-y-2">
              <Label>{t('marketplace.version')}</Label>
              <Input
                value={form.version ?? ''}
                onChange={(e) => setForm((prev: UpdateMarketplaceItemDto) => ({ ...prev, version: e.target.value }))}
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>{t('marketplace.categoryField')}</Label>
              <Input
                value={form.category ?? ''}
                onChange={(e) => setForm((prev: UpdateMarketplaceItemDto) => ({ ...prev, category: e.target.value }))}
                placeholder={t('marketplace.categoryPlaceholder')}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>{t('marketplace.description')}</Label>
              <Textarea
                value={form.description ?? ''}
                onChange={(e) => setForm((prev: UpdateMarketplaceItemDto) => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>{t('marketplace.tags')}</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder={t('marketplace.tagsPlaceholder')}
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="sm" onClick={handleAddTag}>
                  +
                </Button>
              </div>
              {form.tags && form.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {form.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-secondary rounded-md"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Icon & Color */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('marketplace.icon')}</Label>
                <Input
                  value={form.icon ?? ''}
                  onChange={(e) => setForm((prev: UpdateMarketplaceItemDto) => ({ ...prev, icon: e.target.value }))}
                  placeholder={t('marketplace.iconPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('marketplace.color')}</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={form.color ?? '#6366f1'}
                    onChange={(e) => setForm((prev: UpdateMarketplaceItemDto) => ({ ...prev, color: e.target.value }))}
                    className="w-10 h-9 rounded border cursor-pointer"
                  />
                  <Input
                    value={form.color ?? ''}
                    onChange={(e) => setForm((prev: UpdateMarketplaceItemDto) => ({ ...prev, color: e.target.value }))}
                    placeholder="#6366f1"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('marketplace.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Spinner className="mr-2 size-4" />}
            {isSubmitting ? t('marketplace.updating') : t('marketplace.editItem')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
