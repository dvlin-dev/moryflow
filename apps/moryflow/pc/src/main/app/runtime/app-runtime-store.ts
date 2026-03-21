import Store from 'electron-store';

export type CloseBehavior = 'hide_to_menubar' | 'quit';

type AppRuntimeStoreShape = {
  closeBehavior: CloseBehavior;
  quickChatShortcut: string;
  quickChatSessionId: string | null;
  hasShownHideToMenubarHint: boolean;
  autoDownloadUpdates: boolean;
  skippedUpdateVersion: string | null;
  lastUpdateCheckAt: string | null;
};

export const DEFAULT_CLOSE_BEHAVIOR: CloseBehavior = 'hide_to_menubar';
export const DEFAULT_QUICK_CHAT_SHORTCUT = 'CommandOrControl+Shift+M';

export const appRuntimeStore = new Store<AppRuntimeStoreShape>({
  name: 'app-runtime',
  defaults: {
    closeBehavior: DEFAULT_CLOSE_BEHAVIOR,
    quickChatShortcut: DEFAULT_QUICK_CHAT_SHORTCUT,
    quickChatSessionId: null,
    hasShownHideToMenubarHint: false,
    autoDownloadUpdates: true,
    skippedUpdateVersion: null,
    lastUpdateCheckAt: null,
  },
});

export const normalizeStoredString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};
