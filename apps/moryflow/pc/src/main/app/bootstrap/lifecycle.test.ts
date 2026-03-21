import { describe, expect, it, vi } from 'vitest';

import { createAppLifecycle } from './lifecycle.js';

describe('createAppLifecycle', () => {
  it('starts and shuts down the main-process runtime', async () => {
    const quickChatWindowController = {
      open: vi.fn(async () => undefined),
      close: vi.fn(async () => undefined),
      getState: vi.fn(async () => ({ visible: false, focused: false, sessionId: null })),
      setSessionId: vi.fn(),
      destroy: vi.fn(),
      toggle: vi.fn(async () => undefined),
    };
    const menubarController = {
      destroy: vi.fn(),
      clearUnreadCount: vi.fn(),
    };
    const disposeMessageEventSubscription = vi.fn();

    const lifecycle = createAppLifecycle({
      platform: 'darwin',
      launchedFromLoginItem: false,
      isE2EReset: false,
      app: {
        getPath: vi.fn(() => '/logs'),
      },
      initializeChatDebugLogging: vi.fn(() => '/logs/chat.log'),
      shutdownChatDebugLogging: vi.fn(),
      setVaults: vi.fn(),
      setActiveVaultId: vi.fn(),
      setMigrated: vi.fn(),
      migrateVaultData: vi.fn(),
      initSandboxService: vi.fn(),
      registerIpcHandlers: vi.fn(),
      registerChatHandlers: vi.fn(),
      registerSitePublishHandlers: vi.fn(),
      initTelegramChannelForAppStartup: vi.fn(async () => undefined),
      telegramChannelService: { shutdown: vi.fn(async () => undefined) },
      automationService: {
        init: vi.fn(),
        shutdown: vi.fn(),
      },
      createQuickChatWindowController: vi.fn(() => quickChatWindowController),
      preloadPath: '/preload.js',
      isQuitting: vi.fn(() => false),
      ensureQuickChatSessionId: vi.fn(async () => 'session-1'),
      createMenubarController: vi.fn(() => menubarController),
      openMainWindowWithDeepLinkFlush: vi.fn(async () => undefined),
      subscribeMessageEvents: vi.fn(() => disposeMessageEventSubscription),
      handleUnreadFromMessageEvent: vi.fn(),
      registerQuickChatShortcut: vi.fn(),
      globalShortcut: {
        unregisterAll: vi.fn(),
      },
      unreadRevisionTracker: {
        clear: vi.fn(),
      },
      updateService: {
        scheduleAutomaticChecks: vi.fn(),
        dispose: vi.fn(),
      },
    });

    const state = await lifecycle.start();

    expect(lifecycle.start).toBeTypeOf('function');
    expect(state.quickChatWindowController).toBe(quickChatWindowController);
    expect(state.menubarController).toBe(menubarController);

    lifecycle.shutdown(state);

    expect(quickChatWindowController.destroy).toHaveBeenCalledTimes(1);
    expect(menubarController.destroy).toHaveBeenCalledTimes(1);
    expect(disposeMessageEventSubscription).toHaveBeenCalledTimes(1);
  });
});
