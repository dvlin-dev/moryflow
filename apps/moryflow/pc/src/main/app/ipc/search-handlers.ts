import type { IpcMainLike } from './types.js';

export const registerSearchIpcHandlers = (input: {
  ipcMain: IpcMainLike;
  deps: {
    searchIndexService: {
      query: (input: { query: string; limitPerGroup?: number }) => unknown;
      rebuild: () => unknown;
      getStatus: () => unknown;
    };
  };
}) => {
  const { ipcMain, deps } = input;

  ipcMain.handle('search:query', (_event, payload) => {
    const query = typeof payload?.query === 'string' ? payload.query : '';
    const limitPerGroup =
      typeof payload?.limitPerGroup === 'number' ? payload.limitPerGroup : undefined;
    return deps.searchIndexService.query({ query, limitPerGroup });
  });
  ipcMain.handle('search:rebuild', () => deps.searchIndexService.rebuild());
  ipcMain.handle('search:getStatus', () => deps.searchIndexService.getStatus());
};
