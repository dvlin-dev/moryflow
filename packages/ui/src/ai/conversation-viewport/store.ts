/**
 * [PROVIDES]: ConversationViewport Store - 滚动状态与高度测量
 * [DEPENDS]: zustand/vanilla
 * [POS]: Conversation Viewport 交互与布局的核心状态
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import { createStore } from 'zustand/vanilla';

export type SizeHandle = {
  setHeight: (height: number) => void;
  unregister: () => void;
};

type SizeRegistry = {
  register: () => SizeHandle;
};

const createSizeRegistry = (onChange: (total: number) => void): SizeRegistry => {
  const entries = new Map<symbol, number>();

  const recalculate = () => {
    let total = 0;
    for (const height of entries.values()) {
      total += height;
    }
    onChange(total);
  };

  return {
    register: () => {
      const id = Symbol();
      entries.set(id, 0);

      return {
        setHeight: (height: number) => {
          if (entries.get(id) !== height) {
            entries.set(id, height);
            recalculate();
          }
        },
        unregister: () => {
          entries.delete(id);
          recalculate();
        },
      };
    },
  };
};

export type ConversationViewportState = {
  isAtBottom: boolean;
  height: {
    viewport: number;
    inset: number;
    userMessage: number;
  };
  scrollToBottom: (config?: { behavior?: ScrollBehavior }) => void;
  onScrollToBottom: (callback: ({ behavior }: { behavior: ScrollBehavior }) => void) => () => void;
  registerViewport: () => SizeHandle;
  registerContentInset: () => SizeHandle;
  registerUserMessageHeight: () => SizeHandle;
};

export const createConversationViewportStore = () => {
  const scrollListeners = new Set<(config: { behavior: ScrollBehavior }) => void>();

  const store = createStore<ConversationViewportState>(() => ({
    isAtBottom: true,
    height: {
      viewport: 0,
      inset: 0,
      userMessage: 0,
    },
    scrollToBottom: ({ behavior = 'auto' } = {}) => {
      for (const listener of scrollListeners) {
        listener({ behavior });
      }
    },
    onScrollToBottom: (callback) => {
      scrollListeners.add(callback);
      return () => {
        scrollListeners.delete(callback);
      };
    },
    registerViewport: () => ({
      setHeight: () => {},
      unregister: () => {},
    }),
    registerContentInset: () => ({
      setHeight: () => {},
      unregister: () => {},
    }),
    registerUserMessageHeight: () => ({
      setHeight: () => {},
      unregister: () => {},
    }),
  }));

  const viewportRegistry = createSizeRegistry((total) => {
    store.setState((state) => ({
      height: {
        ...state.height,
        viewport: total,
      },
    }));
  });

  const insetRegistry = createSizeRegistry((total) => {
    store.setState((state) => ({
      height: {
        ...state.height,
        inset: total,
      },
    }));
  });

  const userMessageRegistry = createSizeRegistry((total) => {
    store.setState((state) => ({
      height: {
        ...state.height,
        userMessage: total,
      },
    }));
  });

  store.setState({
    registerViewport: viewportRegistry.register,
    registerContentInset: insetRegistry.register,
    registerUserMessageHeight: userMessageRegistry.register,
  });

  return store;
};
