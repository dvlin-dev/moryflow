/**
 * [PROVIDES]: shouldRenderThinkingSelector/resolveActiveThinkingLevel - thinking 选择器显示与等级解析 helper
 * [DEPENDS]: @moryflow/model-bank/registry
 * [POS]: ChatPromptInputThinkingSelector 纯逻辑工具，便于单测覆盖
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import type { ModelThinkingProfile } from '@moryflow/model-bank/registry';

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
