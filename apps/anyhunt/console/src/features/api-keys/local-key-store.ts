/**
 * [PROVIDES]: API Key 明文本地持久化读写
 * [DEPENDS]: window.localStorage
 * [POS]: Console Playground / API Keys 的本地明文事实源
 *
 * [PROTOCOL]: 本文件变更时，必须更新所属目录 CLAUDE.md
 */

const noopStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

export const API_KEY_PLAINTEXT_STORAGE_KEY = 'ah_console_api_key_plaintexts';

export interface StoredApiKeyPlaintext {
  plainKey: string;
  createdAt: string;
}

type StoredApiKeyPlaintextMap = Record<string, StoredApiKeyPlaintext>;

function resolveStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  if (typeof window === 'undefined') {
    return noopStorage;
  }

  return window.localStorage;
}

function parseStoredPlaintexts(value: string | null): StoredApiKeyPlaintextMap {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter((entry) => {
        const record = entry[1];
        return Boolean(
          record &&
          typeof record === 'object' &&
          typeof (record as StoredApiKeyPlaintext).plainKey === 'string' &&
          typeof (record as StoredApiKeyPlaintext).createdAt === 'string'
        );
      })
    ) as StoredApiKeyPlaintextMap;
  } catch {
    return {};
  }
}

function writeStoredPlaintexts(value: StoredApiKeyPlaintextMap): void {
  resolveStorage().setItem(API_KEY_PLAINTEXT_STORAGE_KEY, JSON.stringify(value));
}

export function loadStoredApiKeyPlaintexts(): StoredApiKeyPlaintextMap {
  return parseStoredPlaintexts(resolveStorage().getItem(API_KEY_PLAINTEXT_STORAGE_KEY));
}

export function saveStoredApiKeyPlaintext(keyId: string, plainKey: string): void {
  const stored = loadStoredApiKeyPlaintexts();
  stored[keyId] = {
    plainKey,
    createdAt: new Date().toISOString(),
  };
  writeStoredPlaintexts(stored);
}

export function removeStoredApiKeyPlaintext(keyId: string): void {
  const stored = loadStoredApiKeyPlaintexts();
  if (!stored[keyId]) {
    return;
  }

  delete stored[keyId];
  writeStoredPlaintexts(stored);
}

export function pruneStoredApiKeyPlaintexts(
  apiKeys: Array<{ id: string; isActive: boolean }>
): void {
  const activeKeyIds = new Set(apiKeys.filter((key) => key.isActive).map((key) => key.id));
  const stored = loadStoredApiKeyPlaintexts();

  const pruned = Object.fromEntries(
    Object.entries(stored).filter(([keyId]) => activeKeyIds.has(keyId))
  ) as StoredApiKeyPlaintextMap;

  writeStoredPlaintexts(pruned);
}

export function resolveStoredApiKeyPlaintext(keyId: string): string | null {
  const stored = loadStoredApiKeyPlaintexts();
  return stored[keyId]?.plainKey ?? null;
}
