/**
 * [PROVIDES]: Thinking 等级标签、控制键优先级、控制键到可见参数的固定映射规则
 * [DEPENDS]: src/thinking/types.ts, src/types/aiModel.ts
 * [POS]: model-bank thinking 规则中心（固定数据 + 纯函数）
 *
 * [PROTOCOL]: 若新增/删除 ExtendParamsType，必须同步更新 THINKING_CONTROL_PRIORITY 与 CONTROL_PRESETS
 */

import type { ExtendParamsType } from '../types/aiModel';

import type { ThinkingLevelId, ThinkingVisibleParam, ThinkingVisibleParamKey } from './types';

const OFF_LEVEL_ID = 'off';

export const THINKING_LEVEL_LABELS: Record<string, string> = {
  auto: 'Auto',
  max: 'Max',
  medium: 'Medium',
  minimal: 'Minimal',
  off: 'Off',
  on: 'On',
  high: 'High',
  low: 'Low',
  xhigh: 'X-High',
};

export const THINKING_LEVEL_BUDGETS: Record<string, number> = {
  high: 16_384,
  low: 4096,
  max: 32_768,
  medium: 8192,
  minimal: 1024,
  xhigh: 49_152,
};

export const THINKING_CONTROL_PRIORITY: ExtendParamsType[] = [
  'gpt5_2ProReasoningEffort',
  'gpt5_2ReasoningEffort',
  'gpt5_1ReasoningEffort',
  'gpt5ReasoningEffort',
  'reasoningEffort',
  'effort',
  'thinkingLevel3',
  'thinkingLevel2',
  'thinkingLevel',
  'thinking',
  'thinkingBudget',
  'reasoningBudgetToken',
  'enableAdaptiveThinking',
  'enableReasoning',
];

export const THINKING_CONTROLS = new Set<ExtendParamsType>(THINKING_CONTROL_PRIORITY);

interface BuildContext {
  control: ExtendParamsType;
  controls: Set<ExtendParamsType>;
  levelId: ThinkingLevelId;
  providerId?: string;
  sdkType?: string;
}

export interface ThinkingControlPreset {
  control: ExtendParamsType;
  defaultLevel: ThinkingLevelId;
  levels: ThinkingLevelId[];
  toVisibleParams: (ctx: BuildContext) => ThinkingVisibleParam[];
}

const withOffLevel = (levels: readonly string[]) => [OFF_LEVEL_ID, ...levels];

const buildReasoningEffortParams = (value: string): ThinkingVisibleParam[] => [
  { key: 'reasoningEffort', value },
];

const buildEffortParams = (value: string): ThinkingVisibleParam[] => [{ key: 'effort', value }];

const buildThinkingLevelParams = (value: string): ThinkingVisibleParam[] => [
  { key: 'thinkingLevel', value },
];

const isGoogleLike = (ctx: BuildContext): boolean => {
  const sdkType = (ctx.sdkType || '').toLowerCase();
  const providerId = (ctx.providerId || '').toLowerCase();
  return sdkType === 'google' || providerId === 'google' || providerId === 'vertexai';
};

const buildBudgetParams = (ctx: BuildContext): ThinkingVisibleParam[] => {
  const budget = THINKING_LEVEL_BUDGETS[ctx.levelId];
  if (typeof budget !== 'number') {
    return [];
  }

  const params: ThinkingVisibleParam[] = [{ key: 'thinkingBudget', value: String(budget) }];

  if (ctx.controls.has('enableReasoning')) {
    params.push({ key: 'enableReasoning', value: 'true' });
  }

  if (isGoogleLike(ctx)) {
    params.unshift({ key: 'includeThoughts', value: 'true' });
  }

  return params;
};

const buildThinkingModeParams = (levelId: ThinkingLevelId): ThinkingVisibleParam[] => {
  if (levelId === OFF_LEVEL_ID) {
    return [{ key: 'thinkingMode', value: 'disabled' }];
  }
  if (levelId === 'auto') {
    return [{ key: 'thinkingMode', value: 'auto' }];
  }
  return [{ key: 'thinkingMode', value: 'enabled' }];
};

const buildBooleanSwitchParams = (
  key: ThinkingVisibleParamKey,
  levelId: ThinkingLevelId
): ThinkingVisibleParam[] => {
  if (levelId === OFF_LEVEL_ID) {
    return [];
  }
  return [{ key, value: 'true' }];
};

