/**
 * [PROVIDES]: Model form schema/defaults/mappers
 * [DEPENDS]: zod/v3, llm types/utils
 * [POS]: LlmModelDialog 表单逻辑下沉
 */

import { z } from 'zod/v3';
import {
  resolveModelThinkingProfile,
  resolveReasoningConfigFromThinkingLevel,
  toThinkingLevelLabel,
} from '@moryflow/model-bank';
import type { SubscriptionTier } from '@/lib/types';
import { parseLlmCapabilities } from '../utils';
import type {
  CreateLlmModelInput,
  LlmModelListItem,
  LlmProviderListItem,
  ReasoningConfig,
  UpdateLlmModelInput,
} from '../types';

type ThinkingLevelOption = {
  value: string;
  label: string;
  visibleParams: Array<{ key: string; value: string }>;
};

const OFF_LEVEL = 'off';
const OFF_ONLY_LEVEL_OPTION: ThinkingLevelOption = {
  value: OFF_LEVEL,
  label: toThinkingLevelLabel(OFF_LEVEL),
  visibleParams: [],
};

const normalizeReasoningEffort = (value: unknown): ReasoningConfig['effort'] | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  const mapped = normalized === 'max' ? 'xhigh' : normalized === 'off' ? 'none' : normalized;
  if (!['xhigh', 'high', 'medium', 'low', 'minimal', 'none'].includes(mapped)) {
    return undefined;
  }
  return mapped as ReasoningConfig['effort'];
};

const normalizeReasoningLevel = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  return normalized === 'none' || normalized === 'disabled' ? OFF_LEVEL : normalized;
};

