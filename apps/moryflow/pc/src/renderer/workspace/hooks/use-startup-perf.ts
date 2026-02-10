/**
 * [PROVIDES]: usePerfMarker/useStartupPerfMarks/useFirstInteraction/useWorkspaceWarmup - 启动性能标记与轻量预热
 * [DEPENDS]: requestIdleCallback, dynamic import
 * [POS]: DesktopWorkspaceShell 启动性能相关 hooks（不触发 IPC/落盘缓存）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ActiveDocument, RequestState } from '../const';

const WARMUP_DISABLE_KEY = 'warmup:disable';

let warmupStarted = false;

const isWarmupDisabled = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    return window.localStorage.getItem(WARMUP_DISABLE_KEY) === '1';
  } catch {
    return false;
  }
};

function hasRequestIdleCallback(): boolean {
  return typeof window.requestIdleCallback === 'function';
}

function scheduleWhenIdle(cb: () => void, options?: { timeoutMs?: number; fallbackMs?: number }) {
  const timeoutMs = options?.timeoutMs;
  const fallbackMs = options?.fallbackMs ?? 1500;

  if (typeof window === 'undefined') {
    return () => {};
  }

  if (hasRequestIdleCallback()) {
    const id = window.requestIdleCallback(cb, timeoutMs ? { timeout: timeoutMs } : undefined);
    return () => window.cancelIdleCallback?.(id);
  }

  const timer = window.setTimeout(cb, fallbackMs);
  return () => window.clearTimeout(timer);
}

const waitForIdle = (options?: { timeoutMs?: number; fallbackMs?: number }) =>
  new Promise<void>((resolve) => {
    scheduleWhenIdle(resolve, options);
  });

export const usePerfMarker = () => {
  const marked = useRef<Set<string>>(new Set());
  return useCallback((name: string) => {
    if (typeof performance === 'undefined') return;
    if (marked.current.has(name)) return;
    performance.mark(name);
    marked.current.add(name);
  }, []);
};

export const useFirstInteraction = ({ markOnce }: { markOnce?: (name: string) => void } = {}) => {
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (hasInteracted) {
      return;
    }

    const handle = () => {
      markOnce?.('startup:first-interaction');
      setHasInteracted(true);
    };

    window.addEventListener('pointerdown', handle, { once: true });
    window.addEventListener('keydown', handle, { once: true });

    return () => {
      window.removeEventListener('pointerdown', handle);
      window.removeEventListener('keydown', handle);
    };
  }, [hasInteracted, markOnce]);

  return hasInteracted;
};

export const useStartupPerfMarks = ({
  treeState,
  treeLength,
  activeDoc,
  docState,
  markOnce,
}: {
  treeState: RequestState;
  treeLength: number;
  activeDoc: ActiveDocument | null;
  docState: RequestState;
  markOnce: (name: string) => void;
}) => {
  useEffect(() => {
    markOnce('startup:skeleton-visible');
  }, [markOnce]);

  useEffect(() => {
    if (treeState === 'idle' && treeLength > 0) {
      markOnce('startup:tree-ready');
      markOnce('watcher:ready');
    }
  }, [treeState, treeLength, markOnce]);

  useEffect(() => {
    if (activeDoc && docState === 'idle') {
      markOnce('editor:ready');
    }
  }, [activeDoc, docState, markOnce]);
};

/**
 * 轻量 warmup：只在 idle 期间预热重模块，不做跨进程缓存，不影响设置弹窗取数。
 * - 仅触发一次（per-run）
 * - 仅在用户首次交互后触发（降低与首屏竞争）
 * - 串行执行，每个任务占用独立 idle slot
 */
export const useWorkspaceWarmup = ({
  enabled,
  hasInteracted,
}: {
  enabled: boolean;
  hasInteracted: boolean;
}) => {
  useEffect(() => {
    if (!enabled) return;
    if (!hasInteracted) return;
    if (warmupStarted) return;
    if (isWarmupDisabled()) return;

    warmupStarted = true;
    let cancelled = false;

    const run = async () => {
      // Task 1: Chat Pane (streamdown/render pipeline is heavy)
      try {
        await waitForIdle({ timeoutMs: 5000, fallbackMs: 2000 });
        if (cancelled) return;
        await import('@/components/chat-pane');
      } catch {
        // warmup should be silent and never block the user
      }

      // Task 2: Shiki code block (syntax highlighting)
      try {
        await waitForIdle({ timeoutMs: 5000, fallbackMs: 2000 });
        if (cancelled) return;
        await import('@anyhunt/ui/ai/code-block');
      } catch {
        // warmup should be silent and never block the user
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [enabled, hasInteracted]);
};
