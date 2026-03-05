/* @vitest-environment node */

import { describe, expect, it, vi } from 'vitest';
import { createOpenMainWindowWithDeepLinkFlush } from './open-main-window-flow';

describe('open-main-window-flow', () => {
  it('flushes pending deep links after main window opens', async () => {
    const createOrFocusMainWindow = vi.fn(async () => undefined);
    const flushPendingDeepLinks = vi.fn(() => undefined);

    const openMainWindow = createOpenMainWindowWithDeepLinkFlush({
      createOrFocusMainWindow,
      flushPendingDeepLinks,
    });

    await openMainWindow();

    expect(createOrFocusMainWindow).toHaveBeenCalledTimes(1);
    expect(flushPendingDeepLinks).toHaveBeenCalledTimes(1);
    expect(createOrFocusMainWindow.mock.invocationCallOrder[0]).toBeLessThan(
      flushPendingDeepLinks.mock.invocationCallOrder[0]
    );
  });

  it('does not flush deep links when opening main window fails', async () => {
    const createOrFocusMainWindow = vi.fn(async () => {
      throw new Error('failed to create window');
    });
    const flushPendingDeepLinks = vi.fn(() => undefined);

    const openMainWindow = createOpenMainWindowWithDeepLinkFlush({
      createOrFocusMainWindow,
      flushPendingDeepLinks,
    });

    await expect(openMainWindow()).rejects.toThrowError('failed to create window');
    expect(flushPendingDeepLinks).not.toHaveBeenCalled();
  });

  it('serializes concurrent open requests to avoid duplicate main-window creation', async () => {
    let resolveOpen: (() => void) | null = null;
    const createOrFocusMainWindow = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveOpen = resolve;
        })
    );
    const flushPendingDeepLinks = vi.fn(() => undefined);

    const openMainWindow = createOpenMainWindowWithDeepLinkFlush({
      createOrFocusMainWindow,
      flushPendingDeepLinks,
    });

    const first = openMainWindow();
    const second = openMainWindow();

    expect(createOrFocusMainWindow).toHaveBeenCalledTimes(1);
    resolveOpen?.();
    await Promise.all([first, second]);

    expect(createOrFocusMainWindow).toHaveBeenCalledTimes(1);
    expect(flushPendingDeepLinks).toHaveBeenCalledTimes(1);
  });
});
