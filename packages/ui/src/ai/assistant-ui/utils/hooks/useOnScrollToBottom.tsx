/**
 * [PROVIDES]: useOnScrollToBottom - assistant-ui ScrollToBottom 监听
 * [DEPENDS]: ThreadViewportContext
 * [POS]: mirror @assistant-ui/react useOnScrollToBottom（v0.12.6）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

"use client";

import { useCallbackRef } from "@radix-ui/react-use-callback-ref";
import { useEffect } from "react";
import { useThreadViewport } from "../../context/react/ThreadViewportContext";

export const useOnScrollToBottom = (
  callback: (config: { behavior: ScrollBehavior }) => void,
) => {
  const callbackRef = useCallbackRef(callback);
  const onScrollToBottom = useThreadViewport((vp) => vp.onScrollToBottom);

  useEffect(() => {
    return onScrollToBottom(callbackRef);
  }, [onScrollToBottom, callbackRef]);
};
