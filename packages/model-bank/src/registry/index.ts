/**
 * [PROVIDES]: 兼容 registry/search API（替代 agents-model-registry + model-registry-data）
 * [DEPENDS]: aiModels/modelProviders/types
 * [POS]: model-bank 对外查询与映射入口
 * [UPDATE]: 2026-02-28 - 修复 toApiModelId 对 provider 内模型 ID 的二次切分，保留 openrouter 等多段 model id（含 '/'）原样透传
 */

import { DEFAULT_AI_MODEL_LIST } from '../aiModels';
import { DEFAULT_MODEL_PROVIDER_LIST } from '../modelProviders';
import { resolveProviderSdkType, resolveRuntimeChatSdkType } from '../thinking/resolver';

import type {
  ModelInfo,
  ModelRegistry,
  PresetModel,
  PresetProvider,
  ProviderInfo,
  ProviderRegistry,
  SearchOptions,
  SyncMeta,
} from './types';

const DEFAULT_CONTEXT_WINDOW = 128_000;
const DEFAULT_MAX_OUTPUT = 4096;
const PROVIDER_MODEL_REF_SEPARATOR = '/';

export const buildProviderModelRef = (providerId: string, modelId: string): string => {
  const normalizedProviderId = providerId.trim();
  const normalizedModelId = modelId.trim();
  return `${normalizedProviderId}${PROVIDER_MODEL_REF_SEPARATOR}${normalizedModelId}`;
};

export const parseProviderModelRef = (
  value: string | null | undefined
): { providerId: string; modelId: string } | null => {
  if (!value) {
    return null;
  }
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  const separatorIndex = normalized.indexOf(PROVIDER_MODEL_REF_SEPARATOR);
  if (separatorIndex <= 0 || separatorIndex >= normalized.length - 1) {
    return null;
  }
  const providerId = normalized.slice(0, separatorIndex).trim();
  const modelId = normalized.slice(separatorIndex + 1).trim();
  if (!providerId || !modelId) {
    return null;
  }
  return { providerId, modelId };
};

const toCategory = (mode: string): PresetModel['category'] => {
  switch (mode) {
    case 'chat':
      return 'chat';
    case 'embedding':
      return 'embedding';
    case 'image':
      return 'image';
    case 'tts':
      return 'tts';
    case 'stt':
      return 'asr';
    default:
      return 'chat';
  }
};

const toSearchMode = (mode: string): string => {
  switch (mode) {
    case 'image':
      return 'image_generation';
    default:
      return mode;
  }
};

const toModelModalities = (
  model: (typeof DEFAULT_AI_MODEL_LIST)[number]
): PresetModel['modalities'] => {
  if (model.type === 'image') {
    return { input: ['text', 'image'], output: ['image'] };
  }
  if (model.type === 'embedding') {
    return { input: ['text'], output: ['text'] };
  }
  if (model.type === 'tts') {
    return { input: ['text'], output: ['audio'] };
  }
  if (model.type === 'stt') {
    return { input: ['audio'], output: ['text'] };
  }

  const input: PresetModel['modalities']['input'] = ['text'];
  if (model.abilities?.vision) {
    input.push('image');
  }
  if (model.abilities?.video) {
    input.push('video');
  }
  if (model.abilities?.files) {
    input.push('pdf');
  }

  return { input, output: ['text'] };
};

const resolveRate = (
  model: (typeof DEFAULT_AI_MODEL_LIST)[number],
  unitNames: string[]
): number => {
  const units = model.pricing?.units;
  if (!Array.isArray(units)) {
    return 0;
  }

  for (const unitName of unitNames) {
    const hit = units.find((unit) => unit.name === unitName);
    if (!hit) {
      continue;
    }
    if (hit.strategy === 'fixed') {
      return hit.rate;
    }
    if (hit.strategy === 'tiered' && Array.isArray(hit.tiers) && hit.tiers.length > 0) {
      return hit.tiers[0]?.rate ?? 0;
    }
  }

  return 0;
};

