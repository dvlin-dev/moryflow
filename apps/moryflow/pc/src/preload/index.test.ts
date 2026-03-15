import { beforeEach, describe, expect, it, vi } from 'vitest';

const electronMocks = vi.hoisted(() => {
  return {
    exposeInMainWorld: vi.fn(),
    invoke: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
  };
});

vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: electronMocks.exposeInMainWorld,
  },
  ipcRenderer: {
    invoke: electronMocks.invoke,
    on: electronMocks.on,
    removeListener: electronMocks.removeListener,
  },
}));

const loadDesktopApi = async () => {
  await import('./index');
  const latestExpose = electronMocks.exposeInMainWorld.mock.calls.at(-1);
  if (!latestExpose) {
    throw new Error('desktopAPI is not exposed');
  }
  return latestExpose[1] as {
    membership: {
      openExternal: (url: string) => Promise<void>;
      refreshSession: () => Promise<
        | {
            ok: true;
            payload: { accessToken: string; accessTokenExpiresAt: string };
          }
        | {
            ok: false;
            reason: 'network';
          }
      >;
      startOAuthCallbackLoopback: () => Promise<{ callbackUrl: string } | null>;
      stopOAuthCallbackLoopback: () => Promise<void>;
    };
    payment: { openCheckout: (url: string) => Promise<void> };
    quickChat: {
      toggle: () => Promise<void>;
      setSessionId: (input: { sessionId: string | null }) => Promise<void>;
    };
    appRuntime: {
      getCloseBehavior: () => Promise<'hide_to_menubar' | 'quit'>;
      setLaunchAtLogin: (enabled: boolean) => Promise<{
        enabled: boolean;
        supported: boolean;
        source: 'system';
      }>;
    };
    updates: {
      getState: () => Promise<{ status: string }>;
      onStateChange: (
        handler: (event: {
          state: { status: string };
          settings: Record<string, unknown>;
        }) => void
      ) => () => void;
    };
  };
};

describe('preload openExternal bridge', () => {
  beforeEach(() => {
    vi.resetModules();
    electronMocks.exposeInMainWorld.mockReset();
    electronMocks.invoke.mockReset();
    electronMocks.on.mockReset();
    electronMocks.removeListener.mockReset();
  });

  it('should resolve membership openExternal when main process opens url', async () => {
    electronMocks.invoke.mockResolvedValueOnce(true);
    const api = await loadDesktopApi();

    await expect(api.membership.openExternal('https://example.com')).resolves.toBeUndefined();
    expect(electronMocks.invoke).toHaveBeenCalledWith('shell:openExternal', {
      url: 'https://example.com',
    });
  });

  it('should reject membership openExternal when main process fails to open url', async () => {
    electronMocks.invoke.mockResolvedValueOnce(false);
    const api = await loadDesktopApi();

    await expect(api.membership.openExternal('https://example.com')).rejects.toThrow(
      'Failed to open external URL'
    );
  });

  it('should reject payment openCheckout when main process fails to open url', async () => {
    electronMocks.invoke.mockResolvedValueOnce(false);
    const api = await loadDesktopApi();

    await expect(api.payment.openCheckout('https://example.com')).rejects.toThrow(
      'Failed to open external URL'
    );
  });

  it('should return raw membership refreshSession result without structured runtime decoding', async () => {
    electronMocks.invoke.mockResolvedValueOnce({
      ok: false,
      reason: 'network',
    });
    const api = await loadDesktopApi();

    await expect(api.membership.refreshSession()).resolves.toEqual({
      ok: false,
      reason: 'network',
    });
    expect(electronMocks.invoke).toHaveBeenCalledWith('membership:refreshSession');
  });

  it('should invoke oauth loopback start and stop channels', async () => {
    electronMocks.invoke
      .mockResolvedValueOnce({ callbackUrl: 'http://127.0.0.1:38971/auth/success' })
      .mockResolvedValueOnce(undefined);
    const api = await loadDesktopApi();

    await expect(api.membership.startOAuthCallbackLoopback()).resolves.toEqual({
      callbackUrl: 'http://127.0.0.1:38971/auth/success',
    });
    await expect(api.membership.stopOAuthCallbackLoopback()).resolves.toBeUndefined();

    expect(electronMocks.invoke).toHaveBeenCalledWith('membership:startOAuthCallbackLoopback');
    expect(electronMocks.invoke).toHaveBeenCalledWith('membership:stopOAuthCallbackLoopback');
  });

  it('should invoke quick-chat toggle channel', async () => {
    electronMocks.invoke.mockResolvedValueOnce(undefined);
    const api = await loadDesktopApi();

    await api.quickChat.toggle();

    expect(electronMocks.invoke).toHaveBeenCalledWith('quick-chat:toggle');
  });

  it('should invoke quick-chat setSessionId channel', async () => {
    electronMocks.invoke.mockResolvedValueOnce(undefined);
    const api = await loadDesktopApi();

    await api.quickChat.setSessionId({ sessionId: 'session-1' });

    expect(electronMocks.invoke).toHaveBeenCalledWith('quick-chat:setSessionId', {
      sessionId: 'session-1',
    });
  });

  it('should resolve appRuntime payload when main returns ok result', async () => {
    electronMocks.invoke.mockResolvedValueOnce({
      ok: true,
      data: 'hide_to_menubar',
    });
    const api = await loadDesktopApi();

    await expect(api.appRuntime.getCloseBehavior()).resolves.toBe('hide_to_menubar');
    expect(electronMocks.invoke).toHaveBeenCalledWith('app-runtime:getCloseBehavior', undefined);
  });

  it('should reject with structured runtime error when main returns error result', async () => {
    electronMocks.invoke.mockResolvedValueOnce({
      ok: false,
      error: {
        code: 'UNSUPPORTED_PLATFORM',
        message: 'Launch at Login is unsupported on current platform.',
      },
    });
    const api = await loadDesktopApi();

    const promise = api.appRuntime.setLaunchAtLogin(true);
    await expect(promise).rejects.toThrow('Launch at Login is unsupported on current platform.');
    await promise.catch((error: Error & { code?: string }) => {
      expect(error.code).toBe('UNSUPPORTED_PLATFORM');
    });
  });

  it('should expose updates getState through structured runtime invoke', async () => {
    electronMocks.invoke
      .mockResolvedValueOnce({
        ok: true,
        data: { status: 'idle' },
      });
    const api = await loadDesktopApi();

    await expect(api.updates.getState()).resolves.toEqual({ status: 'idle' });
    expect(electronMocks.invoke).toHaveBeenCalledWith('updates:getState', undefined);
  });

  it('should subscribe and unsubscribe updates state change events', async () => {
    const api = await loadDesktopApi();
    const handler = vi.fn();

    const dispose = api.updates.onStateChange(handler);

    expect(electronMocks.on).toHaveBeenCalledWith('updates:state-changed', expect.any(Function));
    dispose();
    expect(electronMocks.removeListener).toHaveBeenCalledWith(
      'updates:state-changed',
      expect.any(Function)
    );
  });
});
