/**
 * [PROVIDES]: Model form schema/defaults/mappers
 * [DEPENDS]: zod/v3, llm types/utils
 * [POS]: LlmModelDialog 表单逻辑下沉
 */

import { z } from 'zod/v3';
import type { SubscriptionTier } from '@/lib/types';
import { parseLlmCapabilities } from '../utils';
import type {
  CreateLlmModelInput,
  LlmModelListItem,
  LlmProviderListItem,
  ReasoningConfig,
  UpdateLlmModelInput,
} from '../types';

export const llmReasoningEffortOptions: Array<{ value: ReasoningConfig['effort']; label: string }> =
  [
    { value: 'xhigh', label: 'xhigh' },
    { value: 'high', label: 'high' },
    { value: 'medium', label: 'medium' },
    { value: 'low', label: 'low' },
    { value: 'minimal', label: 'minimal' },
    { value: 'none', label: 'none' },
  ];

export const llmTierOptions: Array<{ value: SubscriptionTier; label: string }> = [
  { value: 'FREE', label: 'FREE' },
  { value: 'BASIC', label: 'BASIC' },
  { value: 'PRO', label: 'PRO' },
  { value: 'TEAM', label: 'TEAM' },
];

const optionalPositiveNumber = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z.coerce.number().positive().optional()
);

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
    effort: z.enum(['xhigh', 'high', 'medium', 'low', 'minimal', 'none']),
    maxTokens: optionalPositiveNumber,
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
        effort: 'medium',
        maxTokens: undefined,
        exclude: false,
      },
      sortOrder: 0,
    };
  }

  const parsedCaps = parseLlmCapabilities(params.model?.capabilitiesJson);

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
      effort: parsedCaps.reasoning?.effort ?? 'medium',
      maxTokens: parsedCaps.reasoning?.maxTokens,
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
  rawConfig?: Record<string, unknown>;
}): ReasoningConfig {
  return {
    enabled: params.values.reasoning.enabled,
    effort: params.values.reasoning.effort,
    maxTokens: params.values.reasoning.maxTokens,
    exclude: params.values.reasoning.exclude,
    ...(params.rawConfig ? { rawConfig: params.rawConfig } : {}),
  };
}

export function toCreateLlmModelInput(
  values: LlmModelFormValues,
  rawConfig?: Record<string, unknown>
): CreateLlmModelInput {
  const reasoning = toLlmReasoningConfig({ values, rawConfig });

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
  rawConfig?: Record<string, unknown>
): UpdateLlmModelInput {
  const reasoning = toLlmReasoningConfig({ values, rawConfig });

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
