/**
 * [PROVIDES]: useProviderDetailsController - Provider Details 的状态与行为编排
 * [DEPENDS]: settings-dialog form state, model-registry, desktopAPI.testAgentProvider
 * [POS]: settings-dialog/providers 的控制器层
 * [UPDATE]: 2026-02-26 - 补齐 model thinking 字段在 view/edit/save/custom-provider 链路的透传
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  buildProviderModelRef,
  getModelByProviderAndId,
  getProviderById,
} from '@moryflow/model-bank/registry';
import type { SettingsDialogState } from '../../use-settings-dialog';
import type { FormValues } from '../../const';
import type { AgentProviderTestInput } from '@shared/ipc';
import type { AddModelFormData } from './add-model-dialog';
import type { EditModelFormData, EditModelInitialData } from './edit-model-dialog';
import { MEMBERSHIP_PROVIDER_ID } from './provider-list';
import { toast } from 'sonner';
import { findFirstEnabledModelId, isModelEnabledWithDefaultFirst } from './provider-models';
import { DEFAULT_CUSTOM_MODEL_CONTEXT, DEFAULT_CUSTOM_MODEL_OUTPUT } from './constants';
import type { ProviderModelView, ProviderTestStatus } from './provider-details.types';
import { clearChatThinkingOverride } from '@/lib/chat-thinking-overrides';

type UseProviderDetailsControllerParams = {
  providers: SettingsDialogState['providers'];
  form: SettingsDialogState['form'];
};

type UseProviderDetailsControllerResult = {
  activeProviderId: string | null;
  isMembership: boolean;
  isCustom: boolean;
  preset: ReturnType<typeof getProviderById> | null;
  presetIndex: number;
  customIndex: number;
  customConfig: FormValues['customProviders'][number] | undefined;
  testStatus: ProviderTestStatus;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  allModels: ProviderModelView[];
  filteredModels: Array<{ model: ProviderModelView; index: number }>;
  existingModelIds: string[];
  addModelOpen: boolean;
  setAddModelOpen: (open: boolean) => void;
  editModelOpen: boolean;
  setEditModelOpen: (open: boolean) => void;
  editModelData: EditModelInitialData | null;
  handleTest: () => Promise<void>;
  handleAddModel: (data: AddModelFormData) => void;
  handleRemoveCustomModel: (modelId: string) => void;
  handleEditModel: (model: EditModelInitialData) => void;
  handleSaveModel: (data: EditModelFormData) => void;
  isModelEnabled: (modelId: string, modelIndex: number) => boolean;
  handleTogglePresetModel: (modelId: string, enabled: boolean) => void;
  handleAddCustomProviderModel: (data: AddModelFormData) => void;
  handleUpdateCustomProviderModel: (data: EditModelFormData) => void;
  handleToggleCustomProviderModel: (modelId: string, enabled: boolean) => void;
  handleDeleteCustomProviderModel: (modelId: string) => void;
  handleRemoveCustomProviderByIndex: () => void;
};

export const useProviderDetailsController = ({
  providers,
  form,
}: UseProviderDetailsControllerParams): UseProviderDetailsControllerResult => {
  const { activeProviderId, providerValues, customProviderValues, handleRemoveCustomProvider } =
    providers;
  const { setValue, getValues } = form;

  const [testStatus, setTestStatus] = useState<ProviderTestStatus>('idle');
  const testStatusResetTimeoutRef = useRef<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [addModelOpen, setAddModelOpen] = useState(false);
  const [editModelOpen, setEditModelOpen] = useState(false);
  const [editModelData, setEditModelData] = useState<EditModelInitialData | null>(null);

  const presetIndex = providerValues.findIndex(
    (provider) => provider.providerId === activeProviderId
  );
  const customIndex = customProviderValues.findIndex(
    (provider) => provider.providerId === activeProviderId
  );
  const isMembership = activeProviderId === MEMBERSHIP_PROVIDER_ID;
  const isCustom = customIndex >= 0;
  const preset = !isCustom && activeProviderId ? getProviderById(activeProviderId) : null;

  const currentConfig = presetIndex >= 0 ? providerValues[presetIndex] : null;
  const userModels = currentConfig?.models || [];

  const allModels = useMemo<ProviderModelView[]>(() => {
    if (!preset) {
      return [];
    }

    const models: ProviderModelView[] = [];

    const customModels = userModels.filter((model) => model.isCustom);
    for (let i = customModels.length - 1; i >= 0; i--) {
      const userModel = customModels[i];
      models.push({
        id: userModel.id,
        name: userModel.customName || userModel.id,
        isPreset: false,
        isCustom: true,
        capabilities: userModel.customCapabilities
          ? {
              reasoning: userModel.customCapabilities.reasoning ?? false,
              attachment: userModel.customCapabilities.attachment ?? false,
              toolCall: userModel.customCapabilities.toolCall ?? false,
              temperature: userModel.customCapabilities.temperature ?? true,
            }
          : undefined,
        limits: {
          context: userModel.customContext || DEFAULT_CUSTOM_MODEL_CONTEXT,
          output: userModel.customOutput || DEFAULT_CUSTOM_MODEL_OUTPUT,
        },
        thinking: userModel.thinking,
      });
    }

    for (const modelId of preset.modelIds) {
      const modelDef = getModelByProviderAndId(activeProviderId ?? '', modelId);
      if (!modelDef) {
        continue;
      }

      const userConfig = userModels.find((model) => model.id === modelId && !model.isCustom);
      const hasCustomName = userConfig?.customName;
      const hasCustomConfig =
        userConfig &&
        (userConfig.customName || userConfig.customContext || userConfig.customCapabilities);

      models.push({
        id: modelId,
        name: hasCustomName && userConfig.customName ? userConfig.customName : modelDef.name,
        shortName: hasCustomName ? undefined : modelDef.shortName,
        isPreset: true,
        capabilities:
          hasCustomConfig && userConfig.customCapabilities
            ? {
                reasoning:
                  userConfig.customCapabilities.reasoning ?? modelDef.capabilities.reasoning,
                attachment:
                  userConfig.customCapabilities.attachment ?? modelDef.capabilities.attachment,
                toolCall: userConfig.customCapabilities.toolCall ?? modelDef.capabilities.toolCall,
                temperature:
                  userConfig.customCapabilities.temperature ?? modelDef.capabilities.temperature,
              }
            : modelDef.capabilities,
        limits: hasCustomConfig
          ? {
              context: userConfig.customContext || modelDef.limits.context,
              output: userConfig.customOutput || modelDef.limits.output,
            }
          : modelDef.limits,
        thinking: userConfig?.thinking,
      });
    }

    return models;
  }, [activeProviderId, preset, userModels]);

  const filteredModels = useMemo(() => {
    const modelsWithIndex = allModels.map((model, index) => ({ model, index }));
    if (!searchQuery.trim()) {
      return modelsWithIndex;
    }

    const query = searchQuery.toLowerCase();
    return modelsWithIndex.filter(
      ({ model }) =>
        model.id.toLowerCase().includes(query) ||
        model.name.toLowerCase().includes(query) ||
        model.shortName?.toLowerCase().includes(query)
    );
  }, [allModels, searchQuery]);

  const existingModelIds = useMemo(() => {
    if (!preset) {
      return [];
    }
    return [
      ...preset.modelIds,
      ...userModels.filter((model) => model.isCustom).map((model) => model.id),
    ];
  }, [preset, userModels]);

  useEffect(() => {
    if (!isCustom && activeProviderId && preset) {
      const currentProviders = getValues('providers');
      const existingIndex = currentProviders.findIndex(
        (provider) => provider.providerId === activeProviderId
      );
      if (existingIndex < 0) {
        setValue('providers', [
          ...currentProviders,
          {
            providerId: activeProviderId,
            enabled: false,
            apiKey: '',
            baseUrl: preset.defaultBaseUrl || '',
            models: [],
            defaultModelId: null,
          },
        ]);
        return;
      }

      if (preset.defaultBaseUrl) {
        const existingBaseUrl = currentProviders[existingIndex]?.baseUrl ?? '';
        if (!existingBaseUrl.trim()) {
          setValue(`providers.${existingIndex}.baseUrl`, preset.defaultBaseUrl);
        }
      }
    }
  }, [isCustom, activeProviderId, getValues, setValue, preset]);

  useEffect(() => {
    return () => {
      if (testStatusResetTimeoutRef.current) {
        window.clearTimeout(testStatusResetTimeoutRef.current);
        testStatusResetTimeoutRef.current = null;
      }
    };
  }, []);

  const scheduleTestStatusReset = useCallback(() => {
    if (testStatusResetTimeoutRef.current) {
      window.clearTimeout(testStatusResetTimeoutRef.current);
    }

    testStatusResetTimeoutRef.current = window.setTimeout(() => {
      setTestStatus('idle');
      testStatusResetTimeoutRef.current = null;
    }, 3000);
  }, []);

  const lastTrimmedApiKeyByProviderIdRef = useRef<Record<string, string>>({});
  useEffect(() => {
    if (!activeProviderId) {
      return;
    }

    const apiKey = isCustom
      ? (customProviderValues[customIndex]?.apiKey ?? '')
      : (providerValues[presetIndex]?.apiKey ?? '');

    const trimmed = apiKey.trim();
    const prev = lastTrimmedApiKeyByProviderIdRef.current[activeProviderId] ?? '';

    if (!prev && trimmed) {
      if (isCustom && customIndex >= 0) {
        setValue(`customProviders.${customIndex}.enabled`, true);
      }
      if (!isCustom && presetIndex >= 0) {
        setValue(`providers.${presetIndex}.enabled`, true);
      }
    }

    lastTrimmedApiKeyByProviderIdRef.current[activeProviderId] = trimmed;
  }, [
    activeProviderId,
    isCustom,
    customIndex,
    presetIndex,
    customProviderValues,
    providerValues,
    setValue,
  ]);

  const handleTest = useCallback(async () => {
    if (testStatusResetTimeoutRef.current) {
      window.clearTimeout(testStatusResetTimeoutRef.current);
      testStatusResetTimeoutRef.current = null;
    }

    setTestStatus('testing');

    try {
      if (!activeProviderId) {
        toast.error('Provider is required.');
        setTestStatus('error');
        scheduleTestStatusReset();
        return;
      }
      if (!window.desktopAPI?.testAgentProvider) {
        toast.error('Desktop API is unavailable.');
        setTestStatus('error');
        scheduleTestStatusReset();
        return;
      }

      type BuildPayloadResult =
        | { ok: true; payload: AgentProviderTestInput }
        | { ok: false; error: string };

      const buildPayload = (): BuildPayloadResult => {
        if (isCustom) {
          const config = customProviderValues[customIndex];
          if (!config) {
            return { ok: false, error: 'Provider config is missing.' };
          }
          const apiKey = typeof config.apiKey === 'string' ? config.apiKey.trim() : '';
          if (!apiKey) {
            return { ok: false, error: 'API key is required.' };
          }

          const models = Array.isArray(config.models) ? config.models : [];
          const firstEnabled = models.find((model) => model.enabled);
          const modelId = firstEnabled?.id?.trim() || '';
          if (!modelId) {
            return { ok: false, error: 'Please enable at least one model to test.' };
          }

          return {
            ok: true,
            payload: {
              providerId: activeProviderId,
              providerType: 'custom',
              apiKey,
              baseUrl: config.baseUrl || undefined,
              modelId,
            },
          };
        }

        const config = providerValues[presetIndex];
        if (!config) {
          return { ok: false, error: 'Provider config is missing.' };
        }

        const apiKey = typeof config.apiKey === 'string' ? config.apiKey.trim() : '';
        if (!apiKey) {
          return { ok: false, error: 'API key is required.' };
        }

        const modelIds = allModels.map((model) => model.id);
        const modelId = findFirstEnabledModelId(modelIds, (id, index) =>
          isModelEnabledWithDefaultFirst(userModels, id, index)
        );
        if (!modelId) {
          return { ok: false, error: 'Please enable at least one model to test.' };
        }

        return {
          ok: true,
          payload: {
            providerId: activeProviderId,
            providerType: 'preset',
            apiKey,
            baseUrl: config.baseUrl || undefined,
            modelId,
          },
        };
      };

      const built = buildPayload();
      if (!built.ok) {
        toast.error(built.error);
        setTestStatus('error');
        scheduleTestStatusReset();
        return;
      }

      const result = await window.desktopAPI.testAgentProvider(built.payload);

      if (result?.success) {
        toast.success(result.message || 'Connection successful.');
        setTestStatus('success');
      } else {
        toast.error(result?.error || 'Test failed.');
        setTestStatus('error');
      }
    } catch {
      toast.error('Test failed.');
      setTestStatus('error');
    }

    scheduleTestStatusReset();
  }, [
    isCustom,
    customProviderValues,
    customIndex,
    providerValues,
    presetIndex,
    activeProviderId,
    allModels,
    userModels,
    scheduleTestStatusReset,
  ]);

  const handleAddModel = useCallback(
    (data: AddModelFormData) => {
      if (presetIndex < 0) {
        return;
      }

      const currentModels = providerValues[presetIndex]?.models || [];
      setValue(`providers.${presetIndex}.models`, [
        ...currentModels,
        {
          id: data.id,
          enabled: true,
          isCustom: true,
          customName: data.name,
          customContext: data.contextSize,
          customOutput: data.outputSize,
          customCapabilities: data.capabilities,
          customInputModalities: data.inputModalities,
          thinking: data.thinking,
        },
      ]);
      setValue(`providers.${presetIndex}.enabled`, true);
    },
    [presetIndex, providerValues, setValue]
  );

  const handleRemoveCustomModel = useCallback(
    (modelId: string) => {
      if (presetIndex < 0) {
        return;
      }

      const currentModels = providerValues[presetIndex]?.models || [];
      setValue(
        `providers.${presetIndex}.models`,
        currentModels.filter((model) => model.id !== modelId)
      );
    },
    [presetIndex, providerValues, setValue]
  );

  const handleEditModel = useCallback(
    (model: EditModelInitialData) => {
      const userModel = userModels.find((entry) => entry.id === model.id);
      setEditModelData({
        ...model,
        inputModalities: userModel?.customInputModalities || ['text'],
        thinking: userModel?.thinking ?? model.thinking,
      });
      setEditModelOpen(true);
    },
    [userModels]
  );

  const handleSaveModel = useCallback(
    (data: EditModelFormData) => {
      if (presetIndex < 0) {
        return;
      }

      const currentModels = providerValues[presetIndex]?.models || [];
      const existingIndex = currentModels.findIndex((model) => model.id === data.id);

      const updatedModel = {
        id: data.id,
        enabled: existingIndex >= 0 ? currentModels[existingIndex].enabled : true,
        isCustom: editModelData?.isCustom || false,
        customName: data.name,
        customContext: data.contextSize,
        customOutput: data.outputSize,
        customCapabilities: data.capabilities,
        customInputModalities: data.inputModalities,
        thinking: data.thinking,
      };

      if (existingIndex >= 0) {
        setValue(`providers.${presetIndex}.models.${existingIndex}`, updatedModel);
      } else {
        setValue(`providers.${presetIndex}.models`, [...currentModels, updatedModel]);
      }
      const providerId = providerValues[presetIndex]?.providerId;
      if (providerId) {
        clearChatThinkingOverride(buildProviderModelRef(providerId, data.id));
      }
    },
    [presetIndex, providerValues, setValue, editModelData]
  );

  const isModelEnabled = useCallback(
    (modelId: string, modelIndex: number) => {
      return isModelEnabledWithDefaultFirst(userModels, modelId, modelIndex);
    },
    [userModels]
  );

  const handleTogglePresetModel = useCallback(
    (modelId: string, enabled: boolean) => {
      if (presetIndex < 0) {
        return;
      }

      if (enabled) {
        setValue(`providers.${presetIndex}.enabled`, true);
      }

      const currentModels = providerValues[presetIndex]?.models || [];
      const existingIndex = currentModels.findIndex((model) => model.id === modelId);
      if (existingIndex >= 0) {
        setValue(`providers.${presetIndex}.models.${existingIndex}.enabled`, enabled);
        return;
      }

      setValue(`providers.${presetIndex}.models`, [...currentModels, { id: modelId, enabled }]);
    },
    [presetIndex, providerValues, setValue]
  );

  const handleAddCustomProviderModel = useCallback(
    (data: AddModelFormData) => {
      if (customIndex < 0) {
        return;
      }
      const current = customProviderValues[customIndex];
      const currentModels = Array.isArray(current?.models) ? current.models : [];
      setValue(`customProviders.${customIndex}.models`, [
        {
          id: data.id,
          enabled: true,
          isCustom: true,
          customName: data.name,
          customContext: data.contextSize,
          customOutput: data.outputSize,
          customCapabilities: data.capabilities,
          customInputModalities: data.inputModalities,
          thinking: data.thinking,
        },
        ...currentModels,
      ]);
      setValue(`customProviders.${customIndex}.enabled`, true);
    },
    [customIndex, customProviderValues, setValue]
  );

  const handleUpdateCustomProviderModel = useCallback(
    (data: EditModelFormData) => {
      if (customIndex < 0) {
        return;
      }

      const current = customProviderValues[customIndex];
      const currentModels = Array.isArray(current?.models) ? current.models : [];
      const modelIndex = currentModels.findIndex((model) => model.id === data.id);
      if (modelIndex < 0) {
        return;
      }

      const prev = currentModels[modelIndex];

      setValue(`customProviders.${customIndex}.models.${modelIndex}`, {
        ...prev,
        id: data.id,
        enabled: prev?.enabled ?? true,
        isCustom: true,
        customName: data.name,
        customContext: data.contextSize,
        customOutput: data.outputSize,
        customCapabilities: data.capabilities,
        customInputModalities: data.inputModalities,
        thinking: data.thinking,
      });
      const providerId = customProviderValues[customIndex]?.providerId;
      if (providerId) {
        clearChatThinkingOverride(buildProviderModelRef(providerId, data.id));
      }
    },
    [customIndex, customProviderValues, setValue]
  );

  const handleToggleCustomProviderModel = useCallback(
    (modelId: string, enabled: boolean) => {
      if (customIndex < 0) {
        return;
      }

      const current = customProviderValues[customIndex];
      const currentModels = Array.isArray(current?.models) ? current.models : [];
      const nextModels = currentModels.map((model) =>
        model.id === modelId ? { ...model, enabled } : model
      );
      setValue(`customProviders.${customIndex}.models`, nextModels);
      if (enabled) {
        setValue(`customProviders.${customIndex}.enabled`, true);
      }
    },
    [customIndex, customProviderValues, setValue]
  );

  const handleDeleteCustomProviderModel = useCallback(
    (modelId: string) => {
      if (customIndex < 0) {
        return;
      }

      const current = customProviderValues[customIndex];
      const currentModels = Array.isArray(current?.models) ? current.models : [];
      setValue(
        `customProviders.${customIndex}.models`,
        currentModels.filter((model) => model.id !== modelId)
      );
    },
    [customIndex, customProviderValues, setValue]
  );

  const handleRemoveCustomProviderByIndex = useCallback(() => {
    if (customIndex < 0) {
      return;
    }
    handleRemoveCustomProvider(customIndex);
  }, [customIndex, handleRemoveCustomProvider]);

  return {
    activeProviderId,
    isMembership,
    isCustom,
    preset,
    presetIndex,
    customIndex,
    customConfig: customProviderValues[customIndex],
    testStatus,
    searchQuery,
    setSearchQuery,
    allModels,
    filteredModels,
    existingModelIds,
    addModelOpen,
    setAddModelOpen,
    editModelOpen,
    setEditModelOpen,
    editModelData,
    handleTest,
    handleAddModel,
    handleRemoveCustomModel,
    handleEditModel,
    handleSaveModel,
    isModelEnabled,
    handleTogglePresetModel,
    handleAddCustomProviderModel,
    handleUpdateCustomProviderModel,
    handleToggleCustomProviderModel,
    handleDeleteCustomProviderModel,
    handleRemoveCustomProviderByIndex,
  };
};
