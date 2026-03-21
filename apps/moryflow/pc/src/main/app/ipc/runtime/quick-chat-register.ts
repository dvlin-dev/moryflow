import { type IpcMainLike, asObjectRecord } from '../shared.js';
import type { RegisterRuntimeIpcDeps } from './contracts.js';

export const registerQuickChatIpcHandlers = (
  ipcMain: IpcMainLike,
  quickChat: RegisterRuntimeIpcDeps['quickChat']
): void => {
  ipcMain.handle('quick-chat:toggle', async () => {
    await quickChat.toggle();
  });
  ipcMain.handle('quick-chat:open', async () => {
    await quickChat.open();
  });
  ipcMain.handle('quick-chat:close', async () => {
    await quickChat.close();
  });
  ipcMain.handle('quick-chat:getState', async () => quickChat.getState());
  ipcMain.handle('quick-chat:setSessionId', async (_event, payload) => {
    const input = asObjectRecord(payload);
    if (!('sessionId' in input)) {
      throw new Error('Invalid quick-chat session id payload.');
    }
    const sessionId = input.sessionId;
    if (sessionId !== null && typeof sessionId !== 'string') {
      throw new Error('Invalid quick-chat session id payload.');
    }
    await quickChat.setSessionId(sessionId);
  });
};
