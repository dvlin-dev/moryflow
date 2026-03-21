/* @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const resetAppMock = vi.hoisted(() => vi.fn());

vi.mock('../../maintenance/reset-app.js', () => ({
  resetApp: resetAppMock,
}));

describe('registerRuntimeIpcHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers app:resetApp in the runtime registrar', async () => {
    const handlers = new Map<string, (event: unknown, payload?: unknown) => unknown>();
    const ipcMain = {
      handle: vi.fn((channel: string, handler: (event: unknown, payload?: unknown) => unknown) => {
        handlers.set(channel, handler);
      }),
    };

    const deps = {
      appVersion: vi.fn(() => '1.0.0'),
      quickChat: {
        toggle: vi.fn(async () => undefined),
        open: vi.fn(async () => undefined),
        close: vi.fn(async () => undefined),
        getState: vi.fn(async () => ({ visible: false, focused: false, sessionId: null })),
        setSessionId: vi.fn(async () => undefined),
      },
      appRuntime: {
        getCloseBehavior: vi.fn(() => 'quit' as const),
        setCloseBehavior: vi.fn((behavior) => behavior),
        getLaunchAtLogin: vi.fn(() => ({ enabled: false, openAsHidden: false })),
        setLaunchAtLogin: vi.fn((enabled: boolean) => ({ enabled, openAsHidden: false })),
      },
      updates: {
        getState: vi.fn(() => ({ status: 'idle', releaseNotesUrl: null })),
        getSettings: vi.fn(() => ({ autoDownload: true, skippedVersion: null })),
        setAutoDownload: vi.fn((enabled: boolean) => ({
          autoDownload: enabled,
          skippedVersion: null,
        })),
        checkForUpdates: vi.fn(async () => ({ status: 'idle', releaseNotesUrl: null })),
        downloadUpdate: vi.fn(async () => ({ status: 'idle', releaseNotesUrl: null })),
        restartToInstall: vi.fn(),
        skipVersion: vi.fn((version?: string | null) => ({
          autoDownload: true,
          skippedVersion: version ?? null,
        })),
      },
      openExternal: vi.fn(async () => true),
    };

    const { registerRuntimeIpcHandlers } = await import('./runtime-register.js');
    registerRuntimeIpcHandlers(ipcMain, deps);

    const handler = handlers.get('app:resetApp');
    expect(handler).toBeTypeOf('function');

    await handler?.({});

    expect(resetAppMock).toHaveBeenCalledTimes(1);
  });
});
