/**
 * [PROVIDES]: useSizeHandle - 元素高度测量与注册
 * [DEPENDS]: React, ResizeObserver
 * [POS]: Conversation Viewport 高度测量工具
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import { useCallback, useEffect, useState } from 'react';

import type { SizeHandle } from './store';

type RegisterFn = (() => SizeHandle) | null;

type GetHeight = (el: HTMLElement) => number;

export const useSizeHandle = (register: RegisterFn, getHeight?: GetHeight) => {
  const defaultGetHeight = useCallback((el: HTMLElement) => el.offsetHeight, []);
  const resolvedGetHeight = getHeight ?? defaultGetHeight;
  const [node, setNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!register || !node) {
      return;
    }

    const handle = register();
    const updateHeight = () => {
      handle.setHeight(resolvedGetHeight(node));
    };

    updateHeight();

    if (typeof ResizeObserver === 'undefined') {
      return () => {
        handle.unregister();
      };
    }

    const observer = new ResizeObserver(() => {
      updateHeight();
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
      handle.unregister();
    };
  }, [register, node, resolvedGetHeight]);

  return useCallback((nextNode: HTMLElement | null) => {
    setNode(nextNode);
  }, []);
};
