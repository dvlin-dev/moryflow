/**
 * [INPUT]: modelId/providerId/sdkType/extendParams（可部分输入）
 * [OUTPUT]: ModelThinkingProfile（等级、默认值、可见参数、约束）
 * [POS]: thinking 规则解析器；供 PC/Server/Runtime 统一消费
 *
 * [PROTOCOL]: 本文件新增约束或优先级逻辑时，必须补充同名单测
 */

import { DEFAULT_AI_MODEL_LIST } from '../aiModels';
import { DEFAULT_MODEL_PROVIDER_LIST } from '../modelProviders';
import type { DefaultAiModelListItem, ExtendParamsType } from '../types/aiModel';

import {
  CONTROL_PRESETS,
  buildThinkingVisibleParams,
  hasThinkingControl,
  isThinkingControlKey,
  normalizeThinkingLevelId,
  pickActiveThinkingControl,
  toThinkingLevelLabel,
} from './rules';
import type {
  ModelThinkingProfile,
  ResolveModelThinkingProfileInput,
  ThinkingConstraint,
  ThinkingLevelId,
  ThinkingLevelOption,
  ThinkingVisibleParam,
} from './types';

type ModelWithSettings = DefaultAiModelListItem & {
  settings?: {
    extendParams?: ExtendParamsType[];
  };
};

const OFF_LEVEL_ID: ThinkingLevelId = 'off';

export type RuntimeChatSdkType =
  | 'openai'
  | 'openai-compatible'
  | 'openrouter'
  | 'anthropic'
  | 'google';

type ProviderSdkType = RuntimeChatSdkType | 'fal';

const RUNTIME_CHAT_SDK_TYPES = new Set<RuntimeChatSdkType>([
  'openai',
  'openai-compatible',
  'openrouter',
  'anthropic',
  'google',
]);

const CHAT_MODEL_LIST = DEFAULT_AI_MODEL_LIST.filter(
  (item): item is ModelWithSettings => item.type === 'chat'
);

const MODEL_KEY = (providerId: string, modelId: string) => `${providerId}::${modelId}`;

const BUILTIN_MODEL_BY_PROVIDER_AND_ID = new Map<string, ModelWithSettings>(
  CHAT_MODEL_LIST.map((item) => [MODEL_KEY(item.providerId, item.id), item])
);

const BUILTIN_MODELS_BY_ID = new Map<string, ModelWithSettings[]>();
for (const item of CHAT_MODEL_LIST) {
  const list = BUILTIN_MODELS_BY_ID.get(item.id) ?? [];
  list.push(item);
  BUILTIN_MODELS_BY_ID.set(item.id, list);
}

// Provider -> SDK 显式映射（禁止运行时隐式兜底）。
const PROVIDER_SDK_TYPE_MAP = new Map<string, ProviderSdkType>([
  ['anthropic', 'anthropic'],
  ['azure', 'openai-compatible'],
  ['azureai', 'openai-compatible'],
  ['bedrock', 'openai-compatible'],
  ['cloudflare', 'openai-compatible'],
  ['deepseek', 'openai-compatible'],
  ['fal', 'fal'],
  ['github', 'openai-compatible'],
  ['google', 'google'],
  ['groq', 'openai-compatible'],
  ['huggingface', 'openai-compatible'],
  ['hunyuan', 'openai-compatible'],
  ['minimax', 'openai-compatible'],
  ['mistral', 'openai-compatible'],
  ['moonshot', 'openai-compatible'],
  ['nvidia', 'openai-compatible'],
  ['ollama', 'openai-compatible'],
  ['openai', 'openai'],
  ['openai-compatible', 'openai-compatible'],
  ['openrouter', 'openrouter'],
  ['perplexity', 'openai-compatible'],
  ['qwen', 'openai-compatible'],
  ['vertexai', 'google'],
  ['volcengine', 'openai-compatible'],
  ['xai', 'openai-compatible'],
  ['zenmux', 'openrouter'],
  ['zhipu', 'openai-compatible'],
]);
const BUILTIN_PROVIDER_IDS = new Set(DEFAULT_MODEL_PROVIDER_LIST.map((provider) => provider.id));

