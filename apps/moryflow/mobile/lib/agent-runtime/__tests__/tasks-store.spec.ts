import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import path from 'node:path';
import type { PlatformCapabilities, CryptoUtils } from '@anyhunt/agents-adapter';

const { openDatabaseAsync, addEventListener } = vi.hoisted(() => ({
  openDatabaseAsync: vi.fn(),
  addEventListener: vi.fn(() => ({ remove: vi.fn() })),
}));

vi.mock('expo-sqlite', () => ({
  openDatabaseAsync,
}));

vi.mock('react-native', () => ({
  AppState: {
    addEventListener,
  },
}));

import { createMobileTasksStore } from '../tasks-store';

const createCapabilities = (): PlatformCapabilities => {
  return {
    fs: {
      readFile: async () => '',
      writeFile: async () => {},
      delete: async () => {},
      move: async () => {},
      mkdir: async () => {},
      readdir: async () => [],
      exists: async () => true,
      stat: async () => ({
        isDirectory: false,
        isFile: true,
        size: 0,
        mtime: 0,
      }),
      access: async () => true,
    },
    path,
    storage: {
      get: async () => null,
      set: async () => {},
      remove: async () => {},
    },
    secureStorage: {
      get: async () => null,
      set: async () => {},
      remove: async () => {},
    },
    fetch: (async () => {
      throw new Error('fetch_unavailable');
    }) as typeof globalThis.fetch,
    logger: {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    },
    platform: 'mobile',
    auth: {
      getToken: async () => null,
      getApiUrl: () => 'http://localhost',
    },
  };
};

const createCrypto = (): CryptoUtils => {
  return {
    randomUUID: () => 'uuid',
    sha256: () => 'hash',
  };
};

describe('MobileTasksStore', () => {
  beforeEach(() => {
    const fakeDb = {
      execAsync: vi.fn().mockResolvedValue(undefined),
      getFirstAsync: vi.fn().mockResolvedValue({ user_version: 0 }),
      runAsync: vi.fn().mockResolvedValue({}),
      getAllAsync: vi.fn().mockResolvedValue([]),
      closeAsync: vi.fn().mockResolvedValue(undefined),
    };
    openDatabaseAsync.mockResolvedValue(fakeDb);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it('opens sqlite database within vault directory', async () => {
    const store = createMobileTasksStore(createCapabilities(), createCrypto());
    await store.init({ vaultRoot: '/vault' });

    expect(openDatabaseAsync).toHaveBeenCalledWith(
      'tasks.db',
      undefined,
      path.join('/vault', '.moryflow', 'agent')
    );
  });
});
