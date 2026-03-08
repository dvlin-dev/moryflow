/**
 * [PROVIDES]: STREAMDOWN_ANIM_STREAMING_OPTIONS - Streamdown 流式 token 动画配置（更明显，便于肉眼确认是否生效）
 * [DEPENDS]: streamdown（AnimateOptions）
 * [POS]: Streamdown 动画参数单一事实来源，避免多端散落 magic numbers
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

'use client';

import type { AnimateOptions } from 'streamdown';

// STREAMDOWN_ANIM: 统一的流式 token 动画参数。更省 DOM 用 `sep: 'word'`（中文可能不明显）；更明显用 `sep: 'char'`；可通过 duration/easing 微调。
export const STREAMDOWN_ANIM_STREAMING_OPTIONS: AnimateOptions = {
  animation: 'slideUp',
  duration: 600,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  sep: 'char',
};
