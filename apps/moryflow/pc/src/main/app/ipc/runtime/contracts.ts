import type {
  AppCloseBehavior,
  AppUpdateSettings,
  AppUpdateState,
  LaunchAtLoginState,
  QuickChatWindowState,
} from '../../../../shared/ipc.js';

export type RegisterRuntimeIpcDeps = {
  appVersion: () => string;
  quickChat: {
    toggle: () => Promise<void>;
    open: () => Promise<void>;
    close: () => Promise<void>;
    getState: () => Promise<QuickChatWindowState>;
    setSessionId: (sessionId: string | null) => Promise<void>;
  };
  appRuntime: {
    getCloseBehavior: () => AppCloseBehavior;
    setCloseBehavior: (behavior: AppCloseBehavior) => AppCloseBehavior;
    getLaunchAtLogin: () => LaunchAtLoginState;
    setLaunchAtLogin: (enabled: boolean) => LaunchAtLoginState;
  };
  updates: {
    getState: () => AppUpdateState;
    getSettings: () => AppUpdateSettings;
    setAutoDownload: (enabled: boolean) => AppUpdateSettings;
    checkForUpdates: (options?: { interactive?: boolean }) => Promise<AppUpdateState>;
    downloadUpdate: () => Promise<AppUpdateState>;
    restartToInstall: () => void;
    skipVersion: (version?: string | null) => AppUpdateSettings;
  };
  openExternal: (url: string) => Promise<boolean>;
};
