import { resetApp } from '../../maintenance/reset-app.js';
import { type IpcMainLike } from './shared.js';
import { registerAppRuntimeIpcHandlers } from './runtime/app-runtime-register.js';
import type { RegisterRuntimeIpcDeps } from './runtime/contracts.js';
import { registerQuickChatIpcHandlers } from './runtime/quick-chat-register.js';
import { registerShellIpcHandlers } from './runtime/shell-register.js';
import { registerUpdateIpcHandlers } from './runtime/updates-register.js';

export const registerRuntimeIpcHandlers = (
  ipcMain: IpcMainLike,
  deps: RegisterRuntimeIpcDeps
): void => {
  ipcMain.handle('app:getVersion', () => deps.appVersion());
  ipcMain.handle('app:resetApp', () => resetApp());
  registerQuickChatIpcHandlers(ipcMain, deps.quickChat);
  registerAppRuntimeIpcHandlers(ipcMain, deps.appRuntime);
  registerUpdateIpcHandlers(ipcMain, {
    updates: deps.updates,
    openExternal: deps.openExternal,
  });
  registerShellIpcHandlers(ipcMain, deps.openExternal);
};
