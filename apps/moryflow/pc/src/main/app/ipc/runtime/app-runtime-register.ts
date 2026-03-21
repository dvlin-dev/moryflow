import { okResult, toAppRuntimeErrorResult, type IpcMainLike, asObjectRecord } from '../shared.js';
import type { RegisterRuntimeIpcDeps } from './contracts.js';

export const registerAppRuntimeIpcHandlers = (
  ipcMain: IpcMainLike,
  appRuntime: RegisterRuntimeIpcDeps['appRuntime']
): void => {
  ipcMain.handle('app-runtime:getCloseBehavior', () => {
    try {
      return okResult(appRuntime.getCloseBehavior());
    } catch (error) {
      return toAppRuntimeErrorResult(error);
    }
  });
  ipcMain.handle('app-runtime:setCloseBehavior', (_event, payload) => {
    const input = asObjectRecord(payload);
    const behavior = input.behavior;
    if (behavior !== 'hide_to_menubar' && behavior !== 'quit') {
      return {
        ok: false,
        error: {
          code: 'SYSTEM_API_ERROR',
          message: 'Invalid close behavior.',
        },
      };
    }
    try {
      return okResult(appRuntime.setCloseBehavior(behavior));
    } catch (error) {
      return toAppRuntimeErrorResult(error);
    }
  });
  ipcMain.handle('app-runtime:getLaunchAtLogin', () => {
    try {
      return okResult(appRuntime.getLaunchAtLogin());
    } catch (error) {
      return toAppRuntimeErrorResult(error);
    }
  });
  ipcMain.handle('app-runtime:setLaunchAtLogin', (_event, payload) => {
    const input = asObjectRecord(payload);
    if (typeof input.enabled !== 'boolean') {
      return {
        ok: false,
        error: {
          code: 'SYSTEM_API_ERROR',
          message: 'Invalid launch-at-login payload.',
        },
      };
    }
    try {
      return okResult(appRuntime.setLaunchAtLogin(input.enabled));
    } catch (error) {
      return toAppRuntimeErrorResult(error);
    }
  });
};
