/**
 * [PROVIDES]: useManagedRef - 可清理的 ref 管理
 * [DEPENDS]: React
 * [POS]: Viewport/Message 侧的 ref 组合与清理
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

'use client';

import { useCallback, useRef } from 'react';

export const useManagedRef = <TNode>(callback: (node: TNode) => (() => void) | void) => {
  const cleanupRef = useRef<(() => void) | void>(undefined);

  return useCallback(
    (node: TNode | null) => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }

      if (node) {
        cleanupRef.current = callback(node);
      }
    },
    [callback]
  );
};
