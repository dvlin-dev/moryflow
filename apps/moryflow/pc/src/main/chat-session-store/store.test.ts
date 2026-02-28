import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LEGACY_UNSCOPED_VAULT_PATH } from './const.js';

const storeState = vi.hoisted(() => ({
  sessions: {} as Record<string, Record<string, unknown>>,
}));

const getMock = vi.hoisted(() =>
  vi.fn((key: string) => (key === 'sessions' ? storeState.sessions : undefined))
);
const setMock = vi.hoisted(() =>
  vi.fn((key: string, value: unknown) => {
    if (key === 'sessions') {
      storeState.sessions = value as Record<string, Record<string, unknown>>;
    }
  })
);

vi.mock('electron-store', () => {
  class MockStore {
    get = getMock;
    set = setMock;
  }
  return {
    default: MockStore,
  };
});

const getVaultsMock = vi.hoisted(() => vi.fn());

vi.mock('../vault/store.js', () => ({
  getVaults: getVaultsMock,
}));

import { readSessions } from './store.js';

const createLegacySession = () => ({
  id: 'session-1',
  title: 'Legacy',
  createdAt: 1,
  updatedAt: 1,
  history: [],
  mode: 'agent',
});

describe('chat-session-store normalizeSessions', () => {
  beforeEach(() => {
    storeState.sessions = {};
    getMock.mockClear();
    setMock.mockClear();
    getVaultsMock.mockReset();
  });

  it('single vault 时自动回填 legacy 会话 vaultPath', () => {
    getVaultsMock.mockReturnValue([{ id: 'vault-1', path: '/vault-one', name: 'one', addedAt: 1 }]);
    storeState.sessions = {
      'session-1': createLegacySession(),
    };

    const sessions = readSessions();

    expect(sessions['session-1']?.vaultPath).toBe('/vault-one');
    expect(setMock).toHaveBeenCalledTimes(1);
  });

  it('multi vault 时将 legacy 会话标记为 unscoped', () => {
    getVaultsMock.mockReturnValue([
      { id: 'vault-1', path: '/vault-one', name: 'one', addedAt: 1 },
      { id: 'vault-2', path: '/vault-two', name: 'two', addedAt: 2 },
    ]);
    storeState.sessions = {
      'session-1': createLegacySession(),
    };

    const sessions = readSessions();

    expect(sessions['session-1']?.vaultPath).toBe(LEGACY_UNSCOPED_VAULT_PATH);
    expect(setMock).toHaveBeenCalledTimes(1);
  });

  it('已有有效 vaultPath 时不重复回写', () => {
    getVaultsMock.mockReturnValue([{ id: 'vault-1', path: '/vault-one', name: 'one', addedAt: 1 }]);
    storeState.sessions = {
      'session-1': {
        ...createLegacySession(),
        vaultPath: '/already-scoped',
      },
    };

    const sessions = readSessions();

    expect(sessions['session-1']?.vaultPath).toBe('/already-scoped');
    expect(setMock).not.toHaveBeenCalled();
  });
});
