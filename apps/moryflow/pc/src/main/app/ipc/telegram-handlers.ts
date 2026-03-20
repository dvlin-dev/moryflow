import type { IpcMainLike } from './types.js';

export const registerTelegramIpcHandlers = (input: {
  ipcMain: IpcMainLike;
  deps: {
    telegramChannelService: {
      isSecretStorageAvailable: () => unknown;
      getSettings: () => unknown;
      updateSettings: (...args: any[]) => unknown;
      getStatus: () => unknown;
      listPairingRequests: (...args: any[]) => unknown;
      testProxyConnection: (...args: any[]) => unknown;
      detectProxySuggestion: (...args: any[]) => unknown;
      approvePairingRequest: (requestId: string) => Promise<void>;
      denyPairingRequest: (requestId: string) => Promise<void>;
      listKnownChats: () => unknown;
    };
  };
}) => {
  const { ipcMain, deps } = input;

  ipcMain.handle('telegram:isSecureStorageAvailable', () =>
    deps.telegramChannelService.isSecretStorageAvailable()
  );
  ipcMain.handle('telegram:getSettings', () => deps.telegramChannelService.getSettings());
  ipcMain.handle('telegram:updateSettings', (_event, payload) => {
    const account = payload?.account;
    const accountId = typeof account?.accountId === 'string' ? account.accountId : '';
    if (!accountId) {
      throw new Error('telegram accountId is required');
    }
    const defaultAccountId =
      typeof payload?.defaultAccountId === 'string' ? payload.defaultAccountId : undefined;
    return deps.telegramChannelService.updateSettings({
      defaultAccountId,
      account: {
        ...account,
        accountId,
      },
    });
  });
  ipcMain.handle('telegram:getStatus', () => deps.telegramChannelService.getStatus());
  ipcMain.handle('telegram:listPairingRequests', (_event, payload) => {
    const accountId = typeof payload?.accountId === 'string' ? payload.accountId : undefined;
    const status =
      payload?.status === 'pending' ||
      payload?.status === 'approved' ||
      payload?.status === 'denied' ||
      payload?.status === 'expired'
        ? payload.status
        : undefined;
    return deps.telegramChannelService.listPairingRequests({ accountId, status });
  });
  ipcMain.handle('telegram:testProxyConnection', (_event, payload) => {
    const accountId = typeof payload?.accountId === 'string' ? payload.accountId : '';
    if (!accountId.trim()) {
      throw new Error('accountId is required');
    }
    const proxyEnabled =
      typeof payload?.proxyEnabled === 'boolean' ? payload.proxyEnabled : undefined;
    const proxyUrl = typeof payload?.proxyUrl === 'string' ? payload.proxyUrl : undefined;
    return deps.telegramChannelService.testProxyConnection({
      accountId,
      proxyEnabled,
      proxyUrl,
    });
  });
  ipcMain.handle('telegram:detectProxySuggestion', (_event, payload) => {
    const accountId = typeof payload?.accountId === 'string' ? payload.accountId : '';
    if (!accountId.trim()) {
      throw new Error('accountId is required');
    }
    return deps.telegramChannelService.detectProxySuggestion({ accountId });
  });
  ipcMain.handle('telegram:approvePairingRequest', async (_event, payload) => {
    const requestId = typeof payload?.requestId === 'string' ? payload.requestId : '';
    if (!requestId) {
      throw new Error('requestId is required');
    }
    await deps.telegramChannelService.approvePairingRequest(requestId);
    return { ok: true };
  });
  ipcMain.handle('telegram:denyPairingRequest', async (_event, payload) => {
    const requestId = typeof payload?.requestId === 'string' ? payload.requestId : '';
    if (!requestId) {
      throw new Error('requestId is required');
    }
    await deps.telegramChannelService.denyPairingRequest(requestId);
    return { ok: true };
  });
  ipcMain.handle('telegram:listKnownChats', () => deps.telegramChannelService.listKnownChats());
};