const providerList = DEFAULT_MODEL_PROVIDER_LIST.map((provider, index) => {
  const modelIds = DEFAULT_AI_MODEL_LIST.filter((model) => model.providerId === provider.id)
    .filter((model) => model.type === 'chat')
    .map((model) => model.id);

  const defaultBaseUrl =
    typeof provider.settings?.proxyUrl?.placeholder === 'string'
      ? provider.settings.proxyUrl.placeholder
      : undefined;

  const configuredSdkType =
    typeof provider.settings?.sdkType === 'string' && provider.settings.sdkType.trim().length > 0
      ? provider.settings.sdkType
      : undefined;
  // 运行时 SDK 类型采用显式 provider 映射；未知值不做隐式兜底。
  // 非 chat provider（如 fal）保留语义 sdkType 仅用于元数据展示。
  const runtimeSdkType = resolveRuntimeChatSdkType({
    providerId: provider.id,
    sdkType: configuredSdkType,
  });
  const semanticSdkType = resolveProviderSdkType({
    providerId: provider.id,
    sdkType: configuredSdkType,
  });
  const sdkType = runtimeSdkType ?? semanticSdkType ?? provider.id;

  const card = provider as {
    allowCustomModels?: boolean;
    authType?: 'api-key' | 'oauth' | 'none';
    defaultBaseUrl?: string;
    description?: string;
    docUrl?: string;
    hidden?: boolean;
    icon?: string;
    localBackend?: string;
    modelIdMapping?: Record<string, string>;
    nativeApiBaseUrl?: string;
    sortOrder?: number;
  };

  const normalized: PresetProvider = {
    id: provider.id,
    name: provider.name,
    authType: card.authType ?? 'api-key',
    sdkType,
    modelIds,
    sortOrder: card.sortOrder ?? DEFAULT_MODEL_PROVIDER_LIST.length - index,
    ...(card.allowCustomModels ? { allowCustomModels: true } : {}),
    ...(typeof card.description === 'string' ? { description: card.description } : {}),
    ...(typeof defaultBaseUrl === 'string' ? { defaultBaseUrl } : {}),
    ...(typeof card.docUrl === 'string'
      ? { docUrl: card.docUrl }
      : typeof provider.modelsUrl === 'string'
        ? { docUrl: provider.modelsUrl }
        : {}),
    ...(typeof card.hidden === 'boolean' ? { hidden: card.hidden } : {}),
    ...(typeof card.icon === 'string' ? { icon: card.icon } : { icon: provider.id }),
    ...(typeof card.localBackend === 'string' ? { localBackend: card.localBackend } : {}),
    ...(card.modelIdMapping ? { modelIdMapping: card.modelIdMapping } : {}),
    ...(typeof card.nativeApiBaseUrl === 'string'
      ? { nativeApiBaseUrl: card.nativeApiBaseUrl }
      : {}),
  };

  return normalized;
});

export const providerRegistry: ProviderRegistry = Object.fromEntries(
  providerList.map((provider) => [provider.id, provider])
);

const toPresetModelDefinition = (model: (typeof DEFAULT_AI_MODEL_LIST)[number]) => ({
  name: model.displayName || model.id,
  ...(model.displayName ? { shortName: model.displayName } : {}),
  category: toCategory(model.type),
  capabilities: {
    attachment: Boolean(
      model.abilities?.files || model.abilities?.vision || model.abilities?.video
    ),
    reasoning: Boolean(model.abilities?.reasoning),
    temperature: true,
    toolCall: Boolean(model.abilities?.functionCall),
    openWeights: false,
  },
  modalities: toModelModalities(model),
  limits: {
    context: model.contextWindowTokens ?? DEFAULT_CONTEXT_WINDOW,
    output: model.maxOutput ?? DEFAULT_MAX_OUTPUT,
  },
  ...(model.releasedAt ? { releaseDate: model.releasedAt } : {}),
});

const providerModelByRef = new Map<string, (typeof DEFAULT_AI_MODEL_LIST)[number]>();
for (const model of DEFAULT_AI_MODEL_LIST) {
  const ref = buildProviderModelRef(model.providerId, model.id);
  if (!providerModelByRef.has(ref)) {
    providerModelByRef.set(ref, model);
  }
}

// Canonical model registry: provider/modelId
export const modelRegistry: ModelRegistry = Object.fromEntries(
  Array.from(providerModelByRef.entries()).map(([modelRef, model]) => [
    modelRef,
    toPresetModelDefinition(model),
  ])
);

const allModelInfos: ModelInfo[] = DEFAULT_AI_MODEL_LIST.map((model) => {
  const provider = providerRegistry[model.providerId];
  const inputPricePerMillion = resolveRate(model, ['textInput']);
  const outputPricePerMillion = resolveRate(model, ['textOutput']);
  const inputModalities = toModelModalities(model).input;

  return {
    id: model.id,
    displayName: model.displayName || model.id,
    provider: model.providerId,
    providerName: provider?.name ?? model.providerId,
    mode: toSearchMode(model.type),
    maxContextTokens: model.contextWindowTokens ?? DEFAULT_CONTEXT_WINDOW,
    maxOutputTokens: model.maxOutput ?? DEFAULT_MAX_OUTPUT,
    inputPricePerMillion,
    outputPricePerMillion,
    capabilities: {
      vision: Boolean(model.abilities?.vision),
      tools: Boolean(model.abilities?.functionCall),
      reasoning: Boolean(model.abilities?.reasoning),
      json: Boolean(model.abilities?.structuredOutput),
      audio: inputModalities.includes('audio'),
      pdf: inputModalities.includes('pdf'),
    },
    deprecated: Boolean(model.legacy),
  };
});

const sourceMeta: SyncMeta = {
  syncedAt: new Date().toISOString(),
  modelCount: allModelInfos.length,
  providerCount: Object.keys(providerRegistry).length,
  source: '@moryflow/model-bank',
};

