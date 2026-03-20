import type { IpcMainLike } from './types.js';

export const registerOllamaIpcHandlers = (input: {
  ipcMain: IpcMainLike;
  deps: {
    ollamaService: {
      checkConnection: (...args: any[]) => unknown;
      getLocalModels: (...args: any[]) => Promise<unknown>;
      getLibraryModels: (...args: any[]) => Promise<unknown>;
      pullModel: (...args: any[]) => Promise<void>;
      deleteModel: (...args: any[]) => Promise<void>;
    };
    broadcastToAllWindows: (channel: string, payload: unknown) => void;
  };
}) => {
  const { ipcMain, deps } = input;

  ipcMain.handle('ollama:checkConnection', async (_event, payload) => {
    const baseUrl = typeof payload?.baseUrl === 'string' ? payload.baseUrl : undefined;
    return deps.ollamaService.checkConnection(baseUrl);
  });

  ipcMain.handle('ollama:getLocalModels', async (_event, payload) => {
    const baseUrl = typeof payload?.baseUrl === 'string' ? payload.baseUrl : undefined;
    try {
      return await deps.ollamaService.getLocalModels(baseUrl);
    } catch (error) {
      console.error('[ollama:getLocalModels] error:', error);
      return [];
    }
  });

  ipcMain.handle('ollama:getLibraryModels', async (_event, payload) => {
    try {
      return await deps.ollamaService.getLibraryModels({
        search: typeof payload?.search === 'string' ? payload.search : undefined,
        capability: typeof payload?.capability === 'string' ? payload.capability : undefined,
        sortBy:
          payload?.sortBy === 'pulls' || payload?.sortBy === 'last_updated'
            ? payload.sortBy
            : undefined,
        order: payload?.order === 'asc' || payload?.order === 'desc' ? payload.order : undefined,
        limit: typeof payload?.limit === 'number' ? payload.limit : undefined,
      });
    } catch (error) {
      console.error('[ollama:getLibraryModels] error:', error);
      return [];
    }
  });

  ipcMain.handle('ollama:pullModel', async (_event, payload) => {
    const name = typeof payload?.name === 'string' ? payload.name : '';
    const baseUrl = typeof payload?.baseUrl === 'string' ? payload.baseUrl : undefined;

    if (!name) {
      return { success: false, error: 'Model name is required' };
    }

    try {
      await deps.ollamaService.pullModel(
        name,
        (progress: Record<string, unknown>) => {
          deps.broadcastToAllWindows('ollama:pullProgress', {
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
    const name = typeof payload?.name === 'string' ? payload.name : '';
    const baseUrl = typeof payload?.baseUrl === 'string' ? payload.baseUrl : undefined;

    if (!name) {
      return { success: false, error: 'Model name is required' };
    }

    try {
      await deps.ollamaService.deleteModel(name, baseUrl);
      return { success: true };
    } catch (error) {
      console.error('[ollama:deleteModel] error:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
};
