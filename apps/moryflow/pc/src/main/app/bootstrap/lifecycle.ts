import type { VaultItem } from '../../../shared/ipc.js';
import type { MenubarController } from '../menubar/menubar-controller.js';
import type { QuickChatWindowController } from '../windows/quick-chat/quick-chat-window.js';
import type { UnreadMessageEvent } from '../menubar/unread-menubar-handler.js';

export type AppLifecycleState = {
  quickChatWindowController: QuickChatWindowController;
  menubarController: MenubarController | null;
  disposeMessageEventSubscription: () => void;
};

export const createAppLifecycle = (input: {
  platform: NodeJS.Platform;
  launchedFromLoginItem: boolean;
  isE2EReset: boolean;
  app: { getPath: (name: 'logs') => string };
  initializeChatDebugLogging: (logsPath: string) => string | null;
  shutdownChatDebugLogging: () => void;
  setVaults: (vaults: VaultItem[]) => void;
  setActiveVaultId: (id: string | null) => void;
  setMigrated: (migrated: boolean) => void;
  migrateVaultData: () => void;
  initSandboxService: () => void;
  registerIpcHandlers: (quickChatWindowController: QuickChatWindowController) => void;
  registerChatHandlers: () => void;
  registerSitePublishHandlers: () => void;
  initTelegramChannelForAppStartup: (service: { init: () => Promise<void> }) => Promise<void>;
  telegramChannelService: { init: () => Promise<void>; shutdown: () => Promise<void> };
  automationService: { init: () => void; shutdown: () => void };
  createQuickChatWindowController: () => QuickChatWindowController;
  createMenubarController: () => MenubarController;
  openMainWindowWithDeepLinkFlush: () => Promise<void>;
  subscribeMessageEvents: (handler: (event: UnreadMessageEvent) => void) => () => void;
  handleUnreadFromMessageEvent: (event: UnreadMessageEvent) => void;
  registerQuickChatShortcut: (quickChatWindowController: QuickChatWindowController) => void;
  globalShortcut: { unregisterAll: () => void };
  unreadRevisionTracker: { clear: () => void };
  updateService: { scheduleAutomaticChecks: () => void; dispose: () => void };
}) => {
  const start = async (): Promise<AppLifecycleState> => {
    const chatDebugLogPath = input.initializeChatDebugLogging(input.app.getPath('logs'));
    if (chatDebugLogPath) {
      console.log('[chat-debug] log file:', chatDebugLogPath);
    } else {
      console.warn('[chat-debug] file logging disabled; fallback to console-only logging');
    }

    if (input.isE2EReset) {
      input.setVaults([]);
      input.setActiveVaultId(null);
      input.setMigrated(true);
    } else {
      input.migrateVaultData();
    }

    input.initSandboxService();

    const quickChatWindowController = input.createQuickChatWindowController();
    input.registerIpcHandlers(quickChatWindowController);
    input.registerChatHandlers();
    input.registerSitePublishHandlers();
    await input.initTelegramChannelForAppStartup(input.telegramChannelService);
    input.automationService.init();

    const menubarController = input.platform === 'darwin' ? input.createMenubarController() : null;
    const disposeMessageEventSubscription = input.subscribeMessageEvents(
      input.handleUnreadFromMessageEvent
    );

    input.registerQuickChatShortcut(quickChatWindowController);
    input.updateService.scheduleAutomaticChecks();

    if (!input.launchedFromLoginItem) {
      await input.openMainWindowWithDeepLinkFlush();
    }

    return {
      quickChatWindowController,
      menubarController,
      disposeMessageEventSubscription,
    };
  };

  const shutdown = (state: AppLifecycleState) => {
    input.globalShortcut.unregisterAll();
    state.disposeMessageEventSubscription();
    state.quickChatWindowController.destroy();
    state.menubarController?.destroy();
    input.unreadRevisionTracker.clear();
    input.updateService.dispose();
    input.automationService.shutdown();
    void input.telegramChannelService.shutdown();
    input.shutdownChatDebugLogging();
  };

  return {
    start,
    shutdown,
  };
};
