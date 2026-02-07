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
 * [UPDATE]: 2026-02-06 - TurnAnchor=top：基于 tail 可见性触发跟随 + 上滑 10px 取消/滚到底部恢复
 * [UPDATE]: 2026-02-06 - TurnAnchor=top：tail 可见性优先以 footerRect.top 判定，避免边界误触发跟随/抖动
 * [UPDATE]: 2026-02-06 - TurnAnchor=top：忽略 layout shrink 触发的 scrollTop 回退，避免误判为用户上滚
 * [UPDATE]: 2026-02-06 - thread.initialize/threadSwitch：避免覆盖 runStart smooth 行为
 * [UPDATE]: 2026-02-06 - TurnAnchor=top：runStart 到底后立刻释放 scrollBehavior，避免 assistant 内容过早被 resize.behavior 追底
 * [UPDATE]: 2026-02-07 - AutoScroll：调试日志默认开启（用于抖动/提前滚动排查）
 * [UPDATE]: 2026-02-07 - TurnAnchor=top：runStart 对齐等待 userMessage/resize 稳定后再执行，避免用旧高度对齐导致回弹
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import { useComposedRefs } from '@radix-ui/react-compose-refs';
import { useCallback, useRef, type RefCallback } from 'react';

import { useAuiEvent } from '../../utils/hooks/useAuiEvent';
import { useManagedRef } from '../../utils/hooks/useManagedRef';
import { useOnResizeContent } from '../../utils/hooks/useOnResizeContent';
import { useOnScrollToBottom } from '../../utils/hooks/useOnScrollToBottom';
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

const CONVERSATION_TAIL_SELECTOR = '[data-slot="conversation-tail"]';
const CONVERSATION_FOOTER_SELECTOR = '[data-slot="conversation-viewport-footer"]';
const FOLLOW_CANCEL_THRESHOLD_PX = 10;
const TAIL_VISIBILITY_EPSILON_PX = 0.5;
const RUN_START_SCROLL_LOCK_TICKS = 1;
const RUN_START_ALIGN_MAX_ATTEMPTS = 3;
type AutoScrollBehavior = ScrollBehavior | 'instant';

