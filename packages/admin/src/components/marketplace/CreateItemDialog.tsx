import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Spinner } from '../ui/spinner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  createMarketplaceItem,
  type MarketplaceItemType,
  type CreateMarketplaceItemDto,
} from '../../services/marketplaceApi';

interface CreateItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: MarketplaceItemType;
  onSuccess: () => void;
}

const TYPE_OPTIONS: MarketplaceItemType[] = ['skill', 'mcp', 'plugin', 'expert'];

export default function CreateItemDialog({ open, onOpenChange, defaultType = 'skill', onSuccess }: CreateItemDialogProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<CreateMarketplaceItemDto>({
    type: defaultType,
    name: '',
    slug: '',
    version: '1.0.0',
    description: '',
    author: '',
    category: '',
    tags: [],
    icon: '',
    color: '#6366f1',
  });
  const [tagInput, setTagInput] = useState('');

  const resetForm = () => {
    setForm({
      type: defaultType,
      name: '',
      slug: '',
      version: '1.0.0',
      description: '',
      author: '',
      category: '',
      tags: [],
      icon: '',
      color: '#6366f1',
    });
    setTagInput('');
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !form.tags?.includes(tag)) {
      setForm((prev) => ({ ...prev, tags: [...(prev.tags ?? []), tag] }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setForm((prev) => ({ ...prev, tags: (prev.tags ?? []).filter((t) => t !== tag) }));
  };

  const autoSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.slug.trim()) return;
    setIsSubmitting(true);
    try {
      await createMarketplaceItem(form);
      handleOpenChange(false);
      onSuccess();
    } catch (err) {
      console.error('[CreateItemDialog] Create failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('marketplace.createTitle')}</DialogTitle>
          <DialogDescription>{t('marketplace.listDesc')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Type */}
          <div className="space-y-2">
            <Label>{t('marketplace.type')}</Label>
            <Select
              value={form.type}
              onValueChange={(v) => setForm((prev) => ({ ...prev, type: v as MarketplaceItemType }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((tp) => (
                  <SelectItem key={tp} value={tp}>
                    {t(`marketplace.type${tp.charAt(0).toUpperCase() + tp.slice(1)}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label>{t('marketplace.name')} *</Label>
            <Input
              value={form.name}
              onChange={(e) => {
                const name = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  name,
                  slug: prev.slug ? prev.slug : autoSlug(name),
                }));
              }}
              placeholder="My Awesome Skill"
            />
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <Label>{t('marketplace.slug')} *</Label>
            <Input
              value={form.slug}
              onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
              placeholder={t('marketplace.slugPlaceholder')}
            />
          </div>

          {/* Version */}
          <div className="space-y-2">
            <Label>{t('marketplace.version')}</Label>
            <Input
              value={form.version ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, version: e.target.value }))}
              placeholder="1.0.0"
            />
          </div>

          {/* Author */}
          <div className="space-y-2">
            <Label>{t('marketplace.author')}</Label>
            <Input
              value={form.author ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, author: e.target.value }))}
              placeholder="Author name"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>{t('marketplace.categoryField')}</Label>
            <Input
              value={form.category ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
              placeholder={t('marketplace.categoryPlaceholder')}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>{t('marketplace.description')}</Label>
            <Textarea
              value={form.description ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              placeholder="Describe this item..."
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
                {form.tags.map((tag) => (
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
                onChange={(e) => setForm((prev) => ({ ...prev, icon: e.target.value }))}
                placeholder={t('marketplace.iconPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('marketplace.color')}</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={form.color ?? '#6366f1'}
                  onChange={(e) => setForm((prev) => ({ ...prev, color: e.target.value }))}
                  className="w-10 h-9 rounded border cursor-pointer"
                />
                <Input
                  value={form.color ?? ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, color: e.target.value }))}
                  placeholder="#6366f1"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {t('marketplace.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !form.name.trim() || !form.slug.trim()}>
            {isSubmitting && <Spinner className="mr-2 size-4" />}
            {isSubmitting ? t('marketplace.creating') : t('marketplace.createItem')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
