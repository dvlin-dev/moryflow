/**
 * [PROVIDES]: 模型思考档案构建与归一化
 * [DEPENDS]: types, model-bank/thinking
 * [POS]: thinking 配置的统一入口（cloud/local override/auto）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import {
  buildThinkingProfileFromRaw,
  type RawThinkingProfileInput as ContractRawThinkingProfileInput,
} from '@moryflow/model-bank';
import type {
  ModelThinkingOverride,
  ModelThinkingProfile,
  ProviderSdkType,
  ThinkingLevelId,
  ThinkingSelection,
} from './types';

export type RawThinkingProfileInput = ContractRawThinkingProfileInput;

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
  override?: ModelThinkingOverride | null;
  providerId?: string;
  rawProfile?: RawThinkingProfileInput | null;
  sdkType: ProviderSdkType;
  supportsThinking: boolean;
}): ModelThinkingProfile => {
  const profile = buildThinkingProfileFromRaw({
    modelId: input.modelId,
    providerId: input.providerId,
    sdkType: input.sdkType,
    supportsThinking: input.supportsThinking,
    rawProfile: input.rawProfile,
    defaultLevelOverride: input.override?.defaultLevel,
  });

  return {
    supportsThinking: profile.supportsThinking,
    defaultLevel: profile.defaultLevel as ThinkingLevelId,
    levels: profile.levels.map((level) => ({
      id: level.id as ThinkingLevelId,
      label: level.label,
      ...(level.description ? { description: level.description } : {}),
      ...(level.visibleParams && level.visibleParams.length > 0
        ? {
            visibleParams: level.visibleParams.map((param) => ({
              key: param.key,
              value: param.value,
            })),
          }
        : {}),
    })),
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
