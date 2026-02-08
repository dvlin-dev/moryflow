/**
 * [PROVIDES]: useConversationViewportAutoScroll - 经典 chat 自动滚动（bottom-anchor + following）
 * [DEPENDS]: ResizeObserver/MutationObserver + ConversationViewportStore
 * [POS]: ConversationViewport 的自动滚动实现（Following 状态机 + streaming 追随）
 * [UPDATE]: 2026-02-07 - 发送不贴顶：runStart 由业务侧显式触发 `scrollToBottom({behavior:'smooth'})`
 * [UPDATE]: 2026-02-07 - 上滑取消改为纯滚动指标判定（避免 scrollbar drag/事件丢失导致 following 无法关闭）
 * [UPDATE]: 2026-02-07 - 移除 AutoScroll 调试日志，避免无用噪音
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import { useComposedRefs } from '@radix-ui/react-compose-refs';
import { useCallback, useLayoutEffect, useRef, type RefCallback } from 'react';

import { useConversationViewportStore } from './context';

export type ConversationViewportAutoScrollOptions = {
  autoScroll?: boolean | undefined;
};

const AT_BOTTOM_EPSILON_PX = 1;

const computeDistanceFromBottom = (div: HTMLElement) => {
  const distance = div.scrollHeight - div.scrollTop - div.clientHeight;
  if (!Number.isFinite(distance)) return 0;
  return Math.max(0, distance);
};

const computeIsAtBottom = (div: HTMLElement, distanceFromBottom: number) => {
  if (div.scrollHeight <= div.clientHeight) return true;
  return distanceFromBottom <= AT_BOTTOM_EPSILON_PX;
};

const useManagedRef = <TNode>(callback: (node: TNode) => (() => void) | void) => {
  const cleanupRef = useRef<(() => void) | void>(undefined);

  const ref = useCallback(
    (el: TNode | null) => {
      if (cleanupRef.current) cleanupRef.current();
      cleanupRef.current = undefined;

      if (el) cleanupRef.current = callback(el);
    },
    [callback]
  );

  return ref;
};

const useOnResizeContent = (callback: () => void) => {
  const callbackRef = useRef(callback);
  useLayoutEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const refCallback = useCallback((el: HTMLElement) => {
    const resizeObserver = new ResizeObserver(() => {
      callbackRef.current();
    });

    const mutationObserver = new MutationObserver((mutations) => {
      // Filter out style-only attribute mutations to prevent feedback loops
      // with components that write styles in response to viewport changes.
      const hasRelevantMutation = mutations.some(
        (m) => m.type !== 'attributes' || m.attributeName !== 'style'
      );
      if (hasRelevantMutation) {
        callbackRef.current();
      }
    });

    resizeObserver.observe(el);
    mutationObserver.observe(el, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  return useManagedRef(refCallback);
};

export const useConversationViewportAutoScroll = <TElement extends HTMLElement>({
  autoScroll = true,
}: ConversationViewportAutoScrollOptions = {}): RefCallback<TElement> => {
  const divRef = useRef<TElement>(null);
  const viewportStore = useConversationViewportStore();

  // Following mode:
  // - default ON
  // - ANY user scroll up => OFF
  // - user scrolls back to bottom OR programmatic scrollToBottom => ON
  const followingRef = useRef(true);

  // Track last metrics for stable deltas.
  const lastScrollTopRef = useRef(0);
  const lastScrollHeightRef = useRef(0);
  const lastClientHeightRef = useRef(0);

  // Avoid interrupting a smooth "scroll to bottom" with resize-driven follow.
  const scrollingBehaviorRef = useRef<ScrollBehavior | null>(null);

  // Coalesce repeated resize/mutation bursts into at most one scroll per animation frame.
  const resizeRafScheduledRef = useRef(false);

  const syncStoreFromDiv = useCallback(
    (div: HTMLElement) => {
      const distanceFromBottom = Math.round(computeDistanceFromBottom(div));
      const isAtBottom = computeIsAtBottom(div, distanceFromBottom);

      const state = viewportStore.getState();
      const next: { isAtBottom?: boolean; distanceFromBottom?: number } = {};

      if (state.isAtBottom !== isAtBottom) next.isAtBottom = isAtBottom;
      if (state.distanceFromBottom !== distanceFromBottom)
        next.distanceFromBottom = distanceFromBottom;

      if (Object.keys(next).length > 0) {
        viewportStore.setState(next as Partial<typeof state>);
      }

      return { isAtBottom, distanceFromBottom };
    },
    [viewportStore]
  );

  const performScrollToBottom = useCallback((div: HTMLElement, behavior: ScrollBehavior) => {
    // Ensure "instant" behavior even if some global CSS sets scroll-behavior:smooth.
    const prev = div.style.scrollBehavior;
    if (behavior === 'auto') {
      div.style.scrollBehavior = 'auto';
    }

    if (typeof (div as HTMLElement).scrollTo === 'function') {
      (div as HTMLElement).scrollTo({ top: div.scrollHeight, behavior });
    } else {
      // JSDOM fallback
      div.scrollTop = div.scrollHeight;
    }

    if (behavior === 'auto') {
      div.style.scrollBehavior = prev;
    }
  }, []);

  const scheduleFollowScroll = useCallback(() => {
    const div = divRef.current;
    if (!div) return;

    if (resizeRafScheduledRef.current) {
      return;
    }

    resizeRafScheduledRef.current = true;
    requestAnimationFrame(() => {
      resizeRafScheduledRef.current = false;

      const nextDiv = divRef.current;
      if (!nextDiv) return;

      // If we're currently doing a smooth scroll, let it finish; do not interrupt.
      if (scrollingBehaviorRef.current === 'smooth') {
        syncStoreFromDiv(nextDiv);
        return;
      }

      let didProgrammaticScroll = false;
      if (autoScroll !== false && followingRef.current) {
        const distanceFromBottom = computeDistanceFromBottom(nextDiv);
        if (distanceFromBottom > AT_BOTTOM_EPSILON_PX) {
          performScrollToBottom(nextDiv, 'auto');
          didProgrammaticScroll = true;
        }
      }

      syncStoreFromDiv(nextDiv);

      // Keep internal scroll metrics consistent even in environments where programmatic scroll
      // does not synchronously emit a scroll event (e.g. JSDOM tests).
      if (didProgrammaticScroll) {
        lastScrollTopRef.current = nextDiv.scrollTop;
        lastScrollHeightRef.current = nextDiv.scrollHeight;
        lastClientHeightRef.current = nextDiv.clientHeight;
      }
    });
  }, [autoScroll, performScrollToBottom, syncStoreFromDiv]);

  const handleScroll = useCallback(() => {
    const div = divRef.current;
    if (!div) return;

    const prevScrollTop = lastScrollTopRef.current;
    const prevScrollHeight = lastScrollHeightRef.current;
    const prevClientHeight = lastClientHeightRef.current;

    const scrollDelta = div.scrollTop - prevScrollTop;
    const scrollHeightDelta = div.scrollHeight - prevScrollHeight;
    const clientHeightDelta = div.clientHeight - prevClientHeight;

    const distanceFromBottom = computeDistanceFromBottom(div);
    const isAtBottom = computeIsAtBottom(div, distanceFromBottom);

    // Following rules (pure metrics):
    // - any upward scroll that moves away from bottom => pause
    // - reaching bottom again => resume
    // Layout-driven changes can also reduce scrollTop (e.g. content shrink or viewport resize).
    // We must not pause following in those cases.
    const isScrollUpAwayFromBottom =
      scrollDelta < 0 && !isAtBottom && scrollHeightDelta >= 0 && clientHeightDelta === 0;

    if (isScrollUpAwayFromBottom) {
      followingRef.current = false;
    } else if (isAtBottom) {
      followingRef.current = true;
    }

    // If a smooth scroll reaches bottom, we consider it done.
    if (isAtBottom && scrollingBehaviorRef.current === 'smooth') {
      scrollingBehaviorRef.current = null;
    }

    syncStoreFromDiv(div);

    lastScrollTopRef.current = div.scrollTop;
    lastScrollHeightRef.current = div.scrollHeight;
    lastClientHeightRef.current = div.clientHeight;
  }, [syncStoreFromDiv]);

  const resizeRef = useOnResizeContent(() => {
    if (autoScroll !== false && followingRef.current) {
      scheduleFollowScroll();
    } else {
      const div = divRef.current;
      if (div) syncStoreFromDiv(div);
    }
  });

  const scrollRef = useManagedRef<HTMLElement>((el) => {
    const onScroll = () => handleScroll();
    el.addEventListener('scroll', onScroll);

    // Sync once on mount so ScrollButton can render correctly even before the first user scroll.
    handleScroll();

    return () => {
      el.removeEventListener('scroll', onScroll);
    };
  });

  // Bind store-driven scrollToBottom events to the actual DOM element scroll.
  useLayoutEffect(() => {
    return viewportStore.getState().onScrollToBottom(({ behavior }) => {
      const div = divRef.current;
      if (!div) return;

      followingRef.current = true;
      scrollingBehaviorRef.current = behavior;

      performScrollToBottom(div, behavior);

      // Force a sync for environments (tests) where scroll events are not fired.
      handleScroll();
    });
  }, [handleScroll, performScrollToBottom, viewportStore]);

  const bindDivRef = useCallback(
    (el: TElement | null) => {
      divRef.current = el;
      if (!el) return;

      // Init metrics baseline.
      lastScrollTopRef.current = el.scrollTop;
      lastScrollHeightRef.current = el.scrollHeight;
      lastClientHeightRef.current = el.clientHeight;

      // On mount / thread switch: go to bottom instantly (no smooth).
      if (autoScroll !== false) {
        followingRef.current = true;
        if (computeDistanceFromBottom(el) > AT_BOTTOM_EPSILON_PX) {
          performScrollToBottom(el, 'auto');
        }
      }

      handleScroll();
    },
    [autoScroll, handleScroll, performScrollToBottom]
  );

  return useComposedRefs<TElement>(resizeRef, scrollRef, bindDivRef) as RefCallback<TElement>;
};
