import { describe, expect, it, vi } from 'vitest';

import { createMainWindowRuntime } from './main-window-runtime.js';

const createWindowDouble = () => ({
  isMinimized: vi.fn(() => false),
  restore: vi.fn(),
  isVisible: vi.fn(() => true),
  show: vi.fn(),
  focus: vi.fn(),
  isDestroyed: vi.fn(() => false),
});

describe('createMainWindowRuntime', () => {
  it('creates, focuses, and cleans up the tracked main window', async () => {
    const window = createWindowDouble();
    let hooks:
      | {
          onFocus?: (window: typeof window) => void;
          onClosed?: (window: typeof window) => void;
        }
      | undefined;
    const disposeLifecycle = vi.fn();
    const clearUnreadCount = vi.fn();
    const onAfterClosed = vi.fn(async () => undefined);

    const runtime = createMainWindowRuntime({
      createMainWindow: vi.fn(async (input) => {
        hooks = input.hooks;
        input.hooks.onFocus?.(window);
        return window;
      }),
      bindMainWindowLifecyclePolicy: vi.fn(() => disposeLifecycle),
      clearUnreadCount,
      getCloseBehavior: vi.fn(() => 'quit'),
      isQuitting: vi.fn(() => false),
      onHiddenToMenubar: vi.fn(),
      requestQuit: vi.fn(),
      onAfterClosed,
    });

    const created = await runtime.createOrFocusMainWindow();

    expect(created).toBe(window);
    expect(clearUnreadCount).toHaveBeenCalled();
    expect(runtime.getMainWindow()).toBe(window);
    expect(runtime.getActiveWindow()).toBe(window);

    hooks?.onClosed?.(window);
    await Promise.resolve();

    expect(disposeLifecycle).toHaveBeenCalledTimes(1);
    expect(onAfterClosed).toHaveBeenCalledTimes(1);
    expect(runtime.getMainWindow()).toBeNull();
    expect(runtime.getActiveWindow()).toBeNull();
  });
});