const parseVisibleParams = (
  input: Array<{ key: string; value: string }> | undefined
): Array<{ key: string; value: string }> => {
  const deduped: Array<{ key: string; value: string }> = [];
  const seen = new Set<string>();
  for (const item of input ?? []) {
    if (!item || typeof item.key !== 'string' || typeof item.value !== 'string') {
      continue;
    }
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

const resolveReasoningLevelOptions = (input: {
  providerType?: string | null;
  modelId?: string | null;
}): {
  defaultLevel: string;
  supportsThinking: boolean;
  levelOptions: ThinkingLevelOption[];
} => {
  const providerId = input.providerType?.trim();
  const modelId = input.modelId?.trim();
  if (!providerId || !modelId) {
    return {
      defaultLevel: OFF_LEVEL,
      supportsThinking: false,
      levelOptions: [OFF_ONLY_LEVEL_OPTION],
    };
  }

  const profile = resolveModelThinkingProfile({
    providerId,
    modelId,
  });
  if (!profile.supportsThinking) {
    return {
      defaultLevel: OFF_LEVEL,
      supportsThinking: false,
      levelOptions: [OFF_ONLY_LEVEL_OPTION],
    };
  }

  const levelOptions = profile.levels.map((level) => ({
    value: level.id,
    label: level.label || toThinkingLevelLabel(level.id),
    visibleParams: parseVisibleParams(level.visibleParams),
  }));

  return {
    supportsThinking: true,
    defaultLevel: normalizeReasoningLevel(profile.defaultLevel) ?? OFF_LEVEL,
    levelOptions: levelOptions.length > 0 ? levelOptions : [OFF_ONLY_LEVEL_OPTION],
  };
};

const pickLevelFromStoredReasoning = (input: {
  enabled: boolean;
  effort?: ReasoningConfig['effort'];
  maxTokens?: number;
  levelOptions: ThinkingLevelOption[];
  defaultLevel: string;
}): string => {
  if (!input.enabled) {
    return OFF_LEVEL;
  }

  if (typeof input.maxTokens === 'number' && Number.isFinite(input.maxTokens)) {
    const matchedByBudget = input.levelOptions.find((level) =>
      level.visibleParams.some((param) => {
        if (param.key !== 'thinkingBudget') {
          return false;
        }
        const budget = Number(param.value);
        return Number.isFinite(budget) && budget === input.maxTokens;
      })
    );
    if (matchedByBudget) {
      return matchedByBudget.value;
    }
  }

  const effort = normalizeReasoningEffort(input.effort);
  if (effort && effort !== 'none') {
    const matchedByEffort = input.levelOptions.find((level) => {
      if (normalizeReasoningLevel(level.value) === effort) {
        return true;
      }
      return level.visibleParams.some((param) => {
        if (
          param.key !== 'reasoningEffort' &&
          param.key !== 'effort' &&
          param.key !== 'thinkingLevel'
        ) {
          return false;
        }
        return normalizeReasoningEffort(param.value) === effort;
      });
    });
    if (matchedByEffort) {
      return matchedByEffort.value;
    }
  }

  const fallback = normalizeReasoningLevel(input.defaultLevel) ?? OFF_LEVEL;
  if (input.levelOptions.some((level) => level.value === fallback)) {
    return fallback;
  }
  return input.levelOptions[0]?.value ?? OFF_LEVEL;
};

const resolveReasoningConfigByLevel = (input: {
  enabled: boolean;
  exclude: boolean;
  level: string;
  providerType?: string | null;
  modelId?: string | null;
}): ReasoningConfig => {
  const preset = resolveReasoningLevelOptions({
    providerType: input.providerType,
    modelId: input.modelId,
  });
  if (!input.enabled || !preset.supportsThinking) {
    return {
      enabled: false,
      exclude: input.exclude,
    };
  }

  const normalizedLevel = normalizeReasoningLevel(input.level) ?? OFF_LEVEL;
  if (normalizedLevel === OFF_LEVEL) {
    return {
      enabled: false,
      exclude: input.exclude,
    };
  }

  const levelOption =
    preset.levelOptions.find((option) => option.value === normalizedLevel) ??
    preset.levelOptions.find((option) => option.value !== OFF_LEVEL);

  if (!levelOption) {
    return {
      enabled: false,
      exclude: input.exclude,
    };
  }

  const resolved = resolveReasoningConfigFromThinkingLevel({
    sdkType: input.providerType,
    levelId: levelOption.value,
    visibleParams: levelOption.visibleParams,
  });
  if (!resolved) {
    return {
      enabled: false,
      exclude: input.exclude,
    };
  }

  return {
    ...resolved,
    exclude: input.exclude,
  };
};

const resolveProviderTypeById = (
  providerId: string,
  providers: LlmProviderListItem[]
): string | undefined => {
  return providers.find((provider) => provider.id === providerId)?.providerType;
};

export function resolveLlmReasoningPreset(input: {
  providerType?: string | null;
  modelId?: string | null;
}): {
  supportsThinking: boolean;
  defaultLevel: string;
  levelOptions: ThinkingLevelOption[];
} {
  return resolveReasoningLevelOptions(input);
}

export const llmTierOptions: Array<{ value: SubscriptionTier; label: string }> = [
  { value: 'FREE', label: 'FREE' },
  { value: 'BASIC', label: 'BASIC' },
  { value: 'PRO', label: 'PRO' },
  { value: 'TEAM', label: 'TEAM' },
];

export const llmModelFormSchema = z.object({
  providerId: z.string().trim().min(1).max(50),
  modelId: z.string().trim().min(1).max(200),
  upstreamId: z.string().trim().min(1).max(200),
  displayName: z.string().trim().min(1).max(200),
  enabled: z.boolean(),
  inputTokenPrice: z.coerce.number().min(0),
  outputTokenPrice: z.coerce.number().min(0),
  minTier: z.enum(['FREE', 'BASIC', 'PRO', 'TEAM']),
  maxContextTokens: z.coerce.number().int().positive(),
  maxOutputTokens: z.coerce.number().int().positive(),
  capabilities: z.object({
    vision: z.boolean(),
    tools: z.boolean(),
    json: z.boolean(),
  }),
  reasoning: z.object({
    enabled: z.boolean(),
    level: z.string().trim().min(1),
    exclude: z.boolean(),
  }),
  sortOrder: z.coerce.number().int().min(0).max(10000),
});

export type LlmModelFormValues = z.infer<typeof llmModelFormSchema>;

export function buildLlmModelFormDefaults(params: {
  mode: 'create' | 'edit';
  model: LlmModelListItem | null;
  providers: LlmProviderListItem[];
}): LlmModelFormValues {
  if (params.mode === 'create') {
    return {
      providerId: params.providers[0]?.id ?? '',
      modelId: '',
      upstreamId: '',
      displayName: '',
      enabled: true,
      inputTokenPrice: 0,
      outputTokenPrice: 0,
      minTier: 'FREE',
      maxContextTokens: 128000,
      maxOutputTokens: 4096,
      capabilities: {
        vision: false,
        tools: false,
        json: false,
      },
      reasoning: {
        enabled: false,
        level: OFF_LEVEL,
        exclude: false,
      },
      sortOrder: 0,
    };
  }

  const parsedCaps = parseLlmCapabilities(params.model?.capabilitiesJson);
  const providerType =
    resolveProviderTypeById(params.model?.providerId ?? '', params.providers) ??
    params.model?.providerType;
  const reasoningPreset = resolveReasoningLevelOptions({
    providerType,
    modelId: params.model?.modelId,
  });

  return {
    providerId: params.model?.providerId ?? '',
    modelId: params.model?.modelId ?? '',
    upstreamId: params.model?.upstreamId ?? '',
    displayName: params.model?.displayName ?? params.model?.modelId ?? '',
    enabled: params.model?.enabled ?? true,
    inputTokenPrice: params.model?.inputTokenPrice ?? 0,
    outputTokenPrice: params.model?.outputTokenPrice ?? 0,
    minTier: (params.model?.minTier as SubscriptionTier) ?? 'FREE',
    maxContextTokens: params.model?.maxContextTokens ?? parsedCaps.maxContextTokens ?? 128000,
    maxOutputTokens: params.model?.maxOutputTokens ?? parsedCaps.maxOutputTokens ?? 4096,
    capabilities: {
      vision: parsedCaps.vision ?? false,
      tools: parsedCaps.tools ?? false,
      json: parsedCaps.json ?? false,
    },
    reasoning: {
      enabled: parsedCaps.reasoning?.enabled ?? false,
      level: pickLevelFromStoredReasoning({
        enabled: parsedCaps.reasoning?.enabled ?? false,
        effort: parsedCaps.reasoning?.effort,
        maxTokens: parsedCaps.reasoning?.maxTokens,
        levelOptions: reasoningPreset.levelOptions,
        defaultLevel: reasoningPreset.defaultLevel,
      }),
      exclude: parsedCaps.reasoning?.exclude ?? false,
    },
    sortOrder: params.model?.sortOrder ?? 0,
  };
}

export function parseReasoningRawConfigInput(rawConfigText: string): {
  valid: boolean;
  rawConfig?: Record<string, unknown>;
} {
  if (!rawConfigText.trim()) {
    return {
      valid: true,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawConfigText) as unknown;
  } catch {
    return {
      valid: false,
    };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      valid: false,
    };
  }

  return {
    valid: true,
    rawConfig: parsed as Record<string, unknown>,
  };
}

export function toLlmReasoningConfig(params: {
  values: LlmModelFormValues;
  providers: LlmProviderListItem[];
  rawConfig?: Record<string, unknown>;
}): ReasoningConfig {
  const providerType = resolveProviderTypeById(params.values.providerId, params.providers);
  const resolved = resolveReasoningConfigByLevel({
    enabled: params.values.reasoning.enabled,
    exclude: params.values.reasoning.exclude,
    level: params.values.reasoning.level,
    providerType,
    modelId: params.values.modelId,
  });

  return {
    ...resolved,
    ...(params.rawConfig ? { rawConfig: params.rawConfig } : {}),
  };
}

export function toCreateLlmModelInput(
  values: LlmModelFormValues,
  providers: LlmProviderListItem[],
  rawConfig?: Record<string, unknown>
): CreateLlmModelInput {
  const reasoning = toLlmReasoningConfig({ values, providers, rawConfig });

  return {
    providerId: values.providerId.trim(),
    modelId: values.modelId.trim(),
    upstreamId: values.upstreamId.trim(),
    displayName: values.displayName.trim(),
    enabled: values.enabled,
    inputTokenPrice: values.inputTokenPrice,
    outputTokenPrice: values.outputTokenPrice,
    minTier: values.minTier as SubscriptionTier,
    maxContextTokens: values.maxContextTokens,
    maxOutputTokens: values.maxOutputTokens,
    capabilities: {
      ...values.capabilities,
      maxContextTokens: values.maxContextTokens,
      maxOutputTokens: values.maxOutputTokens,
    },
    reasoning,
    sortOrder: values.sortOrder,
  };
}

export function toUpdateLlmModelInput(
  values: LlmModelFormValues,
  providers: LlmProviderListItem[],
  rawConfig?: Record<string, unknown>
): UpdateLlmModelInput {
  const reasoning = toLlmReasoningConfig({ values, providers, rawConfig });

  return {
    modelId: values.modelId.trim(),
    upstreamId: values.upstreamId.trim(),
    displayName: values.displayName.trim(),
    enabled: values.enabled,
    inputTokenPrice: values.inputTokenPrice,
    outputTokenPrice: values.outputTokenPrice,
    minTier: values.minTier as SubscriptionTier,
    maxContextTokens: values.maxContextTokens,
    maxOutputTokens: values.maxOutputTokens,
    capabilities: {
      ...values.capabilities,
      maxContextTokens: values.maxContextTokens,
      maxOutputTokens: values.maxOutputTokens,
    },
    reasoning,
    sortOrder: values.sortOrder,
  };
}
