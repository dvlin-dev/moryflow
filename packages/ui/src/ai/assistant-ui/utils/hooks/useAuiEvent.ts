/**
 * [PROVIDES]: useAuiEvent/emitAuiEvent - assistant-ui 事件桥接
 * [DEPENDS]: Radix useCallbackRef + React
 * [POS]: 本地事件总线，兼容 @assistant-ui/store 的 useAuiEvent
 * [UPDATE]: 2026-02-05 - 移除 TurnAnchor 调试日志，避免噪音
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import { useCallbackRef } from '@radix-ui/react-use-callback-ref';
import { useLayoutEffect } from 'react';

export type AuiEventName = 'thread.runStart' | 'thread.initialize' | 'threadListItem.switchedTo';

type Listener = () => void;

const listeners = new Map<AuiEventName, Set<Listener>>();

const getListeners = (name: AuiEventName) => {
  const existing = listeners.get(name);
  if (existing) return existing;
  const next = new Set<Listener>();
  listeners.set(name, next);
  return next;
};

export const emitAuiEvent = (name: AuiEventName) => {
  const bucket = listeners.get(name);
  if (!bucket) return;
  for (const listener of bucket) {
    listener();
  }
};

export const useAuiEvent = (name: AuiEventName, callback: () => void) => {
  const callbackRef = useCallbackRef(callback);

  useLayoutEffect(() => {
    const bucket = getListeners(name);
    const handler = () => callbackRef();
    bucket.add(handler);
    return () => {
      bucket.delete(handler);
    };
  }, [name, callbackRef]);
};
