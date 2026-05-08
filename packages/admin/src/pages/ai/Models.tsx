import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useModels, useProviders, useCreateModel, useUpdateModel, useDeleteModel } from '../../hooks/useAiModels';
import { useAuthStore } from '../../stores/authStore';
import { ModelDialog } from '../../components/ai/ModelDialog';
import { Button } from '../../components/ui/button';
import { Spinner } from '../../components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { CreateModelDto, UpdateModelDto } from '../../services/aiModelsApi';

export default function Models() {
  const { t } = useTranslation();
  const { data: models, isLoading } = useModels();
  const { data: providers } = useProviders();
  const createModel = useCreateModel();
  const updateModel = useUpdateModel();
  const deleteModel = useDeleteModel();
  const currentUser = useAuthStore((state) => state.user);
  const canEdit = currentUser?.role === 'OWNER' || currentUser?.role === 'ADMIN';

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editData, setEditData] = React.useState<UpdateModelDto & { id?: string; providerId?: string } | undefined>();
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());
  const [filterProvider, setFilterProvider] = React.useState<string>('');
  const [filterType, setFilterType] = React.useState<string>('');
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const filteredModels = models?.filter(m => {
    if (filterProvider && filterProvider !== 'all' && m.providerId !== filterProvider) return false;
    if (filterType && filterType !== 'all' && m.modelType !== filterType) return false;
    return true;
  });

  const handleCreate = (data: CreateModelDto) => {
    createModel.mutate(data, {
      onSuccess: () => setDialogOpen(false),
    });
  };

  const handleUpdate = (data: UpdateModelDto) => {
    if (editData?.id) {
      updateModel.mutate({ id: editData.id, data }, {
        onSuccess: () => setDialogOpen(false),
      });
    }
  };

  const handleEdit = (model: any) => {
    setEditData(model);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteModel.mutate(deleteId);
      setDeleteId(null);
    }
  };

  const handleAdd = () => {
    setEditData(undefined);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditData(undefined);
  };

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const formatPrice = (price?: number) => {
    if (!price) return '-';
    return `$${price.toFixed(2)}/1M`;
  };

  const formatContextWindow = (tokens?: number) => {
    if (!tokens) return '-';
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(0)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(0)}K`;
    return tokens.toString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{t('ai.models.title')}</h2>
          <p className="text-gray-500 mt-1">{t('ai.models.description')}</p>
        </div>
        {canEdit && (
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            {t('ai.models.addModel')}
          </Button>
        )}
      </div>

      <div className="flex gap-4 mb-4">
        <Select value={filterProvider} onValueChange={setFilterProvider}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('ai.models.allProviders')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('ai.models.allProviders')}</SelectItem>
            {providers?.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('ai.models.allTypes')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('ai.models.allTypes')}</SelectItem>
            <SelectItem value="chat">{t('ai.models.typeChat')}</SelectItem>
            <SelectItem value="vision">{t('ai.models.typeVision')}</SelectItem>
            <SelectItem value="embedding">{t('ai.models.typeEmbedding')}</SelectItem>
            <SelectItem value="text">{t('ai.models.typeText')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-lg shadow border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>{t('ai.models.name')}</TableHead>
              <TableHead>{t('ai.models.modelId')}</TableHead>
              <TableHead>{t('ai.models.type')}</TableHead>
              <TableHead>{t('ai.models.contextWindow')}</TableHead>
              <TableHead>{t('ai.models.price')}</TableHead>
              <TableHead className="text-right">{t('ai.models.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredModels?.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  {t('ai.models.noModels')}
                </td>
              </tr>
            ) : (
              filteredModels?.map((model) => (
                <React.Fragment key={model.id}>
                  <TableRow>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => toggleRow(model.id)}
                      >
                        {expandedRows.has(model.id) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">{model.name}</TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">{model.modelId || '-'}</code>
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                        {t(`ai.models.type${model.modelType.charAt(0).toUpperCase() + model.modelType.slice(1)}` as any)}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatContextWindow(model.contextWindow)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="text-muted-foreground">{t('ai.models.inputPriceShort')} {formatPrice(model.inputPricePer1m)}</span>
                        <br />
                        <span className="text-muted-foreground">{t('ai.models.outputPriceShort')} {formatPrice(model.outputPricePer1m)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {canEdit && (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(model)}
                            title={t('common.edit')}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(model.id)}
                            title={t('common.delete')}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                  {expandedRows.has(model.id) && (
                    <TableRow>
                      <td colSpan={7} className="px-4 py-3">
                        <div className="space-y-2 text-sm">
                          {model.providerName && (
                            <p><span className="font-medium">{t('ai.models.provider')}:</span> {model.providerName}</p>
                          )}
                          {model.description && (
                            <p><span className="font-medium">{t('ai.models.description')}:</span> {model.description}</p>
                          )}
                          {model.capabilities && model.capabilities.length > 0 && (
                            <p>
                              <span className="font-medium">{t('ai.models.capabilities')}:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {model.capabilities.map((cap: string) => (
                                  <span key={cap} className="px-2 py-0.5 bg-muted rounded text-xs">
                                    {t(`ai.models.cap${cap.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join('')}` as any) || cap}
                                  </span>
                                ))}
                              </div>
                            </p>
                          )}
                        </div>
                      </td>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ModelDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        onSubmit={editData?.id ? handleUpdate as any : handleCreate as any}
        initialData={editData}
        providers={providers?.map(p => ({ id: p.id, name: p.name })) || []}
        isLoading={createModel.isPending || updateModel.isPending}
      />

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('ai.models.confirmDelete')}</DialogTitle>
            <DialogDescription>
              {t('ai.models.deleteWarning')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}