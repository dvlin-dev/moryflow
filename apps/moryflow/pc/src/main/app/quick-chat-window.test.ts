/* @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const electronMock = vi.hoisted(() => {
  class MockBrowserWindow {
    handlers = new Map<string, (...args: unknown[]) => void>();
    visible = false;
    focused = false;
    destroyed = false;
    loadURL = vi.fn(async () => undefined);
    loadFile = vi.fn(async () => undefined);
    setPosition = vi.fn();
    webContents = {
      setWindowOpenHandler: vi.fn(),
      on: vi.fn(),
    };

    constructor(public options: unknown) {}

    on = (event: string, handler: (...args: unknown[]) => void) => {
      this.handlers.set(event, handler);
    };

    emit = (event: string, ...args: unknown[]) => {
      this.handlers.get(event)?.(...args);
    };

    show = vi.fn(() => {
      this.visible = true;
      this.emit('show');
    });

    hide = vi.fn(() => {
      this.visible = false;
      this.focused = false;
      this.emit('hide');
    });

    focus = vi.fn(() => {
      this.focused = true;
    });

    isVisible = () => this.visible;
    isFocused = () => this.focused;
    isDestroyed = () => this.destroyed;
    getSize = () => [760, 560] as [number, number];
    destroy = () => {
      this.destroyed = true;
      this.emit('closed');
    };
  }

  const windows: MockBrowserWindow[] = [];
  class BrowserWindow extends MockBrowserWindow {
    constructor(options: unknown) {
      super(options);
      windows.push(this);
    }
  }

  return {
    windows,
    BrowserWindow,
    screen: {
      getCursorScreenPoint: vi.fn(() => ({ x: 100, y: 100 })),
      getDisplayNearestPoint: vi.fn(() => ({
        workArea: { x: 0, y: 0, width: 1280, height: 800 },
      })),
    },
  };
});

vi.mock('electron', () => ({
  BrowserWindow: electronMock.BrowserWindow,
  screen: electronMock.screen,
  shell: {
    openExternal: vi.fn(async () => undefined),
  },
}));

import { createQuickChatWindowController } from './quick-chat-window';

describe('quick-chat-window', () => {
  beforeEach(() => {
    electronMock.windows.length = 0;
    process.env['ELECTRON_RENDERER_URL'] = 'http://localhost:5173';
  });

  it('should open and hide on toggle', async () => {
    const ensureSessionId = vi.fn(async () => 'session-1');
    const controller = createQuickChatWindowController({
      preloadPath: '/tmp/preload.js',
      isQuitting: () => false,
      ensureSessionId,
    });

    await controller.toggle();
    const window = electronMock.windows[0];
    expect(ensureSessionId).toHaveBeenCalledTimes(1);
    expect(window.loadURL).toHaveBeenCalledTimes(1);
    expect(window.show).toHaveBeenCalledTimes(1);
    expect(window.focus).toHaveBeenCalledTimes(1);

    await controller.toggle();
    expect(window.hide).toHaveBeenCalledTimes(1);
  });

  it('should expose state with quick-chat session id', async () => {
    const controller = createQuickChatWindowController({
      preloadPath: '/tmp/preload.js',
      isQuitting: () => false,
      ensureSessionId: async () => 'quick-session',
    });

    await controller.open();
    const state = await controller.getState();

    expect(state).toEqual({
      visible: true,
      focused: true,
      sessionId: 'quick-session',
    });
  });

  it('should update in-memory session id through setSessionId', async () => {
    const controller = createQuickChatWindowController({
      preloadPath: '/tmp/preload.js',
      isQuitting: () => false,
      ensureSessionId: async () => null,
    });

    controller.setSessionId('  quick-session-next  ');
    await expect(controller.getState()).resolves.toEqual({
      visible: false,
      focused: false,
      sessionId: 'quick-session-next',
    });

    controller.setSessionId(null);
    await expect(controller.getState()).resolves.toEqual({
      visible: false,
      focused: false,
      sessionId: null,
    });
  });

  it('should serialize concurrent session resolution and window creation', async () => {
    let releaseSessionId: ((value: string) => void) | null = null;
    const ensureSessionId = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          releaseSessionId = resolve;
        })
    );
    const controller = createQuickChatWindowController({
      preloadPath: '/tmp/preload.js',
      isQuitting: () => false,
      ensureSessionId,
    });

    const firstToggle = controller.toggle();
    const secondToggle = controller.toggle();
    expect(releaseSessionId).not.toBeNull();
    releaseSessionId?.('quick-session');
    await Promise.all([firstToggle, secondToggle]);

    await expect(controller.getState()).resolves.toMatchObject({
      sessionId: 'quick-session',
    });
    expect(ensureSessionId).toHaveBeenCalledTimes(1);
    expect(electronMock.windows).toHaveLength(1);
  });
});
