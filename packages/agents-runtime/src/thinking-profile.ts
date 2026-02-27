/**
 * [PROVIDES]: 模型思考档案构建与归一化
 * [DEPENDS]: types, reasoning-config
 * [POS]: thinking 配置的统一入口（cloud/local override/auto）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import {
  getDefaultVisibleParamsForLevel,
  getDefaultThinkingLevelsForSdkType,
  sanitizeThinkingLevels,
  supportsThinkingForSdkType,
} from './reasoning-config';
import type {
  ModelThinkingOverride,
  ModelThinkingProfile,
  ProviderSdkType,
  ThinkingLevelId,
  ThinkingLevelOption,
  ThinkingSelection,
  ThinkingVisibleParam,
} from './types';

type RawThinkingLevelInput =
  | ThinkingLevelId
  | {
      id: ThinkingLevelId;
      label?: string;
      description?: string;
      visibleParams?: ThinkingVisibleParam[];
    };

export interface RawThinkingProfileInput {
  supportsThinking?: boolean;
  defaultLevel?: ThinkingLevelId;
  levels?: RawThinkingLevelInput[];
}

const DEFAULT_LEVEL_LABELS: Record<string, string> = {
  off: 'Off',
  minimal: 'Minimal',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  max: 'Max',
  xhigh: 'X-High',
};

const normalizeRawLevelId = (value: unknown): ThinkingLevelId | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? (trimmed as ThinkingLevelId) : undefined;
};

const toLevelOption = (
  sdkType: ProviderSdkType,
  level: ThinkingLevelId,
  rawLevelMap: Map<
    string,
    { label?: string; description?: string; visibleParams?: ThinkingVisibleParam[] }
  >
): ThinkingLevelOption => {
  const raw = rawLevelMap.get(level);
  const visibleParams =
    raw?.visibleParams && raw.visibleParams.length > 0
      ? raw.visibleParams
      : getDefaultVisibleParamsForLevel({ sdkType, level });
  return {
    id: level,
    label: raw?.label?.trim() || DEFAULT_LEVEL_LABELS[level] || level,
    ...(raw?.description?.trim() ? { description: raw.description.trim() } : {}),
    ...(visibleParams.length > 0 ? { visibleParams } : {}),
  };
};

const collectRawLevelMap = (levels: RawThinkingLevelInput[] | undefined) => {
  const rawLevelMap = new Map<
    string,
    { label?: string; description?: string; visibleParams?: ThinkingVisibleParam[] }
  >();
  for (const level of levels ?? []) {
    if (typeof level === 'string') {
      const id = normalizeRawLevelId(level);
      if (id) {
        rawLevelMap.set(id, {});
      }
      continue;
    }
    const id = normalizeRawLevelId(level?.id);
    if (!id) {
      continue;
    }
    rawLevelMap.set(id, {
      label: level.label,
      description: level.description,
      visibleParams: Array.isArray(level.visibleParams) ? level.visibleParams : undefined,
    });
  }
  return rawLevelMap;
};

const coerceLevelIds = (levels: RawThinkingLevelInput[] | undefined): ThinkingLevelId[] => {
  const normalized: ThinkingLevelId[] = [];
  for (const level of levels ?? []) {
    if (typeof level === 'string') {
      const id = normalizeRawLevelId(level);
      if (id) {
        normalized.push(id);
      }
      continue;
    }
    const id = normalizeRawLevelId(level?.id);
    if (id) {
      normalized.push(id);
    }
  }
  return normalized;
};

export const resolveDefaultThinkingLevel = (
  levels: ThinkingLevelId[],
  preferred?: ThinkingLevelId
): ThinkingLevelId => {
  if (preferred && levels.includes(preferred)) {
    return preferred;
  }
  return levels.includes('off') ? 'off' : (levels[0] ?? 'off');
};

export const isThinkingLevelEnabled = (
  profile: ModelThinkingProfile | undefined,
  level: ThinkingLevelId
): boolean => {
  if (!profile) {
    return level === 'off';
  }
  return profile.levels.some((option) => option.id === level);
};

export const toThinkingSelection = (level: ThinkingLevelId): ThinkingSelection =>
  level === 'off' ? { mode: 'off' } : { mode: 'level', level };

export const buildThinkingProfile = (input: {
  sdkType: ProviderSdkType;
  supportsThinking: boolean;
  rawProfile?: RawThinkingProfileInput | null;
  override?: ModelThinkingOverride | null;
}): ModelThinkingProfile => {
  const { sdkType, supportsThinking, rawProfile, override } = input;
  const sdkSupportsThinking = supportsThinkingForSdkType(sdkType);
  const rawSupportsThinking = rawProfile?.supportsThinking;
  const effectiveSupportsThinking =
    sdkSupportsThinking &&
    (rawSupportsThinking === undefined ? supportsThinking : Boolean(rawSupportsThinking));

  const defaultLevels = getDefaultThinkingLevelsForSdkType(sdkType, effectiveSupportsThinking);
  const rawLevels = coerceLevelIds(rawProfile?.levels);
  const rawLevelMap = collectRawLevelMap(rawProfile?.levels);

  const mergedLevels = sanitizeThinkingLevels(rawLevels.length > 0 ? rawLevels : defaultLevels);

  const enabledLevels = effectiveSupportsThinking ? mergedLevels : (['off'] as ThinkingLevelId[]);

  const defaultLevel = resolveDefaultThinkingLevel(
    enabledLevels,
    override?.defaultLevel ?? rawProfile?.defaultLevel
  );

  const levels = enabledLevels.map((level) => toLevelOption(sdkType, level, rawLevelMap));

  return {
    supportsThinking: levels.some((level) => level.id !== 'off'),
    defaultLevel,
    levels,
  };
};

export const createDefaultThinkingProfile = (input: {
  sdkType: ProviderSdkType;
  supportsThinking: boolean;
}): ModelThinkingProfile =>
  buildThinkingProfile({
    sdkType: input.sdkType,
    supportsThinking: input.supportsThinking,
    rawProfile: undefined,
    override: undefined,
  });
