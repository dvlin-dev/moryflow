/**
 * [PROVIDES]: useOnResizeContent - assistant-ui Resize/Mutation 监听
 * [DEPENDS]: ResizeObserver/MutationObserver
 * [POS]: mirror @assistant-ui/react useOnResizeContent（v0.12.6）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useCallbackRef } from "@radix-ui/react-use-callback-ref";
import { useCallback } from "react";
import { useManagedRef } from "./useManagedRef";

export const useOnResizeContent = (callback: () => void) => {
  const callbackRef = useCallbackRef(callback);

  const refCallback = useCallback(
    (el: HTMLElement) => {
      const resizeObserver = new ResizeObserver(() => {
        callbackRef();
      });

      const mutationObserver = new MutationObserver((mutations) => {
        // Filter out style-only attribute mutations to prevent feedback loops
        // with components like ThreadViewportSlack that write styles in response
        // to viewport changes
        const hasRelevantMutation = mutations.some(
          (m) => m.type !== "attributes" || m.attributeName !== "style",
        );
        if (hasRelevantMutation) {
          callbackRef();
        }
      });

      resizeObserver.observe(el);
      mutationObserver.observe(el, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      });

      return () => {
        resizeObserver.disconnect();
        mutationObserver.disconnect();
      };
    },
    [callbackRef],
  );

  return useManagedRef(refCallback);
};