export function getSortedProviders(): PresetProvider[] {
  return Object.values(providerRegistry)
    .filter((provider) => !provider.hidden)
    .sort((a, b) => (b.sortOrder ?? 0) - (a.sortOrder ?? 0));
}

export function getAllProviderIds(): string[] {
  return Object.keys(providerRegistry);
}

export function getProviderById(id: string): PresetProvider | null {
  return providerRegistry[id] ?? null;
}

export function getProviderModelApiIds(providerId: string): string[] {
  const provider = getProviderById(providerId);
  if (!provider) {
    return [];
  }
  if (provider.modelIdMapping) {
    return Object.keys(provider.modelIdMapping);
  }
  return provider.modelIds;
}

export function normalizeModelId(providerId: string, apiModelId: string): string {
  const provider = getProviderById(providerId);
  if (!provider) {
    return apiModelId;
  }
  if (provider.modelIdMapping?.[apiModelId]) {
    return provider.modelIdMapping[apiModelId];
  }
  return apiModelId;
}

export function toApiModelId(providerId: string, standardModelId: string): string {
  // 注意：standardModelId 已是 provider 内模型 ID，可能本身包含 '/'（例如 minimax/minimax-m2.1）。
  // 这里不能再次按 provider/model 语义解析，否则会错误丢失前缀。
  const normalizedModelId = standardModelId.trim();
  const provider = getProviderById(providerId);
  if (!provider || !provider.modelIdMapping) {
    return normalizedModelId;
  }

  for (const [apiId, mappedId] of Object.entries(provider.modelIdMapping)) {
    if (mappedId === normalizedModelId) {
      return apiId;
    }
  }

  return normalizedModelId;
}

export function getModelById(id: string): PresetModel | null {
  const parsedRef = parseProviderModelRef(id);
  if (!parsedRef) {
    return null;
  }
  const model = modelRegistry[id];
  if (!model) {
    return null;
  }
  return { id, ...model };
}

export function getModelByProviderAndId(providerId: string, modelId: string): PresetModel | null {
  const modelRef = buildProviderModelRef(providerId, modelId);
  const model = modelRegistry[modelRef];
  if (!model) {
    return null;
  }
  return {
    id: modelId,
    ...model,
  };
}

export function getAllModelIds(): string[] {
  return Object.keys(modelRegistry);
}

export function getModelsByCategory(category: string): string[] {
  return Object.entries(modelRegistry)
    .filter(([, model]) => model.category === category)
    .map(([id]) => id);
}

export function getModelContextWindow(modelId: string | null | undefined): number {
  if (!modelId) {
    return DEFAULT_CONTEXT_WINDOW;
  }
  return getModelById(modelId)?.limits?.context ?? DEFAULT_CONTEXT_WINDOW;
}

export function searchModels(options: SearchOptions): ModelInfo[] {
  const query = options.query.trim().toLowerCase();
  const limit = options.limit ?? 20;
  const includeDeprecated = options.includeDeprecated ?? false;

  let candidates = allModelInfos.filter((model) => {
    if (!includeDeprecated && model.deprecated) {
      return false;
    }
    if (options.provider && model.provider !== options.provider) {
      return false;
    }
    if (options.mode && model.mode !== options.mode) {
      return false;
    }
    return true;
  });

  if (query.length > 0) {
    candidates = candidates
      .map((model) => {
        const haystacks = [model.id, model.displayName, model.provider, model.providerName].map(
          (item) => item.toLowerCase()
        );
        let score = 0;
        for (const hay of haystacks) {
          if (hay === query) {
            score = Math.max(score, 100);
          } else if (hay.startsWith(query)) {
            score = Math.max(score, 80);
          } else if (hay.includes(query)) {
            score = Math.max(score, 60);
          }
        }
        return { model, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.model.id.localeCompare(b.model.id))
      .map((entry) => entry.model);
  } else {
    candidates = [...candidates].sort((a, b) => a.provider.localeCompare(b.provider));
  }

  return candidates.slice(0, limit);
}

export function getProviders(): ProviderInfo[] {
  return getSortedProviders().map((provider) => ({
    id: provider.id,
    name: provider.name,
    modelCount: allModelInfos.filter((model) => model.provider === provider.id).length,
  }));
}

export function getAllModels(): ModelInfo[] {
  return allModelInfos;
}

export function getModelCount(): number {
  return allModelInfos.length;
}

export function getSyncMeta(): SyncMeta {
  return sourceMeta;
}

export type {
  ModelCapabilities,
  ModelModality,
  ModelModalities,
  ModelLimits,
  ModelInfo,
  ModelThinkingOverride,
  ModelThinkingProfile,
  ModelRegistry,
  PresetModel,
  PresetProvider,
  ProviderSdkType,
  ProviderInfo,
  ProviderRegistry,
  SearchOptions,
  SyncMeta,
  ThinkingLevelId,
  ThinkingLevelOption,
  ThinkingVisibleParam,
} from './types';
