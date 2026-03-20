import type { IpcMainLike } from './types.js';

import {
  batchDeleteMemoryFactsIpc,
  batchUpdateMemoryFactsIpc,
  createMemoryExportIpc,
  createMemoryFactIpc,
  deleteMemoryFactIpc,
  feedbackMemoryFactIpc,
  getMemoryEntityDetailIpc,
  getMemoryExportIpc,
  getMemoryFactDetailIpc,
  getMemoryFactHistoryIpc,
  getMemoryOverviewIpc,
  listMemoryFactsIpc,
  queryMemoryGraphIpc,
  searchMemoryIpc,
  updateMemoryFactIpc,
} from './memory-handlers.js';

export const registerMemoryIpcHandlers = (input: {
  ipcMain: IpcMainLike;
  memoryIpcDeps: Parameters<typeof getMemoryOverviewIpc>[0];
}) => {
  const { ipcMain, memoryIpcDeps } = input;

  ipcMain.handle('memory:getOverview', () => getMemoryOverviewIpc(memoryIpcDeps));
  ipcMain.handle('memory:search', (_event, payload) =>
    searchMemoryIpc(memoryIpcDeps, payload ?? {})
  );
  ipcMain.handle('memory:listFacts', (_event, payload) =>
    listMemoryFactsIpc(memoryIpcDeps, payload ?? {})
  );
  ipcMain.handle('memory:getFactDetail', (_event, payload) =>
    getMemoryFactDetailIpc(memoryIpcDeps, typeof payload?.factId === 'string' ? payload.factId : '')
  );
  ipcMain.handle('memory:createFact', (_event, payload) =>
    createMemoryFactIpc(memoryIpcDeps, payload ?? {})
  );
  ipcMain.handle('memory:updateFact', (_event, payload) =>
    updateMemoryFactIpc(memoryIpcDeps, payload ?? {})
  );
  ipcMain.handle('memory:deleteFact', (_event, payload) =>
    deleteMemoryFactIpc(memoryIpcDeps, typeof payload?.factId === 'string' ? payload.factId : '')
  );
  ipcMain.handle('memory:batchUpdateFacts', (_event, payload) =>
    batchUpdateMemoryFactsIpc(memoryIpcDeps, payload ?? {})
  );
  ipcMain.handle('memory:batchDeleteFacts', (_event, payload) =>
    batchDeleteMemoryFactsIpc(memoryIpcDeps, payload ?? {})
  );
  ipcMain.handle('memory:getFactHistory', (_event, payload) =>
    getMemoryFactHistoryIpc(
      memoryIpcDeps,
      typeof payload?.factId === 'string' ? payload.factId : ''
    )
  );
  ipcMain.handle('memory:feedbackFact', (_event, payload) =>
    feedbackMemoryFactIpc(memoryIpcDeps, payload ?? {})
  );
  ipcMain.handle('memory:queryGraph', (_event, payload) =>
    queryMemoryGraphIpc(memoryIpcDeps, payload ?? {})
  );
  ipcMain.handle('memory:getEntityDetail', (_event, payload) =>
    getMemoryEntityDetailIpc(memoryIpcDeps, {
      entityId: typeof payload?.entityId === 'string' ? payload.entityId : '',
      ...(payload?.metadata && typeof payload.metadata === 'object'
        ? { metadata: payload.metadata as Record<string, unknown> }
        : {}),
    })
  );
  ipcMain.handle('memory:createExport', () => createMemoryExportIpc(memoryIpcDeps));
  ipcMain.handle('memory:getExport', (_event, payload) =>
    getMemoryExportIpc(memoryIpcDeps, typeof payload?.exportId === 'string' ? payload.exportId : '')
  );
};
