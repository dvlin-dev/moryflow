/**
 * [PROVIDES]: 思考选择到 Reasoning 配置的适配
 * [DEPENDS]: reasoning-config, thinking-profile, types
 * [POS]: runtime 边界：请求 thinking -> provider reasoning
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
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
      reasoning: undefined,
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
