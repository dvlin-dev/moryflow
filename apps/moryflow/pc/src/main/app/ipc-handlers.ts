/**
 * [INPUT]: IPC payloads from renderer/preload（含外链与工具输出文件打开请求）
 * [OUTPUT]: IPC handler results (plain JSON, serializable)
 * [POS]: Main process IPC router (validation + orchestration only)
 * [UPDATE]: 2026-02-08 - 新增 `vault:ensureDefaultWorkspace`，用于首次启动自动创建默认 workspace 并激活
 * [UPDATE]: 2026-02-10 - 新增 `workspace:getLastAgentSub/setLastAgentSub`，用于全局记忆 AgentSub（Chat/Workspace）
 * [UPDATE]: 2026-02-10 - 移除 `preload:*` IPC handlers（预热改为 Renderer 侧 warmup，避免 IPC/落盘缓存带来的主进程抖动）
 * [UPDATE]: 2026-02-11 - Skills IPC 将 create 收敛为 install，推荐安装统一走预设目录复制链路
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { existsSync } from 'node:fs';
import path from 'node:path';
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { getProviderById, toApiModelId } from '@moryflow/model-bank/registry';
import type { VaultTreeNode } from '../../shared/ipc.js';
import {
  createVault,
  ensureDefaultWorkspace,
  createVaultFile,
  createVaultFolder,
  deleteVaultEntry,
  getStoredVault,
  getActiveVaultInfo,
  getVaults,
  switchVault,
  removeVault,
  updateVaultName,
  moveVaultEntry,
  openVault,
  readVaultFile,
  readVaultTree,
  readVaultTreeChildren,
  readVaultTreeRoot,
  renameVaultEntry,
  selectDirectory,
  showItemInFinder,
  writeVaultFile,
} from '../vault.js';
import { getAgentSettings, updateAgentSettings } from '../agent-settings/index.js';
import { resetApp } from '../app-maintenance.js';
import { isToolOutputPathAllowed } from '../agent-runtime/tool-output-storage.js';
import {
  getExpandedPaths,
  setExpandedPaths,
  getLastOpenedFile,
  setLastOpenedFile,
  getOpenTabs,
  setOpenTabs,
  getLastAgentSub,
  setLastAgentSub,
  getRecentFiles,
  recordRecentFile,
  removeRecentFile,
  type PersistedTab,
} from '../workspace-settings.js';
import { getTreeCache, setTreeCache } from '../tree-cache.js';
import type { VaultWatcherController } from '../vault-watcher/index.js';
import { getRuntime } from '../chat/runtime.js';
import * as ollamaService from '../ollama-service/index.js';
import { membershipBridge } from '../membership-bridge.js';
import {
  isSecureStorageAvailable,
  getRefreshToken,
  setRefreshToken,
  clearRefreshToken,
  getAccessToken,
  setAccessToken,
  clearAccessToken,
  getAccessTokenExpiresAt,
  setAccessTokenExpiresAt,
  clearAccessTokenExpiresAt,
} from '../membership-token-store.js';
import {
  cloudSyncEngine,
  cloudSyncApi,
  fileIndexManager,
  readSettings,
  writeSettings,
  readBinding,
  writeBinding,
  deleteBinding,
} from '../cloud-sync/index.js';
import { handleBindingConflictResponse } from '../cloud-sync/binding-conflict.js';
import { fetchCurrentUserId } from '../cloud-sync/user-info.js';
import { createExternalLinkPolicy, openExternalSafe } from './external-links.js';
import { getTaskDetail, listTasks } from '../tasks/index.js';
import { getSkillsRegistry, SKILLS_DIR } from '../skills/index.js';

type RegisterIpcHandlersOptions = {
  vaultWatcherController: VaultWatcherController;
};

const externalLinkPolicy = createExternalLinkPolicy({
  allowLocalhostHttp: !app.isPackaged,
  hostAllowlist: process.env['MORYFLOW_EXTERNAL_HOST_ALLOWLIST'],
});

/** 广播事件到所有窗口 */
const broadcastToAllWindows = <T>(channel: string, payload: T): void => {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload);
  }
};

