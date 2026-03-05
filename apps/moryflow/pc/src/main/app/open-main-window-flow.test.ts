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
});
