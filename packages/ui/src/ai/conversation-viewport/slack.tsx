/**
 * [PROPS]: ConversationViewportSlackProps - Slack 占位容器
 * [EMITS]: None
 * [POS]: Conversation Viewport Slack（对齐 assistant-ui ThreadViewportSlack）
 * [UPDATE]: 2026-02-05 - 忽略 0 高度测量，避免短列表抖动
 * [UPDATE]: 2026-02-05 - Slack 计算扣除顶部 padding，避免用户消息被 header 遮挡
 * [UPDATE]: 2026-02-05 - 移除 TurnAnchor Slack 日志，避免噪音
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import { Slot } from '@radix-ui/react-slot';
import { createContext, type ReactNode, useCallback, useContext } from 'react';

import { useManagedRef } from '../assistant-ui/utils/hooks/useManagedRef';
import { useConversationMessage } from '../message/context';
import { useConversationViewportStore } from './context';

const SlackNestingContext = createContext(false);

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

const getCssVarLength = (name: string, element: HTMLElement): number => {
  const raw = getComputedStyle(element).getPropertyValue(name).trim();
  if (!raw) return 0;
  return parseCssLength(raw, element);
};

export type ConversationViewportSlackProps = {
  /** Threshold at which the user message height clamps to the offset */
  fillClampThreshold?: string;
  /** Offset used when clamping large user messages */
  fillClampOffset?: string;
  children: ReactNode;
};

export const ConversationViewportSlack = ({
  children,
  fillClampThreshold = '10em',
  fillClampOffset = '6em',
}: ConversationViewportSlackProps) => {
  const messageContext = useConversationMessage({ optional: true });
  const viewportStore = useConversationViewportStore({ optional: true });
  const isNested = useContext(SlackNestingContext);

  const shouldApplySlack =
    !!messageContext &&
    messageContext.message.role === 'assistant' &&
    messageContext.index >= 1 &&
    messageContext.index === messageContext.messages.length - 1 &&
    messageContext.messages.at(messageContext.index - 1)?.role === 'user';

  const callback = useCallback(
    (el: HTMLElement) => {
      if (!viewportStore || isNested) return;

      const updateMinHeight = () => {
        const state = viewportStore.getState();
        if (state.turnAnchor === 'top' && shouldApplySlack) {
          const { viewport, inset, userMessage } = state.height;
          if (viewport === 0 || userMessage === 0) {
            return;
          }
          const threshold = parseCssLength(fillClampThreshold, el);
          const offset = parseCssLength(fillClampOffset, el);
          const clampAdjustment = userMessage <= threshold ? userMessage : offset;
          const topPadding =
            getCssVarLength('--ai-conversation-top-padding', el) +
            getCssVarLength('--ai-conversation-top-padding-extra', el);

          const minHeight = Math.max(0, viewport - inset - clampAdjustment - topPadding);
          el.style.minHeight = `${minHeight}px`;
          el.style.flexShrink = '0';
          el.style.transition = 'min-height 0s';
        } else {
          el.style.minHeight = '';
          el.style.flexShrink = '';
          el.style.transition = '';
        }
      };

      updateMinHeight();
      return viewportStore.subscribe(updateMinHeight);
    },
    [viewportStore, shouldApplySlack, isNested, fillClampThreshold, fillClampOffset]
  );

  const ref = useManagedRef<HTMLElement>(callback);

  return (
    <SlackNestingContext.Provider value={true}>
      <Slot ref={ref}>{children}</Slot>
    </SlackNestingContext.Provider>
  );
};

ConversationViewportSlack.displayName = 'ConversationViewportSlack';
