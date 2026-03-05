/* @vitest-environment node */

import { describe, expect, it, vi } from 'vitest';
import { bindMainWindowLifecyclePolicy } from './window-lifecycle-policy';

const createWindowStub = () => {
  const listeners = new Map<string, (event: Electron.Event) => void>();
  const hide = vi.fn();
  const on = vi.fn((event: string, handler: (evt: Electron.Event) => void) => {
    listeners.set(event, handler);
  });
  const removeListener = vi.fn((event: string) => {
    listeners.delete(event);
  });
  return {
    hide,
    on,
    removeListener,
    emitClose: () => {
      const event = { preventDefault: vi.fn() } as unknown as Electron.Event;
      const closeHandler = listeners.get('close');
      closeHandler?.(event);
      return event;
    },
  };
};

describe('window-lifecycle-policy', () => {
  it('should hide window when closeBehavior=hide_to_menubar on macOS', () => {
    const windowStub = createWindowStub();
    const onHiddenToMenubar = vi.fn();
    bindMainWindowLifecyclePolicy(windowStub as any, {
      platform: 'darwin',
      getCloseBehavior: () => 'hide_to_menubar',
      isQuitting: () => false,
      onHiddenToMenubar,
      requestQuit: vi.fn(),
    });

    const closeEvent = windowStub.emitClose();

    expect(closeEvent.preventDefault).toHaveBeenCalledTimes(1);
    expect(windowStub.hide).toHaveBeenCalledTimes(1);
    expect(onHiddenToMenubar).toHaveBeenCalledTimes(1);
  });

  it('should quit app when closeBehavior=quit on macOS', () => {
    const windowStub = createWindowStub();
    const requestQuit = vi.fn();
    bindMainWindowLifecyclePolicy(windowStub as any, {
      platform: 'darwin',
      getCloseBehavior: () => 'quit',
      isQuitting: () => false,
      requestQuit,
    });

    const closeEvent = windowStub.emitClose();

    expect(closeEvent.preventDefault).toHaveBeenCalledTimes(1);
    expect(requestQuit).toHaveBeenCalledTimes(1);
    expect(windowStub.hide).not.toHaveBeenCalled();
  });

  it('should not intercept close when app is quitting', () => {
    const windowStub = createWindowStub();
    bindMainWindowLifecyclePolicy(windowStub as any, {
      platform: 'darwin',
      getCloseBehavior: () => 'hide_to_menubar',
      isQuitting: () => true,
      requestQuit: vi.fn(),
    });

    const closeEvent = windowStub.emitClose();

    expect(closeEvent.preventDefault).not.toHaveBeenCalled();
    expect(windowStub.hide).not.toHaveBeenCalled();
  });
});