const normalizeSdkTypeAlias = (sdkType: string): ProviderSdkType | undefined => {
  const normalizedSdkType = sdkType.trim().toLowerCase();
  if (!normalizedSdkType) {
    return undefined;
  }

  switch (normalizedSdkType) {
    case 'openai':
      return 'openai';
    case 'openai-compatible':
      return 'openai-compatible';
    case 'openrouter':
    case 'router':
      return 'openrouter';
    case 'anthropic':
      return 'anthropic';
    case 'google':
    case 'vertexai':
      return 'google';
    case 'fal':
      return 'fal';
    // 下列 provider 统一显式归一到 openai-compatible。
    case 'azure':
    case 'azureai':
    case 'bedrock':
    case 'cloudflare':
    case 'deepseek':
    case 'github':
    case 'groq':
    case 'huggingface':
    case 'hunyuan':
    case 'minimax':
    case 'mistral':
    case 'moonshot':
    case 'nvidia':
    case 'ollama':
    case 'perplexity':
    case 'qwen':
    case 'volcengine':
    case 'xai':
    case 'zhipu':
      return 'openai-compatible';
    case 'zenmux':
      return 'openrouter';
    default:
      return undefined;
  }
};

const REASONING_EFFORT_FAMILY = new Set<ExtendParamsType>([
  'reasoningEffort',
  'gpt5ReasoningEffort',
  'gpt5_1ReasoningEffort',
  'gpt5_2ReasoningEffort',
  'gpt5_2ProReasoningEffort',
  'effort',
]);

const THINKING_LEVEL_FAMILY = new Set<ExtendParamsType>([
  'thinkingLevel',
  'thinkingLevel2',
  'thinkingLevel3',
]);

const THINKING_BUDGET_FAMILY = new Set<ExtendParamsType>([
  'reasoningBudgetToken',
  'thinkingBudget',
  'enableReasoning',
]);

const dedupeVisibleParams = (params: ThinkingVisibleParam[]): ThinkingVisibleParam[] => {
  const deduped: ThinkingVisibleParam[] = [];
  const seen = new Set<string>();

  for (const item of params) {
    const key = item.key.trim();
    const value = item.value.trim();
    if (!key || !value) {
      continue;
    }
    const hash = `${key}=${value}`;
    if (seen.has(hash)) {
      continue;
    }
    seen.add(hash);
    deduped.push({ key, value });
  }

  return deduped;
};

const parseSemanticModelAlias = (
  modelId: string
): { providerId: string; modelId: string } | undefined => {
  const separatorIndex = modelId.indexOf('/');
  if (separatorIndex <= 0 || separatorIndex >= modelId.length - 1) {
    return undefined;
  }

  const providerId = modelId.slice(0, separatorIndex).trim();
  const aliasModelId = modelId.slice(separatorIndex + 1).trim();
  if (!providerId || !aliasModelId) {
    return undefined;
  }

  if (!BUILTIN_PROVIDER_IDS.has(providerId)) {
    return undefined;
  }

  return { providerId, modelId: aliasModelId };
};

const pickModelCandidate = (
  candidates: ModelWithSettings[] | undefined,
  preferredProviderId?: string,
  fallbackProviderId?: string
): ModelWithSettings | undefined => {
  if (!candidates || candidates.length === 0) {
    return undefined;
  }

  const normalizedPreferredProviderId = (preferredProviderId || '').trim();
  if (normalizedPreferredProviderId) {
    const exact = candidates.find(
      (candidate) => candidate.providerId === normalizedPreferredProviderId
    );
    if (exact) {
      return exact;
    }
  }

  const normalizedFallbackProviderId = (fallbackProviderId || '').trim();
  if (
    normalizedFallbackProviderId &&
    normalizedFallbackProviderId !== normalizedPreferredProviderId
  ) {
    const semantic = candidates.find(
      (candidate) => candidate.providerId === normalizedFallbackProviderId
    );
    if (semantic) {
      return semantic;
    }
  }

  return candidates[0];
};

