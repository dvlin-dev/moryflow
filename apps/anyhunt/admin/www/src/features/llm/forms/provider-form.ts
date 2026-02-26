/**
 * [PROVIDES]: Provider form schema/defaults/mappers
 * [DEPENDS]: zod/v3, llm types
 * [POS]: LlmProviderDialog 表单逻辑下沉
 */

import { z } from 'zod/v3';
import type {
  CreateLlmProviderInput,
  LlmProviderListItem,
  LlmProviderPreset,
  LlmProviderType,
  UpdateLlmProviderInput,
} from '../types';

export const llmProviderFormSchema = z.object({
  providerType: z.string().trim().min(1),
  name: z.string().trim().min(1).max(100),
  apiKey: z.string().trim().max(5000),
  baseUrl: z.string().trim().url().or(z.literal('')),
  enabled: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(10000),
});

export type LlmProviderFormValues = z.infer<typeof llmProviderFormSchema>;

export interface BuildProviderDefaultsParams {
  mode: 'create' | 'edit';
  provider: LlmProviderListItem | null;
  presets: LlmProviderPreset[];
}

export function buildLlmProviderFormDefaults(
  params: BuildProviderDefaultsParams
): LlmProviderFormValues {
  if (params.mode === 'create') {
    return {
      providerType: params.presets[0]?.id ?? 'openai',
      name: '',
      apiKey: '',
      baseUrl: '',
      enabled: true,
      sortOrder: 0,
    };
  }

  return {
    providerType: params.provider?.providerType ?? 'openai',
    name: params.provider?.name ?? '',
    apiKey: '',
    baseUrl: params.provider?.baseUrl ?? '',
    enabled: params.provider?.enabled ?? true,
    sortOrder: params.provider?.sortOrder ?? 0,
  };
}

export function buildAvailableProviderPresets(params: {
  presets: LlmProviderPreset[];
  providerType: string | undefined;
}): LlmProviderPreset[] {
  const presetIds = new Set(params.presets.map((preset) => preset.id));
  if (params.providerType && !presetIds.has(params.providerType)) {
    return [
      ...params.presets,
      {
        id: params.providerType,
        name: params.providerType,
        sdkType: 'custom',
        defaultBaseUrl: '',
      },
    ];
  }

  return params.presets;
}

export function toCreateLlmProviderInput(values: LlmProviderFormValues): CreateLlmProviderInput {
  const input: CreateLlmProviderInput = {
    providerType: values.providerType as LlmProviderType,
    name: values.name.trim(),
    apiKey: values.apiKey.trim(),
    enabled: values.enabled,
    sortOrder: values.sortOrder,
  };

  if (values.baseUrl.trim()) {
    input.baseUrl = values.baseUrl.trim();
  }

  return input;
}

export function toUpdateLlmProviderInput(values: LlmProviderFormValues): UpdateLlmProviderInput {
  const input: UpdateLlmProviderInput = {
    name: values.name.trim(),
    enabled: values.enabled,
    sortOrder: values.sortOrder,
    baseUrl: values.baseUrl.trim() ? values.baseUrl.trim() : null,
  };

  if (values.apiKey.trim()) {
    input.apiKey = values.apiKey.trim();
  }

  return input;
}
