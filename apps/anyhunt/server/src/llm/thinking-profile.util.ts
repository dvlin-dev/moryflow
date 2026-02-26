/**
 * [PROVIDES]: thinking profile 解析 + thinking 选择校验 + reasoning 映射
 * [DEPENDS]: model-provider.factory ReasoningOptions
 * [POS]: Anyhunt LLM thinking 能力统一模块（AgentModelService + LlmLanguageModelService 共用）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { BadRequestException } from '@nestjs/common';
import type { ReasoningOptions } from './providers/model-provider.factory';

export type LlmThinkingSelection =
  | { mode: 'off' }
  | { mode: 'level'; level: string };

export type ThinkingLevelProfile = {
  id: string;
  label: string;
  description?: string;
  reasoning?: Partial<ReasoningOptions>;
};

export type ThinkingProfile = {
  supportsThinking: boolean;
  defaultLevel: string;
  levels: ThinkingLevelProfile[];
};

const THINKING_LEVEL_LABELS: Record<string, string> = {
  off: 'Off',
  minimal: 'Minimal',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  max: 'Max',
  xhigh: 'X-High',
};

const KNOWN_REASONING_EFFORT = new Set([
  'xhigh',
  'high',
  'medium',
  'low',
  'minimal',
  'none',
]);

const THINKING_EFFORT_BY_LEVEL: Record<
  string,
  NonNullable<ReasoningOptions['effort']>
> = {
  minimal: 'minimal',
  low: 'low',
  medium: 'medium',
  high: 'high',
  xhigh: 'xhigh',
  max: 'xhigh',
};

const THINKING_BUDGET_BY_LEVEL: Record<string, number> = {
  minimal: 1024,
  low: 4096,
  medium: 8192,
  high: 16384,
  max: 32768,
  xhigh: 49152,
};

export function parseCapabilitiesJson(
  capabilitiesJson: unknown,
): Record<string, unknown> | null {
  if (!capabilitiesJson) return null;
  if (typeof capabilitiesJson === 'string') {
    try {
      const parsed = JSON.parse(capabilitiesJson) as Record<string, unknown>;
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }
  if (typeof capabilitiesJson === 'object') {
    return capabilitiesJson as Record<string, unknown>;
  }
  return null;
}

function getDefaultThinkingLevelsByProviderType(
  providerType: string,
): ThinkingLevelProfile[] {
  const toLevels = (levels: string[]): ThinkingLevelProfile[] =>
    levels.map((id) => ({
      id,
      label: THINKING_LEVEL_LABELS[id] ?? id,
    }));

  switch (providerType) {
    case 'openrouter':
      return toLevels(['off', 'minimal', 'low', 'medium', 'high', 'xhigh']);
    case 'anthropic':
      return toLevels(['off', 'low', 'medium', 'high', 'max']);
    case 'google':
      return toLevels(['off', 'low', 'medium', 'high']);
    case 'openai':
    case 'openai-compatible':
    case 'xai':
      return toLevels(['off', 'low', 'medium', 'high']);
    default:
      return toLevels(['off']);
  }
}

function parseReasoningPatch(
  patch: unknown,
): Partial<ReasoningOptions> | undefined {
  if (!patch || typeof patch !== 'object') {
    return undefined;
  }
  const record = patch as Record<string, unknown>;
  const next: Partial<ReasoningOptions> = {};

  if (
    typeof record.effort === 'string' &&
    KNOWN_REASONING_EFFORT.has(record.effort)
  ) {
    next.effort = record.effort as ReasoningOptions['effort'];
  }
  const maxTokens =
    typeof record.maxTokens === 'number'
      ? record.maxTokens
      : typeof record.max_tokens === 'number'
        ? record.max_tokens
        : undefined;
  if (typeof maxTokens === 'number') {
    next.maxTokens = maxTokens;
  }
  if (typeof record.exclude === 'boolean') {
    next.exclude = record.exclude;
  }
  if (record.rawConfig && typeof record.rawConfig === 'object') {
    next.rawConfig = record.rawConfig as Record<string, unknown>;
  }

  const knownKeys = new Set([
    'effort',
    'maxTokens',
    'max_tokens',
    'exclude',
    'rawConfig',
  ]);
  const hasUnknownFields = Object.keys(record).some(
    (key) => !knownKeys.has(key),
  );
  if (!next.rawConfig && hasUnknownFields) {
    next.rawConfig = record;
  }

  return Object.keys(next).length > 0 ? next : undefined;
}

function parseConfiguredLevel(input: {
  level: unknown;
  providerType: string;
}): ThinkingLevelProfile | undefined {
  const fromString = (value: string): ThinkingLevelProfile | undefined => {
    const id = value.trim();
    if (!id) return undefined;
    return {
      id,
      label: THINKING_LEVEL_LABELS[id] ?? id,
    };
  };

  if (typeof input.level === 'string') {
    return fromString(input.level);
  }
  if (!input.level || typeof input.level !== 'object') {
    return undefined;
  }

  const record = input.level as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id.trim() : '';
  if (!id) {
    return undefined;
  }

  const providerPatches =
    record.providerPatches && typeof record.providerPatches === 'object'
      ? (record.providerPatches as Record<string, unknown>)
      : undefined;
  const providerPatch = providerPatches?.[input.providerType];
  const providerReasoning = parseReasoningPatch(providerPatch);
  const genericReasoning = parseReasoningPatch(record.reasoning);
  const directReasoning = parseReasoningPatch({
    effort: record.effort,
    maxTokens: record.maxTokens,
    max_tokens: record.max_tokens,
    exclude: record.exclude,
    rawConfig: record.rawConfig,
  });

  const reasoning: Partial<ReasoningOptions> = {
    ...(genericReasoning ?? {}),
    ...(providerReasoning ?? {}),
    ...(directReasoning ?? {}),
  };

  return {
    id,
    label:
      typeof record.label === 'string' && record.label.trim().length > 0
        ? record.label.trim()
        : (THINKING_LEVEL_LABELS[id] ?? id),
    ...(typeof record.description === 'string' &&
    record.description.trim().length > 0
      ? { description: record.description.trim() }
      : {}),
    ...(Object.keys(reasoning).length > 0 ? { reasoning } : {}),
  };
}

export function buildThinkingProfileFromCapabilities(input: {
  providerType: string;
  capabilitiesJson: unknown;
}): ThinkingProfile {
  const capabilities = parseCapabilitiesJson(input.capabilitiesJson);
  const reasoning = capabilities?.reasoning as
    | Record<string, unknown>
    | undefined;
  const rawLevels = Array.isArray(reasoning?.levels) ? reasoning.levels : [];

  const configuredLevelsMap = new Map<string, ThinkingLevelProfile>();
  for (const item of rawLevels) {
    const parsed = parseConfiguredLevel({
      level: item,
      providerType: input.providerType,
    });
    if (parsed && !configuredLevelsMap.has(parsed.id)) {
      configuredLevelsMap.set(parsed.id, parsed);
    }
  }
  const configuredLevels = Array.from(configuredLevelsMap.values());

  const configuredSupport =
    reasoning?.supportsThinking === true || reasoning?.enabled === true;
  const supportsThinking =
    configuredSupport || configuredLevels.some((level) => level.id !== 'off');

  let levels = supportsThinking
    ? configuredLevels.length > 0
      ? [...configuredLevels]
      : getDefaultThinkingLevelsByProviderType(input.providerType)
    : [{ id: 'off', label: THINKING_LEVEL_LABELS.off }];

  if (!levels.some((level) => level.id === 'off')) {
    levels = [{ id: 'off', label: THINKING_LEVEL_LABELS.off }, ...levels];
  } else {
    const offIndex = levels.findIndex((level) => level.id === 'off');
    if (offIndex > 0) {
      const [off] = levels.splice(offIndex, 1);
      levels.unshift(off);
    }
  }

  const requestedDefault =
    typeof reasoning?.defaultLevel === 'string'
      ? reasoning.defaultLevel.trim()
      : '';
  const defaultLevel = levels.some((level) => level.id === requestedDefault)
    ? requestedDefault
    : 'off';

  return {
    supportsThinking: levels.some((level) => level.id !== 'off'),
    defaultLevel,
    levels,
  };
}

function resolveKnownEffort(
  levelId: string,
): ReasoningOptions['effort'] | undefined {
  return THINKING_EFFORT_BY_LEVEL[levelId];
}

function resolveKnownBudget(levelId: string): number | undefined {
  return THINKING_BUDGET_BY_LEVEL[levelId];
}

function validateMappedReasoning(input: {
  providerType: string;
  levelId: string;
  explicit?: Partial<ReasoningOptions>;
}): ReasoningOptions | undefined {
  const explicit = input.explicit ?? {};
  const knownEffort = resolveKnownEffort(input.levelId);
  const knownBudget = resolveKnownBudget(input.levelId);

  switch (input.providerType) {
    case 'openai':
    case 'openai-compatible':
    case 'xai': {
      const effort = explicit.effort ?? knownEffort;
      if (!effort) {
        throw new BadRequestException(
          `Thinking level '${input.levelId}' has no effort mapping for provider '${input.providerType}'.`,
        );
      }
      return {
        enabled: true,
        effort,
      };
    }
    case 'openrouter': {
      if (explicit.rawConfig) {
        return {
          enabled: true,
          ...explicit,
        };
      }
      const effort = explicit.effort ?? knownEffort;
      const maxTokens = explicit.maxTokens ?? knownBudget;
      if (!effort && maxTokens === undefined) {
        throw new BadRequestException(
          `Thinking level '${input.levelId}' has no reasoning mapping for provider '${input.providerType}'.`,
        );
      }
      return {
        enabled: true,
        effort,
        maxTokens,
        exclude: explicit.exclude ?? false,
      };
    }
    case 'anthropic':
    case 'google': {
      const maxTokens = explicit.maxTokens ?? knownBudget;
      if (maxTokens === undefined) {
        throw new BadRequestException(
          `Thinking level '${input.levelId}' has no token budget mapping for provider '${input.providerType}'.`,
        );
      }
      return {
        enabled: true,
        maxTokens,
      };
    }
    default:
      return undefined;
  }
}

export function resolveReasoningFromThinkingSelection(input: {
  providerType: string;
  capabilitiesJson: unknown;
  thinking: LlmThinkingSelection;
}): ReasoningOptions | undefined {
  const profile = buildThinkingProfileFromCapabilities({
    providerType: input.providerType,
    capabilitiesJson: input.capabilitiesJson,
  });

  if (input.thinking.mode === 'off') {
    return undefined;
  }

  if (!profile.supportsThinking) {
    throw new BadRequestException(
      'Thinking is not supported by the selected model.',
    );
  }

  const selectedLevel = input.thinking.level.trim();
  const matchedLevel = profile.levels.find(
    (level) => level.id === selectedLevel,
  );
  if (!matchedLevel) {
    throw new BadRequestException(
      `Invalid thinking level '${selectedLevel}'. Allowed levels: ${profile.levels
        .map((level) => level.id)
        .join(', ')}`,
    );
  }

  const mapped = validateMappedReasoning({
    providerType: input.providerType,
    levelId: matchedLevel.id,
    explicit: matchedLevel.reasoning,
  });
  if (!mapped) {
    throw new BadRequestException(
      `Thinking is not supported by provider '${input.providerType}'.`,
    );
  }

  return mapped;
}

export function toPublicThinkingProfile(profile: ThinkingProfile): Omit<
  ThinkingProfile,
  'levels'
> & {
  levels: Array<{ id: string; label: string; description?: string }>;
} {
  return {
    supportsThinking: profile.supportsThinking,
    defaultLevel: profile.defaultLevel,
    levels: profile.levels.map((level) => ({
      id: level.id,
      label: level.label,
      ...(level.description ? { description: level.description } : {}),
    })),
  };
}