const resolveBuiltinModel = (input: {
  modelId?: string;
  providerId?: string;
}): ModelWithSettings | undefined => {
  const modelId = (input.modelId || '').trim();
  const providerId = (input.providerId || '').trim();
  const semanticAlias = parseSemanticModelAlias(modelId);

  if (!modelId) {
    return undefined;
  }

  // 1) provider + model exact hit
  if (providerId) {
    const exact = BUILTIN_MODEL_BY_PROVIDER_AND_ID.get(MODEL_KEY(providerId, modelId));
    if (exact) {
      return exact;
    }
  }

  // 2) provider alias in prefixed model id, e.g. openai/gpt-5.2
  if (semanticAlias) {
    const byAlias = BUILTIN_MODEL_BY_PROVIDER_AND_ID.get(
      MODEL_KEY(semanticAlias.providerId, semanticAlias.modelId)
    );
    if (byAlias) {
      return byAlias;
    }
  }

  // 3) global model-id hit (exact id)
  const directCandidates = BUILTIN_MODELS_BY_ID.get(modelId);
  const directHit = pickModelCandidate(directCandidates, providerId, semanticAlias?.providerId);
  if (directHit) {
    return directHit;
  }

  // 4) global alias-model-id hit (id after provider prefix)
  if (semanticAlias) {
    const aliasCandidates = BUILTIN_MODELS_BY_ID.get(semanticAlias.modelId);
    return pickModelCandidate(aliasCandidates, providerId, semanticAlias.providerId);
  }

  return undefined;
};

const toThinkingControls = (extendParams?: ExtendParamsType[]): ExtendParamsType[] => {
  if (!extendParams || extendParams.length === 0) {
    return [];
  }

  const deduped = new Set<ExtendParamsType>();
  for (const key of extendParams) {
    if (!isThinkingControlKey(key)) {
      continue;
    }
    if (!hasThinkingControl(key)) {
      continue;
    }
    deduped.add(key);
  }
  return Array.from(deduped);
};

const buildConstraints = (controls: ExtendParamsType[]): ThinkingConstraint[] => {
  const constraints: ThinkingConstraint[] = [];

  const hasEffortFamily = controls.some((key) => REASONING_EFFORT_FAMILY.has(key));
  const hasLevelFamily = controls.some((key) => THINKING_LEVEL_FAMILY.has(key));
  const hasBudgetFamily = controls.some((key) => THINKING_BUDGET_FAMILY.has(key));

  if (hasEffortFamily && hasBudgetFamily) {
    constraints.push({
      id: 'reasoning-effort-vs-budget',
      keys: ['reasoningEffort', 'thinkingBudget'],
      reason: 'reasoning.effort 与 reasoning.max_tokens 属于 one-of 约束，不能同时下发',
      type: 'one-of',
    });
  }

  if (hasLevelFamily && hasBudgetFamily) {
    constraints.push({
      id: 'thinking-level-vs-budget',
      keys: ['thinkingLevel', 'thinkingBudget'],
      reason: 'thinking level 与 budget 互斥，避免同一请求出现冲突语义',
      type: 'mutually-exclusive',
    });
  }

  return constraints;
};

const buildOffOnlyProfile = (input: ResolveModelThinkingProfileInput): ModelThinkingProfile => ({
  activeControl: 'off-only',
  availableControls: [],
  constraints: [],
  defaultLevel: OFF_LEVEL_ID,
  levels: [{ id: OFF_LEVEL_ID, label: toThinkingLevelLabel(OFF_LEVEL_ID), visibleParams: [] }],
  modelId: input.modelId,
  providerId: input.providerId,
  sdkType: input.sdkType,
  source: 'off-only',
  supportsThinking: false,
});

const buildLevels = (input: {
  control: ExtendParamsType;
  controls: ExtendParamsType[];
  providerId?: string;
  sdkType?: string;
}): ThinkingLevelOption[] => {
  const preset = CONTROL_PRESETS[input.control];
  if (!preset) {
    return [];
  }

  const controlsSet = new Set(input.controls);
  return preset.levels.map((rawLevel) => {
    const levelId = normalizeThinkingLevelId(rawLevel);
    return {
      id: levelId,
      label: toThinkingLevelLabel(levelId),
      visibleParams: dedupeVisibleParams(
        buildThinkingVisibleParams({
          control: input.control,
          controls: controlsSet,
          levelId,
          providerId: input.providerId,
          sdkType: input.sdkType,
        })
      ),
    };
  });
};

const sanitizeDefaultLevel = (
  defaultLevel: string,
  levels: ThinkingLevelOption[]
): ThinkingLevelId => {
  const normalized = normalizeThinkingLevelId(defaultLevel);
  return levels.some((level) => level.id === normalized) ? normalized : OFF_LEVEL_ID;
};

