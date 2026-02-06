/**
 * [PROVIDES]: useThreadViewportAutoScroll - assistant-ui 自动滚动
 * [DEPENDS]: ResizeObserver/MutationObserver + ThreadViewport Store
 * [POS]: mirror @assistant-ui/react auto-scroll（v0.12.6）
 * [UPDATE]: 2026-02-05 - runStart 滚动锁，等待首个 ResizeObserver 更新再释放
 * [UPDATE]: 2026-02-05 - runStart 测量未就绪时延后滚动，避免短列表抖动
 * [UPDATE]: 2026-02-05 - 用户上滚立即取消 runStart 自动滚动，避免手动滚动抖动
 * [UPDATE]: 2026-02-05 - 同步 distanceFromBottom，供滚动按钮阈值判定
 * [UPDATE]: 2026-02-05 - 移除 TurnAnchor 滚动日志，避免噪音
 * [UPDATE]: 2026-02-06 - 移除 namespace，符合 lint 规则
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import { useComposedRefs } from '@radix-ui/react-compose-refs';
import { useCallback, useRef, type RefCallback } from 'react';
import { useAuiEvent } from '../../utils/hooks/useAuiEvent';
import { useOnResizeContent } from '../../utils/hooks/useOnResizeContent';
import { useOnScrollToBottom } from '../../utils/hooks/useOnScrollToBottom';
import { useManagedRef } from '../../utils/hooks/useManagedRef';
import { writableStore } from '../../context/ReadonlyStore';
import { useThreadViewportStore } from '../../context/react/ThreadViewportContext';

export type UseThreadViewportAutoScrollOptions = {
  /**
   * Whether to automatically scroll to the bottom when new messages are added.
   * When enabled, the viewport will automatically scroll to show the latest content.
   *
   * Default false if `turnAnchor` is "top", otherwise defaults to true.
   */
  autoScroll?: boolean | undefined;

  /**
   * Whether to scroll to bottom when a new run starts.
   *
   * Defaults to true.
   */
  scrollToBottomOnRunStart?: boolean | undefined;

  /**
   * Whether to scroll to bottom when thread history is first loaded.
   *
   * Defaults to true.
   */
  scrollToBottomOnInitialize?: boolean | undefined;

  /**
   * Whether to scroll to bottom when switching to a different thread.
   *
   * Defaults to true.
   */
  scrollToBottomOnThreadSwitch?: boolean | undefined;
};

export const useThreadViewportAutoScroll = <TElement extends HTMLElement>({
  autoScroll,
  scrollToBottomOnRunStart = true,
  scrollToBottomOnInitialize = true,
  scrollToBottomOnThreadSwitch = true,
}: UseThreadViewportAutoScrollOptions): RefCallback<TElement> => {
  const divRef = useRef<TElement>(null);

  const threadViewportStore = useThreadViewportStore();
  if (autoScroll === undefined) {
    autoScroll = threadViewportStore.getState().turnAnchor !== 'top';
  }

  const lastScrollTop = useRef<number>(0);
  const runStartScrollLockRef = useRef<number>(0);

  // bug: when ScrollToBottom's button changes its disabled state, the scroll stops
  // fix: delay the state change until the scroll is done
  // stores the scroll behavior to reuse during content resize, or null if not scrolling
  const scrollingToBottomBehaviorRef = useRef<ScrollBehavior | null>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior) => {
    const div = divRef.current;
    if (!div) return;

    scrollingToBottomBehaviorRef.current = behavior;
    div.scrollTo({ top: div.scrollHeight, behavior });
  }, []);

  const handleScroll = () => {
    const div = divRef.current;
    if (!div) return;

    const isAtBottom = threadViewportStore.getState().isAtBottom;
    const newIsAtBottom =
      Math.abs(div.scrollHeight - div.scrollTop - div.clientHeight) < 1 ||
      div.scrollHeight <= div.clientHeight;
    const isUserScrollUp = div.scrollTop < lastScrollTop.current;

    if (isUserScrollUp && !newIsAtBottom) {
      scrollingToBottomBehaviorRef.current = null;
      runStartScrollLockRef.current = 0;
    }

    const distanceFromBottom = Math.max(
      0,
      Math.round(div.scrollHeight - div.scrollTop - div.clientHeight)
    );

    if (!newIsAtBottom && lastScrollTop.current < div.scrollTop) {
      // ignore scroll down
    } else {
      if (newIsAtBottom) {
        if (runStartScrollLockRef.current > 0) {
          runStartScrollLockRef.current -= 1;
        } else {
          scrollingToBottomBehaviorRef.current = null;
        }
      }

      const shouldUpdate = newIsAtBottom || scrollingToBottomBehaviorRef.current === null;

      const nextState: { isAtBottom?: boolean } = {};
      if (shouldUpdate && newIsAtBottom !== isAtBottom) {
        nextState.isAtBottom = newIsAtBottom;
      }
      if (Object.keys(nextState).length > 0) {
        writableStore(threadViewportStore).setState(nextState);
      }
    }

    if (threadViewportStore.getState().distanceFromBottom !== distanceFromBottom) {
      writableStore(threadViewportStore).setState({
        distanceFromBottom,
      });
    }

    lastScrollTop.current = div.scrollTop;
  };

  const resizeRef = useOnResizeContent(() => {
    const scrollBehavior = scrollingToBottomBehaviorRef.current;
    if (scrollBehavior) {
      scrollToBottom(scrollBehavior);
    } else if (autoScroll && threadViewportStore.getState().isAtBottom) {
      scrollToBottom('instant');
    }

    handleScroll();
  });

  const scrollRef = useManagedRef<HTMLElement>((el) => {
    el.addEventListener('scroll', handleScroll);
    return () => {
      el.removeEventListener('scroll', handleScroll);
    };
  });

  useOnScrollToBottom(({ behavior }) => {
    scrollToBottom(behavior);
  });

  // autoscroll on run start
  useAuiEvent('thread.runStart', () => {
    if (!scrollToBottomOnRunStart) return;
    runStartScrollLockRef.current = 1;
    scrollingToBottomBehaviorRef.current = 'auto';
    const state = threadViewportStore.getState();
    const shouldDefer =
      state.turnAnchor === 'top' && (state.height.viewport <= 0 || state.height.userMessage <= 0);
    if (shouldDefer) return;
    requestAnimationFrame(() => {
      scrollToBottom('auto');
    });
  });

  // scroll to bottom instantly when thread history is first loaded
  useAuiEvent('thread.initialize', () => {
    if (!scrollToBottomOnInitialize) return;
    scrollingToBottomBehaviorRef.current = 'instant';
    requestAnimationFrame(() => {
      scrollToBottom('instant');
    });
  });

  // scroll to bottom instantly when switching threads
  useAuiEvent('threadListItem.switchedTo', () => {
    if (!scrollToBottomOnThreadSwitch) return;
    scrollingToBottomBehaviorRef.current = 'instant';
    requestAnimationFrame(() => {
      scrollToBottom('instant');
    });
  });

  const autoScrollRef = useComposedRefs<TElement>(resizeRef, scrollRef, divRef);
  return autoScrollRef as RefCallback<TElement>;
};
