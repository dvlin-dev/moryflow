/**
 * [PROVIDES]: noopStateStorage, isStateStorageLike, resolveSafeStateStorage, createSafeJSONStorage
 * [DEPENDS]: zustand/middleware
 * [POS]: 浏览器端状态持久化适配器，统一把不完整 storage 降级为 noop storage
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { createJSONStorage, type StateStorage } from 'zustand/middleware';

export const noopStateStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

export const isStateStorageLike = (value: unknown): value is StateStorage => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<StateStorage>;
  return (
    typeof candidate.getItem === 'function' &&
    typeof candidate.setItem === 'function' &&
    typeof candidate.removeItem === 'function'
  );
};

export const resolveSafeStateStorage = (
  value: unknown,
  fallback: StateStorage = noopStateStorage
): StateStorage => {
  if (isStateStorageLike(value)) {
    return value;
  }
  return fallback;
};

export const createSafeJSONStorage = <T>(
  getStorage: () => unknown,
  fallback: StateStorage = noopStateStorage
) => createJSONStorage<T>(() => resolveSafeStateStorage(getStorage(), fallback));
