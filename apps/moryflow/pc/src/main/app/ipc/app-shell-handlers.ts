import type { IpcMainLike } from './types.js';

import type {
  AppCloseBehavior,
  AppRuntimeErrorCode,
  AppRuntimeResult,
  AppUpdateSettings,
  AppUpdateState,
  LaunchAtLoginState,
  QuickChatWindowState,
} from '../../../shared/ipc.js';

type AppRuntimeApi = {
  getCloseBehavior: () => AppCloseBehavior;
  setCloseBehavior: (behavior: AppCloseBehavior) => AppCloseBehavior;
  getLaunchAtLogin: () => LaunchAtLoginState;
  setLaunchAtLogin: (enabled: boolean) => LaunchAtLoginState;
};

type UpdatesApi = {
  getState: () => AppUpdateState;
  getSettings: () => AppUpdateSettings;
  setAutoDownload: (enabled: boolean) => AppUpdateSettings;
  checkForUpdates: (options?: { interactive?: boolean }) => Promise<AppUpdateState>;
  downloadUpdate: () => Promise<AppUpdateState>;
  restartToInstall: () => void;
  skipVersion: (version?: string | null) => AppUpdateSettings;
};

export const registerAppShellIpcHandlers = (input: {
  ipcMain: IpcMainLike;
  deps: {
    app: { getVersion: () => string };
    quickChat: {
      toggle: () => Promise<void>;
      open: () => Promise<void>;
      close: () => Promise<void>;
      getState: () => Promise<QuickChatWindowState>;
      setSessionId: (sessionId: string | null) => Promise<void>;
    };
    appRuntime: AppRuntimeApi;
    updates: UpdatesApi;
    externalLinkPolicy: unknown;
    openExternalSafe: (...args: any[]) => Promise<boolean>;
    parseSkipVersionPayload: (payload: unknown) => {
      isValid: boolean;
      version: string | null | undefined;
    };
    okResult: <T>(data: T) => AppRuntimeResult<T>;
    toAppRuntimeErrorResult: <T>(error: unknown) => AppRuntimeResult<T>;
    resetApp: (...args: any[]) => Promise<unknown>;
  };
}) => {
  const { ipcMain, deps } = input;

  ipcMain.handle('app:getVersion', () => deps.app.getVersion());
  ipcMain.handle('quick-chat:toggle', async () => {
    await deps.quickChat.toggle();
  });
  ipcMain.handle('quick-chat:open', async () => {
    await deps.quickChat.open();
  });
  ipcMain.handle('quick-chat:close', async () => {
    await deps.quickChat.close();
  });
  ipcMain.handle('quick-chat:getState', async () => {
    return deps.quickChat.getState();
  });
  ipcMain.handle('quick-chat:setSessionId', async (_event, payload) => {
    if (!payload || typeof payload !== 'object' || !('sessionId' in payload)) {
      throw new Error('Invalid quick-chat session id payload.');
    }
    const sessionId = (payload as { sessionId?: unknown }).sessionId;
    if (sessionId !== null && typeof sessionId !== 'string') {
      throw new Error('Invalid quick-chat session id payload.');
    }
    await deps.quickChat.setSessionId(sessionId);
  });
  ipcMain.handle('app-runtime:getCloseBehavior', () => {
    try {
      return deps.okResult(deps.appRuntime.getCloseBehavior());
    } catch (error) {
      return deps.toAppRuntimeErrorResult(error);
    }
  });
  ipcMain.handle('app-runtime:setCloseBehavior', (_event, payload) => {
    const behavior = payload?.behavior;
    if (behavior !== 'hide_to_menubar' && behavior !== 'quit') {
      return {
        ok: false,
        error: {
          code: 'SYSTEM_API_ERROR' satisfies AppRuntimeErrorCode,
          message: 'Invalid close behavior.',
        },
      } satisfies AppRuntimeResult<AppCloseBehavior>;
    }
    try {
      return deps.okResult(deps.appRuntime.setCloseBehavior(behavior));
    } catch (error) {
      return deps.toAppRuntimeErrorResult(error);
    }
  });
  ipcMain.handle('app-runtime:getLaunchAtLogin', () => {
    try {
      return deps.okResult(deps.appRuntime.getLaunchAtLogin());
    } catch (error) {
      return deps.toAppRuntimeErrorResult(error);
    }
  });
  ipcMain.handle('app-runtime:setLaunchAtLogin', (_event, payload) => {
    if (typeof payload?.enabled !== 'boolean') {
      return {
        ok: false,
        error: {
          code: 'SYSTEM_API_ERROR' satisfies AppRuntimeErrorCode,
          message: 'Invalid launch-at-login payload.',
        },
      } satisfies AppRuntimeResult<LaunchAtLoginState>;
    }
    try {
      return deps.okResult(deps.appRuntime.setLaunchAtLogin(payload.enabled));
    } catch (error) {
      return deps.toAppRuntimeErrorResult(error);
    }
  });
  ipcMain.handle('updates:getState', () => {
    try {
      return deps.okResult(deps.updates.getState());
    } catch (error) {
      return deps.toAppRuntimeErrorResult(error);
    }
  });
  ipcMain.handle('updates:getSettings', () => {
    try {
      return deps.okResult(deps.updates.getSettings());
    } catch (error) {
      return deps.toAppRuntimeErrorResult(error);
    }
  });
  ipcMain.handle('updates:setAutoDownload', (_event, payload) => {
    if (typeof payload?.enabled !== 'boolean') {
      return {
        ok: false,
        error: {
          code: 'SYSTEM_API_ERROR' satisfies AppRuntimeErrorCode,
          message: 'Invalid auto-download payload.',
        },
      } satisfies AppRuntimeResult<AppUpdateSettings>;
    }
    try {
      return deps.okResult(deps.updates.setAutoDownload(payload.enabled));
    } catch (error) {
      return deps.toAppRuntimeErrorResult(error);
    }
  });
  ipcMain.handle('updates:checkForUpdates', async () => {
    try {
      return deps.okResult(await deps.updates.checkForUpdates({ interactive: true }));
    } catch (error) {
      return deps.toAppRuntimeErrorResult(error);
    }
  });
  ipcMain.handle('updates:downloadUpdate', async () => {
    try {
      return deps.okResult(await deps.updates.downloadUpdate());
    } catch (error) {
      return deps.toAppRuntimeErrorResult(error);
    }
  });
  ipcMain.handle('updates:restartToInstall', () => {
    try {
      deps.updates.restartToInstall();
      return deps.okResult(undefined);
    } catch (error) {
      return deps.toAppRuntimeErrorResult(error);
    }
  });
  ipcMain.handle('updates:skipVersion', (_event, payload) => {
    const { isValid, version } = deps.parseSkipVersionPayload(payload);
    if (!isValid) {
      return {
        ok: false,
        error: {
          code: 'SYSTEM_API_ERROR' satisfies AppRuntimeErrorCode,
          message: 'Invalid skipped version payload.',
        },
      } satisfies AppRuntimeResult<AppUpdateSettings>;
    }
    try {
      return deps.okResult(deps.updates.skipVersion(version));
    } catch (error) {
      return deps.toAppRuntimeErrorResult(error);
    }
  });
  ipcMain.handle('updates:openReleaseNotes', async () => {
    try {
      const url = deps.updates.getState().releaseNotesUrl;
      if (!url) {
        throw new Error('Release notes URL is unavailable.');
      }
      const opened = await deps.openExternalSafe(url, deps.externalLinkPolicy);
      if (!opened) {
        throw new Error('Failed to open release notes URL.');
      }
      return deps.okResult(undefined);
    } catch (error) {
      return deps.toAppRuntimeErrorResult(error);
    }
  });
  ipcMain.handle('updates:openDownloadPage', async () => {
    try {
      const opened = await deps.openExternalSafe(
        'https://www.moryflow.com/download',
        deps.externalLinkPolicy
      );
      if (!opened) {
        throw new Error('Failed to open download page.');
      }
      return deps.okResult(undefined);
    } catch (error) {
      return deps.toAppRuntimeErrorResult(error);
    }
  });
  ipcMain.handle('shell:openExternal', async (_event, payload) => {
    const url = typeof payload?.url === 'string' ? payload.url : '';
    if (!url) {
      return false;
    }
    return deps.openExternalSafe(url, deps.externalLinkPolicy);
  });
  ipcMain.handle('app:resetApp', () => deps.resetApp());
};
