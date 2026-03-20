import { describe, expect, it, vi } from 'vitest';

import { registerMembershipIpcHandlers } from '../membership-handlers.js';

describe('registerMembershipIpcHandlers', () => {
  it('registers membership ipc channels', () => {
    const handle = vi.fn();

    registerMembershipIpcHandlers({
      ipcMain: {
        handle,
      },
      deps: {
        membershipBridge: {
          syncToken: vi.fn(),
          setEnabled: vi.fn(),
        },
        isSecureStorageAvailable: vi.fn(async () => true),
        getRefreshToken: vi.fn(async () => null),
        setRefreshToken: vi.fn(async () => undefined),
        clearRefreshToken: vi.fn(async () => undefined),
        getAccessToken: vi.fn(async () => null),
        setAccessToken: vi.fn(async () => undefined),
        clearAccessToken: vi.fn(async () => undefined),
        getAccessTokenExpiresAt: vi.fn(async () => null),
        setAccessTokenExpiresAt: vi.fn(async () => undefined),
        clearAccessTokenExpiresAt: vi.fn(async () => undefined),
        refreshMembershipSession: vi.fn(async () => ({
          ok: true,
          data: null,
        })),
        clearMembershipSession: vi.fn(async () => undefined),
        oauthLoopbackManager: {
          start: vi.fn(async () => ({ callbackUrl: 'http://127.0.0.1:38971/auth/success' })),
          stop: vi.fn(async () => undefined),
        },
      },
    });

    const channels = handle.mock.calls.map(([channel]) => channel);
    expect(channels).toContain('membership:syncToken');
    expect(channels).toContain('membership:syncEnabled');
    expect(channels).toContain('membership:refreshSession');
    expect(channels).toContain('membership:startOAuthCallbackLoopback');
    expect(channels).toContain('membership:stopOAuthCallbackLoopback');
  });
});
