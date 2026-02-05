/**
 * [PROVIDES]: ThreadViewportContext hooks - assistant-ui 视口上下文
 * [DEPENDS]: zustand + React context
 * [POS]: mirror @assistant-ui/react ThreadViewportContext（v0.12.6）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

"use client";

import { createContext } from "react";
import { ReadonlyStore } from "../ReadonlyStore";
import { UseBoundStore } from "zustand";
import { createContextHook } from "./utils/createContextHook";
import { createContextStoreHook } from "./utils/createContextStoreHook";
import { ThreadViewportState } from "../stores";

export type ThreadViewportContextValue = {
  useThreadViewport: UseBoundStore<ReadonlyStore<ThreadViewportState>>;
};

export const ThreadViewportContext =
  createContext<ThreadViewportContextValue | null>(null);

const useThreadViewportContext = createContextHook(
  ThreadViewportContext,
  "ThreadPrimitive.Viewport",
);

export const { useThreadViewport, useThreadViewportStore } =
  createContextStoreHook(useThreadViewportContext, "useThreadViewport");
