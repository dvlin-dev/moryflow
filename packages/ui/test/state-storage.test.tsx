import { describe, expect, it, vi } from 'vitest';
import {
  createSafeJSONStorage,
  isStateStorageLike,
  noopStateStorage,
  resolveSafeStateStorage,
} from '../src/lib/state-storage';

describe('state-storage', () => {
  it('falls back to noop storage when candidate misses required methods', () => {
    const storage = resolveSafeStateStorage({ getItem: () => null });

    expect(storage).toBe(noopStateStorage);
    expect(isStateStorageLike({ getItem: () => null })).toBe(false);
  });

  it('keeps a valid storage implementation intact', () => {
    const candidate = {
      getItem: vi.fn(() => 'value'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };

    const storage = resolveSafeStateStorage(candidate);

    expect(storage).toBe(candidate);
    expect(isStateStorageLike(candidate)).toBe(true);
  });

  it('creates json storage that noops when browser storage is invalid', () => {
    const storage = createSafeJSONStorage<{ token: string }>(() => ({ getItem: () => null }));

    expect(storage.getItem('auth')).toBeNull();
    expect(() => storage.setItem('auth', { state: { token: 'a' }, version: 1 })).not.toThrow();
    expect(() => storage.removeItem('auth')).not.toThrow();
  });
});
