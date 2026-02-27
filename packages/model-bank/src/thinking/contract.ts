/**
 * [PROVIDES]: 云端 capabilities.reasoning contract 解析 + thinking 选择到 reasoning 的统一映射
 * [DEPENDS]: resolver/rules/reasoning
 * [POS]: Server 侧 thinking 规则单源（Anyhunt + Moryflow 共用）
 *
 * [PROTOCOL]: 解析规则变更时必须补充 contract.test.ts 回归
 */

import { THINKING_LEVEL_LABELS, normalizeThinkingLevelId } from './rules';
import { resolveReasoningConfigFromThinkingLevel } from './reasoning';
import { resolveModelThinkingProfile, resolveProviderSdkType } from './resolver';
import type { ThinkingVisibleParam } from './types';

export type ThinkingSelection = { mode: 'off' } | { mode: 'level'; level: string };

export type ThinkingContractErrorCode = 'THINKING_LEVEL_INVALID' | 'THINKING_NOT_SUPPORTED';

export class ThinkingContractError extends Error {
  code: ThinkingContractErrorCode;
  details?: unknown;

  constructor(input: { code: ThinkingContractErrorCode; message: string; details?: unknown }) {
    super(input.message);
    this.name = 'ThinkingContractError';
    this.code = input.code;
    this.details = input.details;
  }
}

export interface ThinkingContractLevel {
  description?: string;
  id: string;
  label: string;
  visibleParams?: ThinkingVisibleParam[];
}

export interface ThinkingContractProfile {
  defaultLevel: string;
  levels: ThinkingContractLevel[];
  supportsThinking: boolean;
}

const ALLOWED_VISIBLE_PARAM_KEYS = new Set([
  'reasoningEffort',
  'thinkingBudget',
  'includeThoughts',
  'reasoningSummary',
]);

const OFF_LEVEL_ID = 'off';

const buildOffOnlyProfile = (): ThinkingContractProfile => ({
  supportsThinking: false,
  defaultLevel: OFF_LEVEL_ID,
  levels: [{ id: OFF_LEVEL_ID, label: THINKING_LEVEL_LABELS.off }],
});

export const parseCapabilitiesJson = (
  capabilitiesJson: unknown
): Record<string, unknown> | null => {
  if (!capabilitiesJson) {
    return null;
  }
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
};

const parseVisibleParams = (input: unknown): ThinkingVisibleParam[] => {
  if (!Array.isArray(input)) {
    return [];
  }

  const params: ThinkingVisibleParam[] = [];
  const deduped = new Set<string>();

  for (const rawItem of input) {
    if (!rawItem || typeof rawItem !== 'object') {
      continue;
    }
    const item = rawItem as Record<string, unknown>;
    const key =
      typeof item.key === 'string' && ALLOWED_VISIBLE_PARAM_KEYS.has(item.key) ? item.key : null;
    const value = typeof item.value === 'string' ? item.value.trim() : '';
    if (!key || !value || deduped.has(key)) {
      continue;
    }
    deduped.add(key);
    params.push({ key, value });
  }

  return params;
};

const parseConfiguredLevel = (rawLevel: unknown): ThinkingContractLevel | undefined => {
  if (typeof rawLevel === 'string') {
    const id = normalizeThinkingLevelId(rawLevel);
    if (!id) {
      return undefined;
    }
    return {
      id,
      label: THINKING_LEVEL_LABELS[id] ?? id,
    };
  }

  if (!rawLevel || typeof rawLevel !== 'object') {
    return undefined;
  }

  const level = rawLevel as Record<string, unknown>;
  const id = normalizeThinkingLevelId(typeof level.id === 'string' ? level.id : '');
  if (!id) {
    return undefined;
  }

  const label =
    typeof level.label === 'string' && level.label.trim().length > 0
      ? level.label.trim()
      : (THINKING_LEVEL_LABELS[id] ?? id);
  const description =
    typeof level.description === 'string' && level.description.trim().length > 0
      ? level.description.trim()
      : undefined;
  const visibleParams = parseVisibleParams(level.visibleParams);

  return {
    id,
    label,
    ...(description ? { description } : {}),
    ...(visibleParams.length > 0 ? { visibleParams } : {}),
  };
};

const normalizeLevels = (input: {
  configuredLevels: ThinkingContractLevel[];
  nativeLevels: ThinkingContractLevel[];
}): ThinkingContractLevel[] => {
  const sourceLevels =
    input.configuredLevels.length > 0
      ? input.configuredLevels
      : input.nativeLevels.length > 0
        ? input.nativeLevels
        : buildOffOnlyProfile().levels;

  const deduped: ThinkingContractLevel[] = [];
  const seen = new Set<string>();

  for (const level of sourceLevels) {
    if (seen.has(level.id)) {
      continue;
    }
    seen.add(level.id);
    deduped.push(level);
  }

  if (!deduped.some((level) => level.id === OFF_LEVEL_ID)) {
    deduped.unshift({ id: OFF_LEVEL_ID, label: THINKING_LEVEL_LABELS.off });
  } else {
    const offIndex = deduped.findIndex((level) => level.id === OFF_LEVEL_ID);
    if (offIndex > 0) {
      const [off] = deduped.splice(offIndex, 1);
      if (off) {
        deduped.unshift(off);
      }
    }
  }

  const runtimeValid = deduped.filter((level) => {
    if (level.id === OFF_LEVEL_ID) {
      return true;
    }
    return Array.isArray(level.visibleParams) && level.visibleParams.length > 0;
  });

  if (!runtimeValid.some((level) => level.id === OFF_LEVEL_ID)) {
    runtimeValid.unshift({ id: OFF_LEVEL_ID, label: THINKING_LEVEL_LABELS.off });
  }

  return runtimeValid.length > 0 ? runtimeValid : buildOffOnlyProfile().levels;
};

