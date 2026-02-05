/**
 * [PROVIDES]: ReadonlyStore/writableStore - assistant-ui store wrapper
 * [DEPENDS]: zustand StoreApi
 * [POS]: mirror @assistant-ui/react ReadonlyStore（v0.12.6）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { StoreApi } from "zustand";

export type ReadonlyStore<T> = Omit<StoreApi<T>, "setState" | "destroy">;

export const writableStore = <T>(store: ReadonlyStore<T> | undefined) => {
  return store as unknown as StoreApi<T>;
};
