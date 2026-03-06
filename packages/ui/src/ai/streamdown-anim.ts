/**
 * [PROVIDES]: STREAMDOWN_ANIM_STREAMING_OPTIONS - Streamdown 流式 token 动画配置（更明显，便于肉眼确认是否生效）
 * [DEPENDS]: streamdown（AnimateOptions）
 * [POS]: Streamdown 动画参数单一事实来源，避免多端散落 magic numbers
 * [UPDATE]: 2026-02-10 - 明确 sep=word/char 的取舍（性能 vs 视觉明显程度），避免注释误导
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
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
