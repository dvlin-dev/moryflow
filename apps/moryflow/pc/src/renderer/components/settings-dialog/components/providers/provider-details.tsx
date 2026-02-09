/**
 * [PROPS]: { providers, form }
 * [EMITS]: 通过 react-hook-form setValue 修改 settings 表单；通过 desktopAPI 触发 provider 测试
 * [POS]: 设置弹窗 - AI Providers 详情页（预设/自定义服务商配置、Base URL 默认填充、模型启用与连接测试，Lucide 图标）
 * [UPDATE]: 2026-02-02 - 移除右侧 Provider Enable 开关区域
 * [UPDATE]: 2026-02-09 - 自定义服务商模型添加流程复用 AddModelDialog（含 model library 搜索与参数面板）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Input } from '@anyhunt/ui/components/input';
import { Label } from '@anyhunt/ui/components/label';
import { Button } from '@anyhunt/ui/components/button';
import { Switch } from '@anyhunt/ui/components/switch';
import { Badge } from '@anyhunt/ui/components/badge';
import { ScrollArea } from '@anyhunt/ui/components/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@anyhunt/ui/components/select';
import {
  Plus,
  CircleCheck,
  Delete,
  SquareArrowUpRight,
  Loader,
  Search,
  Settings,
} from 'lucide-react';
import { getProviderById, modelRegistry } from '@shared/model-registry';
import type { SettingsDialogState } from '../../use-settings-dialog';
import type { AgentProviderTestInput, ProviderSdkType } from '@shared/ipc';
import { AddModelDialog, type AddModelFormData } from './add-model-dialog';
import {
  EditModelDialog,
  type EditModelFormData,
  type EditModelInitialData,
} from './edit-model-dialog';
import { OllamaPanel } from './ollama-panel';
import { MembershipDetails } from './membership-details';
import { MEMBERSHIP_PROVIDER_ID } from './provider-list';
import { useTranslation } from '@/lib/i18n';
import { toast } from 'sonner';
import { CustomProviderModels } from './custom-provider-models';
import { findFirstEnabledModelId, isModelEnabledWithDefaultFirst } from './provider-models';

type ProviderDetailsProps = {
  providers: SettingsDialogState['providers'];
  form: SettingsDialogState['form'];
};

const SDK_TYPE_OPTIONS = [
  { value: 'openai', labelKey: 'OpenAI' },
  { value: 'anthropic', labelKey: 'Anthropic' },
  { value: 'google', labelKey: 'Google' },
  { value: 'xai', labelKey: 'xAI' },
  { value: 'openrouter', labelKey: 'OpenRouter' },
  { value: 'openai-compatible', labelKey: 'sdkTypeOpenAICompatible' },
] as const satisfies readonly { value: ProviderSdkType; labelKey: string }[];

/**
 * 服务商详情面板
 * 显示选中服务商的配置表单
 */
