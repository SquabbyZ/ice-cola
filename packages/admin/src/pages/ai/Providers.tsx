import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Globe, ExternalLink } from 'lucide-react';
import { useProviders, useCreateProvider, useUpdateProvider, useDeleteProvider } from '../../hooks/useAiModels';
import { useAuthStore } from '../../stores/authStore';
import { ProviderDialog } from '../../components/ai/ProviderDialog';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { CreateProviderDto, UpdateProviderDto } from '../../services/aiModelsApi';

export default function Providers() {
  const { t } = useTranslation();
  const { data: providers, isLoading } = useProviders();
  const createProvider = useCreateProvider();
  const updateProvider = useUpdateProvider();
  const deleteProvider = useDeleteProvider();
  const currentUser = useAuthStore((state) => state.user);
  const canEdit = currentUser?.role === 'OWNER' || currentUser?.role === 'ADMIN';

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editData, setEditData] = React.useState<UpdateProviderDto & { id?: string } | undefined>();
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const handleCreate = (data: CreateProviderDto) => {
    createProvider.mutate(data, {
      onSuccess: () => setDialogOpen(false),
    });
  };

  const handleUpdate = (data: UpdateProviderDto) => {
    if (editData?.id) {
      updateProvider.mutate({ id: editData.id, data }, {
        onSuccess: () => setDialogOpen(false),
      });
    }
  };

  const handleEdit = (provider: any) => {
    setEditData(provider);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteProvider.mutate(deleteId);
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
          <h2 className="text-2xl font-bold">{t('ai.providers.title')}</h2>
          <p className="text-gray-500 mt-1">{t('ai.providers.description')}</p>
        </div>
        {canEdit && (
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            {t('ai.providers.addProvider')}
          </Button>
        )}
      </div>

      <div className="bg-card rounded-lg shadow border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('ai.providers.name')}</TableHead>
              <TableHead>{t('ai.providers.code')}</TableHead>
              <TableHead>{t('ai.providers.website')}</TableHead>
              <TableHead>{t('ai.providers.status')}</TableHead>
              <TableHead className="text-right">{t('ai.providers.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {providers?.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  {t('ai.providers.noProviders')}
                </td>
              </tr>
            ) : (
              providers?.map((provider) => (
                <TableRow key={provider.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {provider.logoUrl ? (
                        <img
                          src={provider.logoUrl}
                          alt={provider.name}
                          className="h-8 w-8 rounded object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <span className="font-medium">{provider.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      {provider.code}
                    </code>
                  </TableCell>
                  <TableCell>
                    {provider.websiteUrl ? (
                      <a
                        href={provider.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        {t('ai.providers.visit')}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      provider.status === 'active'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {provider.status === 'active' ? t('ai.providers.active') : t('ai.providers.inactive')}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {canEdit && (
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(provider)}
                          title={t('common.edit')}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(provider.id)}
                          title={t('common.delete')}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ProviderDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        onSubmit={editData?.id ? handleUpdate as any : handleCreate as any}
        initialData={editData}
        isLoading={createProvider.isPending || updateProvider.isPending}
      />

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('ai.providers.confirmDelete')}</DialogTitle>
            <DialogDescription>
              {t('ai.providers.deleteWarning')}
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