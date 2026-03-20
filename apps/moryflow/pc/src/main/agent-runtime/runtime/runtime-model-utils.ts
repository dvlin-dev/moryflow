/**
 * [PROVIDES]: runtime model debug + compaction helpers
 * [DEPENDS]: model-bank registry, agents-runtime context-window helpers
 * [POS]: PC Agent Runtime 装配层辅助函数
 */

import {
  resolveContextWindow,
  type AgentSettings,
  type ModelThinkingProfile,
} from '@moryflow/agents-runtime';
import {
  buildProviderModelRef,
  getModelById,
  parseProviderModelRef,
} from '@moryflow/model-bank/registry';
import { extractMembershipModelId, isMembershipModelId } from '@moryflow/agents-runtime';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const pickRecordFields = (
  input: Record<string, unknown>,
  keys: readonly string[]
): Record<string, unknown> => {
  const output: Record<string, unknown> = {};
  for (const key of keys) {
    const value = input[key];
    if (value !== undefined) {
      output[key] = value;
    }
  }
  return output;
};

export const summarizeProviderOptionsForThinkingDebug = (
  providerOptions: unknown
): Record<string, unknown> | undefined => {
  if (!isRecord(providerOptions)) {
    return undefined;
  }

  const summary: Record<string, unknown> = {};
  for (const [providerKey, providerConfig] of Object.entries(providerOptions)) {
    if (!isRecord(providerConfig)) {
      continue;
    }

    const providerSummary: Record<string, unknown> = {};
    if (isRecord(providerConfig.reasoning)) {
      providerSummary.reasoning = pickRecordFields(providerConfig.reasoning, [
        'effort',
        'max_tokens',
        'exclude',
      ]);
    }
    if (typeof providerConfig.reasoningEffort === 'string') {
      providerSummary.reasoningEffort = providerConfig.reasoningEffort;
    }
    if (typeof providerConfig.reasoningSummary === 'string') {
      providerSummary.reasoningSummary = providerConfig.reasoningSummary;
    }
    if (isRecord(providerConfig.thinking)) {
      providerSummary.thinking = pickRecordFields(providerConfig.thinking, [
        'type',
        'budget_tokens',
        'tokenBudget',
      ]);
    }
    if (isRecord(providerConfig.thinkingConfig)) {
      providerSummary.thinkingConfig = pickRecordFields(providerConfig.thinkingConfig, [
        'thinkingBudget',
        'includeThoughts',
      ]);
    }
    if (typeof providerConfig.includeReasoning === 'boolean') {
      providerSummary.includeReasoning = providerConfig.includeReasoning;
    }

    if (Object.keys(providerSummary).length > 0) {
      summary[providerKey] = providerSummary;
    }
  }

  return Object.keys(summary).length > 0 ? summary : undefined;
};

export const summarizeThinkingProfile = (profile?: ModelThinkingProfile) => {
  if (!profile) {
    return undefined;
  }
  return {
    supportsThinking: profile.supportsThinking,
    defaultLevel: profile.defaultLevel,
    levels: profile.levels.map((level: ModelThinkingProfile['levels'][number]) => ({
      id: level.id,
      label: level.label,
      visibleParams: level.visibleParams ?? [],
    })),
  };
};

export const resolveCompactionContextWindow = (
  modelId: string,
  settings: AgentSettings
): number | undefined => {
  if (!modelId) return undefined;
  const isMembership = isMembershipModelId(modelId);
  const normalized = isMembership ? extractMembershipModelId(modelId) : modelId;
  const parsedModelRef = parseProviderModelRef(normalized);
  const canonicalModelRef = parsedModelRef
    ? buildProviderModelRef(parsedModelRef.providerId, parsedModelRef.modelId)
    : null;
  const normalizedModelId = parsedModelRef?.modelId ?? normalized;
  const normalizedProviderId = parsedModelRef?.providerId;
  const providerSources = isMembership
    ? []
    : [...settings.providers, ...(settings.customProviders || [])].filter((provider) =>
        normalizedProviderId ? provider.providerId === normalizedProviderId : true
      );

  return resolveContextWindow({
    modelId: normalizedModelId,
    providers: providerSources,
    getDefaultContext: (id) => {
      if (canonicalModelRef) {
        return getModelById(canonicalModelRef)?.limits?.context;
      }
      if (!normalizedProviderId) {
        return undefined;
      }
      return getModelById(buildProviderModelRef(normalizedProviderId, id))?.limits?.context;
    },
  });
};
