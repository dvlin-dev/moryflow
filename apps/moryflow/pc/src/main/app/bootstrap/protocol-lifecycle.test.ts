import { describe, expect, it, vi } from 'vitest';

import { configureProtocolLifecycle } from './protocol-lifecycle.js';

describe('configureProtocolLifecycle', () => {
  it('registers protocol client and routes deep-link lifecycle events', () => {
    const listeners = new Map<string, (...args: any[]) => void>();
    const appLike = {
      setAsDefaultProtocolClient: vi.fn(),
      requestSingleInstanceLock: vi.fn(() => true),
      quit: vi.fn(),
      on: vi.fn((event: string, listener: (...args: any[]) => void) => {
        listeners.set(event, listener);
      }),
    };
    const deepLinkController = {
      handleDeepLink: vi.fn(),
    };
    const openMainWindowWithDeepLinkFlush = vi.fn(async () => undefined);

    const result = configureProtocolLifecycle({
      app: appLike,
      process: {
        defaultApp: true,
        argv: ['/electron', '/app-entry.js', 'moryflow://auth/success?code=first'],
        execPath: '/electron',
        env: {},
      },
      protocolName: 'moryflow',
      extractDeepLinkFromArgv: (argv) =>
        argv.find((value) => value.startsWith('moryflow://')) ?? null,
      deepLinkController,
      openMainWindowWithDeepLinkFlush,
    });

    expect(result.gotSingleInstanceLock).toBe(true);
    expect(appLike.setAsDefaultProtocolClient).toHaveBeenCalledWith('moryflow', '/electron', [
      '/app-entry.js',
    ]);
    expect(deepLinkController.handleDeepLink).toHaveBeenCalledWith(
      'moryflow://auth/success?code=first'
    );

    listeners.get('second-instance')?.({}, ['moryflow://payment/success']);
    expect(deepLinkController.handleDeepLink).toHaveBeenLastCalledWith(
      'moryflow://payment/success'
    );

    const preventDefault = vi.fn();
    listeners.get('open-url')?.({ preventDefault }, 'moryflow://payment/success');
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(deepLinkController.handleDeepLink).toHaveBeenLastCalledWith(
      'moryflow://payment/success'
    );
    expect(openMainWindowWithDeepLinkFlush).not.toHaveBeenCalled();
  });
});
