/**
 * [PROVIDES]: shouldRenderThinkingSelector/resolveActiveThinkingLevel - thinking 选择器显示与等级解析 helper
 * [DEPENDS]: @shared/model-registry
 * [POS]: ChatPromptInputThinkingSelector 纯逻辑工具，便于单测覆盖
 * [UPDATE]: 2026-02-26 - 从组件抽离 helper，避免测试耦合 UI 依赖解析
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { ModelThinkingProfile } from '@shared/model-registry';

export const shouldRenderThinkingSelector = (
  thinkingProfile?: ModelThinkingProfile
): thinkingProfile is ModelThinkingProfile =>
  Boolean(thinkingProfile && thinkingProfile.supportsThinking && thinkingProfile.levels.length > 1);

export const resolveActiveThinkingLevel = (
  thinkingProfile: ModelThinkingProfile,
  selectedThinkingLevel?: string | null
): string => {
  const normalized = selectedThinkingLevel?.trim();
  if (normalized && thinkingProfile.levels.some((option) => option.id === normalized)) {
    return normalized;
  }
  if (thinkingProfile.levels.some((option) => option.id === thinkingProfile.defaultLevel)) {
    return thinkingProfile.defaultLevel;
  }
  return thinkingProfile.levels[0]?.id ?? 'off';
};
