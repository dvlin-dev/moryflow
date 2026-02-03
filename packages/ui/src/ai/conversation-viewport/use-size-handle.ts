/**
 * [PROVIDES]: useSizeHandle - 元素高度测量与注册
 * [DEPENDS]: React, ResizeObserver
 * [POS]: Conversation Viewport 高度测量工具
 * [UPDATE]: 2026-02-03 - 使用受控 ref 统一测量与清理
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import { useCallback } from 'react';

import type { SizeHandle } from './store';
import { useManagedRef } from './use-managed-ref';

type RegisterFn = (() => SizeHandle) | null | undefined;

type GetHeight = (el: HTMLElement) => number;

export const useSizeHandle = (register: RegisterFn, getHeight?: GetHeight) => {
  const callbackRef = useCallback(
    (el: HTMLElement) => {
      if (!register) return;

      const sizeHandle = register();
      const updateHeight = () => {
        const height = getHeight ? getHeight(el) : el.offsetHeight;
        sizeHandle.setHeight(height);
      };

      const observer = new ResizeObserver(updateHeight);
      observer.observe(el);
      updateHeight();

      return () => {
        observer.disconnect();
        sizeHandle.unregister();
      };
    },
    [register, getHeight]
  );

  return useManagedRef(callbackRef);
};