export const resolveProviderSdkType = (input: {
  providerId?: string;
  sdkType?: string;
}): string | undefined => {
  const providerId = (input.providerId || '').trim();
  if (providerId) {
    const mapped = PROVIDER_SDK_TYPE_MAP.get(providerId);
    if (mapped) {
      return mapped;
    }
  }

  if (!input.sdkType || !input.sdkType.trim()) {
    return undefined;
  }

  return normalizeSdkTypeAlias(input.sdkType);
};

export const resolveRuntimeChatSdkType = (input: {
  providerId?: string;
  sdkType?: string;
}): RuntimeChatSdkType | undefined => {
  const resolved = resolveProviderSdkType(input);
  if (!resolved) {
    return undefined;
  }
  const normalized = resolved.trim().toLowerCase();
  if (!RUNTIME_CHAT_SDK_TYPES.has(normalized as RuntimeChatSdkType)) {
    return undefined;
  }
  return normalized as RuntimeChatSdkType;
};

export const resolveModelThinkingProfile = (
  input: ResolveModelThinkingProfileInput
): ModelThinkingProfile => {
  const builtin = resolveBuiltinModel({ modelId: input.modelId, providerId: input.providerId });
  const sdkType = resolveProviderSdkType({
    providerId: input.providerId || builtin?.providerId,
    sdkType: input.sdkType,
  });

  if (input.abilities?.reasoning === false) {
    return buildOffOnlyProfile({
      ...input,
      modelId: input.modelId || builtin?.id,
      providerId: input.providerId || builtin?.providerId,
      sdkType,
    });
  }

  const extendParams = input.extendParams ?? builtin?.settings?.extendParams ?? [];
  const controls = toThinkingControls(extendParams);
  const activeControl = pickActiveThinkingControl(controls);

  if (!activeControl) {
    return buildOffOnlyProfile({
      ...input,
      modelId: input.modelId || builtin?.id,
      providerId: input.providerId || builtin?.providerId,
      sdkType,
    });
  }

  const preset = CONTROL_PRESETS[activeControl];
  if (!preset) {
    return buildOffOnlyProfile({
      ...input,
      modelId: input.modelId || builtin?.id,
      providerId: input.providerId || builtin?.providerId,
      sdkType,
    });
  }

  const levels = buildLevels({
    control: activeControl,
    controls,
    providerId: input.providerId || builtin?.providerId,
    sdkType,
  });

  if (levels.length === 0) {
    return buildOffOnlyProfile({
      ...input,
      modelId: input.modelId || builtin?.id,
      providerId: input.providerId || builtin?.providerId,
      sdkType,
    });
  }

  const defaultLevel = sanitizeDefaultLevel(preset.defaultLevel, levels);

  return {
    activeControl,
    availableControls: controls,
    constraints: buildConstraints(controls),
    defaultLevel,
    levels,
    modelId: input.modelId || builtin?.id,
    providerId: input.providerId || builtin?.providerId,
    sdkType,
    source: 'model-native',
    supportsThinking: levels.some((level) => level.id !== OFF_LEVEL_ID),
  };
};

export const resolveModelThinkingProfileById = (input: {
  abilities?: {
    reasoning?: boolean;
  };
  extendParams?: ExtendParamsType[];
  modelId: string;
  providerId?: string;
  sdkType?: string;
}): ModelThinkingProfile =>
  resolveModelThinkingProfile({
    abilities: input.abilities,
    extendParams: input.extendParams,
    modelId: input.modelId,
    providerId: input.providerId,
    sdkType: input.sdkType,
  });

export const listThinkingLevels = (profile: ModelThinkingProfile): ThinkingLevelId[] =>
  profile.levels.map((level) => level.id);

export const getThinkingVisibleParamsByLevel = (
  profile: ModelThinkingProfile,
  levelId?: string
): ThinkingVisibleParam[] => {
  const targetLevelId = normalizeThinkingLevelId(levelId || profile.defaultLevel);
  const hit = profile.levels.find((level) => level.id === targetLevelId);
  if (hit) {
    return hit.visibleParams;
  }
  const fallback = profile.levels.find((level) => level.id === profile.defaultLevel);
  return fallback?.visibleParams ?? [];
};
