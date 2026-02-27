/**
 * [PROVIDES]: 设置页模型 thinking 等级选项解析（模型合同单一事实源）
 * [DEPENDS]: @moryflow/model-bank resolveModelThinkingProfile / toThinkingLevelLabel
 * [POS]: providers Add/Edit Model Dialog 的 thinking 等级适配层
 *
 * [PROTOCOL]: 若修改等级回退规则，必须同步补充同目录单元测试
 */

import { resolveModelThinkingProfile, toThinkingLevelLabel } from '@moryflow/model-bank';
import type { ProviderSdkType } from '@shared/ipc';

const OFF_THINKING_LEVEL = 'off';

export type ThinkingLevelOption = {
  id: string;
  label: string;
};

export type ResolveThinkingLevelOptionsInput = {
  providerId?: string;
  sdkType?: ProviderSdkType;
  modelId?: string;
  reasoningEnabled: boolean;
  selectedLevel?: string;
};

export type ThinkingLevelSelection = {
  options: ThinkingLevelOption[];
  defaultLevel: string;
  normalizedLevel: string;
  supportsThinking: boolean;
};

const normalizeValue = (value?: string): string | undefined => {
  const trimmed = (value || '').trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const OFF_ONLY_SELECTION: ThinkingLevelSelection = {
  options: [{ id: OFF_THINKING_LEVEL, label: toThinkingLevelLabel(OFF_THINKING_LEVEL) }],
  defaultLevel: OFF_THINKING_LEVEL,
  normalizedLevel: OFF_THINKING_LEVEL,
  supportsThinking: false,
};

const toOptions = (levelIds: string[]): ThinkingLevelOption[] => {
  const uniqueLevelIds = Array.from(new Set(levelIds));
  if (uniqueLevelIds.length === 0) {
    return OFF_ONLY_SELECTION.options;
  }
  return uniqueLevelIds.map((levelId) => ({
    id: levelId,
    label: toThinkingLevelLabel(levelId),
  }));
};

export const resolveThinkingLevelSelection = (
  input: ResolveThinkingLevelOptionsInput
): ThinkingLevelSelection => {
  if (!input.reasoningEnabled) {
    return OFF_ONLY_SELECTION;
  }

  const normalizedModelId = normalizeValue(input.modelId);
  const normalizedProviderId = normalizeValue(input.providerId);
  const normalizedSdkType = normalizeValue(input.sdkType);

  const profile = resolveModelThinkingProfile({
    abilities: { reasoning: true },
    modelId: normalizedModelId,
    providerId: normalizedProviderId,
    sdkType: normalizedSdkType,
  });

  const options = toOptions(profile.levels.map((level) => level.id));
  const optionIds = new Set(options.map((option) => option.id));
  const defaultLevel = optionIds.has(profile.defaultLevel)
    ? profile.defaultLevel
    : OFF_THINKING_LEVEL;
  const selectedLevel = normalizeValue(input.selectedLevel);
  const normalizedLevel =
    selectedLevel && optionIds.has(selectedLevel) ? selectedLevel : defaultLevel;

  return {
    options,
    defaultLevel,
    normalizedLevel,
    supportsThinking: profile.supportsThinking,
  };
};
