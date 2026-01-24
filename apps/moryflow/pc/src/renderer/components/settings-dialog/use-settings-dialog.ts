/**
 * [PROVIDES]: useSettingsDialog - 设置弹窗状态与表单控制
 * [DEPENDS]: react-hook-form, desktopAPI.agent
 * [POS]: Settings Dialog 状态管理入口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useCallback, useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  useFieldArray,
  useForm,
  useWatch,
  type FieldErrors,
  type UseFormRegister,
} from 'react-hook-form';
import type { AgentSettings } from '@shared/ipc';
import { getSortedProviders } from '@shared/model-registry';
import {
  defaultValues,
  formSchema,
  type FormValues,
  type SettingsDialogProps,
  type SettingsSection,
} from './const';
import { formToUpdate, settingsToForm } from './handle';

type SettingsForm = ReturnType<typeof useForm<FormValues>>;

type ArrayControllers = {
  stdioArray: ReturnType<typeof useFieldArray<FormValues, 'mcp.stdio'>>;
  httpArray: ReturnType<typeof useFieldArray<FormValues, 'mcp.streamableHttp'>>;
  providersArray: ReturnType<typeof useFieldArray<FormValues, 'providers'>>;
  customProvidersArray: ReturnType<typeof useFieldArray<FormValues, 'customProviders'>>;
};

type ProviderControls = {
  providerValues: FormValues['providers'];
  customProviderValues: FormValues['customProviders'];
  activeProviderId: string | null;
  setActiveProviderId: (id: string | null) => void;
  handleAddCustomProvider: () => void;
  handleRemoveCustomProvider: (index: number) => void;
  getProviderIndex: (providerId: string) => number;
  getCustomProviderIndex: (providerId: string) => number;
};

type FormExpose = {
  control: SettingsForm['control'];
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
  handleSubmit: SettingsForm['handleSubmit'];
  setValue: SettingsForm['setValue'];
  getValues: SettingsForm['getValues'];
};

export type SettingsDialogState = {
  meta: {
    isLoading: boolean;
    isSaving: boolean;
    appVersion: string | null;
  };
  navigation: {
    activeSection: SettingsSection;
    setActiveSection: (section: SettingsSection) => void;
  };
  form: FormExpose;
  mcpArrays: Pick<ArrayControllers, 'stdioArray' | 'httpArray'>;
  providers: ProviderControls;
  actions: {
    handleSave: (values: FormValues) => Promise<void>;
    handleClose: () => void;
  };
};

/**
 * 管理设置弹窗的表单状态、数据同步与交互方法，保持 UI 层纯渲染。
 */
