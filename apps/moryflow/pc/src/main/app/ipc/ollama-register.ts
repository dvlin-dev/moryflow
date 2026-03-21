import * as ollamaService from '../../ollama-service/index.js';
import { type IpcMainLike, asObjectRecord, broadcastToAllWindows } from './shared.js';

export const registerOllamaIpcHandlers = (ipcMain: IpcMainLike): void => {
  ipcMain.handle('ollama:checkConnection', async (_event, payload) => {
    const input = asObjectRecord(payload);
    const baseUrl = typeof input.baseUrl === 'string' ? input.baseUrl : undefined;
    return ollamaService.checkConnection(baseUrl);
  });
  ipcMain.handle('ollama:getLocalModels', async (_event, payload) => {
    const input = asObjectRecord(payload);
    const baseUrl = typeof input.baseUrl === 'string' ? input.baseUrl : undefined;
    try {
      return await ollamaService.getLocalModels(baseUrl);
    } catch (error) {
      console.error('[ollama:getLocalModels] error:', error);
      return [];
    }
  });
  ipcMain.handle('ollama:getLibraryModels', async (_event, payload) => {
    const input = asObjectRecord(payload);
    try {
      return await ollamaService.getLibraryModels({
        search: typeof input.search === 'string' ? input.search : undefined,
        capability: typeof input.capability === 'string' ? input.capability : undefined,
        sortBy:
          input.sortBy === 'pulls' || input.sortBy === 'last_updated' ? input.sortBy : undefined,
        order: input.order === 'asc' || input.order === 'desc' ? input.order : undefined,
        limit: typeof input.limit === 'number' ? input.limit : undefined,
      });
    } catch (error) {
      console.error('[ollama:getLibraryModels] error:', error);
      return [];
    }
  });
  ipcMain.handle('ollama:pullModel', async (_event, payload) => {
    const input = asObjectRecord(payload);
    const name = typeof input.name === 'string' ? input.name : '';
    const baseUrl = typeof input.baseUrl === 'string' ? input.baseUrl : undefined;

    if (!name) {
      return { success: false, error: 'Model name is required' };
    }

    try {
      await ollamaService.pullModel(
        name,
        (progress) => {
          broadcastToAllWindows('ollama:pullProgress', {
            modelName: name,
            status: progress.status,
            digest: progress.digest,
            total: progress.total,
            completed: progress.completed,
          });
        },
        baseUrl
      );
      return { success: true };
    } catch (error) {
      console.error('[ollama:pullModel] error:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
  ipcMain.handle('ollama:deleteModel', async (_event, payload) => {
    const input = asObjectRecord(payload);
    const name = typeof input.name === 'string' ? input.name : '';
    const baseUrl = typeof input.baseUrl === 'string' ? input.baseUrl : undefined;

    if (!name) {
      return { success: false, error: 'Model name is required' };
    }

    try {
      await ollamaService.deleteModel(name, baseUrl);
      return { success: true };
    } catch (error) {
      console.error('[ollama:deleteModel] error:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
};