export const useThreadViewportAutoScroll = <TElement extends HTMLElement>({
  autoScroll,
  scrollToBottomOnRunStart = true,
  scrollToBottomOnInitialize = true,
  scrollToBottomOnThreadSwitch = true,
}: UseThreadViewportAutoScrollOptions): RefCallback<TElement> => {
  const divRef = useRef<TElement>(null);
  const debugSeqRef = useRef(0);

  const debugLog = useCallback((event: string, data?: Record<string, unknown>) => {
    const seq = debugSeqRef.current;
    debugSeqRef.current += 1;

    const t = typeof performance === 'undefined' ? Date.now() : Math.round(performance.now());

    if (data) {
      console.log(`[aui:auto-scroll ${seq} t=${t}] ${event}`, data);
    } else {
      console.log(`[aui:auto-scroll ${seq} t=${t}] ${event}`);
    }
  }, []);

  const threadViewportStore = useThreadViewportStore();
  if (autoScroll === undefined) {
    autoScroll = threadViewportStore.getState().turnAnchor !== 'top';
  }

  const lastScrollTop = useRef<number>(0);
  const lastScrollHeight = useRef<number>(0);
  const lastClientHeight = useRef<number>(0);
  const runStartScrollLockRef = useRef<number>(0);
  const pendingRunStartAlignRef = useRef<boolean>(false);
  const runStartAlignScheduledRef = useRef<boolean>(false);
  const runStartAlignBaselineUserMessageHeightRef = useRef<number>(0);
  const runStartAlignAttemptsRef = useRef<number>(0);
  const runStartAlignResizeSeenRef = useRef<boolean>(false);

  // TurnAnchor=top：仅在 runStart 后允许“本轮跟随”，用户上滑超过阈值取消，可通过滚到底部/ScrollButton 恢复。
  const followEnabledRef = useRef(false);
  const followCanceledRef = useRef(false);
  const maxScrollTopRef = useRef(0);

  // bug: when ScrollToBottom's button changes its disabled state, the scroll stops
  // fix: delay the state change until the scroll is done
  // stores the scroll behavior to reuse during content resize, or null if not scrolling
  const scrollingToBottomBehaviorRef = useRef<AutoScrollBehavior | null>(null);

  const performScrollToBottom = useCallback((div: HTMLElement, behavior: AutoScrollBehavior) => {
    if (behavior === 'instant') {
      const prev = div.style.scrollBehavior;
      div.style.scrollBehavior = 'auto';
      div.scrollTo({ top: div.scrollHeight, behavior: 'auto' });
      div.style.scrollBehavior = prev;
      return;
    }
    div.scrollTo({ top: div.scrollHeight, behavior });
  }, []);

  const scrollToBottom = useCallback(
    (behavior: AutoScrollBehavior, reason: string) => {
      const div = divRef.current;
      if (!div) return;

      scrollingToBottomBehaviorRef.current = behavior;
      performScrollToBottom(div, behavior);

      debugLog('scrollToBottom', {
        reason,
        behavior,
        turnAnchor: threadViewportStore.getState().turnAnchor,
        isAtBottom: threadViewportStore.getState().isAtBottom,
        distanceFromBottom: threadViewportStore.getState().distanceFromBottom,
      });
    },
    [debugLog, performScrollToBottom, threadViewportStore]
  );

  const scheduleRunStartAlign = useCallback(
    (reason: string) => {
      if (runStartAlignScheduledRef.current) return;

      const state = threadViewportStore.getState();
      const shouldDefer = state.height.viewport <= 0 || state.height.userMessage <= 0;
      const div = divRef.current;

      if (shouldDefer || !div) return;

      runStartAlignScheduledRef.current = true;
      requestAnimationFrame(() => {
        runStartAlignScheduledRef.current = false;

        // 若 runStart 期间用户已上滑取消/中断，不再强制贴顶。
        if (!pendingRunStartAlignRef.current) return;

        const nextState = threadViewportStore.getState();
        const nextShouldDefer = nextState.height.viewport <= 0 || nextState.height.userMessage <= 0;
        const nextDiv = divRef.current;

        if (nextShouldDefer || !nextDiv) return;

        const baseline = runStartAlignBaselineUserMessageHeightRef.current;
        const userMessageHeightChanged = nextState.height.userMessage !== baseline;
        const hasResizeAfterRunStart = runStartAlignResizeSeenRef.current;
        const attempts = runStartAlignAttemptsRef.current;

        // 关键：runStart 可能早于“新 user message”插入/测量完成。
        // 若此时直接对齐，会用旧的 userMessage 高度计算 slack，随后高度刷新导致 scrollTop clamp/回弹。
        //
        // 触发对齐的条件：
        // - 观察到 runStart 之后的 resize/mutation（意味着 DOM 已更新），或
        // - userMessage 高度发生变化（意味着锚点已切换/重新测量），或
        // - 超过最大尝试次数（兜底：例如 regenerate 不插入新 user message）。
        const shouldAlignNow =
          hasResizeAfterRunStart ||
          userMessageHeightChanged ||
          attempts >= RUN_START_ALIGN_MAX_ATTEMPTS;

        if (!shouldAlignNow) {
          runStartAlignAttemptsRef.current += 1;
          scheduleRunStartAlign(reason);
          return;
        }

        pendingRunStartAlignRef.current = false;
        runStartAlignResizeSeenRef.current = false;
        runStartAlignAttemptsRef.current = 0;

        runStartScrollLockRef.current = RUN_START_SCROLL_LOCK_TICKS;
        scrollingToBottomBehaviorRef.current = 'auto';

        scrollToBottom('auto', reason);
      });
    },
    [scrollToBottom, threadViewportStore]
  );

  const handleScroll = () => {
    const div = divRef.current;
    if (!div) return;

    const prevScrollTop = lastScrollTop.current;
    const prevScrollHeight = lastScrollHeight.current;
    const prevClientHeight = lastClientHeight.current;

    const state = threadViewportStore.getState();
    const isAtBottom = state.isAtBottom;
    const shouldTrackFollow = state.turnAnchor === 'top' && followEnabledRef.current;
    const newIsAtBottom =
      Math.abs(div.scrollHeight - div.scrollTop - div.clientHeight) < 1 ||
      div.scrollHeight <= div.clientHeight;

    const scrollDelta = div.scrollTop - prevScrollTop;
    const scrollHeightDelta = div.scrollHeight - prevScrollHeight;
    const clientHeightDelta = div.clientHeight - prevClientHeight;

    const layoutPinnedDelta = scrollHeightDelta - clientHeightDelta;
    const isLayoutDrivenScrollUp =
      scrollDelta < 0 &&
      newIsAtBottom &&
      (scrollHeightDelta < 0 || clientHeightDelta > 0) &&
      Math.abs(scrollDelta - layoutPinnedDelta) <= 2;

    const isUserScrollUp = scrollDelta < 0 && !isLayoutDrivenScrollUp;

    if (
      shouldTrackFollow &&
      !followCanceledRef.current &&
      div.scrollTop > maxScrollTopRef.current
    ) {
      maxScrollTopRef.current = div.scrollTop;
    }

    if (
      shouldTrackFollow &&
      !followCanceledRef.current &&
      isUserScrollUp &&
      maxScrollTopRef.current - div.scrollTop > FOLLOW_CANCEL_THRESHOLD_PX
    ) {
      followCanceledRef.current = true;

      debugLog('follow.cancel', {
        thresholdPx: FOLLOW_CANCEL_THRESHOLD_PX,
        deltaPx: maxScrollTopRef.current - div.scrollTop,
        maxScrollTop: maxScrollTopRef.current,
        scrollTop: div.scrollTop,
        scrollingToBottomBehavior: scrollingToBottomBehaviorRef.current,
        runStartScrollLock: runStartScrollLockRef.current,
      });
    }

    if (shouldTrackFollow && newIsAtBottom && followCanceledRef.current) {
      followCanceledRef.current = false;
      maxScrollTopRef.current = div.scrollTop;

      debugLog('follow.resume', {
        scrollTop: div.scrollTop,
        scrollingToBottomBehavior: scrollingToBottomBehaviorRef.current,
        runStartScrollLock: runStartScrollLockRef.current,
      });
    }

    const wasAutoScrolling = scrollingToBottomBehaviorRef.current !== null;
    if (isUserScrollUp && !newIsAtBottom) {
      if (shouldTrackFollow && wasAutoScrolling) {
        followCanceledRef.current = true;

        debugLog('follow.cancel.onAutoScrollAbort', {
          scrollTop: div.scrollTop,
          scrollingToBottomBehavior: scrollingToBottomBehaviorRef.current,
        });
      }

      scrollingToBottomBehaviorRef.current = null;
      runStartScrollLockRef.current = 0;
      pendingRunStartAlignRef.current = false;
      runStartAlignScheduledRef.current = false;

      debugLog('autoScroll.abort.onUserScrollUp', {
        scrollTop: div.scrollTop,
        lastScrollTop: lastScrollTop.current,
        clientHeight: div.clientHeight,
        scrollHeight: div.scrollHeight,
        scrollingToBottomBehavior: scrollingToBottomBehaviorRef.current,
        runStartScrollLock: runStartScrollLockRef.current,
      });
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
          const before = runStartScrollLockRef.current;
          runStartScrollLockRef.current -= 1;
          if (runStartScrollLockRef.current === 0 && state.turnAnchor === 'top') {
            scrollingToBottomBehaviorRef.current = null;

            debugLog('runStart.lock.release', {
              before,
              after: runStartScrollLockRef.current,
              scrollTop: div.scrollTop,
              scrollingToBottomBehavior: scrollingToBottomBehaviorRef.current,
            });
          }
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

    debugLog('scroll', {
      turnAnchor: state.turnAnchor,
      delta: scrollDelta,
      scrollTop: div.scrollTop,
      lastScrollTop: prevScrollTop,
      scrollHeight: div.scrollHeight,
      lastScrollHeight: prevScrollHeight,
      scrollHeightDelta,
      clientHeight: div.clientHeight,
      lastClientHeight: prevClientHeight,
      clientHeightDelta,
      isAtBottom: state.isAtBottom,
      newIsAtBottom,
      distanceFromBottom,
      runStartScrollLock: runStartScrollLockRef.current,
      scrollingToBottomBehavior: scrollingToBottomBehaviorRef.current,
      followEnabled: followEnabledRef.current,
      followCanceled: followCanceledRef.current,
      isLayoutDrivenScrollUp,
      isUserScrollUp,
    });

    lastScrollTop.current = div.scrollTop;
    lastScrollHeight.current = div.scrollHeight;
    lastClientHeight.current = div.clientHeight;
  };

  const resizeRef = useOnResizeContent(() => {
    const state = threadViewportStore.getState();

    // TurnAnchor=top：runStart 统一延后一帧对齐，等待最新 userMessage/slack 测量就绪。
    if (state.turnAnchor === 'top' && pendingRunStartAlignRef.current) {
      runStartAlignResizeSeenRef.current = true;
      scheduleRunStartAlign('event.runStart.deferAlign');
    }

    const scrollBehavior = scrollingToBottomBehaviorRef.current;
    if (scrollBehavior) {
      scrollToBottom(scrollBehavior, 'resize.behavior');
    } else {
      if (state.turnAnchor === 'top') {
        const shouldFollow =
          followEnabledRef.current &&
          !followCanceledRef.current &&
          !pendingRunStartAlignRef.current;
        const shouldDefer = state.height.viewport <= 0 || state.height.userMessage <= 0;

        if (shouldFollow && !shouldDefer) {
          const div = divRef.current;
          const tailEl = div?.querySelector<HTMLElement>(CONVERSATION_TAIL_SELECTOR);

          if (div && tailEl) {
            const footerEl = div
              .closest<HTMLElement>('[data-slot="conversation-viewport"]')
              ?.querySelector<HTMLElement>(CONVERSATION_FOOTER_SELECTOR);
            const viewportRect = div.getBoundingClientRect();
            const tailRect = tailEl.getBoundingClientRect();
            const footerRect = footerEl?.getBoundingClientRect();
            const visibleBottomFromInset = viewportRect.bottom - state.height.inset;
            const visibleBottom = footerRect?.top ?? visibleBottomFromInset;
            const tailIsVisible = tailRect.top <= visibleBottom + TAIL_VISIBILITY_EPSILON_PX;

            debugLog('follow.check', {
              tailIsVisible,
              insetBottomPx: state.height.inset,
              visibleBottom,
              visibleBottomFromInset,
              viewportBottom: viewportRect.bottom,
              footerTop: footerRect?.top,
              tailTop: tailRect.top,
              tailBottom: tailRect.bottom,
            });

            if (!tailIsVisible) {
              scrollToBottom('instant', 'resize.follow');
            }
          }
        }
      } else if (autoScroll && state.isAtBottom) {
        scrollToBottom('instant', 'resize.bottom');
      }
    }

    handleScroll();

    const div = divRef.current;
    if (div) {
      debugLog('autoScroll.done', {
        scrollTop: div.scrollTop,
        behavior: scrollingToBottomBehaviorRef.current,
      });
    }
  });

  const scrollRef = useManagedRef<HTMLElement>((el) => {
    el.addEventListener('scroll', handleScroll);
    return () => {
      el.removeEventListener('scroll', handleScroll);
    };
  });

  useOnScrollToBottom(({ behavior }) => {
    if (followEnabledRef.current && followCanceledRef.current) {
      followCanceledRef.current = false;
      const div = divRef.current;
      if (div) {
        maxScrollTopRef.current = div.scrollTop;
      }
    }
    scrollToBottom(behavior, 'event.scrollToBottom');
  });

  // autoscroll on run start
  useAuiEvent('thread.runStart', () => {
    const state = threadViewportStore.getState();

    debugLog('event.thread.runStart', {
      turnAnchor: state.turnAnchor,
      heightInset: state.height.inset,
      heightViewport: state.height.viewport,
      heightUserMessage: state.height.userMessage,
      followEnabled: followEnabledRef.current,
      followCanceled: followCanceledRef.current,
    });

    if (state.turnAnchor === 'top') {
      followEnabledRef.current = true;
      followCanceledRef.current = false;

      const div = divRef.current;
      if (div) {
        maxScrollTopRef.current = div.scrollTop;
      }
    } else {
      followEnabledRef.current = false;
      followCanceledRef.current = false;
    }

    if (!scrollToBottomOnRunStart) return;

    const shouldDefer = state.height.viewport <= 0 || state.height.userMessage <= 0;

    debugLog('event.thread.runStart.schedule', {
      shouldDefer,
      runStartScrollLock: runStartScrollLockRef.current,
      scrollingToBottomBehavior: scrollingToBottomBehaviorRef.current,
    });

    if (state.turnAnchor === 'top') {
      // TurnAnchor=top：runStart 只做 pending。
      // 对齐由 ResizeObserver 回调触发（scheduleRunStartAlign -> scrollToBottom('auto')），
      // 避免在同一帧先滚动再被 slack/style 变更触发的 scrollTop clamp 回弹。
      pendingRunStartAlignRef.current = true;
      runStartAlignBaselineUserMessageHeightRef.current = state.height.userMessage;
      runStartAlignAttemptsRef.current = 0;
      runStartAlignResizeSeenRef.current = false;
      scheduleRunStartAlign('event.runStart.pending');
      return;
    }

    if (shouldDefer) return;

    runStartScrollLockRef.current = 1;
    scrollingToBottomBehaviorRef.current = 'auto';

    requestAnimationFrame(() => {
      debugLog('event.thread.runStart.raf', {
        runStartScrollLock: runStartScrollLockRef.current,
        scrollingToBottomBehavior: scrollingToBottomBehaviorRef.current,
        followEnabled: followEnabledRef.current,
        followCanceled: followCanceledRef.current,
      });

      scrollToBottom('auto', 'event.runStart.raf');
    });
  });

  // scroll to bottom instantly when thread history is first loaded
  useAuiEvent('thread.initialize', () => {
    followEnabledRef.current = false;
    followCanceledRef.current = false;

    if (!scrollToBottomOnInitialize) return;

    if (scrollingToBottomBehaviorRef.current !== null) return;
    scrollToBottom('instant', 'event.initialize');
  });

  // scroll to bottom instantly when switching threads
  useAuiEvent('threadListItem.switchedTo', () => {
    followEnabledRef.current = false;
    followCanceledRef.current = false;

    if (!scrollToBottomOnThreadSwitch) return;

    if (scrollingToBottomBehaviorRef.current !== null) return;
    scrollToBottom('instant', 'event.threadSwitch');
  });

  const autoScrollRef = useComposedRefs<TElement>(resizeRef, scrollRef, divRef);
  return autoScrollRef as RefCallback<TElement>;
};
