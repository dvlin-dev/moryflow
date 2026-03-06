import { beforeEach, describe, expect, it } from 'vitest';
import {
  API_KEY_PLAINTEXT_STORAGE_KEY,
  loadStoredApiKeyPlaintexts,
  pruneStoredApiKeyPlaintexts,
  removeStoredApiKeyPlaintext,
  saveStoredApiKeyPlaintext,
} from './local-key-store';

describe('local api key plaintext store', () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
        removeItem: (key: string) => {
          storage.delete(key);
        },
      },
    });
  });

  it('saves and loads plaintext by key id', () => {
    saveStoredApiKeyPlaintext('key-1', 'ah_secret_key_1234');

    expect(loadStoredApiKeyPlaintexts()).toEqual({
      'key-1': expect.objectContaining({
        plainKey: 'ah_secret_key_1234',
      }),
    });
  });

  it('removes plaintext entry by key id', () => {
    saveStoredApiKeyPlaintext('key-1', 'ah_secret_key_1234');

    removeStoredApiKeyPlaintext('key-1');

    expect(loadStoredApiKeyPlaintexts()).toEqual({});
  });

  it('prunes deleted and inactive keys', () => {
    saveStoredApiKeyPlaintext('active-key', 'ah_active_1234');
    saveStoredApiKeyPlaintext('inactive-key', 'ah_inactive_1234');
    saveStoredApiKeyPlaintext('deleted-key', 'ah_deleted_1234');

    pruneStoredApiKeyPlaintexts([
      { id: 'active-key', isActive: true },
      { id: 'inactive-key', isActive: false },
    ]);

    expect(loadStoredApiKeyPlaintexts()).toEqual({
      'active-key': expect.objectContaining({
        plainKey: 'ah_active_1234',
      }),
    });
    expect(storage.get(API_KEY_PLAINTEXT_STORAGE_KEY)).toContain('active-key');
    expect(storage.get(API_KEY_PLAINTEXT_STORAGE_KEY)).not.toContain('inactive-key');
    expect(storage.get(API_KEY_PLAINTEXT_STORAGE_KEY)).not.toContain('deleted-key');
  });
});
