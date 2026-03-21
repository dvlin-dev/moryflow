import { type IpcMainLike, asObjectRecord } from '../shared.js';
import type { RegisterWorkspaceIpcDeps } from './contracts.js';

export const registerWorkspaceSearchIpcHandlers = (
  ipcMain: IpcMainLike,
  searchIndexService: RegisterWorkspaceIpcDeps['searchIndexService']
): void => {
  ipcMain.handle('search:query', (_event, payload) => {
    const input = asObjectRecord(payload);
    const query = typeof input.query === 'string' ? input.query : '';
    const limitPerGroup = typeof input.limitPerGroup === 'number' ? input.limitPerGroup : undefined;
    return searchIndexService.query({ query, limitPerGroup });
  });
  ipcMain.handle('search:rebuild', () => searchIndexService.rebuild());
  ipcMain.handle('search:getStatus', () => searchIndexService.getStatus());
};
