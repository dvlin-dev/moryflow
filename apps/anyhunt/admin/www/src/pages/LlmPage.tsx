/**
 * LLM Configuration Page
 *
 * [PROPS]: None
 * [POS]: Admin - LLM Providers/Models/Defaults 管理（后端存储密钥并加密）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

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
} from '@moryflow/ui';
import { getLlmQueryErrorMessage, useLlmPageController } from '@/features/llm';
import { LlmModelDialog } from './llm/LlmModelDialog';
import { LlmModelsCard } from './llm/LlmModelsCard';
import { LlmProviderDialog } from './llm/LlmProviderDialog';
import { LlmProvidersCard } from './llm/LlmProvidersCard';
import { LlmSettingsCard } from './llm/LlmSettingsCard';

export default function LlmPage() {
  const controller = useLlmPageController();

  const settingsErrorMessage = controller.settingsQuery.isError
    ? getLlmQueryErrorMessage(controller.settingsQuery.error, 'Failed to load settings')
    : null;
  const providersErrorMessage = controller.providersQuery.isError
    ? getLlmQueryErrorMessage(controller.providersQuery.error, 'Failed to load providers')
    : null;
  const modelsErrorMessage = controller.modelsQuery.isError
    ? getLlmQueryErrorMessage(controller.modelsQuery.error, 'Failed to load models')
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="LLM"
        description="Configure providers, model mappings, and default models for Agent/Extract usage."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <LlmSettingsCard
          isLoading={
            controller.settingsQuery.isLoading ||
            controller.providersQuery.isLoading ||
            controller.modelsQuery.isLoading
          }
          errorMessage={settingsErrorMessage}
          isSaving={controller.isSavingSettings}
          initialValues={controller.initialSettings}
          modelOptions={controller.modelOptions}
          onSave={controller.saveSettings}
          onReset={() => {
            void controller.resetSettings();
          }}
        />

        <div className="space-y-6">
          <LlmProvidersCard
            isLoading={controller.providersQuery.isLoading}
            errorMessage={providersErrorMessage}
            isMutating={controller.isMutating}
            providers={controller.providers}
            onNew={controller.openCreateProvider}
            onEdit={controller.openEditProvider}
            onDelete={controller.requestDeleteProvider}
          />
        </div>
      </div>

      <LlmModelsCard
        isLoading={controller.modelsQuery.isLoading}
        errorMessage={modelsErrorMessage}
        isMutating={controller.isMutating}
        models={controller.models}
        onNew={controller.openCreateModel}
        onEdit={controller.openEditModel}
        onDelete={controller.requestDeleteModel}
      />

      <LlmProviderDialog
        viewModel={{
          open: controller.providerDialog.open,
          mode: controller.providerDialog.mode,
          provider: controller.providerDialog.provider,
          presets: controller.providerPresets,
          isSubmitting: controller.isMutating,
        }}
        actions={{
          onClose: controller.closeProviderDialog,
          onCreate: controller.createProvider,
          onUpdate: controller.updateProvider,
        }}
      />

      <LlmModelDialog
        viewModel={{
          open: controller.modelDialog.open,
          mode: controller.modelDialog.mode,
          model: controller.modelDialog.model,
          providers: controller.providers,
          isSubmitting: controller.isMutating,
        }}
        actions={{
          onClose: controller.closeModelDialog,
          onCreate: controller.createModel,
          onUpdate: controller.updateModel,
        }}
      />

      <AlertDialog open={controller.confirmDialog.open} onOpenChange={controller.setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{controller.confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{controller.confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={controller.isMutating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!controller.confirmDialog.action || controller.isMutating}
              onClick={(event) => {
                event.preventDefault();
                void controller.confirmDelete();
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
