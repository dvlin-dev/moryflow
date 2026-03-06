/**
 * [PROVIDES]: useLlmPageController
 * [DEPENDS]: llm hooks + sonner
 * [POS]: LlmPage 容器层状态与行为编排
 */

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import type {
  CreateLlmModelInput,
  CreateLlmProviderInput,
  LlmModelListItem,
  LlmProviderListItem,
  UpdateLlmModelInput,
  UpdateLlmProviderInput,
  UpdateLlmSettingsInput,
} from './types';
import {
  useAdminLlmModels,
  useAdminLlmProviders,
  useAdminLlmProviderPresets,
  useAdminLlmSettings,
  useCreateAdminLlmModel,
  useCreateAdminLlmProvider,
  useDeleteAdminLlmModel,
  useDeleteAdminLlmProvider,
  useUpdateAdminLlmModel,
  useUpdateAdminLlmProvider,
  useUpdateAdminLlmSettings,
} from './hooks';

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

interface ProviderDialogState {
  open: boolean;
  mode: 'create' | 'edit';
  provider: LlmProviderListItem | null;
}

interface ModelDialogState {
  open: boolean;
  mode: 'create' | 'edit';
  model: LlmModelListItem | null;
}

interface ConfirmDialogState {
  open: boolean;
  title: string;
  description: string;
  action: null | (() => Promise<void>);
}

export function useLlmPageController() {
  const settingsQuery = useAdminLlmSettings();
  const providersQuery = useAdminLlmProviders();
  const providerPresetsQuery = useAdminLlmProviderPresets();
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
  const providerPresets = providerPresetsQuery.data?.providers ?? [];

  const enabledProviderIds = useMemo(
    () => new Set(providers.filter((provider) => provider.enabled).map((provider) => provider.id)),
    [providers]
  );

  const modelOptions = useMemo(() => {
    const available = models
      .filter((model) => model.enabled && enabledProviderIds.has(model.providerId))
      .map((model) => model.modelId);
    const defaults = settingsQuery.data
      ? [settingsQuery.data.defaultAgentModelId, settingsQuery.data.defaultExtractModelId]
      : [];
    return uniqueStrings([...available, ...defaults].filter(Boolean));
  }, [enabledProviderIds, models, settingsQuery.data]);

  const initialSettings = useMemo<UpdateLlmSettingsInput | null>(() => {
    if (!settingsQuery.data) {
      return null;
    }

    return {
      defaultAgentModelId: settingsQuery.data.defaultAgentModelId,
      defaultExtractModelId: settingsQuery.data.defaultExtractModelId,
    };
  }, [settingsQuery.data]);

  const [providerDialog, setProviderDialog] = useState<ProviderDialogState>({
    open: false,
    mode: 'create',
    provider: null,
  });
  const [modelDialog, setModelDialog] = useState<ModelDialogState>({
    open: false,
    mode: 'create',
    model: null,
  });
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    open: false,
    title: '',
    description: '',
    action: null,
  });

  const isMutating =
    updateSettingsMutation.isPending ||
    createProviderMutation.isPending ||
    updateProviderMutation.isPending ||
    deleteProviderMutation.isPending ||
    createModelMutation.isPending ||
    updateModelMutation.isPending ||
    deleteModelMutation.isPending;

  const resetSettings = async () => {
    try {
      await Promise.all([settingsQuery.refetch(), providersQuery.refetch(), modelsQuery.refetch()]);
      toast.message('Synced from server');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to sync');
    }
  };

  const saveSettings = async (input: UpdateLlmSettingsInput) => {
    try {
      await updateSettingsMutation.mutateAsync(input);
      toast.success('Saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save');
    }
  };

  const openCreateProvider = () => {
    setProviderDialog({
      open: true,
      mode: 'create',
      provider: null,
    });
  };

  const openEditProvider = (provider: LlmProviderListItem) => {
    setProviderDialog({
      open: true,
      mode: 'edit',
      provider,
    });
  };

  const closeProviderDialog = () => {
    setProviderDialog((prev) => ({
      ...prev,
      open: false,
    }));
  };

  const openCreateModel = () => {
    if (providers.length === 0) {
      toast.message('Create a provider first');
      return;
    }

    setModelDialog({
      open: true,
      mode: 'create',
      model: null,
    });
  };

  const openEditModel = (model: LlmModelListItem) => {
    setModelDialog({
      open: true,
      mode: 'edit',
      model,
    });
  };

  const closeModelDialog = () => {
    setModelDialog((prev) => ({
      ...prev,
      open: false,
    }));
  };

  const openConfirmDialog = (params: {
    title: string;
    description: string;
    action: () => Promise<void>;
  }) => {
    setConfirmDialog({
      open: true,
      title: params.title,
      description: params.description,
      action: params.action,
    });
  };

  const requestDeleteProvider = (provider: LlmProviderListItem) => {
    openConfirmDialog({
      title: 'Delete provider',
      description: `Delete provider "${provider.name}"? This will also delete its model mappings.`,
      action: () => deleteProviderMutation.mutateAsync(provider.id),
    });
  };

  const requestDeleteModel = (model: LlmModelListItem) => {
    openConfirmDialog({
      title: 'Delete model mapping',
      description: `Delete model mapping "${model.modelId}"?`,
      action: () => deleteModelMutation.mutateAsync(model.id),
    });
  };

  const setConfirmOpen = (open: boolean) => {
    if (open) {
      setConfirmDialog((prev) => ({
        ...prev,
        open: true,
      }));
      return;
    }

    setConfirmDialog({
      open: false,
      title: '',
      description: '',
      action: null,
    });
  };

  const confirmDelete = async () => {
    if (!confirmDialog.action) {
      return;
    }

    try {
      await confirmDialog.action();
      toast.success('Deleted');
      setConfirmOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete');
    }
  };

  const createProvider = async (input: CreateLlmProviderInput) => {
    try {
      await createProviderMutation.mutateAsync(input);
      toast.success('Created');
      closeProviderDialog();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create');
    }
  };

  const updateProvider = async (providerId: string, input: UpdateLlmProviderInput) => {
    try {
      await updateProviderMutation.mutateAsync({ providerId, input });
      toast.success('Saved');
      closeProviderDialog();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save');
    }
  };

  const createModel = async (input: CreateLlmModelInput) => {
    try {
      await createModelMutation.mutateAsync(input);
      toast.success('Created');
      closeModelDialog();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create');
    }
  };

  const updateModel = async (llmModelId: string, input: UpdateLlmModelInput) => {
    try {
      await updateModelMutation.mutateAsync({ llmModelId, input });
      toast.success('Saved');
      closeModelDialog();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save');
    }
  };

  return {
    settingsQuery,
    providersQuery,
    providerPresetsQuery,
    modelsQuery,
    providers,
    models,
    providerPresets,
    modelOptions,
    initialSettings,
    isSavingSettings: updateSettingsMutation.isPending,
    isMutating,
    providerDialog,
    modelDialog,
    confirmDialog,
    resetSettings,
    saveSettings,
    openCreateProvider,
    openEditProvider,
    closeProviderDialog,
    openCreateModel,
    openEditModel,
    closeModelDialog,
    requestDeleteProvider,
    requestDeleteModel,
    setConfirmOpen,
    confirmDelete,
    createProvider,
    updateProvider,
    createModel,
    updateModel,
  };
}
