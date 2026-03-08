/**
 * [PROVIDES]: useConversationViewportAutoScroll - 经典 chat 自动滚动（intent 驱动的 following + anchor preservation）
 * [DEPENDS]: ResizeObserver/MutationObserver + ConversationViewportStore
 * [POS]: ConversationViewport 的自动滚动实现（Following 状态机 + streaming 追随 + inspection 锚点保持）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

'use client';

import { useComposedRefs } from '@radix-ui/react-compose-refs';
import { useCallback, useLayoutEffect, useRef, type RefCallback } from 'react';

import { useConversationViewportStore } from './context';

export type ConversationViewportAutoScrollOptions = {
  autoScroll?: boolean | undefined;
};

type AnchorSnapshot = {
  anchorId: string;
  anchorTop: number;
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

const resolveAnchorElement = (div: HTMLElement, anchorId: string): HTMLElement | null => {
  if (!anchorId.trim()) {
    return null;
  }

  const candidates = div.querySelectorAll<HTMLElement>('[data-ai-anchor]');
  for (const candidate of candidates) {
    if (candidate.getAttribute('data-ai-anchor') === anchorId) {
      return candidate;
    }
  }
  return null;
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
  // - user scrolls back to bottom OR programmatic navigateToLatest => ON
  const followingRef = useRef(true);

  // Track last metrics for stable deltas.
  const lastScrollTopRef = useRef(0);
  const lastScrollHeightRef = useRef(0);
  const lastClientHeightRef = useRef(0);

  // Avoid interrupting a smooth "scroll to bottom" with resize-driven follow.
  const scrollingBehaviorRef = useRef<ScrollBehavior | null>(null);
  const pendingAnchorSnapshotRef = useRef<AnchorSnapshot | null>(null);

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

  const applyPendingAnchorPreservation = useCallback(
    (div: HTMLElement) => {
      const snapshot = pendingAnchorSnapshotRef.current;
      if (!snapshot) {
        return false;
      }

      pendingAnchorSnapshotRef.current = null;
      const anchor = resolveAnchorElement(div, snapshot.anchorId);
      if (!anchor) {
        syncStoreFromDiv(div);
        return true;
      }

      const nextAnchorTop = anchor.getBoundingClientRect().top;
      const delta = nextAnchorTop - snapshot.anchorTop;
      if (Math.abs(delta) > 0) {
        div.scrollTop += delta;
      }

      syncStoreFromDiv(div);
      lastScrollTopRef.current = div.scrollTop;
      lastScrollHeightRef.current = div.scrollHeight;
      lastClientHeightRef.current = div.clientHeight;
      return true;
    },
    [syncStoreFromDiv]
  );

  const scheduleViewportReaction = useCallback(() => {
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

      if (applyPendingAnchorPreservation(nextDiv)) {
        return;
      }

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
  }, [applyPendingAnchorPreservation, autoScroll, performScrollToBottom, syncStoreFromDiv]);

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
    if (pendingAnchorSnapshotRef.current) {
      scheduleViewportReaction();
    } else if (autoScroll !== false && followingRef.current) {
      scheduleViewportReaction();
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

  // Bind store-driven navigateToLatest events to the actual DOM element scroll.
  useLayoutEffect(() => {
    return viewportStore.getState().onNavigateToLatest(({ behavior }) => {
      const div = divRef.current;
      if (!div) return;

      followingRef.current = true;
      pendingAnchorSnapshotRef.current = null;
      scrollingBehaviorRef.current = behavior;

      performScrollToBottom(div, behavior);

      // Force a sync for environments (tests) where scroll events are not fired.
      handleScroll();
    });
  }, [handleScroll, performScrollToBottom, viewportStore]);

  useLayoutEffect(() => {
    return viewportStore.getState().onPreserveAnchor(({ anchorId }) => {
      const div = divRef.current;
      if (!div) {
        return;
      }

      const anchor = resolveAnchorElement(div, anchorId);
      followingRef.current = false;
      scrollingBehaviorRef.current = null;

      if (!anchor) {
        pendingAnchorSnapshotRef.current = null;
        syncStoreFromDiv(div);
        return;
      }

      pendingAnchorSnapshotRef.current = {
        anchorId,
        anchorTop: anchor.getBoundingClientRect().top,
      };
    });
  }, [syncStoreFromDiv, viewportStore]);

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
