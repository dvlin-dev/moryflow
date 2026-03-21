import { BrowserWindow } from 'electron';
import type { IpcMain } from 'electron';
import type { AppRuntimeErrorCode, AppRuntimeResult } from '../../../shared/ipc.js';

export type IpcMainLike = Pick<IpcMain, 'handle' | 'on'>;

export const asObjectRecord = (payload: unknown): Record<string, unknown> =>
  payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};

export const broadcastToAllWindows = <T>(channel: string, payload: T): void => {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload);
  }
};

export const toAppRuntimeErrorResult = <T>(error: unknown): AppRuntimeResult<T> => {
  const codeValue =
    typeof error === 'object' && error && 'code' in error ? (error as { code?: unknown }).code : '';
  const code: AppRuntimeErrorCode =
    codeValue === 'UNSUPPORTED_PLATFORM' || codeValue === 'SYSTEM_API_ERROR'
      ? codeValue
      : 'SYSTEM_API_ERROR';
  const message =
    error instanceof Error && error.message.trim().length > 0
      ? error.message
      : 'App runtime operation failed.';
  return {
    ok: false,
    error: {
      code,
      message,
    },
  };
};

export const okResult = <T>(data: T): AppRuntimeResult<T> => ({
  ok: true,
  data,
});