export const useSettingsDialogState = ({
  open,
  onOpenChange,
  initialSection,
}: SettingsDialogProps): SettingsDialogState => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<SettingsSection>(initialSection ?? 'general');
  const [activeProviderId, setActiveProviderId] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState<string | null>(null);

  // 当 open 变为 true 且传入了 initialSection 时，跳转到对应 section
  useEffect(() => {
    if (open && initialSection) {
      setActiveSection(initialSection);
    }
  }, [open, initialSection]);

  // 初始化时选择第一个服务商
  useEffect(() => {
    if (!activeProviderId) {
      const sortedProviders = getSortedProviders();
      if (sortedProviders.length > 0) {
        setActiveProviderId(sortedProviders[0].id);
      }
    }
  }, [activeProviderId]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues,
  });
  const {
    control,
    handleSubmit,
    reset,
    register,
    setValue,
    getValues,
    formState: { errors },
  } = form;

  const stdioArray = useFieldArray({ control, name: 'mcp.stdio' });
  const httpArray = useFieldArray({ control, name: 'mcp.streamableHttp' });
  const providersArray = useFieldArray({ control, name: 'providers' });
  const customProvidersArray = useFieldArray({ control, name: 'customProviders' });
  const providerValues = useWatch({ control, name: 'providers' }) ?? [];
  const customProviderValues = useWatch({ control, name: 'customProviders' }) ?? [];

  // 获取预设服务商在表单数组中的索引
  const getProviderIndex = useCallback(
    (providerId: string) => {
      return providerValues.findIndex((p) => p.providerId === providerId);
    },
    [providerValues]
  );

  // 获取自定义服务商在表单数组中的索引
  const getCustomProviderIndex = useCallback(
    (providerId: string) => {
      return customProviderValues.findIndex((p) => p.providerId === providerId);
    },
    [customProviderValues]
  );

  useEffect(() => {
    if (!open || !window.desktopAPI?.agent) {
      return;
    }
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const settings = await window.desktopAPI.agent.getSettings();
        reset(settingsToForm(settings as AgentSettings));
      } catch (error) {
        console.error('[settings-dialog] failed to load agent settings', error);
      } finally {
        setIsLoading(false);
      }
    };
    void loadSettings();
  }, [open, reset]);

  useEffect(() => {
    if (!window.desktopAPI?.agent?.onSettingsChange) {
      return;
    }
    const dispose = window.desktopAPI.agent.onSettingsChange((settings: AgentSettings) => {
      reset(settingsToForm(settings));
    });
    return () => dispose?.();
  }, [reset]);

  useEffect(() => {
    let cancelled = false;
    const loadVersion = async () => {
      if (!window.desktopAPI?.getAppVersion) {
        return;
      }
      try {
        const version = await window.desktopAPI.getAppVersion();
        if (!cancelled) {
          setAppVersion(version);
        }
      } catch {
        if (!cancelled) {
          setAppVersion(null);
        }
      }
    };
    void loadVersion();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAddCustomProvider = useCallback(() => {
    const newId = `custom-${crypto.randomUUID().slice(0, 8)}`;
    customProvidersArray.append({
      providerId: newId,
      name: 'Custom provider',
      enabled: false,
      apiKey: '',
      baseUrl: '',
      sdkType: 'openai-compatible',
      models: [],
      defaultModelId: null,
    });
    setActiveProviderId(newId);
  }, [customProvidersArray]);

  const handleRemoveCustomProvider = useCallback(
    (index: number) => {
      const removed = customProviderValues[index];
      customProvidersArray.remove(index);
      // 如果删除的是当前选中的，选择第一个预设服务商
      if (removed?.providerId === activeProviderId) {
        const sortedProviders = getSortedProviders();
        setActiveProviderId(sortedProviders[0]?.id ?? null);
      }
    },
    [customProvidersArray, customProviderValues, activeProviderId]
  );

  const handleClose = useCallback(() => {
    if (!isSaving) {
      onOpenChange(false);
    }
  }, [isSaving, onOpenChange]);

  const handleSave = useCallback(
    async (values: FormValues) => {
      if (!window.desktopAPI?.agent) {
        return;
      }
      try {
        setIsSaving(true);
        await window.desktopAPI.agent.updateSettings(formToUpdate(values));
        onOpenChange(false);
      } catch (error) {
        console.error('[settings-dialog] failed to save settings', error);
      } finally {
        setIsSaving(false);
      }
    },
    [onOpenChange]
  );

  return {
    meta: {
      isLoading,
      isSaving,
      appVersion,
    },
    navigation: {
      activeSection,
      setActiveSection,
    },
    form: {
      control: control as any,
      register,
      errors,

      handleSubmit: handleSubmit as any,
      setValue,
      getValues,
    },
    mcpArrays: {
      stdioArray,
      httpArray,
    },
    providers: {
      providerValues,
      customProviderValues,
      activeProviderId,
      setActiveProviderId,
      handleAddCustomProvider,
      handleRemoveCustomProvider,
      getProviderIndex,
      getCustomProviderIndex,
    },
    actions: {
      handleSave,
      handleClose,
    },
  };
};