export const ProviderDetails = ({ providers, form }: ProviderDetailsProps) => {
  const { t } = useTranslation('settings');
  const { activeProviderId, providerValues, customProviderValues, handleRemoveCustomProvider } =
    providers;
  const { setValue, getValues, register } = form;

  // 所有 hooks 必须在组件顶层调用（不能在条件语句之后）
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const testStatusResetTimeoutRef = useRef<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [addModelOpen, setAddModelOpen] = useState(false);
  const [editModelOpen, setEditModelOpen] = useState(false);
  const [editModelData, setEditModelData] = useState<EditModelInitialData | null>(null);

  // 判断是预设服务商还是自定义服务商
  const isMembership = activeProviderId === MEMBERSHIP_PROVIDER_ID;
  const isCustom = activeProviderId?.startsWith('custom-') ?? false;
  const preset = !isCustom && activeProviderId ? getProviderById(activeProviderId) : null;

  // 获取配置索引
  const presetIndex = providerValues.findIndex((p) => p.providerId === activeProviderId);
  const customIndex = customProviderValues.findIndex((p) => p.providerId === activeProviderId);

  // 获取当前配置
  const currentConfig = presetIndex >= 0 ? providerValues[presetIndex] : null;
  const userModels = currentConfig?.models || [];

  // 构建模型列表（用户添加的模型在前 + 预设模型在后）- hooks 必须在顶层
  const allModels = useMemo(() => {
    if (!preset) return [];

    const models: Array<{
      id: string;
      name: string;
      shortName?: string;
      isPreset: boolean;
      isCustom?: boolean;
      capabilities?: {
        reasoning: boolean;
        attachment: boolean;
        toolCall?: boolean;
        temperature?: boolean;
      };
      limits: { context: number; output: number };
    }> = [];

    // 用户添加的自定义模型（显示在最上面，最新添加的在最前）
    const customModels = userModels.filter((m) => m.isCustom);
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
          context: userModel.customContext || 128000,
          output: userModel.customOutput || 16384,
        },
      });
    }

    // 预设模型（检查是否有用户自定义配置）
    for (const modelId of preset.modelIds) {
      const modelDef = modelRegistry[modelId];
      if (modelDef) {
        // 检查用户是否自定义了该预设模型（预设模型配置 isCustom 为 false 或 undefined）
        const userConfig = userModels.find((m) => m.id === modelId && !m.isCustom);
        const hasCustomName = userConfig?.customName;
        const hasCustomConfig =
          userConfig &&
          (userConfig.customName || userConfig.customContext || userConfig.customCapabilities);

        models.push({
          id: modelId,
          // 如果有自定义名称，优先使用自定义名称，并清除 shortName
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
                  toolCall:
                    userConfig.customCapabilities.toolCall ?? modelDef.capabilities.toolCall,
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
        });
      }
    }

    return models;
  }, [preset, userModels]);

  // 搜索过滤
  const filteredModels = useMemo(() => {
    const modelsWithIndex = allModels.map((model, index) => ({ model, index }));
    if (!searchQuery.trim()) return modelsWithIndex;
    const query = searchQuery.toLowerCase();
    return modelsWithIndex.filter(
      ({ model: m }) =>
        m.id.toLowerCase().includes(query) ||
        m.name.toLowerCase().includes(query) ||
        m.shortName?.toLowerCase().includes(query)
    );
  }, [allModels, searchQuery]);

  // 获取所有已配置的模型 ID
  const existingModelIds = useMemo(() => {
    if (!preset) return [];
    return [...preset.modelIds, ...userModels.filter((m) => m.isCustom).map((m) => m.id)];
  }, [preset, userModels]);

  // 确保预设服务商有配置记录（在 useEffect 中调用，避免渲染期间 setState）
  useEffect(() => {
    if (!isCustom && activeProviderId && preset) {
      // 使用 getValues 获取最新值，避免闭包问题和重复添加
      const currentProviders = getValues('providers');
      const existingIndex = currentProviders.findIndex((p) => p.providerId === activeProviderId);
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

  // 避免 setTimeout 在组件卸载后触发 setState
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

  // API Key 从空 -> 非空时，自动开启服务商（防止“填完忘了开”）
  const lastTrimmedApiKeyByProviderIdRef = useRef<Record<string, string>>({});
  useEffect(() => {
    if (!activeProviderId) return;

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

  // 测试连接
  const handleTest = useCallback(async () => {
    // 多次点击时避免旧定时器影响状态
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
          if (!apiKey) return { ok: false, error: 'API key is required.' };

          const models = Array.isArray(config.models) ? config.models : [];
          const firstEnabled = models.find((m) => m.enabled);
          const modelId = firstEnabled?.id?.trim() || '';
          if (!modelId) return { ok: false, error: 'Please enable at least one model to test.' };

          return {
            ok: true,
            payload: {
              providerId: activeProviderId,
              apiKey,
              baseUrl: config.baseUrl || undefined,
              modelId,
              sdkType: config.sdkType,
            },
          };
        }

        const config = providerValues[presetIndex];
        if (!config) return { ok: false, error: 'Provider config is missing.' };

        const apiKey = typeof config.apiKey === 'string' ? config.apiKey.trim() : '';
        if (!apiKey) return { ok: false, error: 'API key is required.' };

        const modelIds = allModels.map((m) => m.id);
        const modelId = findFirstEnabledModelId(modelIds, (id, index) =>
          isModelEnabledWithDefaultFirst(userModels, id, index)
        );
        if (!modelId) return { ok: false, error: 'Please enable at least one model to test.' };

        return {
          ok: true,
          payload: {
            providerId: activeProviderId,
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
    preset,
    allModels,
    userModels,
    scheduleTestStatusReset,
  ]);

  // 添加自定义模型
  const handleAddModel = useCallback(
    (data: AddModelFormData) => {
      if (presetIndex < 0) return;

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
        },
      ]);
      // 添加模型意味着用户要用该服务商
      setValue(`providers.${presetIndex}.enabled`, true);
    },
    [presetIndex, providerValues, setValue]
  );

  // 删除用户添加的自定义模型
  const handleRemoveCustomModel = useCallback(
    (index: number, modelId: string) => {
      const currentModels = providerValues[index]?.models || [];
      setValue(
        `providers.${index}.models`,
        currentModels.filter((m) => m.id !== modelId)
      );
    },
    [providerValues, setValue]
  );

  // 打开编辑模型弹窗
  const handleEditModel = useCallback(
    (model: EditModelInitialData) => {
      // 获取用户配置的输入模态
      const userModel = userModels.find((m) => m.id === model.id);
      setEditModelData({
        ...model,
        inputModalities: userModel?.customInputModalities || ['text'],
      });
      setEditModelOpen(true);
    },
    [userModels]
  );

  // 保存编辑的模型配置
  const handleSaveModel = useCallback(
    (data: EditModelFormData) => {
      if (presetIndex < 0) return;

      const currentModels = providerValues[presetIndex]?.models || [];
      const existingIndex = currentModels.findIndex((m) => m.id === data.id);

      const updatedModel = {
        id: data.id,
        enabled: existingIndex >= 0 ? currentModels[existingIndex].enabled : true,
        // 标记为已自定义配置
        isCustom: editModelData?.isCustom || false,
        customName: data.name,
        customContext: data.contextSize,
        customOutput: data.outputSize,
        customCapabilities: data.capabilities,
        customInputModalities: data.inputModalities,
      };

      if (existingIndex >= 0) {
        // 更新已有配置
        setValue(`providers.${presetIndex}.models.${existingIndex}`, updatedModel);
      } else {
        // 添加新配置（用于预设模型首次自定义）
        setValue(`providers.${presetIndex}.models`, [...currentModels, updatedModel]);
      }
    },
    [presetIndex, providerValues, setValue, editModelData]
  );

  // 获取模型是否启用（对齐 agents-runtime：仅在“无任何显式配置”时默认启用第一个）
  const isModelEnabled = useCallback(
    (modelId: string, modelIndex: number) => {
      return isModelEnabledWithDefaultFirst(userModels, modelId, modelIndex);
    },
    [userModels]
  );

  // 自定义服务商模型管理
  const handleAddCustomProviderModel = useCallback(
    (data: AddModelFormData) => {
      if (customIndex < 0) return;
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
        },
        ...currentModels,
      ]);
      setValue(`customProviders.${customIndex}.enabled`, true);
    },
    [customIndex, customProviderValues, setValue]
  );

  const handleUpdateCustomProviderModel = useCallback(
    (data: EditModelFormData) => {
      if (customIndex < 0) return;
      const current = customProviderValues[customIndex];
      const currentModels = Array.isArray(current?.models) ? current.models : [];
      const modelIndex = currentModels.findIndex((m) => m.id === data.id);
      if (modelIndex < 0) return;

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
      });
    },
    [customIndex, customProviderValues, setValue]
  );

  const handleToggleCustomProviderModel = useCallback(
    (modelId: string, enabled: boolean) => {
      if (customIndex < 0) return;
      const current = customProviderValues[customIndex];
      const currentModels = Array.isArray(current?.models) ? current.models : [];
      const nextModels = currentModels.map((m) => (m.id === modelId ? { ...m, enabled } : m));
      setValue(`customProviders.${customIndex}.models`, nextModels);
      if (enabled) {
        setValue(`customProviders.${customIndex}.enabled`, true);
      }
    },
    [customIndex, customProviderValues, setValue]
  );

  const handleDeleteCustomProviderModel = useCallback(
    (modelId: string) => {
      if (customIndex < 0) return;
      const current = customProviderValues[customIndex];
      const currentModels = Array.isArray(current?.models) ? current.models : [];
      setValue(
        `customProviders.${customIndex}.models`,
        currentModels.filter((m) => m.id !== modelId)
      );
    },
    [customIndex, customProviderValues, setValue]
  );

  // 空状态
  if (!activeProviderId) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        {t('selectProviderPlaceholder')}
      </div>
    );
  }

  // 会员模型详情
  if (isMembership) {
    return <MembershipDetails />;
  }

  // 渲染 Ollama 专属面板
  if (!isCustom && preset?.localBackend === 'ollama') {
    return <OllamaPanel providers={providers} form={form} />;
  }

  // 渲染预设服务商详情
  // 等待配置创建完成后再渲染表单，避免 register 创建不完整的对象
  if (!isCustom && preset) {
    if (presetIndex < 0) {
      return (
        <div className="flex h-full items-center justify-center text-muted-foreground">
          {t('loading')}
        </div>
      );
    }

    return (
      <ScrollArea className="h-full">
        <div className="space-y-6 p-4">
          {/* 服务商信息 */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold">{preset.name}</h3>
              {preset.description && (
                <p className="text-sm text-muted-foreground mt-1">{preset.description}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <a
                href={preset.docUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1 text-sm"
              >
                {t('documentation')} <SquareArrowUpRight className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <div className="flex gap-2">
              <Input
                id="api-key"
                type="password"
                placeholder={t('enterApiKey')}
                {...register(`providers.${presetIndex}.apiKey` as const)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTest}
                disabled={testStatus === 'testing'}
              >
                {testStatus === 'testing' && <Loader className="h-4 w-4 animate-spin mr-1" />}
                {testStatus === 'success' && (
                  <CircleCheck className="h-4 w-4 text-green-500 mr-1" />
                )}
                {testStatus === 'idle' || testStatus === 'error' ? t('testButton') : ''}
              </Button>
            </div>
          </div>

          {/* 自定义 Base URL */}
          <div className="space-y-2">
            <Label htmlFor="base-url">{t('apiAddressOptional')}</Label>
            <Input
              id="base-url"
              placeholder={preset.defaultBaseUrl || 'https://api.example.com/v1'}
              {...register(`providers.${presetIndex}.baseUrl` as const)}
            />
            <p className="text-xs text-muted-foreground">{t('baseUrlHint')}</p>
          </div>

          {/* 模型列表 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{t('modelsSection')}</Label>
              <span className="text-xs text-muted-foreground">
                {t('modelsCount', { count: allModels.length })}
              </span>
            </div>

            {/* 搜索和添加 */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('searchModels')}
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setAddModelOpen(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* 模型列表 */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {filteredModels.map(({ model, index: modelIndex }) => {
                const isEnabled = isModelEnabled(model.id, modelIndex);

                return (
                  <div
                    key={model.id}
                    className="flex items-center justify-between py-2 px-3 rounded-md border"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {model.shortName || model.name}
                        </span>
                        {model.isCustom && (
                          <Badge variant="outline" className="text-xs">
                            {t('customBadge')}
                          </Badge>
                        )}
                        {model.capabilities?.reasoning && (
                          <Badge variant="secondary" className="text-xs">
                            {t('reasoningBadge')}
                          </Badge>
                        )}
                        {model.capabilities?.attachment && (
                          <Badge variant="secondary" className="text-xs">
                            {t('multimodalBadge')}
                          </Badge>
                        )}
                        {model.capabilities?.toolCall && (
                          <Badge variant="secondary" className="text-xs">
                            {t('toolsBadge')}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {t('contextLength')}: {Math.round(model.limits.context / 1000)}K
                        {model.isCustom && (
                          <button
                            type="button"
                            className="ml-2 text-destructive hover:underline"
                            onClick={() => handleRemoveCustomModel(presetIndex, model.id)}
                          >
                            {t('delete')}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        onClick={() => handleEditModel(model)}
                        title={t('configureModel')}
                      >
                        <Settings className="size-4" />
                      </button>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) => {
                          if (presetIndex < 0) return;
                          if (checked) {
                            setValue(`providers.${presetIndex}.enabled`, true);
                          }
                          const currentModels = providerValues[presetIndex]?.models || [];
                          const existingIndex = currentModels.findIndex((m) => m.id === model.id);
                          if (existingIndex >= 0) {
                            setValue(
                              `providers.${presetIndex}.models.${existingIndex}.enabled`,
                              checked
                            );
                          } else {
                            setValue(`providers.${presetIndex}.models`, [
                              ...currentModels,
                              { id: model.id, enabled: checked },
                            ]);
                          }
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              {filteredModels.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-4">
                  {t('noMatchingModels')}
                </div>
              )}
            </div>
          </div>

          {/* 添加模型弹窗 */}
          <AddModelDialog
            open={addModelOpen}
            onOpenChange={setAddModelOpen}
            onAdd={handleAddModel}
            existingModelIds={existingModelIds}
          />

          {/* 编辑模型弹窗 */}
          <EditModelDialog
            open={editModelOpen}
            onOpenChange={setEditModelOpen}
            onSave={handleSaveModel}
            initialData={editModelData}
          />
        </div>
      </ScrollArea>
    );
  }

  // 渲染自定义服务商详情
  if (isCustom && customIndex >= 0) {
    const config = customProviderValues[customIndex];

    return (
      <ScrollArea className="h-full">
        <div className="space-y-6 p-4">
          {/* 服务商名称 */}
          <div className="space-y-2">
            <Label htmlFor="custom-name">{t('customProviderNameLabel')}</Label>
            <Input
              id="custom-name"
              placeholder={t('customProviderPlaceholder')}
              {...register(`customProviders.${customIndex}.name`)}
            />
          </div>

          {/* SDK 类型 */}
          <div className="space-y-2">
            <Label>{t('sdkType')}</Label>
            <Select
              value={config.sdkType}
              onValueChange={(value: ProviderSdkType) => {
                setValue(`customProviders.${customIndex}.sdkType`, value);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SDK_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.labelKey === 'sdkTypeOpenAICompatible'
                      ? t(option.labelKey)
                      : option.labelKey}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="custom-api-key">API Key</Label>
            <div className="flex gap-2">
              <Input
                id="custom-api-key"
                type="password"
                placeholder={t('enterApiKey')}
                {...register(`customProviders.${customIndex}.apiKey`)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTest}
                disabled={testStatus === 'testing'}
              >
                {testStatus === 'testing' && <Loader className="h-4 w-4 animate-spin mr-1" />}
                {testStatus === 'success' && (
                  <CircleCheck className="h-4 w-4 text-green-500 mr-1" />
                )}
                {testStatus === 'idle' || testStatus === 'error' ? t('testButton') : ''}
              </Button>
            </div>
          </div>

          {/* Base URL */}
          <div className="space-y-2">
            <Label htmlFor="custom-base-url">{t('apiAddress')}</Label>
            <Input
              id="custom-base-url"
              placeholder="https://api.example.com/v1"
              {...register(`customProviders.${customIndex}.baseUrl`)}
            />
          </div>

          {/* Models */}
          <CustomProviderModels
            models={config.models || []}
            onAddModel={handleAddCustomProviderModel}
            onUpdateModel={handleUpdateCustomProviderModel}
            onToggleModel={handleToggleCustomProviderModel}
            onDeleteModel={handleDeleteCustomProviderModel}
          />

          {/* 删除按钮 */}
          <div className="pt-4 border-t">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => handleRemoveCustomProvider(customIndex)}
            >
              <Delete className="h-4 w-4 mr-1" />
              {t('deleteProvider')}
            </Button>
          </div>
        </div>
      </ScrollArea>
    );
  }

  return (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      {t('providerConfigLoading')}
    </div>
  );
};
