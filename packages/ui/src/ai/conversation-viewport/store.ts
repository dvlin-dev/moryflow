/**
 * [PROVIDES]: ConversationViewportStore - 会话视口状态（isAtBottom/distanceFromBottom + intent 驱动控制）
 * [DEPENDS]: zustand
 * [POS]: ConversationViewport 的最小状态：用于 scroll button 判定 + navigate-to-latest / preserve-anchor 触发
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

'use client';

import { create } from 'zustand';

export type ConversationViewportState = {
  readonly isAtBottom: boolean;
  /** Distance to the bottom of the scroll container (px, rounded). */
  readonly distanceFromBottom: number;

  readonly navigateToLatest: (config?: { behavior?: ScrollBehavior | undefined }) => void;
  readonly onNavigateToLatest: (
    callback: ({ behavior }: { behavior: ScrollBehavior }) => void
  ) => () => void;
  readonly preserveAnchor: (anchorId: string) => void;
  readonly onPreserveAnchor: (callback: ({ anchorId }: { anchorId: string }) => void) => () => void;
};

export const makeConversationViewportStore = () => {
  const navigateToLatestListeners = new Set<(config: { behavior: ScrollBehavior }) => void>();
  const preserveAnchorListeners = new Set<(config: { anchorId: string }) => void>();
  let pendingNavigateToLatest: { behavior: ScrollBehavior } | null = null;

  const store = create<ConversationViewportState>(() => ({
    isAtBottom: true,
    distanceFromBottom: 0,
    navigateToLatest: ({ behavior = 'auto' } = {}) => {
      if (navigateToLatestListeners.size === 0) {
        pendingNavigateToLatest = { behavior };
        return;
      }
      for (const listener of navigateToLatestListeners) {
        listener({ behavior });
      }
    },
    onNavigateToLatest: (callback) => {
      navigateToLatestListeners.add(callback);
      if (pendingNavigateToLatest) {
        const pending = pendingNavigateToLatest;
        pendingNavigateToLatest = null;
        callback(pending);
      }
      return () => {
        navigateToLatestListeners.delete(callback);
      };
    },
    preserveAnchor: (anchorId) => {
      if (!anchorId.trim()) {
        return;
      }
      for (const listener of preserveAnchorListeners) {
        listener({ anchorId });
      }
    },
    onPreserveAnchor: (callback) => {
      preserveAnchorListeners.add(callback);
      return () => {
        preserveAnchorListeners.delete(callback);
      };
    },
  }));

  return store;
};
