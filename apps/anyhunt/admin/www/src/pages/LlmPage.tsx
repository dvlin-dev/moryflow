/**
 * LLM Configuration Page
 *
 * [PROPS]: None
 * [POS]: Admin - LLM Providers/Models/Defaults 管理（后端存储密钥并加密）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  PageHeader,
} from '@anyhunt/ui';
import {
  useAdminLlmModels,
  useAdminLlmProviders,
  useAdminLlmSettings,
  useCreateAdminLlmModel,
  useCreateAdminLlmProvider,
  useDeleteAdminLlmModel,
  useDeleteAdminLlmProvider,
  useUpdateAdminLlmModel,
  useUpdateAdminLlmProvider,
  useUpdateAdminLlmSettings,
  type LlmModelListItem,
  type LlmProviderListItem,
  type UpdateLlmSettingsInput,
} from '@/features/llm';
import { LlmSettingsCard } from './llm/LlmSettingsCard';
import { LlmProvidersCard } from './llm/LlmProvidersCard';
import { LlmModelsCard } from './llm/LlmModelsCard';
import { LlmProviderDialog } from './llm/LlmProviderDialog';
import { LlmModelDialog } from './llm/LlmModelDialog';

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

export default function LlmPage() {
  const settingsQuery = useAdminLlmSettings();
  const providersQuery = useAdminLlmProviders();
  const modelsQuery = useAdminLlmModels();

  const updateSettingsMutation = useUpdateAdminLlmSettings();
  const createProviderMutation = useCreateAdminLlmProvider();
  const updateProviderMutation = useUpdateAdminLlmProvider();
  const deleteProviderMutation = useDeleteAdminLlmProvider();
  const createModelMutation = useCreateAdminLlmModel();
  const updateModelMutation = useUpdateAdminLlmModel();
  const deleteModelMutation = useDeleteAdminLlmModel();

  const providers = providersQuery.data ?? [];
  const models = modelsQuery.data ?? [];

  const enabledProviderIds = useMemo(() => {
    return new Set(providers.filter((p) => p.enabled).map((p) => p.id));
  }, [providers]);

  const modelOptions = useMemo(() => {
    const available = models
      .filter((m) => m.enabled && enabledProviderIds.has(m.providerId))
      .map((m) => m.modelId);
    const defaults = settingsQuery.data
      ? [settingsQuery.data.defaultAgentModelId, settingsQuery.data.defaultExtractModelId]
      : [];
    return uniqueStrings([...available, ...defaults].filter(Boolean));
  }, [enabledProviderIds, models, settingsQuery.data]);

  const initialSettings = useMemo<UpdateLlmSettingsInput | null>(() => {
    if (!settingsQuery.data) return null;
    return {
      defaultAgentModelId: settingsQuery.data.defaultAgentModelId,
      defaultExtractModelId: settingsQuery.data.defaultExtractModelId,
    };
  }, [settingsQuery.data]);

  const [providerDialogOpen, setProviderDialogOpen] = useState(false);
  const [providerDialogMode, setProviderDialogMode] = useState<'create' | 'edit'>('create');
  const [activeProvider, setActiveProvider] = useState<LlmProviderListItem | null>(null);

  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [modelDialogMode, setModelDialogMode] = useState<'create' | 'edit'>('create');
  const [activeModel, setActiveModel] = useState<LlmModelListItem | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmDescription, setConfirmDescription] = useState('');
  const [confirmAction, setConfirmAction] = useState<null | (() => Promise<void>)>(null);

  const isMutating =
    updateSettingsMutation.isPending ||
    createProviderMutation.isPending ||
    updateProviderMutation.isPending ||
    deleteProviderMutation.isPending ||
    createModelMutation.isPending ||
    updateModelMutation.isPending ||
    deleteModelMutation.isPending;

  const handleResetSettings = () => {
    void (async () => {
      try {
        await Promise.all([
          settingsQuery.refetch(),
          providersQuery.refetch(),
          modelsQuery.refetch(),
        ]);
        toast.message('Synced from server');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to sync');
      }
    })();
  };

  const handleSaveSettings = async (input: UpdateLlmSettingsInput) => {
    try {
      await updateSettingsMutation.mutateAsync(input);
      toast.success('Saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save');
    }
  };

  const openCreateProvider = () => {
    setProviderDialogMode('create');
    setActiveProvider(null);
    setProviderDialogOpen(true);
  };

  const openEditProvider = (provider: LlmProviderListItem) => {
    setProviderDialogMode('edit');
    setActiveProvider(provider);
    setProviderDialogOpen(true);
  };

  const requestDeleteProvider = (provider: LlmProviderListItem) => {
    setConfirmTitle('Delete provider');
    setConfirmDescription(
      `Delete provider "${provider.name}"? This will also delete its model mappings.`
    );
    setConfirmAction(() => async () => {
      await deleteProviderMutation.mutateAsync(provider.id);
    });
    setConfirmOpen(true);
  };

  const openCreateModel = () => {
    if (providers.length === 0) {
      toast.message('Create a provider first');
      return;
    }
    setModelDialogMode('create');
    setActiveModel(null);
    setModelDialogOpen(true);
  };

  const openEditModel = (model: LlmModelListItem) => {
    setModelDialogMode('edit');
    setActiveModel(model);
    setModelDialogOpen(true);
  };

  const requestDeleteModel = (model: LlmModelListItem) => {
    setConfirmTitle('Delete model mapping');
    setConfirmDescription(`Delete model mapping "${model.modelId}"?`);
    setConfirmAction(() => async () => {
      await deleteModelMutation.mutateAsync(model.id);
    });
    setConfirmOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="LLM"
        description="Configure providers, model mappings, and default models for Agent/Extract usage."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <LlmSettingsCard
          isLoading={settingsQuery.isLoading || providersQuery.isLoading || modelsQuery.isLoading}
          errorMessage={
            settingsQuery.isError
              ? settingsQuery.error instanceof Error
                ? settingsQuery.error.message
                : 'Failed to load settings'
              : null
          }
          isSaving={updateSettingsMutation.isPending}
          initialValues={initialSettings}
          modelOptions={modelOptions}
          onSave={handleSaveSettings}
          onReset={handleResetSettings}
        />

        <div className="space-y-6">
          <LlmProvidersCard
            isLoading={providersQuery.isLoading}
            errorMessage={
              providersQuery.isError
                ? providersQuery.error instanceof Error
                  ? providersQuery.error.message
                  : 'Failed to load providers'
                : null
            }
            isMutating={isMutating}
            providers={providers}
            onNew={openCreateProvider}
            onEdit={openEditProvider}
            onDelete={requestDeleteProvider}
          />
        </div>
      </div>

      <LlmModelsCard
        isLoading={modelsQuery.isLoading}
        errorMessage={
          modelsQuery.isError
            ? modelsQuery.error instanceof Error
              ? modelsQuery.error.message
              : 'Failed to load models'
            : null
        }
        isMutating={isMutating}
        models={models}
        onNew={openCreateModel}
        onEdit={openEditModel}
        onDelete={requestDeleteModel}
      />

      <LlmProviderDialog
        open={providerDialogOpen}
        mode={providerDialogMode}
        provider={activeProvider}
        isSubmitting={createProviderMutation.isPending || updateProviderMutation.isPending}
        onClose={() => setProviderDialogOpen(false)}
        onCreate={async (input) => {
          try {
            await createProviderMutation.mutateAsync(input);
            toast.success('Created');
            setProviderDialogOpen(false);
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to create');
          }
        }}
        onUpdate={async (providerId, input) => {
          try {
            await updateProviderMutation.mutateAsync({ providerId, input });
            toast.success('Saved');
            setProviderDialogOpen(false);
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to save');
          }
        }}
      />

      <LlmModelDialog
        open={modelDialogOpen}
        mode={modelDialogMode}
        model={activeModel}
        providers={providers}
        isSubmitting={createModelMutation.isPending || updateModelMutation.isPending}
        onClose={() => setModelDialogOpen(false)}
        onCreate={async (input) => {
          try {
            await createModelMutation.mutateAsync(input);
            toast.success('Created');
            setModelDialogOpen(false);
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to create');
          }
        }}
        onUpdate={async (llmModelId, input) => {
          try {
            await updateModelMutation.mutateAsync({ llmModelId, input });
            toast.success('Saved');
            setModelDialogOpen(false);
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to save');
          }
        }}
      />

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(next) => {
          setConfirmOpen(next);
          if (!next) {
            setConfirmAction(null);
            setConfirmTitle('');
            setConfirmDescription('');
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!confirmAction || isMutating}
              onClick={(event) => {
                event.preventDefault();
                if (!confirmAction) return;
                void (async () => {
                  try {
                    await confirmAction();
                    toast.success('Deleted');
                    setConfirmOpen(false);
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : 'Failed to delete');
                  }
                })();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
