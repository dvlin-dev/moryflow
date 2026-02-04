/**
 * [PROPS]: ConversationViewportSlackProps - Slack 计算配置
 * [EMITS]: None
 * [POS]: Conversation Viewport Slack 补位容器
 * [UPDATE]: 2026-02-03 - 禁用状态短路订阅，避免无用更新
 * [UPDATE]: 2026-02-03 - 仅在测量有效时写入 min-height，避免闪烁
 * [UPDATE]: 2026-02-04 - 移除顶部 inset 与 enabled 参数，严格对齐 assistant-ui
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import { Slot } from '@radix-ui/react-slot';
import { createContext, type ReactNode, useCallback, useContext } from 'react';

import { useConversationViewportStoreOptional } from './context';
import { useManagedRef } from './use-managed-ref';
import { useConversationMessage } from '../message/context';

const SlackNestingContext = createContext(false);

const parseCssLength = (value: string, element: HTMLElement): number => {
  const match = value.match(/^([\d.]+)(em|px|rem)$/);
  if (!match) return 0;

  const num = parseFloat(match[1]!);
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

export type ConversationViewportSlackProps = {
  fillClampThreshold?: string;
  fillClampOffset?: string;
  children: ReactNode;
};

const DEFAULT_THRESHOLD = '10em';
const DEFAULT_OFFSET = '6em';

export const ConversationViewportSlack = ({
  fillClampThreshold = DEFAULT_THRESHOLD,
  fillClampOffset = DEFAULT_OFFSET,
  children,
}: ConversationViewportSlackProps) => {
  const store = useConversationViewportStoreOptional();
  const isNested = useContext(SlackNestingContext);
  const messageContext = useConversationMessage({ optional: true });
  const shouldApplySlack = Boolean(
    messageContext &&
    messageContext.message.role === 'assistant' &&
    messageContext.index >= 1 &&
    messageContext.index === messageContext.messages.length - 1 &&
    messageContext.messages[messageContext.index - 1]?.role === 'user'
  );

  const callback = useCallback(
    (el: HTMLElement) => {
      if (!store || isNested) return;

      const updateMinHeight = () => {
        const state = store.getState();
        if (state.turnAnchor === 'top' && shouldApplySlack) {
          const { viewport, inset, userMessage } = state.height;
          if (viewport <= 0) {
            if (el.style.minHeight !== '') el.style.minHeight = '';
            if (el.style.flexShrink !== '') el.style.flexShrink = '';
            if (el.style.transition !== '') el.style.transition = '';
            return;
          }
          const threshold = parseCssLength(fillClampThreshold, el);
          const offset = parseCssLength(fillClampOffset, el);
          const clampAdjustment = userMessage <= threshold ? userMessage : offset;

          const minHeight = Math.max(0, viewport - inset - clampAdjustment);
          const nextMinHeight = `${minHeight}px`;
          if (el.style.minHeight !== nextMinHeight) {
            el.style.minHeight = nextMinHeight;
          }
          if (el.style.flexShrink !== '0') {
            el.style.flexShrink = '0';
          }
          if (el.style.transition !== 'min-height 0s') {
            el.style.transition = 'min-height 0s';
          }
        } else {
          if (el.style.minHeight !== '') el.style.minHeight = '';
          if (el.style.flexShrink !== '') el.style.flexShrink = '';
          if (el.style.transition !== '') el.style.transition = '';
        }
      };

      updateMinHeight();
      return store.subscribe(updateMinHeight);
    },
    [store, isNested, shouldApplySlack, fillClampThreshold, fillClampOffset]
  );

  const ref = useManagedRef(callback);

  return (
    <SlackNestingContext.Provider value={true}>
      <Slot ref={ref}>{children}</Slot>
    </SlackNestingContext.Provider>
  );
};

ConversationViewportSlack.displayName = 'ConversationViewportSlack';
