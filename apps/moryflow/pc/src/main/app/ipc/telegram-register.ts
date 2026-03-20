import { telegramChannelService } from '../../channels/telegram/index.js';
import { type IpcMainLike, asObjectRecord, broadcastToAllWindows } from './shared.js';

export const registerTelegramIpcHandlers = (ipcMain: IpcMainLike): void => {
  ipcMain.handle('telegram:isSecureStorageAvailable', () =>
    telegramChannelService.isSecretStorageAvailable()
  );
  ipcMain.handle('telegram:getSettings', () => telegramChannelService.getSettings());
  ipcMain.handle('telegram:updateSettings', (_event, payload) => {
    const input = asObjectRecord(payload);
    const account =
      input.account && typeof input.account === 'object'
        ? (input.account as Record<string, unknown>)
        : {};
    const accountId = typeof account.accountId === 'string' ? account.accountId : '';
    if (!accountId) {
      throw new Error('telegram accountId is required');
    }
    const defaultAccountId =
      typeof input.defaultAccountId === 'string' ? input.defaultAccountId : undefined;
    return telegramChannelService.updateSettings({
      defaultAccountId,
      account: {
        ...account,
        accountId,
      },
    });
  });
  ipcMain.handle('telegram:getStatus', () => telegramChannelService.getStatus());
  ipcMain.handle('telegram:listPairingRequests', (_event, payload) => {
    const input = asObjectRecord(payload);
    const accountId = typeof input.accountId === 'string' ? input.accountId : undefined;
    const status =
      input.status === 'pending' ||
      input.status === 'approved' ||
      input.status === 'denied' ||
      input.status === 'expired'
        ? input.status
        : undefined;
    return telegramChannelService.listPairingRequests({ accountId, status });
  });
  ipcMain.handle('telegram:testProxyConnection', (_event, payload) => {
    const input = asObjectRecord(payload);
    const accountId = typeof input.accountId === 'string' ? input.accountId : '';
    if (!accountId.trim()) {
      throw new Error('accountId is required');
    }
    const proxyEnabled = typeof input.proxyEnabled === 'boolean' ? input.proxyEnabled : undefined;
    const proxyUrl = typeof input.proxyUrl === 'string' ? input.proxyUrl : undefined;
    return telegramChannelService.testProxyConnection({
      accountId,
      proxyEnabled,
      proxyUrl,
    });
  });
  ipcMain.handle('telegram:detectProxySuggestion', (_event, payload) => {
    const input = asObjectRecord(payload);
    const accountId = typeof input.accountId === 'string' ? input.accountId : '';
    if (!accountId.trim()) {
      throw new Error('accountId is required');
    }
    return telegramChannelService.detectProxySuggestion({
      accountId,
    });
  });
  ipcMain.handle('telegram:approvePairingRequest', async (_event, payload) => {
    const input = asObjectRecord(payload);
    const requestId = typeof input.requestId === 'string' ? input.requestId : '';
    if (!requestId) {
      throw new Error('requestId is required');
    }
    await telegramChannelService.approvePairingRequest(requestId);
    return { ok: true };
  });
  ipcMain.handle('telegram:denyPairingRequest', async (_event, payload) => {
    const input = asObjectRecord(payload);
    const requestId = typeof input.requestId === 'string' ? input.requestId : '';
    if (!requestId) {
      throw new Error('requestId is required');
    }
    await telegramChannelService.denyPairingRequest(requestId);
    return { ok: true };
  });
  ipcMain.handle('telegram:listKnownChats', () => telegramChannelService.listKnownChats());

  telegramChannelService.subscribeStatus((status) => {
    broadcastToAllWindows('telegram:status-changed', status);
  });
};
