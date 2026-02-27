/**
 * [PROVIDES]: 模型思考档案构建与归一化
 * [DEPENDS]: types, model-bank/thinking
 * [POS]: thinking 配置的统一入口（cloud/local override/auto）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { resolveModelThinkingProfile, toThinkingLevelLabel } from '@moryflow/model-bank';
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

const normalizeRawLevelId = (value: unknown): ThinkingLevelId | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? (trimmed as ThinkingLevelId) : undefined;
};

const toRuntimeProfile = (
  profile: ReturnType<typeof resolveModelThinkingProfile>
): ModelThinkingProfile => ({
  supportsThinking: profile.supportsThinking,
  defaultLevel: profile.defaultLevel as ThinkingLevelId,
  levels: profile.levels.map((level) => ({
    id: level.id as ThinkingLevelId,
    label: level.label,
    ...(level.description ? { description: level.description } : {}),
    ...(level.visibleParams.length > 0
      ? {
          visibleParams: level.visibleParams.map((param) => ({
            key: param.key,
            value: param.value,
          })),
        }
      : {}),
  })),
});

const buildModelNativeFallbackProfile = (input: {
  modelId?: string;
  providerId?: string;
  sdkType: ProviderSdkType;
  supportsThinking: boolean;
}): ModelThinkingProfile => {
  const modelScoped = resolveModelThinkingProfile({
    modelId: input.modelId,
    providerId: input.providerId,
    sdkType: input.sdkType,
    abilities: {
      reasoning: input.supportsThinking,
    },
  });
  return toRuntimeProfile(modelScoped);
};

const sanitizeThinkingLevels = (levels: ThinkingLevelId[] | undefined): ThinkingLevelId[] => {
  const normalized = Array.isArray(levels) ? levels.filter(Boolean) : [];
  const deduped = Array.from(new Set(normalized));
  if (!deduped.includes('off')) {
    deduped.unshift('off');
  }
  return deduped.length > 0 ? deduped : ['off'];
};

const toLevelOption = (
  level: ThinkingLevelId,
  rawLevelMap: Map<
    string,
    { label?: string; description?: string; visibleParams?: ThinkingVisibleParam[] }
  >,
  fallbackProfile: ModelThinkingProfile
): ThinkingLevelOption => {
  const raw = rawLevelMap.get(level);
  const fallbackVisibleParams =
    fallbackProfile.levels.find((option) => option.id === level)?.visibleParams ?? [];
  const visibleParams =
    raw?.visibleParams && raw.visibleParams.length > 0
      ? raw.visibleParams
      : fallbackVisibleParams.map((param) => ({
          key: param.key,
          value: param.value,
        }));
  return {
    id: level,
    label: raw?.label?.trim() || toThinkingLevelLabel(level),
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
  modelId?: string;
  providerId?: string;
  sdkType: ProviderSdkType;
  supportsThinking: boolean;
  rawProfile?: RawThinkingProfileInput | null;
  override?: ModelThinkingOverride | null;
}): ModelThinkingProfile => {
  const { sdkType, supportsThinking, rawProfile, override, modelId, providerId } = input;
  const fallbackProfile = buildModelNativeFallbackProfile({
    modelId,
    providerId,
    sdkType,
    supportsThinking,
  });
  const rawLevels = coerceLevelIds(rawProfile?.levels);
  const rawHasThinkingLevels = rawLevels.some((level) => level !== 'off');
  const rawSupportsThinking = rawProfile?.supportsThinking;
  const profileSupportsThinking =
    rawSupportsThinking !== undefined
      ? Boolean(rawSupportsThinking)
      : rawLevels.length > 0
        ? rawHasThinkingLevels
        : fallbackProfile.supportsThinking;
  const effectiveSupportsThinking = supportsThinking && profileSupportsThinking;

  const defaultLevels = fallbackProfile.levels.map((level) => level.id);
  const rawLevelMap = collectRawLevelMap(rawProfile?.levels);

  const mergedLevels = sanitizeThinkingLevels(rawLevels.length > 0 ? rawLevels : defaultLevels);

  const enabledLevels = effectiveSupportsThinking ? mergedLevels : (['off'] as ThinkingLevelId[]);

  const defaultLevel = resolveDefaultThinkingLevel(
    enabledLevels,
    override?.defaultLevel ?? rawProfile?.defaultLevel ?? fallbackProfile.defaultLevel
  );

  const levels = enabledLevels.map((level) => toLevelOption(level, rawLevelMap, fallbackProfile));

  return {
    supportsThinking: levels.some((level) => level.id !== 'off'),
    defaultLevel,
    levels,
  };
};

export const createDefaultThinkingProfile = (input: {
  modelId?: string;
  providerId?: string;
  sdkType: ProviderSdkType;
  supportsThinking: boolean;
}): ModelThinkingProfile =>
  buildThinkingProfile({
    modelId: input.modelId,
    providerId: input.providerId,
    sdkType: input.sdkType,
    supportsThinking: input.supportsThinking,
    rawProfile: undefined,
    override: undefined,
  });
