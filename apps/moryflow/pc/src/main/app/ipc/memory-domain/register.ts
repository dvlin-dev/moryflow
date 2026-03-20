import type {
  MemoryBatchDeleteFactsInput,
  MemoryBatchUpdateFactsInput,
  MemoryCreateFactInput,
  MemoryFeedbackInput,
  MemoryGraphQueryInput,
  MemoryListFactsInput,
  MemorySearchInput,
  MemoryUpdateFactInput,
} from '../../../../shared/ipc/memory.js';
import { asObjectRecord, type IpcMainLike } from '../shared.js';
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
  listMemoryFactsIpc,
  queryMemoryGraphIpc,
  searchMemoryIpc,
  updateMemoryFactIpc,
} from './facts.js';
import { getMemoryOverviewIpc } from './overview.js';
import type { MemoryIpcDeps } from './shared.js';

export const registerMemoryIpcHandlers = (ipcMain: IpcMainLike, deps: MemoryIpcDeps): void => {
  ipcMain.handle('memory:getOverview', () => getMemoryOverviewIpc(deps));
  ipcMain.handle('memory:search', (_event, payload) =>
    searchMemoryIpc(deps, asObjectRecord(payload) as MemorySearchInput)
  );
  ipcMain.handle('memory:listFacts', (_event, payload) =>
    listMemoryFactsIpc(deps, asObjectRecord(payload) as MemoryListFactsInput)
  );
  ipcMain.handle('memory:getFactDetail', (_event, payload) => {
    const input = asObjectRecord(payload);
    return getMemoryFactDetailIpc(deps, typeof input.factId === 'string' ? input.factId : '');
  });
  ipcMain.handle('memory:createFact', (_event, payload) =>
    createMemoryFactIpc(deps, asObjectRecord(payload) as MemoryCreateFactInput)
  );
  ipcMain.handle('memory:updateFact', (_event, payload) =>
    updateMemoryFactIpc(deps, asObjectRecord(payload) as MemoryUpdateFactInput)
  );
  ipcMain.handle('memory:deleteFact', (_event, payload) => {
    const input = asObjectRecord(payload);
    return deleteMemoryFactIpc(deps, typeof input.factId === 'string' ? input.factId : '');
  });
  ipcMain.handle('memory:batchUpdateFacts', (_event, payload) =>
    batchUpdateMemoryFactsIpc(deps, asObjectRecord(payload) as MemoryBatchUpdateFactsInput)
  );
  ipcMain.handle('memory:batchDeleteFacts', (_event, payload) =>
    batchDeleteMemoryFactsIpc(deps, asObjectRecord(payload) as MemoryBatchDeleteFactsInput)
  );
  ipcMain.handle('memory:getFactHistory', (_event, payload) => {
    const input = asObjectRecord(payload);
    return getMemoryFactHistoryIpc(deps, typeof input.factId === 'string' ? input.factId : '');
  });
  ipcMain.handle('memory:feedbackFact', (_event, payload) =>
    feedbackMemoryFactIpc(deps, asObjectRecord(payload) as MemoryFeedbackInput)
  );
  ipcMain.handle('memory:queryGraph', (_event, payload) =>
    queryMemoryGraphIpc(deps, asObjectRecord(payload) as MemoryGraphQueryInput)
  );
  ipcMain.handle('memory:getEntityDetail', (_event, payload) => {
    const input = asObjectRecord(payload);
    return getMemoryEntityDetailIpc(deps, {
      entityId: typeof input.entityId === 'string' ? input.entityId : '',
      ...(input.metadata && typeof input.metadata === 'object'
        ? { metadata: input.metadata as Record<string, unknown> }
        : {}),
    });
  });
  ipcMain.handle('memory:createExport', () => createMemoryExportIpc(deps));
  ipcMain.handle('memory:getExport', (_event, payload) => {
    const input = asObjectRecord(payload);
    return getMemoryExportIpc(deps, typeof input.exportId === 'string' ? input.exportId : '');
  });
};
