/**
 * [PROVIDES]: useAuiEvent/emitAuiEvent - assistant-ui 事件桥接
 * [DEPENDS]: Radix useCallbackRef + React
 * [POS]: 本地事件总线，兼容 @assistant-ui/store 的 useAuiEvent
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

"use client";

import { useCallbackRef } from "@radix-ui/react-use-callback-ref";
import { useLayoutEffect } from "react";

export type AuiEventName =
  | "thread.runStart"
  | "thread.initialize"
  | "threadListItem.switchedTo";

type Listener = () => void;

const listeners = new Map<AuiEventName, Set<Listener>>();

const isDebugEnabled = () => {
  if (typeof window === "undefined") return false;
  if ((window as unknown as { __ANYHUNT_TURN_ANCHOR_DEBUG__?: boolean })
    .__ANYHUNT_TURN_ANCHOR_DEBUG__) {
    return true;
  }
  try {
    return window.localStorage?.getItem("anyhunt:turn-anchor-debug") === "1";
  } catch {
    return false;
  }
};

const debugLog = (label: string, detail?: Record<string, unknown>) => {
  if (!isDebugEnabled()) return;
  if (detail) {
    // eslint-disable-next-line no-console
    console.info(`[turn-anchor] ${label}`, detail);
  } else {
    // eslint-disable-next-line no-console
    console.info(`[turn-anchor] ${label}`);
  }
};

const getListeners = (name: AuiEventName) => {
  const existing = listeners.get(name);
  if (existing) return existing;
  const next = new Set<Listener>();
  listeners.set(name, next);
  return next;
};

export const emitAuiEvent = (name: AuiEventName) => {
  debugLog("aui-event", { name });
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
