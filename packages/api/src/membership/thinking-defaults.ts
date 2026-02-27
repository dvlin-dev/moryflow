/**
 * [PROVIDES]: Thinking 默认等级与默认可见参数（单一事实源）
 * [DEPENDS]: membership/types.ts
 * [POS]: Anyhunt + Moryflow 共用的 Thinking 默认映射
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import type { MembershipThinkingVisibleParam, MembershipThinkingVisibleParamKey } from './types';

export type ThinkingProviderType =
  | 'openai'
  | 'openai-compatible'
  | 'openrouter'
  | 'anthropic'
  | 'google'
  | 'xai';

export const THINKING_LEVEL_LABELS: Record<string, string> = {
  off: 'Off',
  minimal: 'Minimal',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  max: 'Max',
  xhigh: 'X-High',
};

const THINKING_LEVELS_BY_PROVIDER: Record<ThinkingProviderType, string[]> = {
  openai: ['off', 'low', 'medium', 'high'],
  'openai-compatible': ['off', 'low', 'medium', 'high'],
  xai: ['off', 'low', 'medium', 'high'],
  openrouter: ['off', 'minimal', 'low', 'medium', 'high', 'xhigh'],
  anthropic: ['off', 'low', 'medium', 'high', 'max'],
  google: ['off', 'low', 'medium', 'high'],
};

const THINKING_EFFORT_BY_LEVEL: Record<string, string> = {
  minimal: 'minimal',
  low: 'low',
  medium: 'medium',
  high: 'high',
  max: 'xhigh',
  xhigh: 'xhigh',
};

const THINKING_BUDGET_BY_LEVEL: Record<string, number> = {
  minimal: 1024,
  low: 4096,
  medium: 8192,
  high: 16384,
  max: 32768,
  xhigh: 49152,
};

const mapByProvider = <T>(
  providerType: string,
  source: Record<ThinkingProviderType, T>
): T | undefined => source[providerType as ThinkingProviderType];

const dedupeVisibleParams = (
  params: MembershipThinkingVisibleParam[]
): MembershipThinkingVisibleParam[] => {
  const deduped: MembershipThinkingVisibleParam[] = [];
  const seen = new Set<MembershipThinkingVisibleParamKey>();
  for (const item of params) {
    if (!item || seen.has(item.key)) {
      continue;
    }
    const value = item.value.trim();
    if (!value) {
      continue;
    }
    seen.add(item.key);
    deduped.push({ key: item.key, value });
  }
  return deduped;
};

export const getDefaultThinkingLevelsForProvider = (providerType: string): string[] => {
  const mapped = mapByProvider(providerType, THINKING_LEVELS_BY_PROVIDER);
  if (!mapped) {
    return ['off'];
  }
  return [...mapped];
};

export const getDefaultThinkingVisibleParams = (input: {
  providerType: string;
  levelId: string;
}): MembershipThinkingVisibleParam[] => {
  const levelId = input.levelId.trim();
  if (!levelId || levelId === 'off') {
    return [];
  }

  const effort = THINKING_EFFORT_BY_LEVEL[levelId];
  const budget = THINKING_BUDGET_BY_LEVEL[levelId];
  const providerType = input.providerType;

  if (providerType === 'openai' || providerType === 'openai-compatible' || providerType === 'xai') {
    return effort ? [{ key: 'reasoningEffort', value: effort }] : [];
  }

  if (providerType === 'openrouter') {
    return dedupeVisibleParams([
      ...(effort ? [{ key: 'reasoningEffort', value: effort } as const] : []),
      ...(typeof budget === 'number'
        ? [{ key: 'thinkingBudget', value: String(budget) } as const]
        : []),
    ]);
  }

  if (providerType === 'anthropic') {
    return typeof budget === 'number' ? [{ key: 'thinkingBudget', value: String(budget) }] : [];
  }

  if (providerType === 'google') {
    return dedupeVisibleParams([
      { key: 'includeThoughts', value: 'true' },
      ...(typeof budget === 'number'
        ? [{ key: 'thinkingBudget', value: String(budget) } as const]
        : []),
    ]);
  }

  return [];
};
