import { okResult, toAppRuntimeErrorResult, type IpcMainLike, asObjectRecord } from '../shared.js';
import type { RegisterRuntimeIpcDeps } from './contracts.js';

const parseSkipVersionPayload = (
  payload: unknown
): { isValid: boolean; version: string | null | undefined } => {
  if (typeof payload === 'undefined') return { isValid: true, version: undefined };
  if (!payload || typeof payload !== 'object') {
    return { isValid: false, version: undefined };
  }
  const input = asObjectRecord(payload);
  const candidate = input.version;
  if (candidate === undefined) return { isValid: true, version: undefined };
  if (candidate === null) return { isValid: true, version: null };
  if (typeof candidate === 'string') return { isValid: true, version: candidate };
  return { isValid: false, version: undefined };
};

export const registerUpdateIpcHandlers = (
  ipcMain: IpcMainLike,
  deps: Pick<RegisterRuntimeIpcDeps, 'updates' | 'openExternal'>
): void => {
  ipcMain.handle('updates:getState', () => {
    try {
      return okResult(deps.updates.getState());
    } catch (error) {
      return toAppRuntimeErrorResult(error);
    }
  });
  ipcMain.handle('updates:getSettings', () => {
    try {
      return okResult(deps.updates.getSettings());
    } catch (error) {
      return toAppRuntimeErrorResult(error);
    }
  });
  ipcMain.handle('updates:setAutoDownload', (_event, payload) => {
    const input = asObjectRecord(payload);
    if (typeof input.enabled !== 'boolean') {
      return {
        ok: false,
        error: {
          code: 'SYSTEM_API_ERROR',
          message: 'Invalid auto-download payload.',
        },
      };
    }
    try {
      return okResult(deps.updates.setAutoDownload(input.enabled));
    } catch (error) {
      return toAppRuntimeErrorResult(error);
    }
  });
  ipcMain.handle('updates:checkForUpdates', async () => {
    try {
      return okResult(await deps.updates.checkForUpdates({ interactive: true }));
    } catch (error) {
      return toAppRuntimeErrorResult(error);
    }
  });
  ipcMain.handle('updates:downloadUpdate', async () => {
    try {
      return okResult(await deps.updates.downloadUpdate());
    } catch (error) {
      return toAppRuntimeErrorResult(error);
    }
  });
  ipcMain.handle('updates:restartToInstall', () => {
    try {
      deps.updates.restartToInstall();
      return okResult(undefined);
    } catch (error) {
      return toAppRuntimeErrorResult(error);
    }
  });
  ipcMain.handle('updates:skipVersion', (_event, payload) => {
    const { isValid, version } = parseSkipVersionPayload(payload);
    if (!isValid) {
      return {
        ok: false,
        error: {
          code: 'SYSTEM_API_ERROR',
          message: 'Invalid skipped version payload.',
        },
      };
    }
    try {
      return okResult(deps.updates.skipVersion(version));
    } catch (error) {
      return toAppRuntimeErrorResult(error);
    }
  });
  ipcMain.handle('updates:openReleaseNotes', async () => {
    try {
      const url = deps.updates.getState().releaseNotesUrl;
      if (!url) {
        throw new Error('Release notes URL is unavailable.');
      }
      const opened = await deps.openExternal(url);
      if (!opened) {
        throw new Error('Failed to open release notes URL.');
      }
      return okResult(undefined);
    } catch (error) {
      return toAppRuntimeErrorResult(error);
    }
  });
  ipcMain.handle('updates:openDownloadPage', async () => {
    try {
      const opened = await deps.openExternal('https://www.moryflow.com/download');
      if (!opened) {
        throw new Error('Failed to open download page.');
      }
      return okResult(undefined);
    } catch (error) {
      return toAppRuntimeErrorResult(error);
    }
  });
};
