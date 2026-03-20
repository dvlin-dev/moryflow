import type { AgentThinkingProfile } from '../../../shared/ipc.js';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const pickRecordFields = (
  input: Record<string, unknown>,
  keys: readonly string[]
): Record<string, unknown> => {
  const output: Record<string, unknown> = {};
  for (const key of keys) {
    const value = input[key];
    if (value === undefined) {
      continue;
    }
    output[key] = value;
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

    if (Object.keys(providerSummary).length === 0) {
      continue;
    }
    summary[providerKey] = providerSummary;
  }

  return Object.keys(summary).length > 0 ? summary : undefined;
};

export const summarizeThinkingProfile = (profile?: AgentThinkingProfile) => {
  if (!profile) {
    return undefined;
  }
  return {
    supportsThinking: profile.supportsThinking,
    defaultLevel: profile.defaultLevel,
    levels: profile.levels.map((level) => ({
      id: level.id,
      label: level.label,
      visibleParams: level.visibleParams ?? [],
    })),
  };
};
