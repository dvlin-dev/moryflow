/**
 * [PROVIDES]: chat thinking 覆盖缓存的单一读写入口（localStorage + 订阅）
 * [DEPENDS]: window.localStorage（renderer）
 * [POS]: Settings 与 ChatPane 共享的 thinking 覆盖状态源，替代 DOM CustomEvent 桥接
 *
 * [PROTOCOL]: 本文件变更时，必须同步检查 use-chat-model-selection 与 providers controller 的调用契约
 */

type ThinkingOverridesSnapshot = Record<string, string>;
type ThinkingOverridesListener = (snapshot: ThinkingOverridesSnapshot) => void;

const THINKING_STORAGE_KEY = 'moryflow.chat.thinkingByModel';

let initialized = false;
let snapshot: ThinkingOverridesSnapshot = {};
const listeners = new Set<ThinkingOverridesListener>();

const isBrowser = () => typeof window !== 'undefined';

const normalizeNonEmpty = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const readSnapshotFromStorage = (): ThinkingOverridesSnapshot => {
  if (!isBrowser()) {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(THINKING_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }

    const normalized: ThinkingOverridesSnapshot = {};
    for (const [rawModelId, rawLevel] of Object.entries(parsed)) {
      const modelId = normalizeNonEmpty(rawModelId);
      const level = normalizeNonEmpty(rawLevel);
      if (!modelId || !level) {
        continue;
      }
      normalized[modelId] = level;
    }
    return normalized;
  } catch {
    return {};
  }
};

const writeSnapshotToStorage = (next: ThinkingOverridesSnapshot) => {
  if (!isBrowser()) {
    return;
  }

  try {
    if (Object.keys(next).length === 0) {
      window.localStorage.removeItem(THINKING_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(THINKING_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
};

const ensureInitialized = () => {
  if (initialized) {
    return;
  }
  snapshot = readSnapshotFromStorage();
  initialized = true;
};

const cloneSnapshot = (): ThinkingOverridesSnapshot => ({ ...snapshot });

const notifyListeners = () => {
  for (const listener of listeners) {
    listener(cloneSnapshot());
  }
};

export const getChatThinkingOverridesSnapshot = (): ThinkingOverridesSnapshot => {
  ensureInitialized();
  return cloneSnapshot();
};

export const subscribeChatThinkingOverrides = (
  listener: ThinkingOverridesListener
): (() => void) => {
  ensureInitialized();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const setChatThinkingOverrideLevel = (modelId: string, level: string): void => {
  ensureInitialized();
  const normalizedModelId = normalizeNonEmpty(modelId);
  const normalizedLevel = normalizeNonEmpty(level);
  if (!normalizedModelId || !normalizedLevel) {
    return;
  }
  if (snapshot[normalizedModelId] === normalizedLevel) {
    return;
  }

  snapshot = {
    ...snapshot,
    [normalizedModelId]: normalizedLevel,
  };
  writeSnapshotToStorage(snapshot);
  notifyListeners();
};

export const clearChatThinkingOverride = (modelId: string): void => {
  ensureInitialized();
  const normalizedModelId = normalizeNonEmpty(modelId);
  if (!normalizedModelId || !Object.prototype.hasOwnProperty.call(snapshot, normalizedModelId)) {
    return;
  }

  const next = { ...snapshot };
  delete next[normalizedModelId];
  snapshot = next;
  writeSnapshotToStorage(snapshot);
  notifyListeners();
};
