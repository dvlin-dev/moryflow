import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  });

  it('缺少 vaultPath 的会话会被清理', () => {
    storeState.sessions = {
      'session-1': createLegacySession(),
    };

    const sessions = readSessions();

    expect(sessions['session-1']).toBeUndefined();
    expect(setMock).toHaveBeenCalledTimes(1);
  });

  it('非绝对路径 vaultPath 的会话会被清理', () => {
    storeState.sessions = {
      'session-1': {
        ...createLegacySession(),
        vaultPath: 'relative/path.md',
      },
    };

    const sessions = readSessions();

    expect(sessions['session-1']).toBeUndefined();
    expect(setMock).toHaveBeenCalledTimes(1);
  });

  it('已有有效绝对路径 vaultPath 时不重复回写', () => {
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

  it('非法 mode 会回退为 agent', () => {
    storeState.sessions = {
      'session-1': {
        ...createLegacySession(),
        mode: 'invalid-mode',
        vaultPath: '/already-scoped',
      },
    };

    const sessions = readSessions();

    expect(sessions['session-1']?.mode).toBe('agent');
    expect(setMock).toHaveBeenCalledTimes(1);
  });
});