export const buildThinkingProfileFromCapabilities = (input: {
  capabilitiesJson: unknown;
  modelId?: string;
  providerId?: string;
  sdkType?: string;
}): ThinkingContractProfile => {
  const capabilities = parseCapabilitiesJson(input.capabilitiesJson);
  const reasoning = capabilities?.reasoning as Record<string, unknown> | undefined;
  const normalizedSdkType = resolveProviderSdkType({
    providerId: input.providerId,
    sdkType: input.sdkType,
  });

  const nativeProfile =
    input.modelId && input.modelId.trim().length > 0
      ? resolveModelThinkingProfile({
          modelId: input.modelId,
          providerId: input.providerId,
          sdkType: normalizedSdkType ?? input.sdkType,
        })
      : null;

  const nativeLevels =
    nativeProfile?.levels.map((level) => {
      const visibleParams = parseVisibleParams(level.visibleParams);
      return {
        id: level.id,
        label: level.label,
        ...(level.description ? { description: level.description } : {}),
        ...(visibleParams.length > 0 ? { visibleParams } : {}),
      };
    }) ?? [];
  const nativeVisibleParamsByLevel = new Map<string, ThinkingVisibleParam[]>(
    nativeLevels
      .filter((level) => Array.isArray(level.visibleParams) && level.visibleParams.length > 0)
      .map((level) => [level.id, level.visibleParams as ThinkingVisibleParam[]])
  );
  const rawConfiguredLevels = Array.isArray(reasoning?.levels) ? reasoning.levels : [];
  const configuredLevels = rawConfiguredLevels
    .map((item) => parseConfiguredLevel(item))
    .filter((item): item is ThinkingContractLevel => Boolean(item))
    .map((level) => {
      if (
        level.id === OFF_LEVEL_ID ||
        (Array.isArray(level.visibleParams) && level.visibleParams.length > 0)
      ) {
        return level;
      }
      const fallback = nativeVisibleParamsByLevel.get(level.id);
      return fallback ? { ...level, visibleParams: fallback } : level;
    });
  const levels = normalizeLevels({ configuredLevels, nativeLevels });
  const requestedDefault =
    typeof reasoning?.defaultLevel === 'string'
      ? normalizeThinkingLevelId(reasoning.defaultLevel)
      : undefined;
  const nativeDefault = nativeProfile?.defaultLevel ?? OFF_LEVEL_ID;
  const defaultLevel = levels.some((level) => level.id === requestedDefault)
    ? (requestedDefault as string)
    : levels.some((level) => level.id === nativeDefault)
      ? nativeDefault
      : OFF_LEVEL_ID;

  return {
    supportsThinking: levels.some((level) => level.id !== OFF_LEVEL_ID),
    defaultLevel,
    levels,
  };
};

export const resolveReasoningFromThinkingSelection = (input: {
  capabilitiesJson: unknown;
  modelId?: string;
  providerId?: string;
  sdkType?: string;
  thinking: ThinkingSelection;
}) => {
  if (input.thinking.mode === 'off') {
    return undefined;
  }

  const profile = buildThinkingProfileFromCapabilities(input);
  if (!profile.supportsThinking) {
    throw new ThinkingContractError({
      code: 'THINKING_NOT_SUPPORTED',
      message: 'Thinking is not supported by the selected model.',
    });
  }

  const selectedLevel = normalizeThinkingLevelId(input.thinking.level);
  const matched = profile.levels.find((level) => level.id === selectedLevel);
  if (!matched) {
    throw new ThinkingContractError({
      code: 'THINKING_LEVEL_INVALID',
      message: `Invalid thinking level '${input.thinking.level}'.`,
      details: {
        allowedLevels: profile.levels.map((level) => level.id),
        modelSupportsThinking: profile.supportsThinking,
      },
    });
  }

  if (matched.id === OFF_LEVEL_ID) {
    return undefined;
  }

  const normalizedSdkType = resolveProviderSdkType({
    providerId: input.providerId,
    sdkType: input.sdkType,
  });
  if (!normalizedSdkType) {
    throw new ThinkingContractError({
      code: 'THINKING_NOT_SUPPORTED',
      message: `Provider '${input.providerId ?? input.sdkType ?? 'unknown'}' does not support thinking.`,
    });
  }

  const reasoning = resolveReasoningConfigFromThinkingLevel({
    sdkType: normalizedSdkType,
    levelId: matched.id,
    visibleParams: matched.visibleParams,
  });
  if (!reasoning) {
    throw new ThinkingContractError({
      code: 'THINKING_LEVEL_INVALID',
      message: `Thinking level '${matched.id}' is missing runtime preset params for provider '${input.providerId ?? normalizedSdkType}'.`,
      details: {
        level: matched.id,
        providerId: input.providerId,
        sdkType: normalizedSdkType,
      },
    });
  }

  return normalizedSdkType === 'openrouter' ? { ...reasoning, exclude: false } : reasoning;
};