/**
 * 注册 main 进程的 IPC handlers，保持纯粹的参数校验和调用。
 */
export const registerIpcHandlers = ({ vaultWatcherController }: RegisterIpcHandlersOptions) => {
  ipcMain.handle('app:getVersion', () => app.getVersion());
  ipcMain.handle('shell:openExternal', async (_event, payload) => {
    const url = typeof payload?.url === 'string' ? payload.url : '';
    if (!url) {
      return;
    }
    await openExternalSafe(url, externalLinkPolicy);
  });
  ipcMain.handle('vault:open', (_event, payload) => openVault(payload ?? {}));
  ipcMain.handle('vault:create', (_event, payload) => createVault(payload ?? {}));
  ipcMain.handle('vault:ensureDefaultWorkspace', async () => {
    const active = await getActiveVaultInfo();
    if (active) {
      vaultWatcherController.scheduleStart(active.path);
      await cloudSyncEngine.init(active.path);
      return active;
    }

    // 防止存在旧 active/旧引擎残留（不做历史兼容，但保证行为可解释）
    cloudSyncEngine.stop();

    const vault = await ensureDefaultWorkspace();
    if (vault) {
      broadcastToAllWindows('vault:vaultsChanged', getVaults());
      broadcastToAllWindows('vault:activeVaultChanged', vault);
      vaultWatcherController.scheduleStart(vault.path);
      await cloudSyncEngine.init(vault.path);
    }
    return vault;
  });
  ipcMain.handle('vault:selectDirectory', () => selectDirectory());

  // ── 多 Vault 支持 ────────────────────────────────────────────
  ipcMain.handle('vault:getVaults', () => getVaults());
  ipcMain.handle('vault:getActiveVault', async () => {
    const vault = await getActiveVaultInfo();
    // 确保云同步引擎初始化（应用启动时）
    if (vault) {
      await cloudSyncEngine.init(vault.path);
    }
    return vault;
  });
  ipcMain.handle('vault:setActiveVault', async (_event, payload) => {
    const vaultId = typeof payload?.vaultId === 'string' ? payload.vaultId : '';
    if (!vaultId) return null;

    // 1. 停止当前云同步引擎（内部会清理 fileId 缓存）
    cloudSyncEngine.stop();

    // 2. 切换活动 Vault
    const vault = await switchVault(vaultId);
    if (vault) {
      // 3. 广播活动 Vault 变更事件
      broadcastToAllWindows('vault:activeVaultChanged', vault);
      // 4. 重新初始化 vault watcher
      vaultWatcherController.scheduleStart(vault.path);
      // 5. 重新初始化云同步引擎
      await cloudSyncEngine.init(vault.path);
    }
    return vault;
  });
  ipcMain.handle('vault:removeVault', (_event, payload) => {
    const vaultId = typeof payload?.vaultId === 'string' ? payload.vaultId : '';
    if (!vaultId) return;
    removeVault(vaultId);
    broadcastToAllWindows('vault:vaultsChanged', getVaults());
  });
  ipcMain.handle('vault:renameVault', (_event, payload) => {
    const vaultId = typeof payload?.vaultId === 'string' ? payload.vaultId : '';
    const name = typeof payload?.name === 'string' ? payload.name : '';
    if (!vaultId || !name) return;
    updateVaultName(vaultId, name);
    broadcastToAllWindows('vault:vaultsChanged', getVaults());
  });

  // 验证工作区：检查目录是否存在，删除不存在的
  ipcMain.handle('vault:validateVaults', () => {
    const vaults = getVaults();
    const invalidIds: string[] = [];

    for (const vault of vaults) {
      if (!existsSync(vault.path)) {
        invalidIds.push(vault.id);
      }
    }

    // 删除无效的工作区
    for (const id of invalidIds) {
      removeVault(id);
    }

    // 如果有删除，广播更新
    if (invalidIds.length > 0) {
      broadcastToAllWindows('vault:vaultsChanged', getVaults());
    }

    return { removedCount: invalidIds.length };
  });

  ipcMain.handle('vault:readTreeRoot', async (_event, payload) => {
    const result = await readVaultTreeRoot(payload ?? {});
    if (payload?.path) {
      vaultWatcherController.scheduleStart(payload.path);
    }
    return result;
  });
  ipcMain.handle('vault:readTreeChildren', async (_event, payload) =>
    readVaultTreeChildren(payload ?? {})
  );
  ipcMain.handle('workspace:getExpandedPaths', (_event, payload) => {
    const vaultPath = typeof payload?.vaultPath === 'string' ? payload.vaultPath : '';
    if (!vaultPath) return [];
    return getExpandedPaths(vaultPath);
  });
  ipcMain.handle('workspace:setExpandedPaths', (_event, payload) => {
    const vaultPath = typeof payload?.vaultPath === 'string' ? payload.vaultPath : '';
    const paths = Array.isArray(payload?.paths) ? payload.paths : [];
    if (!vaultPath) return;
    setExpandedPaths(vaultPath, paths);
  });
  ipcMain.handle('workspace:getLastOpenedFile', (_event, payload) => {
    const vaultPath = typeof payload?.vaultPath === 'string' ? payload.vaultPath : '';
    if (!vaultPath) return null;
    return getLastOpenedFile(vaultPath);
  });
  ipcMain.handle('workspace:getLastAgentSub', () => getLastAgentSub());
  ipcMain.handle('workspace:setLastAgentSub', (_event, payload) => {
    const sub = typeof payload?.sub === 'string' ? payload.sub : '';
    if (sub !== 'chat' && sub !== 'workspace') {
      return;
    }
    setLastAgentSub(sub);
  });
  ipcMain.handle('workspace:setLastOpenedFile', (_event, payload) => {
    const vaultPath = typeof payload?.vaultPath === 'string' ? payload.vaultPath : '';
    const filePath =
      payload?.filePath === null
        ? null
        : typeof payload?.filePath === 'string'
          ? payload.filePath
          : null;
    if (!vaultPath) return;
    setLastOpenedFile(vaultPath, filePath);
  });
  ipcMain.handle('workspace:getOpenTabs', (_event, payload) => {
    const vaultPath = typeof payload?.vaultPath === 'string' ? payload.vaultPath : '';
    if (!vaultPath) return [];
    return getOpenTabs(vaultPath);
  });
  ipcMain.handle('workspace:setOpenTabs', (_event, payload) => {
    const vaultPath = typeof payload?.vaultPath === 'string' ? payload.vaultPath : '';
    const tabs = Array.isArray(payload?.tabs) ? (payload.tabs as PersistedTab[]) : [];
    if (!vaultPath) return;
    setOpenTabs(vaultPath, tabs);
  });
  ipcMain.handle('workspace:getRecentFiles', (_event, payload) => {
    const vaultPath = typeof payload?.vaultPath === 'string' ? payload.vaultPath : '';
    if (!vaultPath) return [];
    return getRecentFiles(vaultPath);
  });
  ipcMain.handle('workspace:recordRecentFile', (_event, payload) => {
    const vaultPath = typeof payload?.vaultPath === 'string' ? payload.vaultPath : '';
    const filePath = typeof payload?.filePath === 'string' ? payload.filePath : null;
    if (!vaultPath) return;
    recordRecentFile(vaultPath, filePath);
  });
  ipcMain.handle('workspace:removeRecentFile', (_event, payload) => {
    const vaultPath = typeof payload?.vaultPath === 'string' ? payload.vaultPath : '';
    const filePath = typeof payload?.filePath === 'string' ? payload.filePath : null;
    if (!vaultPath) return;
    removeRecentFile(vaultPath, filePath);
  });
  ipcMain.handle('vault:readTree', async (_event, payload) => {
    const result = await readVaultTree(payload ?? {});
    if (payload?.path) {
      vaultWatcherController.scheduleStart(payload.path);
    }
    return result;
  });
  ipcMain.handle('vault:getTreeCache', (_event, payload) => {
    const vaultPath = typeof payload?.vaultPath === 'string' ? payload.vaultPath : '';
    if (!vaultPath) return null;
    return getTreeCache(vaultPath);
  });
  ipcMain.handle('vault:setTreeCache', (_event, payload) => {
    const vaultPath = typeof payload?.vaultPath === 'string' ? payload.vaultPath : '';
    const nodes = Array.isArray(payload?.nodes) ? (payload.nodes as VaultTreeNode[]) : [];
    if (!vaultPath || nodes.length === 0) return;
    setTreeCache(vaultPath, nodes);
  });
  ipcMain.handle('vault:updateWatchPaths', async (_event, payload) => {
    const paths = Array.isArray(payload?.paths) ? payload.paths : [];
    await vaultWatcherController.updateExpandedWatchers(paths);
  });
  ipcMain.handle('files:read', (_event, payload) => readVaultFile(payload ?? {}));
  ipcMain.handle('files:write', (_event, payload) => writeVaultFile(payload ?? {}));
  ipcMain.handle('files:createFile', (_event, payload) => createVaultFile(payload ?? {}));
  ipcMain.handle('files:createFolder', (_event, payload) => createVaultFolder(payload ?? {}));
  ipcMain.handle('files:rename', (_event, payload) => renameVaultEntry(payload ?? {}));
  ipcMain.handle('files:move', (_event, payload) => moveVaultEntry(payload ?? {}));
  ipcMain.handle('files:delete', (_event, payload) => deleteVaultEntry(payload ?? {}));
  ipcMain.handle('files:showInFinder', (_event, payload) => showItemInFinder(payload ?? {}));
  ipcMain.handle('files:openPath', async (_event, payload) => {
    const targetPath = typeof payload?.path === 'string' ? payload.path : '';
    if (!targetPath) {
      throw new Error('Path is required');
    }

    const vaultInfo = await getStoredVault();
    const resolvedPath = path.resolve(targetPath);
    const allowed = isToolOutputPathAllowed({
      targetPath: resolvedPath,
      vaultRoot: vaultInfo?.path,
      pathUtils: path,
    });

    if (!allowed) {
      throw new Error('Path is not allowed');
    }

    if (!existsSync(resolvedPath)) {
      throw new Error('File not found');
    }

    const openError = await shell.openPath(resolvedPath);
    if (openError) {
      throw new Error(openError);
    }
  });
  ipcMain.handle('agent:settings:get', () => getAgentSettings());
  ipcMain.handle('agent:settings:update', (_event, payload) => updateAgentSettings(payload ?? {}));
  ipcMain.handle('agent:skills:list', async () => {
    const registry = getSkillsRegistry();
    return registry.list();
  });
  ipcMain.handle('agent:skills:refresh', async () => {
    const registry = getSkillsRegistry();
    return registry.refresh();
  });
  ipcMain.handle('agent:skills:get', async (_event, payload) => {
    const name = typeof payload?.name === 'string' ? payload.name : '';
    if (!name) {
      throw new Error('Skill name is required.');
    }
    const registry = getSkillsRegistry();
    return registry.getDetail(name);
  });
  ipcMain.handle('agent:skills:setEnabled', async (_event, payload) => {
    const name = typeof payload?.name === 'string' ? payload.name : '';
    if (!name) {
      throw new Error('Skill name is required.');
    }
    if (typeof payload?.enabled !== 'boolean') {
      throw new Error('Skill enabled flag is required.');
    }
    const registry = getSkillsRegistry();
    return registry.setEnabled(name, payload.enabled);
  });
  ipcMain.handle('agent:skills:uninstall', async (_event, payload) => {
    const name = typeof payload?.name === 'string' ? payload.name : '';
    if (!name) {
      throw new Error('Skill name is required.');
    }
    const registry = getSkillsRegistry();
    await registry.uninstall(name);
    return { ok: true };
  });
  ipcMain.handle('agent:skills:install', async (_event, payload) => {
    const name = typeof payload?.name === 'string' ? payload.name : '';
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
    const name = typeof payload?.name === 'string' ? payload.name : '';
    const registry = getSkillsRegistry();
    const targetPath =
      name.trim().length > 0 ? (await registry.getDetail(name)).location : path.resolve(SKILLS_DIR);
    const openError = await shell.openPath(targetPath);
    if (openError) {
      throw new Error(openError);
    }
    return { ok: true };
  });
  ipcMain.handle('tasks:list', async (_event, payload) => {
    const chatId = typeof payload?.chatId === 'string' ? payload.chatId : '';
    if (!chatId) return [];
    const query = {
      status: Array.isArray(payload?.status) ? payload.status : undefined,
      priority: Array.isArray(payload?.priority) ? payload.priority : undefined,
      owner:
        payload?.owner === null
          ? null
          : typeof payload?.owner === 'string'
            ? payload.owner
            : undefined,
      search: typeof payload?.search === 'string' ? payload.search : undefined,
      includeArchived:
        typeof payload?.includeArchived === 'boolean' ? payload.includeArchived : undefined,
    };
    return listTasks(chatId, query);
  });
  ipcMain.handle('tasks:get', async (_event, payload) => {
    const chatId = typeof payload?.chatId === 'string' ? payload.chatId : '';
    const taskId = typeof payload?.taskId === 'string' ? payload.taskId : '';
    if (!chatId || !taskId) return null;
    return getTaskDetail(chatId, taskId);
  });
  ipcMain.handle('agent:test-provider', async (_event, payload) => {
    const { providerId, providerType, apiKey, baseUrl, modelId } = payload ?? {};
    if (!apiKey || typeof apiKey !== 'string') {
      return {
        success: false,
        error: 'API Key is required',
      };
    }
    if (!providerId || typeof providerId !== 'string') {
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

    const trimmedModelId = typeof modelId === 'string' ? modelId.trim() : '';
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

  // MCP 状态相关
  ipcMain.handle('agent:mcp:getStatus', () => {
    return getRuntime().getMcpStatus();
  });

  ipcMain.handle('agent:mcp:testServer', (_event, payload) => {
    return getRuntime().testMcpServer(payload);
  });

  ipcMain.handle('agent:mcp:reload', () => {
    getRuntime().reloadMcp();
  });

  // MCP 状态变更事件广播到所有窗口
  const runtime = getRuntime();
  runtime.onMcpStatusChange((event) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('agent:mcp-status-changed', event);
    }
  });

  // Ollama 相关
  ipcMain.handle('ollama:checkConnection', async (_event, payload) => {
    const baseUrl = typeof payload?.baseUrl === 'string' ? payload.baseUrl : undefined;
    return ollamaService.checkConnection(baseUrl);
  });

  ipcMain.handle('ollama:getLocalModels', async (_event, payload) => {
    const baseUrl = typeof payload?.baseUrl === 'string' ? payload.baseUrl : undefined;
    try {
      return await ollamaService.getLocalModels(baseUrl);
    } catch (error) {
      console.error('[ollama:getLocalModels] error:', error);
      return [];
    }
  });

  ipcMain.handle('ollama:getLibraryModels', async (_event, payload) => {
    try {
      return await ollamaService.getLibraryModels({
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
      await ollamaService.pullModel(
        name,
        (progress) => {
          // 广播下载进度到所有窗口
          for (const win of BrowserWindow.getAllWindows()) {
            win.webContents.send('ollama:pullProgress', {
              modelName: name,
              status: progress.status,
              digest: progress.digest,
              total: progress.total,
              completed: progress.completed,
            });
          }
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
      await ollamaService.deleteModel(name, baseUrl);
      return { success: true };
    } catch (error) {
      console.error('[ollama:deleteModel] error:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // ── Membership ──────────────────────────────────────────────
  ipcMain.handle('membership:syncToken', (_event, payload) => {
    const token = payload === null ? null : typeof payload === 'string' ? payload : null;
    membershipBridge.syncToken(token);
  });

  ipcMain.handle('membership:syncEnabled', (_event, payload) => {
    const enabled = typeof payload === 'boolean' ? payload : true;
    membershipBridge.setEnabled(enabled);
  });

  ipcMain.handle('membership:isSecureStorageAvailable', async () => isSecureStorageAvailable());

  ipcMain.handle('membership:getRefreshToken', async () => getRefreshToken());

  ipcMain.handle('membership:setRefreshToken', async (_event, payload) => {
    if (typeof payload === 'string' && payload.trim()) {
      await setRefreshToken(payload.trim());
      return;
    }
    await clearRefreshToken();
  });

  ipcMain.handle('membership:clearRefreshToken', async () => {
    await clearRefreshToken();
  });

  ipcMain.handle('membership:getAccessToken', async () => getAccessToken());

  ipcMain.handle('membership:setAccessToken', async (_event, payload) => {
    if (typeof payload === 'string' && payload.trim()) {
      await setAccessToken(payload.trim());
      return;
    }
    await clearAccessToken();
  });

  ipcMain.handle('membership:clearAccessToken', async () => {
    await clearAccessToken();
  });

  ipcMain.handle('membership:getAccessTokenExpiresAt', async () => getAccessTokenExpiresAt());

  ipcMain.handle('membership:setAccessTokenExpiresAt', async (_event, payload) => {
    if (typeof payload === 'string' && payload.trim()) {
      await setAccessTokenExpiresAt(payload.trim());
      return;
    }
    await clearAccessTokenExpiresAt();
  });

  ipcMain.handle('membership:clearAccessTokenExpiresAt', async () => {
    await clearAccessTokenExpiresAt();
  });

  // ── Cloud Sync ────────────────────────────────────────────────

  ipcMain.handle('cloud-sync:getSettings', () => readSettings());

  ipcMain.handle('cloud-sync:updateSettings', (_event, payload) => {
    const current = readSettings();
    const next = { ...current, ...payload };
    writeSettings(next);
    return next;
  });

  ipcMain.handle('cloud-sync:getBinding', (_event, payload) => {
    const localPath = typeof payload?.localPath === 'string' ? payload.localPath : '';
    if (!localPath) return null;
    return readBinding(localPath);
  });

  ipcMain.handle('cloud-sync:bindVault', async (_event, payload) => {
    const localPath = typeof payload?.localPath === 'string' ? payload.localPath : '';
    const vaultId = typeof payload?.vaultId === 'string' ? payload.vaultId : undefined;
    const vaultName = typeof payload?.vaultName === 'string' ? payload.vaultName : undefined;

    if (!localPath) {
      throw new Error('localPath is required');
    }

    const settings = readSettings();
    let finalVaultId = vaultId;
    let finalVaultName = vaultName || path.basename(localPath);

    // 获取当前用户 ID
    const userId = await fetchCurrentUserId();
    if (!userId) {
      throw new Error('Cannot determine current user ID');
    }

    try {
      // 如果没有指定 vaultId，创建新的
      if (!finalVaultId) {
        console.log('[cloud-sync:bindVault] creating vault:', finalVaultName);
        const vault = await cloudSyncApi.createVault(finalVaultName);
        finalVaultId = vault.id;
        finalVaultName = vault.name;
        console.log('[cloud-sync:bindVault] vault created:', finalVaultId);
      }

      // 注册设备
      console.log(
        '[cloud-sync:bindVault] registering device:',
        settings.deviceId,
        settings.deviceName
      );
      await cloudSyncApi.registerDevice(finalVaultId, settings.deviceId, settings.deviceName);
      console.log('[cloud-sync:bindVault] device registered');
    } catch (error) {
      console.error('[cloud-sync:bindVault] API error:', error);
      throw error;
    }

    // 保存绑定
    const binding = {
      localPath,
      vaultId: finalVaultId,
      vaultName: finalVaultName,
      boundAt: Date.now(),
      userId,
    };
    writeBinding(binding);

    // 诊断日志：验证绑定是否正确保存
    const readBack = readBinding(localPath);
    console.log('[cloud-sync:bindVault] saved:', {
      localPath,
      binding,
      readBack: readBack ? { vaultId: readBack.vaultId, vaultName: readBack.vaultName } : null,
    });

    // 重新初始化同步引擎
    await cloudSyncEngine.reinit();

    return binding;
  });

  ipcMain.handle('cloud-sync:unbindVault', (_event, payload) => {
    const localPath = typeof payload?.localPath === 'string' ? payload.localPath : '';
    if (!localPath) return;
    deleteBinding(localPath);
    cloudSyncEngine.stop();
  });

  ipcMain.handle('cloud-sync:listCloudVaults', async () => {
    try {
      const { vaults } = await cloudSyncApi.listVaults();
      return vaults.map((v) => ({
        id: v.id,
        name: v.name,
        fileCount: v.fileCount,
        deviceCount: v.deviceCount,
      }));
    } catch (error) {
      console.error('[cloud-sync:listCloudVaults] error:', error);
      return [];
    }
  });

  ipcMain.handle('cloud-sync:getStatus', () => cloudSyncEngine.getStatus());

  ipcMain.handle('cloud-sync:getStatusDetail', () => cloudSyncEngine.getStatusDetail());

  ipcMain.handle('cloud-sync:triggerSync', () => {
    cloudSyncEngine.triggerSync();
  });

  ipcMain.handle('cloud-sync:getUsage', async () => {
    try {
      const result = await cloudSyncApi.getUsage();
      // 诊断日志：显示用量查询结果
      console.log('[cloud-sync:getUsage] success:', {
        storage: result.storage,
        vectorized: result.vectorized,
        plan: result.plan,
      });
      return result;
    } catch (error) {
      // 诊断日志：详细记录错误信息
      console.error('[cloud-sync:getUsage] API failed:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return {
        storage: { used: 0, limit: 0, percentage: 0 },
        vectorized: { count: 0, limit: 0, percentage: 0 },
        fileLimit: { maxFileSize: 0 },
        plan: 'unknown',
      };
    }
  });

  ipcMain.handle('cloud-sync:search', async (_event, payload) => {
    const query = typeof payload?.query === 'string' ? payload.query : '';
    const topK = typeof payload?.topK === 'number' ? payload.topK : undefined;
    const vaultId = typeof payload?.vaultId === 'string' ? payload.vaultId : undefined;

    if (!query) return [];

    try {
      const response = await cloudSyncApi.search({ query, topK, vaultId });
      const status = cloudSyncEngine.getStatus();

      // 填充 localPath
      if (status.vaultPath) {
        const results = response.results.map((r) => ({
          ...r,
          localPath: fileIndexManager.getByFileId(status.vaultPath!, r.fileId) ?? undefined,
        }));
        return results;
      }

      return response.results;
    } catch (error) {
      console.error('[cloud-sync:search] error:', error);
      return [];
    }
  });

  // 绑定冲突响应处理
  ipcMain.handle('cloud-sync:binding-conflict-response', (_event, payload) => {
    const requestId = typeof payload?.requestId === 'string' ? payload.requestId : '';
    const choice =
      payload?.choice === 'sync_to_current' || payload?.choice === 'stay_offline'
        ? payload.choice
        : 'stay_offline';
    if (requestId) {
      handleBindingConflictResponse(requestId, choice);
    }
  });
};
