import type {
  AgentSettings,
  AgentSettingsUpdate,
  UserProviderConfig,
  CustomProviderConfig,
} from '@shared/ipc';
import type { FormValues } from './const';

type EnvEntry = { key: string; value: string };
type PartialEnvEntry = { key?: string; value?: string };

/** Record<string, string> -> 表单数组 */
const envRecordToArray = (record?: Record<string, string>): EnvEntry[] => {
  if (!record) return [];
  return Object.entries(record).map(([key, value]) => ({ key, value }));
};

/** 表单数组 -> Record<string, string> */
const envArrayToRecord = (entries?: PartialEnvEntry[]): Record<string, string> | undefined => {
  if (!entries || entries.length === 0) return undefined;
  const result: Record<string, string> = {};
  for (const entry of entries) {
    const key = entry.key?.trim();
    if (key) {
      result[key] = entry.value ?? '';
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
};

/**
 * 将 AgentSettings 转换为表单数据
 */
export const settingsToForm = (settings: AgentSettings): FormValues => ({
  model: {
    defaultModel: settings.model.defaultModel,
  },
  personalization: {
    customInstructions: settings.personalization?.customInstructions ?? '',
  },
  mcp: {
    stdio: settings.mcp.stdio.map((entry) => ({
      id: entry.id,
      name: entry.name,
      packageName: entry.packageName,
      binName: entry.binName ?? '',
      args: entry.args.join(' '),
      enabled: entry.enabled,
      env: envRecordToArray(entry.env),
    })),
    streamableHttp: settings.mcp.streamableHttp.map((entry) => ({
      id: entry.id,
      name: entry.name,
      url: entry.url,
      authorizationHeader: entry.authorizationHeader ?? '',
      enabled: entry.enabled,
      headers: envRecordToArray(entry.headers),
    })),
  },
  providers: settings.providers.map((provider) => ({
    providerId: provider.providerId,
    enabled: provider.enabled,
    apiKey: provider.apiKey ?? '',
    baseUrl: provider.baseUrl ?? '',
    models: provider.models.map((model) => ({
      id: model.id,
      enabled: model.enabled,
      // 保留自定义模型的额外字段
      isCustom: model.isCustom,
      customName: model.customName,
      customContext: model.customContext,
      customOutput: model.customOutput,
      customCapabilities: model.customCapabilities,
      customInputModalities: model.customInputModalities,
      thinking: model.thinking,
    })),
    defaultModelId: provider.defaultModelId,
  })),
  customProviders: (settings.customProviders || []).map((provider) => ({
    providerId: provider.providerId,
    name: provider.name,
    enabled: provider.enabled,
    apiKey: provider.apiKey ?? '',
    baseUrl: provider.baseUrl ?? '',
    models: provider.models.map((model) => ({
      id: model.id,
      enabled: model.enabled,
      isCustom: true,
      customName: model.customName ?? model.id,
      customContext: model.customContext,
      customOutput: model.customOutput,
      customCapabilities: model.customCapabilities,
      customInputModalities: model.customInputModalities,
      thinking: model.thinking,
    })),
    defaultModelId: provider.defaultModelId,
  })),
  ui: {
    theme: settings.ui?.theme ?? 'system',
  },
});

/**
 * 将表单数据转换为 AgentSettingsUpdate
 */
export const formToUpdate = (values: FormValues): AgentSettingsUpdate => {
  // 计算默认模型
  let defaultModel = values.model.defaultModel;
  if (!defaultModel) {
    // 查找第一个启用且配置了 API Key 的服务商的默认模型
    for (const provider of values.providers) {
      if (provider.enabled && provider.apiKey?.trim() && provider.defaultModelId) {
        defaultModel = `${provider.providerId}/${provider.defaultModelId}`;
        break;
      }
    }
    // 如果预设服务商没有，查找自定义服务商
    if (!defaultModel) {
      for (const provider of values.customProviders) {
        if (provider.enabled && provider.apiKey?.trim() && provider.defaultModelId) {
          defaultModel = `${provider.providerId}/${provider.defaultModelId}`;
          break;
        }
      }
    }
  }

  return {
    model: {
      defaultModel: defaultModel || null,
    },
    personalization: {
      customInstructions: values.personalization.customInstructions.trim(),
    },
    mcp: {
      stdio: values.mcp.stdio.map((entry) => ({
        id: entry.id,
        name: entry.name.trim(),
        packageName: entry.packageName.trim(),
        binName: entry.binName?.trim() || undefined,
        args: entry.args?.trim() ? entry.args.trim().split(/\s+/) : [],
        enabled: entry.enabled,
        env: envArrayToRecord(entry.env),
      })),
      streamableHttp: values.mcp.streamableHttp.map((entry) => ({
        id: entry.id,
        name: entry.name.trim(),
        url: entry.url.trim(),
        authorizationHeader: entry.authorizationHeader?.trim() || undefined,
        enabled: entry.enabled,
        headers: envArrayToRecord(entry.headers),
      })),
    },
    providers: values.providers.map(
      (provider): UserProviderConfig => ({
        providerId: provider.providerId,
        enabled: provider.enabled,
        apiKey: provider.apiKey?.trim() ? provider.apiKey.trim() : null,
        baseUrl: provider.baseUrl?.trim() ? provider.baseUrl.trim() : null,
        models: provider.models.map((model) => ({
          id: model.id,
          enabled: model.enabled,
          // 保存自定义模型的额外字段
          isCustom: model.isCustom,
          customName: model.customName,
          customContext: model.customContext,
          customOutput: model.customOutput,
          customCapabilities: model.customCapabilities,
          customInputModalities: model.customInputModalities,
          thinking: model.thinking,
        })),
        defaultModelId: provider.defaultModelId || null,
      })
    ),
    customProviders: values.customProviders.map(
      (provider): CustomProviderConfig => ({
        providerId: provider.providerId,
        name: provider.name.trim(),
        enabled: provider.enabled,
        apiKey: provider.apiKey?.trim() ? provider.apiKey.trim() : null,
        baseUrl: provider.baseUrl?.trim() ? provider.baseUrl.trim() : null,
        models: provider.models.map((model) => {
          const customName = model.customName?.trim() ? model.customName.trim() : model.id;
          return {
            id: model.id,
            enabled: model.enabled,
            isCustom: true,
            customName,
            customContext: model.customContext,
            customOutput: model.customOutput,
            customCapabilities: model.customCapabilities,
            customInputModalities: model.customInputModalities,
            thinking: model.thinking,
          };
        }),
        defaultModelId: provider.defaultModelId || null,
      })
    ),
    ui: {
      theme: values.ui.theme,
    },
  };
};
