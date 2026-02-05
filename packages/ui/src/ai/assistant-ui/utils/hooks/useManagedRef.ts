/**
 * [PROVIDES]: useManagedRef - assistant-ui ref 管理工具
 * [DEPENDS]: React
 * [POS]: mirror @assistant-ui/react useManagedRef（v0.12.6）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useCallback, useRef } from "react";

export const useManagedRef = <TNode>(
  callback: (node: TNode) => (() => void) | void,
) => {
  const cleanupRef = useRef<(() => void) | void>(undefined);

  const ref = useCallback(
    (el: TNode | null) => {
      // Call the previous cleanup function
      if (cleanupRef.current) {
        cleanupRef.current();
      }

      // Call the new callback and store its cleanup function
      if (el) {
        cleanupRef.current = callback(el);
      }
    },
    [callback],
  );

  return ref;
};
