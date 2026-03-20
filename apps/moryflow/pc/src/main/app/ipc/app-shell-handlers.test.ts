import { describe, expect, it, vi } from 'vitest';

import { registerAppShellIpcHandlers } from './app-shell-handlers.js';

describe('registerAppShellIpcHandlers', () => {
  it('registers app shell and update channels', () => {
    const handle = vi.fn();

    registerAppShellIpcHandlers({
      ipcMain: { handle },
      deps: {
        app: {
          getVersion: vi.fn(() => '1.0.0'),
        },
        quickChat: {
          toggle: vi.fn(async () => undefined),
          open: vi.fn(async () => undefined),
          close: vi.fn(async () => undefined),
          getState: vi.fn(async () => ({ visible: false, sessionId: null })),
          setSessionId: vi.fn(async () => undefined),
        },
        appRuntime: {
          getCloseBehavior: vi.fn(() => 'quit'),
          setCloseBehavior: vi.fn((behavior) => behavior),
          getLaunchAtLogin: vi.fn(() => ({ enabled: false, openAsHidden: false })),
          setLaunchAtLogin: vi.fn(() => ({ enabled: true, openAsHidden: false })),
        },
        updates: {
          getState: vi.fn(() => ({ status: 'idle' })),
          getSettings: vi.fn(() => ({ autoDownload: false })),
          setAutoDownload: vi.fn(() => ({ autoDownload: true })),
          checkForUpdates: vi.fn(async () => ({ status: 'checking' })),
          downloadUpdate: vi.fn(async () => ({ status: 'downloading' })),
          restartToInstall: vi.fn(),
          skipVersion: vi.fn(() => ({ autoDownload: false })),
        },
        externalLinkPolicy: {},
        openExternalSafe: vi.fn(async () => true),
        parseSkipVersionPayload: vi.fn(() => ({ isValid: true, version: undefined })),
        okResult: vi.fn((data) => ({ ok: true, data })),
        toAppRuntimeErrorResult: vi.fn((error) => ({ ok: false, error })),
        resetApp: vi.fn(async () => ({ success: true })),
      },
    });

    const channels = handle.mock.calls.map(([channel]) => channel);
    expect(channels).toContain('app:getVersion');
    expect(channels).toContain('quick-chat:toggle');
    expect(channels).toContain('app-runtime:getCloseBehavior');
    expect(channels).toContain('updates:checkForUpdates');
    expect(channels).toContain('shell:openExternal');
    expect(channels).toContain('app:resetApp');
  });
});
