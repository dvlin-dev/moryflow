/**
 * [PROPS]: ConversationViewportTurnTailProps - TurnTail 容器（稳定 Slack 宿主）
 * [EMITS]: None
 * [POS]: TurnAnchor=top 的 Slack/min-height 计算与挂载点（对齐 assistant-ui ThreadViewportSlack 语义）
 * [UPDATE]: 2026-02-05 - Slack 计算扣除顶部 padding，避免用户消息被 header 遮挡
 * [UPDATE]: 2026-02-06 - 重构：用稳定 TurnTail 容器取代 per-message Slack + UserTailSlack，修复 scrollTop clamp 跌落
 * [UPDATE]: 2026-02-06 - tail sentinel 放在 slack spacer 之前，避免 AI 跟随被 slack 空白区提前触发
 * [UPDATE]: 2026-02-07 - Slack 计算扣除 ConversationContent 的 gap/padding-bottom，避免短列表产生额外 overflow 导致 runStart 贴顶偏移
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import { useCallback, type ReactNode } from 'react';

import { useManagedRef } from '../assistant-ui/utils/hooks/useManagedRef';
import { useConversationViewportStore } from './context';

const parseCssLength = (value: string, element: HTMLElement): number => {
  const match = value.match(/^([\d.]+)(em|px|rem)$/);
  if (!match) return 0;

  const num = parseFloat(match[1] ?? '0');
  const unit = match[2];

  if (unit === 'px') return num;
  if (unit === 'em') {
    const fontSize = parseFloat(getComputedStyle(element).fontSize) || 16;
    return num * fontSize;
  }
  if (unit === 'rem') {
    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return num * rootFontSize;
  }
  return 0;
};

const getInheritedCssVarValue = (name: string, element: HTMLElement): string => {
  // 优先读 inline style（由 React style 属性写入），可规避渲染初期 computedStyle 尚未稳定时的抖动。
  let current: HTMLElement | null = element;
  while (current) {
    const raw = current.style.getPropertyValue(name);
    if (raw) return raw.trim();
    current = current.parentElement;
  }

  // 兜底：允许业务方用 CSS class/stylesheet 注入变量。
  return getComputedStyle(element).getPropertyValue(name).trim();
};

const getInheritedCssVarLength = (name: string, element: HTMLElement): number => {
  const raw = getInheritedCssVarValue(name, element);
  if (!raw) return 0;
  return parseCssLength(raw, element);
};

const CONVERSATION_CONTENT_GAP_VAR = '--ai-conversation-content-gap';
const CONVERSATION_CONTENT_PADDING_BOTTOM_VAR = '--ai-conversation-content-padding-bottom';

const computeTurnAnchorSlackMinHeight = ({
  viewport,
  inset,
  userMessage,
  element,
  fillClampThreshold,
  fillClampOffset,
  contentPaddingBottom,
  contentRowGap,
}: {
  viewport: number;
  inset: number;
  userMessage: number;
  element: HTMLElement;
  fillClampThreshold: string;
  fillClampOffset: string;
  contentPaddingBottom: number;
  contentRowGap: number;
}): number | null => {
  if (viewport === 0) return null;

  const threshold = parseCssLength(fillClampThreshold, element);
  const offset = parseCssLength(fillClampOffset, element);

  // userMessage 在切换/测量阶段可能短暂归零；为了避免 slack 断档，这里用 offset 兜底。
  const clampAdjustment =
    userMessage === 0 ? offset : userMessage <= threshold ? userMessage : offset;

  const topPadding =
    getInheritedCssVarLength('--ai-conversation-top-padding', element) +
    getInheritedCssVarLength('--ai-conversation-top-padding-extra', element);

  // ConversationContent 有固定的 gap/padding-bottom。
  // TurnAnchor=top 依赖 slack “刚好填满可视区”，否则短列表会产生额外 overflow，
  // runStart scrollToBottom 会滚掉一段顶部 padding，表现为“user 没贴顶 / 没动画”。
  return Math.max(
    0,
    viewport - inset - clampAdjustment - topPadding - contentPaddingBottom - contentRowGap
  );
};

const applySlackStyle = (element: HTMLElement, minHeight: number) => {
  element.style.minHeight = `${minHeight}px`;
  element.style.flexShrink = '0';
  element.style.transition = 'min-height 0s';
};

const resetSlackStyle = (element: HTMLElement) => {
  element.style.minHeight = '';
  element.style.flexShrink = '';
  element.style.transition = '';
};

export type ConversationViewportTurnTailProps = {
  enabled: boolean;
  /** Threshold at which the user message height clamps to the offset */
  fillClampThreshold?: string;
  /** Offset used when clamping large user messages */
  fillClampOffset?: string;
  children?: ReactNode;
};

/**
 * TurnAnchor=top：稳定的 slack 宿主。
 *
 * - 该节点始终存在（MessageList 内 messages.length>0 即渲染），避免 slack “宿主切换”导致 scrollHeight 瞬时收缩。
 * - slack 通过容器 minHeight + 末尾 spacer 消耗：内容增长会逐步吃掉 slack，直至溢出才需要 AutoScroll 跟随。
 * - tail sentinel 放在 spacer 之前：tail 可见性代表“实际内容尾部”，不被 slack 空白区干扰。
 */
export const ConversationViewportTurnTail = ({
  enabled,
  fillClampThreshold = '10em',
  fillClampOffset = '6em',
  children,
}: ConversationViewportTurnTailProps) => {
  const viewportStore = useConversationViewportStore({ optional: true });

  const callback = useCallback(
    (el: HTMLElement) => {
      if (!viewportStore) return;

      const updateMinHeight = () => {
        const state = viewportStore.getState();
        if (state.turnAnchor === 'top' && enabled) {
          const { viewport, inset, userMessage } = state.height;
          const paddingBottom = getInheritedCssVarLength(
            CONVERSATION_CONTENT_PADDING_BOTTOM_VAR,
            el
          );
          const rowGap = getInheritedCssVarLength(CONVERSATION_CONTENT_GAP_VAR, el);
          const minHeight = computeTurnAnchorSlackMinHeight({
            viewport,
            inset,
            userMessage,
            element: el,
            fillClampThreshold,
            fillClampOffset,
            contentPaddingBottom: paddingBottom,
            contentRowGap: rowGap,
          });
          if (minHeight === null) return;
          applySlackStyle(el, minHeight);
        } else {
          resetSlackStyle(el);
        }
      };

      updateMinHeight();
      return viewportStore.subscribe(updateMinHeight);
    },
    [viewportStore, enabled, fillClampThreshold, fillClampOffset]
  );

  const ref = useManagedRef<HTMLElement>(callback);

  return (
    <div ref={ref} data-slot="conversation-turn-tail" className="flex w-full flex-col">
      {children}
      <div data-slot="conversation-tail" aria-hidden="true" className="h-px w-full" />
      <div
        data-slot="conversation-turn-slack"
        aria-hidden="true"
        className="min-h-0 w-full flex-1"
      />
    </div>
  );
};

ConversationViewportTurnTail.displayName = 'ConversationViewportTurnTail';
