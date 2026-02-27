/**
 * [PROVIDES]: thinking_profile 解析 + thinking 选择校验 + reasoning 映射
 * [DEPENDS]: model-provider.factory ReasoningOptions
 * [POS]: Anyhunt LLM thinking 能力统一模块（AgentModelService + LlmLanguageModelService 共用）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { BadRequestException } from '@nestjs/common';
import {
  THINKING_LEVEL_LABELS,
  getDefaultThinkingVisibleParams,
  type MembershipThinkingVisibleParam,
  type MembershipThinkingVisibleParamKey,
} from '@moryflow/api';
import type { ReasoningOptions } from './providers/model-provider.factory';

export type LlmThinkingSelection =
  | { mode: 'off' }
  | { mode: 'level'; level: string };

export type ThinkingVisibleParamKey = MembershipThinkingVisibleParamKey;

export type ThinkingVisibleParam = MembershipThinkingVisibleParam;

export type ThinkingLevelProfile = {
  id: string;
  label: string;
  description?: string;
  visibleParams?: ThinkingVisibleParam[];
};

export type ThinkingProfile = {
  supportsThinking: boolean;
  defaultLevel: string;
  levels: ThinkingLevelProfile[];
};

export type ThinkingBoundaryErrorCode =
  | 'THINKING_LEVEL_INVALID'
  | 'THINKING_NOT_SUPPORTED';

const VISIBLE_PARAM_KEYS = new Set<ThinkingVisibleParamKey>([
  'reasoningEffort',
  'thinkingBudget',
  'includeThoughts',
  'reasoningSummary',
]);

const KNOWN_REASONING_EFFORT = new Set([
  'xhigh',
  'high',
  'medium',
  'low',
  'minimal',
  'none',
]);

const MIN_BUDGET = 1;
const MAX_BUDGET = 262_144;

const buildThinkingError = (params: {
  code: ThinkingBoundaryErrorCode;
  message: string;
  details?: unknown;
}): BadRequestException =>
  new BadRequestException({
    code: params.code,
    message: params.message,
    ...(params.details !== undefined ? { details: params.details } : {}),
  });

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

function toVisibleParamMap(
  params: ThinkingVisibleParam[] | undefined,
): Partial<Record<ThinkingVisibleParamKey, string>> {
  const map: Partial<Record<ThinkingVisibleParamKey, string>> = {};
  for (const item of params ?? []) {
    if (!item || typeof item.key !== 'string') {
      continue;
    }
    if (!VISIBLE_PARAM_KEYS.has(item.key)) {
      continue;
    }
    if (typeof item.value !== 'string') {
      continue;
    }
    const value = item.value.trim();
    if (!value) {
      continue;
    }
    map[item.key] = value;
  }
  return map;
}

function parseBoolean(value: string | undefined): boolean | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }
  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }
  return undefined;
}

function parseBudget(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  const normalized = Math.floor(parsed);
  if (normalized < MIN_BUDGET) {
    return MIN_BUDGET;
  }
  if (normalized > MAX_BUDGET) {
    return MAX_BUDGET;
  }
  return normalized;
}

function parseEffort(
  value: string | undefined,
): ReasoningOptions['effort'] | undefined {
  if (!value) {
    return undefined;
  }
  if (!KNOWN_REASONING_EFFORT.has(value)) {
    return undefined;
  }
  return value as ReasoningOptions['effort'];
}

function parseVisibleParams(input: unknown): ThinkingVisibleParam[] {
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
      typeof item.key === 'string' &&
      VISIBLE_PARAM_KEYS.has(item.key as ThinkingVisibleParamKey)
        ? (item.key as ThinkingVisibleParamKey)
        : null;
    const value = typeof item.value === 'string' ? item.value.trim() : '';

    if (!key || !value) {
      continue;
    }

    if (deduped.has(key)) {
      continue;
    }

    deduped.add(key);
    params.push({ key, value });
  }

  return params;
}

function getDefaultVisibleParamsByProvider(input: {
  providerType: string;
  levelId: string;
}): ThinkingVisibleParam[] {
  return getDefaultThinkingVisibleParams(input);
}

function parseConfiguredLevel(
  rawLevel: unknown,
): ThinkingLevelProfile | undefined {
  if (typeof rawLevel === 'string') {
    const id = rawLevel.trim();
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
  const id = typeof level.id === 'string' ? level.id.trim() : '';
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
}

function normalizeLevels(input: {
  providerType: string;
  levels: ThinkingLevelProfile[];
}): ThinkingLevelProfile[] {
  const deduped: ThinkingLevelProfile[] = [];
  const seen = new Set<string>();

  for (const level of input.levels) {
    if (seen.has(level.id)) {
      continue;
    }
    seen.add(level.id);

    const fallbackParams = getDefaultVisibleParamsByProvider({
      providerType: input.providerType,
      levelId: level.id,
    });
    const visibleParams =
      level.visibleParams && level.visibleParams.length > 0
        ? level.visibleParams
        : fallbackParams;

    deduped.push({
      id: level.id,
      label: level.label,
      ...(level.description ? { description: level.description } : {}),
      ...(visibleParams.length > 0 ? { visibleParams } : {}),
    });
  }

  if (!deduped.some((level) => level.id === 'off')) {
    deduped.unshift({ id: 'off', label: THINKING_LEVEL_LABELS.off });
  } else {
    const offIndex = deduped.findIndex((level) => level.id === 'off');
    if (offIndex > 0) {
      const [off] = deduped.splice(offIndex, 1);
      deduped.unshift(off);
    }
  }

  const validLevels = deduped.filter((level) => {
    if (level.id === 'off') {
      return true;
    }
    return Array.isArray(level.visibleParams) && level.visibleParams.length > 0;
  });

  if (validLevels.length === 0) {
    return [{ id: 'off', label: THINKING_LEVEL_LABELS.off }];
  }

  if (!validLevels.some((level) => level.id === 'off')) {
    validLevels.unshift({ id: 'off', label: THINKING_LEVEL_LABELS.off });
  }

  return validLevels;
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
  const configuredLevels = rawLevels
    .map((item) => parseConfiguredLevel(item))
    .filter((item): item is ThinkingLevelProfile => Boolean(item));

  const levels = normalizeLevels({
    providerType: input.providerType,
    levels:
      configuredLevels.length > 0
        ? configuredLevels
        : [{ id: 'off', label: THINKING_LEVEL_LABELS.off }],
  });

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

function resolveReasoningFromLevel(input: {
  providerType: string;
  level: ThinkingLevelProfile;
}): ReasoningOptions | undefined {
  const paramMap = toVisibleParamMap(input.level.visibleParams);
  const effort = parseEffort(paramMap.reasoningEffort);
  const thinkingBudget = parseBudget(paramMap.thinkingBudget);
  const includeThoughts = parseBoolean(paramMap.includeThoughts);

  switch (input.providerType) {
    case 'openai':
    case 'openai-compatible':
    case 'xai':
      return effort
        ? {
            enabled: true,
            effort,
          }
        : undefined;

    case 'openrouter':
      return effort || thinkingBudget !== undefined
        ? {
            enabled: true,
            ...(effort ? { effort } : {}),
            ...(thinkingBudget !== undefined
              ? { maxTokens: thinkingBudget }
              : {}),
            exclude: false,
          }
        : undefined;

    case 'anthropic':
      return thinkingBudget !== undefined
        ? {
            enabled: true,
            maxTokens: thinkingBudget,
          }
        : undefined;

    case 'google': {
      const enabled =
        thinkingBudget !== undefined || includeThoughts !== undefined;
      if (!enabled) {
        return undefined;
      }
      return {
        enabled: true,
        ...(includeThoughts !== undefined ? { includeThoughts } : {}),
        ...(thinkingBudget !== undefined ? { maxTokens: thinkingBudget } : {}),
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
    throw buildThinkingError({
      code: 'THINKING_NOT_SUPPORTED',
      message: 'Thinking is not supported by the selected model.',
    });
  }

  const selectedLevel = input.thinking.level.trim();
  const matchedLevel = profile.levels.find(
    (level) => level.id === selectedLevel,
  );
  if (!matchedLevel) {
    throw buildThinkingError({
      code: 'THINKING_LEVEL_INVALID',
      message: `Invalid thinking level '${selectedLevel}'.`,
      details: {
        modelSupportsThinking: profile.supportsThinking,
        allowedLevels: profile.levels.map((level) => level.id),
      },
    });
  }

  if (matchedLevel.id === 'off') {
    return undefined;
  }

  const reasoning = resolveReasoningFromLevel({
    providerType: input.providerType,
    level: matchedLevel,
  });

  if (!reasoning) {
    throw buildThinkingError({
      code: 'THINKING_LEVEL_INVALID',
      message: `Thinking level '${matchedLevel.id}' is missing runtime preset params for provider '${input.providerType}'.`,
      details: {
        level: matchedLevel.id,
        providerType: input.providerType,
      },
    });
  }

  return reasoning;
}

export function toPublicThinkingProfile(
  profile: ThinkingProfile,
): ThinkingProfile {
  return {
    supportsThinking: profile.supportsThinking,
    defaultLevel: profile.defaultLevel,
    levels: profile.levels.map((level) => ({
      id: level.id,
      label: level.label,
      ...(level.description ? { description: level.description } : {}),
      ...(level.visibleParams && level.visibleParams.length > 0
        ? { visibleParams: level.visibleParams }
        : {}),
    })),
  };
}
