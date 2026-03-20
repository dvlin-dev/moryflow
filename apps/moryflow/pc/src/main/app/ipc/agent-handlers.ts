import path from 'node:path';
import { getProviderById } from '@moryflow/model-bank/registry';
import type { IpcMainLike } from './types.js';

export const registerAgentIpcHandlers = (input: {
  ipcMain: IpcMainLike;
  deps: {
    getAgentSettings: () => unknown;
    updateAgentSettings: (...args: any[]) => unknown;
    getSkillsRegistry: () => {
      list: () => unknown;
      refresh: () => unknown;
      getDetail: (name: string) => Promise<{ location: string }> | { location: string };
      setEnabled: (name: string, enabled: boolean) => unknown;
      uninstall: (name: string) => Promise<void>;
      install: (name: string) => unknown;
      listRecommended: () => unknown;
    };
    skillsDir: string;
    shell: { openPath: (path: string) => Promise<string> };
    getRuntime: () => {
      getMcpStatus: () => unknown;
      testMcpServer: (...args: any[]) => unknown;
      reloadMcp: () => void;
      onMcpStatusChange: (listener: (event: unknown) => void) => void;
    };
    broadcastToAllWindows: (channel: string, payload: unknown) => void;
  };
}) => {
  const { ipcMain, deps } = input;

  ipcMain.handle('agent:settings:get', () => deps.getAgentSettings());
  ipcMain.handle('agent:settings:update', (_event, payload) =>
    deps.updateAgentSettings(payload ?? {})
  );
  ipcMain.handle('agent:skills:list', async () => deps.getSkillsRegistry().list());
  ipcMain.handle('agent:skills:refresh', async () => deps.getSkillsRegistry().refresh());
  ipcMain.handle('agent:skills:get', async (_event, payload) => {
    const name = typeof payload?.name === 'string' ? payload.name : '';
    if (!name) {
      throw new Error('Skill name is required.');
    }
    return deps.getSkillsRegistry().getDetail(name);
  });
  ipcMain.handle('agent:skills:setEnabled', async (_event, payload) => {
    const name = typeof payload?.name === 'string' ? payload.name : '';
    if (!name) {
      throw new Error('Skill name is required.');
    }
    if (typeof payload?.enabled !== 'boolean') {
      throw new Error('Skill enabled flag is required.');
    }
    return deps.getSkillsRegistry().setEnabled(name, payload.enabled);
  });
  ipcMain.handle('agent:skills:uninstall', async (_event, payload) => {
    const name = typeof payload?.name === 'string' ? payload.name : '';
    if (!name) {
      throw new Error('Skill name is required.');
    }
    await deps.getSkillsRegistry().uninstall(name);
    return { ok: true };
  });
  ipcMain.handle('agent:skills:install', async (_event, payload) => {
    const name = typeof payload?.name === 'string' ? payload.name : '';
    if (!name) {
      throw new Error('Skill name is required.');
    }
    return deps.getSkillsRegistry().install(name);
  });
  ipcMain.handle('agent:skills:listRecommended', async () =>
    deps.getSkillsRegistry().listRecommended()
  );
  ipcMain.handle('agent:skills:openDirectory', async (_event, payload) => {
    const name = typeof payload?.name === 'string' ? payload.name : '';
    const registry = deps.getSkillsRegistry();
    const targetPath =
      name.trim().length > 0
        ? (await registry.getDetail(name)).location
        : path.resolve(deps.skillsDir);
    const openError = await deps.shell.openPath(targetPath);
    if (openError) {
      throw new Error(openError);
    }
    return { ok: true };
  });
  ipcMain.handle('agent:test-provider', async (_event, payload) => {
    const { providerId, providerType, apiKey, baseUrl, modelId } = payload ?? {};
    if (!apiKey || typeof apiKey !== 'string') {
      return { success: false, error: 'API Key is required' };
    }
    if (!providerId || typeof providerId !== 'string') {
      return { success: false, error: 'Provider ID is required' };
    }
    if (providerType !== 'preset' && providerType !== 'custom') {
      return { success: false, error: 'Provider type is required' };
    }

    const trimmedModelId = typeof modelId === 'string' ? modelId.trim() : '';
    if (!trimmedModelId) {
      return { success: false, error: 'Model ID is required' };
    }

    try {
      const { generateText } = await import('ai');
      const { createModelFactory } = await import('@moryflow/agents-runtime');
      const { providerRegistry, toApiModelId } = await import('@moryflow/model-bank/registry');

      const preset = getProviderById(providerId);
      if (providerType === 'preset' && !preset) {
        return { success: false, error: `Unsupported provider ID: ${providerId}` };
      }
      if (providerType === 'custom' && preset) {
        return {
          success: false,
          error: `Provider ID ${providerId} is reserved for preset providers`,
        };
      }

      const effectiveBaseUrl = baseUrl?.trim() || preset?.defaultBaseUrl;
      const trimmedApiKey = apiKey.trim();
      const testModelRef = `${providerId}/${trimmedModelId}`;
      const settings =
        providerType === 'custom'
          ? {
              model: { defaultModel: testModelRef },
              providers: [],
              customProviders: [
                {
                  providerId,
                  name: providerId,
                  enabled: true,
                  apiKey: trimmedApiKey,
                  baseUrl: effectiveBaseUrl || null,
                  models: [{ id: trimmedModelId, enabled: true, isCustom: true }],
                  defaultModelId: trimmedModelId,
                },
              ],
            }
          : {
              model: { defaultModel: testModelRef },
              providers: [
                {
                  providerId,
                  enabled: true,
                  apiKey: trimmedApiKey,
                  baseUrl: effectiveBaseUrl || null,
                  models: [
                    {
                      id: trimmedModelId,
                      enabled: true,
                      ...(preset?.modelIds.includes(trimmedModelId) ? {} : { isCustom: true }),
                    },
                  ],
                  defaultModelId: trimmedModelId,
                },
              ],
              customProviders: [],
            };
      const modelFactory = createModelFactory({
        settings: settings as Parameters<typeof createModelFactory>[0]['settings'],
        providerRegistry,
        toApiModelId,
      });
      const { model } = modelFactory.buildRawModel(testModelRef);

      const result = await generateText({
        model,
        prompt: 'Say "Test successful" and nothing else.',
      });

      return {
        success: true,
        message: result.text || 'Connection successful.',
      };
    } catch (error) {
      console.error('[test-provider] test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
  ipcMain.handle('agent:mcp:getStatus', () => deps.getRuntime().getMcpStatus());
  ipcMain.handle('agent:mcp:testServer', (_event, payload) =>
    deps.getRuntime().testMcpServer(payload)
  );
  ipcMain.handle('agent:mcp:reload', () => {
    deps.getRuntime().reloadMcp();
  });

  const runtime = deps.getRuntime();
  runtime.onMcpStatusChange((event) => {
    deps.broadcastToAllWindows('agent:mcp-status-changed', event);
  });
};
