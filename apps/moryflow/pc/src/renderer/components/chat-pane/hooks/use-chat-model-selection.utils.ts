/**
 * [PROVIDES]: 模型选中态下的 thinking 等级解析工具函数
 * [DEPENDS]: chat-pane models 与 model-bank registry 类型
 * [POS]: use-chat-model-selection 的纯函数层，供运行时与单测复用
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { ModelThinkingProfile } from '@moryflow/model-bank/registry';

import type { ModelGroup, ModelOption } from '../models';

const hasLevel = (profile: ModelThinkingProfile, level: string | undefined): level is string =>
  Boolean(level) && profile.levels.some((item) => item.id === level);

const resolveOffLevel = (profile: ModelThinkingProfile): string =>
  profile.levels.some((level) => level.id === 'off') ? 'off' : (profile.levels[0]?.id ?? 'off');

const resolvePreferredLevel = (profile: ModelThinkingProfile): string => {
  if (hasLevel(profile, profile.defaultLevel)) {
    return profile.defaultLevel;
  }
  return resolveOffLevel(profile);
};

export const findModelOption = (
  groups: ModelGroup[],
  modelId?: string | null
): ModelOption | undefined => {
  if (!modelId) {
    return undefined;
  }
  for (const group of groups) {
    const matched = group.options.find((option) => option.id === modelId);
    if (matched) {
      return matched;
    }
  }
  return undefined;
};

export const hasEnabledModelOption = (groups: ModelGroup[], modelId?: string | null): boolean => {
  const option = findModelOption(groups, modelId);
  return Boolean(option && !option.disabled);
};

export const pickFirstEnabledModelId = (groups: ModelGroup[]): string => {
  for (const group of groups) {
    const option = group.options.find((item) => !item.disabled);
    if (option?.id) {
      return option.id;
    }
  }
  return '';
};

export const pickAvailableModelId = (input: {
  groups: ModelGroup[];
  candidates: Array<string | null | undefined>;
}): string => {
  for (const candidate of input.candidates) {
    const modelId = candidate?.trim();
    if (!modelId) {
      continue;
    }
    if (hasEnabledModelOption(input.groups, modelId)) {
      return modelId;
    }
  }
  return pickFirstEnabledModelId(input.groups);
};

export const resolveThinkingLevel = (input: {
  modelId?: string;
  thinkingByModel: Record<string, string>;
  modelGroups: ModelGroup[];
  resolveExternalThinkingProfile?: (modelId?: string) => ModelThinkingProfile | undefined;
}): string => {
  const profile =
    findModelOption(input.modelGroups, input.modelId)?.thinkingProfile ??
    input.resolveExternalThinkingProfile?.(input.modelId);
  if (!profile) {
    return 'off';
  }

  const preferredLevel = resolvePreferredLevel(profile);
  if (!input.modelId) {
    return preferredLevel;
  }

  const stored = input.thinkingByModel[input.modelId];
  if (hasLevel(profile, stored)) {
    return stored;
  }

  return preferredLevel;
};
