import { type IpcMainLike, asObjectRecord } from '../shared.js';

export const registerShellIpcHandlers = (
  ipcMain: IpcMainLike,
  openExternal: (url: string) => Promise<boolean>
): void => {
  ipcMain.handle('shell:openExternal', async (_event, payload) => {
    const input = asObjectRecord(payload);
    const url = typeof input.url === 'string' ? input.url : '';
    if (!url) {
      return false;
    }
    return openExternal(url);
  });
};
