/* @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';

type AnyRecord = Record<string, unknown>;

const mockStoreState = vi.hoisted(() => ({
  value: undefined as AnyRecord | undefined,
}));

vi.mock('electron-store', () => {
  class MockStore<T extends AnyRecord> {
    store: T;

    constructor(options?: { defaults?: T }) {
      if (!mockStoreState.value) {
        mockStoreState.value = structuredClone((options?.defaults ?? {}) as AnyRecord);
      }
      this.store = mockStoreState.value as T;
    }
  }

  return {
    default: MockStore,
  };
});

describe('telegram settings store', () => {
  beforeEach(() => {
    vi.resetModules();
    mockStoreState.value = undefined;
  });

  it('updateSettings 不应把 botToken/webhookSecret 持久化到明文 store', async () => {
    const { getTelegramSettingsStore, updateTelegramSettingsStore } =
      await import('./settings-store.js');

    updateTelegramSettingsStore({
      account: {
        accountId: 'default',
        enabled: true,
        botToken: 'bot_secret_should_not_persist',
        webhookSecret: 'webhook_secret_should_not_persist',
      },
    });

    const store = getTelegramSettingsStore();
    const defaultAccount = store.accounts.default as AnyRecord;

    expect(defaultAccount.botToken).toBeUndefined();
    expect(defaultAccount.webhookSecret).toBeUndefined();
    expect(defaultAccount.enabled).toBe(true);
  });
});
