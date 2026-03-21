import path from 'node:path';
import { shell } from 'electron';
import { getProviderById } from '@moryflow/model-bank/registry';
import type { McpStatusEvent } from '../../../shared/ipc.js';
import { getAgentSettings, updateAgentSettings } from '../../agent-settings/index.js';
import { getRuntime } from '../../chat/services/runtime.js';
import { getSkillsRegistry, SKILLS_DIR } from '../../skills/index.js';
import { resetApp } from '../../maintenance/reset-app.js';
import { type IpcMainLike, asObjectRecord, broadcastToAllWindows } from './shared.js';

export const registerAgentIpcHandlers = (ipcMain: IpcMainLike): void => {
  ipcMain.handle('agent:settings:get', () => getAgentSettings());
  ipcMain.handle('agent:settings:update', (_event, payload) =>
    updateAgentSettings(asObjectRecord(payload))
  );
  ipcMain.handle('agent:skills:list', async () => {
    const registry = getSkillsRegistry();
    return registry.list();
  });
  ipcMain.handle('agent:skills:refresh', async () => {
    const registry = getSkillsRegistry();
    return registry.refresh();
  });
  ipcMain.handle('agent:skills:get', async (_event, payload) => {
    const input = asObjectRecord(payload);
    const name = typeof input.name === 'string' ? input.name : '';
    if (!name) {
      throw new Error('Skill name is required.');
    }
    const registry = getSkillsRegistry();
    return registry.getDetail(name);
  });
  ipcMain.handle('agent:skills:setEnabled', async (_event, payload) => {
    const input = asObjectRecord(payload);
    const name = typeof input.name === 'string' ? input.name : '';
    if (!name) {
      throw new Error('Skill name is required.');
    }
    if (typeof input.enabled !== 'boolean') {
      throw new Error('Skill enabled flag is required.');
    }
    const registry = getSkillsRegistry();
    return registry.setEnabled(name, input.enabled);
  });
  ipcMain.handle('agent:skills:uninstall', async (_event, payload) => {
    const input = asObjectRecord(payload);
    const name = typeof input.name === 'string' ? input.name : '';
    if (!name) {
      throw new Error('Skill name is required.');
    }
    const registry = getSkillsRegistry();
    await registry.uninstall(name);
    return { ok: true };
  });
  ipcMain.handle('agent:skills:install', async (_event, payload) => {
    const input = asObjectRecord(payload);
    const name = typeof input.name === 'string' ? input.name : '';
    if (!name) {
      throw new Error('Skill name is required.');
    }
    const registry = getSkillsRegistry();
    return registry.install(name);
  });
  ipcMain.handle('agent:skills:listRecommended', async () => {
    const registry = getSkillsRegistry();
    return registry.listRecommended();
  });
  ipcMain.handle('agent:skills:openDirectory', async (_event, payload) => {
    const input = asObjectRecord(payload);
    const name = typeof input.name === 'string' ? input.name : '';
    const registry = getSkillsRegistry();
    const targetPath =
      name.trim().length > 0 ? (await registry.getDetail(name)).location : path.resolve(SKILLS_DIR);
    const openError = await shell.openPath(targetPath);
    if (openError) {
      throw new Error(openError);
    }
    return { ok: true };
  });
  ipcMain.handle('agent:test-provider', async (_event, payload) => {
    const input = asObjectRecord(payload);
    const providerId = typeof input.providerId === 'string' ? input.providerId : '';
    const providerType = input.providerType;
    const apiKey = typeof input.apiKey === 'string' ? input.apiKey : '';
    const baseUrl = typeof input.baseUrl === 'string' ? input.baseUrl : undefined;
    const modelId = typeof input.modelId === 'string' ? input.modelId : '';
    if (!apiKey) {
      return {
        success: false,
        error: 'API Key is required',
      };
    }
    if (!providerId) {
      return {
        success: false,
        error: 'Provider ID is required',
      };
    }
    if (providerType !== 'preset' && providerType !== 'custom') {
      return {
        success: false,
        error: 'Provider type is required',
      };
    }

    const trimmedModelId = modelId.trim();
    if (!trimmedModelId) {
      return {
        success: false,
        error: 'Model ID is required',
      };
    }

    try {
      const { generateText } = await import('ai');
      const { createModelFactory } = await import('@moryflow/agents-runtime');
      const { providerRegistry, toApiModelId } = await import('@moryflow/model-bank/registry');

      const preset = getProviderById(providerId);
      if (providerType === 'preset' && !preset) {
        return {
          success: false,
          error: `Unsupported provider ID: ${providerId}`,
        };
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

  ipcMain.handle('app:resetApp', () => resetApp());

  ipcMain.handle('agent:mcp:getStatus', () => getRuntime().getMcpStatus());
  ipcMain.handle('agent:mcp:testServer', (_event, payload) =>
    getRuntime().testMcpServer(
      payload as Parameters<ReturnType<typeof getRuntime>['testMcpServer']>[0]
    )
  );
  ipcMain.handle('agent:mcp:reload', () => {
    getRuntime().reloadMcp();
  });
  getRuntime().onMcpStatusChange((event: McpStatusEvent) => {
    broadcastToAllWindows('agent:mcp-status-changed', event);
  });
};