export const CONTROL_PRESETS: Record<ExtendParamsType, ThinkingControlPreset | undefined> = {
  disableContextCaching: undefined,
  enableAdaptiveThinking: {
    control: 'enableAdaptiveThinking',
    defaultLevel: 'on',
    levels: [OFF_LEVEL_ID, 'on'],
    toVisibleParams: (ctx) => buildBooleanSwitchParams('enableAdaptiveThinking', ctx.levelId),
  },
  enableReasoning: {
    control: 'enableReasoning',
    defaultLevel: 'on',
    levels: [OFF_LEVEL_ID, 'on'],
    toVisibleParams: (ctx) => buildBooleanSwitchParams('enableReasoning', ctx.levelId),
  },
  effort: {
    control: 'effort',
    defaultLevel: 'medium',
    levels: withOffLevel(['low', 'medium', 'high', 'max']),
    toVisibleParams: (ctx) => (ctx.levelId === OFF_LEVEL_ID ? [] : buildEffortParams(ctx.levelId)),
  },
  gpt5ReasoningEffort: {
    control: 'gpt5ReasoningEffort',
    defaultLevel: 'medium',
    levels: withOffLevel(['minimal', 'low', 'medium', 'high']),
    toVisibleParams: (ctx) =>
      ctx.levelId === OFF_LEVEL_ID ? [] : buildReasoningEffortParams(ctx.levelId),
  },
  gpt5_1ReasoningEffort: {
    control: 'gpt5_1ReasoningEffort',
    defaultLevel: OFF_LEVEL_ID,
    levels: withOffLevel(['low', 'medium', 'high']),
    toVisibleParams: (ctx) =>
      ctx.levelId === OFF_LEVEL_ID ? [] : buildReasoningEffortParams(ctx.levelId),
  },
  gpt5_2ProReasoningEffort: {
    control: 'gpt5_2ProReasoningEffort',
    defaultLevel: 'medium',
    levels: withOffLevel(['medium', 'high', 'xhigh']),
    toVisibleParams: (ctx) =>
      ctx.levelId === OFF_LEVEL_ID ? [] : buildReasoningEffortParams(ctx.levelId),
  },
  gpt5_2ReasoningEffort: {
    control: 'gpt5_2ReasoningEffort',
    defaultLevel: OFF_LEVEL_ID,
    levels: withOffLevel(['low', 'medium', 'high', 'xhigh']),
    toVisibleParams: (ctx) =>
      ctx.levelId === OFF_LEVEL_ID ? [] : buildReasoningEffortParams(ctx.levelId),
  },
  imageAspectRatio: undefined,
  imageResolution: undefined,
  reasoningBudgetToken: {
    control: 'reasoningBudgetToken',
    defaultLevel: 'medium',
    levels: withOffLevel(['low', 'medium', 'high', 'max']),
    toVisibleParams: (ctx) => (ctx.levelId === OFF_LEVEL_ID ? [] : buildBudgetParams(ctx)),
  },
  reasoningEffort: {
    control: 'reasoningEffort',
    defaultLevel: 'medium',
    levels: withOffLevel(['low', 'medium', 'high']),
    toVisibleParams: (ctx) =>
      ctx.levelId === OFF_LEVEL_ID ? [] : buildReasoningEffortParams(ctx.levelId),
  },
  textVerbosity: undefined,
  thinking: {
    control: 'thinking',
    defaultLevel: 'auto',
    levels: [OFF_LEVEL_ID, 'auto', 'on'],
    toVisibleParams: (ctx) => buildThinkingModeParams(ctx.levelId),
  },
  thinkingBudget: {
    control: 'thinkingBudget',
    defaultLevel: 'medium',
    levels: withOffLevel(['low', 'medium', 'high', 'max']),
    toVisibleParams: (ctx) => (ctx.levelId === OFF_LEVEL_ID ? [] : buildBudgetParams(ctx)),
  },
  thinkingLevel: {
    control: 'thinkingLevel',
    defaultLevel: 'high',
    levels: withOffLevel(['minimal', 'low', 'medium', 'high']),
    toVisibleParams: (ctx) =>
      ctx.levelId === OFF_LEVEL_ID ? [] : buildThinkingLevelParams(ctx.levelId),
  },
  thinkingLevel2: {
    control: 'thinkingLevel2',
    defaultLevel: 'high',
    levels: withOffLevel(['low', 'high']),
    toVisibleParams: (ctx) =>
      ctx.levelId === OFF_LEVEL_ID ? [] : buildThinkingLevelParams(ctx.levelId),
  },
  thinkingLevel3: {
    control: 'thinkingLevel3',
    defaultLevel: 'high',
    levels: withOffLevel(['low', 'medium', 'high']),
    toVisibleParams: (ctx) =>
      ctx.levelId === OFF_LEVEL_ID ? [] : buildThinkingLevelParams(ctx.levelId),
  },
  urlContext: undefined,
};

export const normalizeThinkingLevelId = (levelId?: string): ThinkingLevelId => {
  const trimmed = (levelId || '').trim().toLowerCase();
  if (!trimmed) {
    return OFF_LEVEL_ID;
  }
  if (trimmed === 'none' || trimmed === 'disabled') {
    return OFF_LEVEL_ID;
  }
  if (trimmed === 'enabled') {
    return 'on';
  }
  return trimmed;
};

export const toThinkingLevelLabel = (levelId: string): string =>
  THINKING_LEVEL_LABELS[levelId] ?? levelId;

export const buildThinkingVisibleParams = (ctx: BuildContext): ThinkingVisibleParam[] => {
  const preset = CONTROL_PRESETS[ctx.control];
  if (!preset) {
    return [];
  }
  return preset.toVisibleParams(ctx);
};

export const pickActiveThinkingControl = (
  controls: ExtendParamsType[]
): ExtendParamsType | undefined => {
  const set = new Set(controls);
  return THINKING_CONTROL_PRIORITY.find((key) => set.has(key));
};

export const hasThinkingControl = (control: ExtendParamsType): boolean =>
  Boolean(CONTROL_PRESETS[control]);

export const isThinkingControlKey = (value: string): value is ExtendParamsType =>
  THINKING_CONTROLS.has(value as ExtendParamsType);
