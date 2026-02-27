/**
 * [PROPS]: { providers, form }
 * [EMITS]: 通过 react-hook-form setValue 修改 settings 表单；通过 desktopAPI 触发 provider 测试
 * [POS]: 设置弹窗 - AI Providers 详情页容器（状态分流 + 子组件装配）
 * [UPDATE]: 2026-02-26 - 拆分为容器 + useProviderDetailsController + 预设/自定义子组件
 * [UPDATE]: 2026-02-26 - ProviderDetailsPreset props 收敛为 form/list/dialog 三段模型
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { SettingsDialogState } from '../../use-settings-dialog';
import type { ProviderSdkType } from '@shared/ipc';
import { OllamaPanel } from './ollama-panel';
import { MembershipDetails } from './membership-details';
import { useTranslation } from '@/lib/i18n';
import { ProviderDetailsPreset } from './provider-details-preset';
import { ProviderDetailsCustom } from './provider-details-custom';
import { useProviderDetailsController } from './use-provider-details-controller';

type ProviderDetailsProps = {
  providers: SettingsDialogState['providers'];
  form: SettingsDialogState['form'];
};

/**
 * 服务商详情面板容器
 * 负责状态分流与子组件装配，具体业务逻辑由 hook 承担。
 */
export const ProviderDetails = ({ providers, form }: ProviderDetailsProps) => {
  const { t } = useTranslation('settings');
  const controller = useProviderDetailsController({ providers, form });

  if (!controller.activeProviderId) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        {t('selectProviderPlaceholder')}
      </div>
    );
  }

  if (controller.isMembership) {
    return <MembershipDetails />;
  }

  if (!controller.isCustom && controller.preset?.localBackend === 'ollama') {
    return <OllamaPanel providers={providers} form={form} />;
  }

  if (!controller.isCustom && controller.preset) {
    if (controller.presetIndex < 0) {
      return (
        <div className="flex h-full items-center justify-center text-muted-foreground">
          {t('loading')}
        </div>
      );
    }

    const formModel = {
      preset: controller.preset,
      presetIndex: controller.presetIndex,
      register: form.register,
      testStatus: controller.testStatus,
      onTest: controller.handleTest,
    };
    const listModel = {
      searchQuery: controller.searchQuery,
      onSearchQueryChange: controller.setSearchQuery,
      allModelsCount: controller.allModels.length,
      filteredModels: controller.filteredModels,
      isModelEnabled: controller.isModelEnabled,
      onOpenAddModel: () => controller.setAddModelOpen(true),
      onEditModel: controller.handleEditModel,
      onToggleModel: controller.handleTogglePresetModel,
      onRemoveCustomModel: controller.handleRemoveCustomModel,
    };
    const dialogModel = {
      providerId: controller.activeProviderId,
      sdkType: controller.preset.sdkType as ProviderSdkType,
      addModelOpen: controller.addModelOpen,
      onAddModelOpenChange: controller.setAddModelOpen,
      onAddModel: controller.handleAddModel,
      existingModelIds: controller.existingModelIds,
      editModelOpen: controller.editModelOpen,
      onEditModelOpenChange: controller.setEditModelOpen,
      onSaveModel: controller.handleSaveModel,
      editModelData: controller.editModelData,
    };

    return (
      <ProviderDetailsPreset
        formModel={formModel}
        listModel={listModel}
        dialogModel={dialogModel}
      />
    );
  }

  if (controller.isCustom && controller.customIndex >= 0 && controller.customConfig) {
    return (
      <ProviderDetailsCustom
        customIndex={controller.customIndex}
        config={controller.customConfig}
        register={form.register}
        testStatus={controller.testStatus}
        onTest={controller.handleTest}
        onSdkTypeChange={controller.handleChangeCustomSdkType}
        onAddModel={controller.handleAddCustomProviderModel}
        onUpdateModel={controller.handleUpdateCustomProviderModel}
        onToggleModel={controller.handleToggleCustomProviderModel}
        onDeleteModel={controller.handleDeleteCustomProviderModel}
        onRemoveProvider={controller.handleRemoveCustomProviderByIndex}
      />
    );
  }

  return (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      {t('providerConfigLoading')}
    </div>
  );
};
