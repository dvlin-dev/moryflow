/**
 * [PROVIDES]: 思考选择到 Reasoning 配置的适配
 * [DEPENDS]: reasoning-config, thinking-profile, types
 * [POS]: runtime 边界：请求 thinking -> provider reasoning
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { resolveReasoningConfigFromThinkingSelection } from './reasoning-config';
import {
  isThinkingLevelEnabled,
  resolveDefaultThinkingLevel,
  toThinkingSelection,
} from './thinking-profile';
import type {
  ModelThinkingProfile,
  ProviderSdkType,
  ReasoningConfig,
  ThinkingLevelId,
  ThinkingSelection,
} from './types';

const resolveExplicitOffReasoning = (
  sdkType: ProviderSdkType,
  profile: ModelThinkingProfile
): ReasoningConfig | undefined => {
  if (sdkType !== 'openai-compatible') {
    return undefined;
  }

  const nonOffLevels = profile.levels.filter((level) => level.id !== 'off');
  const rawConfig: Record<string, unknown> = {};

  if (
    nonOffLevels.some((level) =>
      (level.visibleParams ?? []).some((param) => param.key === 'enableReasoning')
    )
  ) {
    rawConfig.enableReasoning = false;
  }

  if (
    nonOffLevels.some((level) =>
      (level.visibleParams ?? []).some((param) => param.key === 'thinkingMode')
    )
  ) {
    rawConfig.thinkingMode = 'disabled';
  }

  return Object.keys(rawConfig).length > 0
    ? {
        enabled: false,
        rawConfig,
      }
    : undefined;
};

export interface ResolvedThinkingResult {
  level: ThinkingLevelId;
  selection: ThinkingSelection;
  reasoning: ReasoningConfig | undefined;
  downgradedToOff: boolean;
  downgradeReason?: ThinkingDowngradeReason;
}

export type ThinkingDowngradeReason =
  | 'requested-level-not-allowed'
  | 'reasoning-config-unavailable';

const resolveInitialSelection = (
  profile: ModelThinkingProfile,
  requested?: ThinkingSelection
): {
  selection: ThinkingSelection;
  downgradedToOff: boolean;
  downgradeReason?: ThinkingDowngradeReason;
} => {
  if (!requested) {
    return {
      selection: toThinkingSelection(profile.defaultLevel),
      downgradedToOff: false,
    };
  }

  if (requested.mode === 'off') {
    return {
      selection: { mode: 'off' },
      downgradedToOff: false,
    };
  }

  if (isThinkingLevelEnabled(profile, requested.level)) {
    return {
      selection: requested,
      downgradedToOff: false,
    };
  }

  return {
    selection: { mode: 'off' },
    downgradedToOff: true,
    downgradeReason: 'requested-level-not-allowed',
  };
};

export const resolveThinkingToReasoning = (input: {
  sdkType: ProviderSdkType;
  profile: ModelThinkingProfile;
  requested?: ThinkingSelection;
}): ResolvedThinkingResult => {
  const { sdkType, profile, requested } = input;
  const initial = resolveInitialSelection(profile, requested);

  if (initial.selection.mode === 'off') {
    return {
      level: 'off',
      selection: { mode: 'off' },
      reasoning: resolveExplicitOffReasoning(sdkType, profile),
      downgradedToOff: initial.downgradedToOff,
      downgradeReason: initial.downgradeReason,
    };
  }

  const reasoning = resolveReasoningConfigFromThinkingSelection({
    sdkType,
    profile,
    selection: initial.selection,
  });
  if (!reasoning) {
    return {
      level: 'off',
      selection: { mode: 'off' },
      reasoning: undefined,
      downgradedToOff: true,
      downgradeReason: initial.downgradeReason ?? 'reasoning-config-unavailable',
    };
  }

  return {
    level: initial.selection.level,
    selection: initial.selection,
    reasoning,
    downgradedToOff: initial.downgradedToOff,
    downgradeReason: initial.downgradeReason,
  };
};

export const resolveThinkingSelectionForProfile = (
  profile: ModelThinkingProfile,
  requested?: ThinkingSelection
): ThinkingSelection => {
  if (requested?.mode === 'off') {
    return requested;
  }
  if (requested?.mode === 'level' && isThinkingLevelEnabled(profile, requested.level)) {
    return requested;
  }
  const fallback = resolveDefaultThinkingLevel(
    profile.levels.map((level) => level.id),
    profile.defaultLevel
  );
  return toThinkingSelection(fallback);
};
