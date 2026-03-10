/**
 * [INPUT]: IPC payloads from renderer/preload（含外链与工具输出文件打开请求）
 * [OUTPUT]: IPC handler results (plain JSON, serializable)
 * [POS]: Main process IPC router (validation + orchestration only)
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { existsSync } from 'node:fs';
import path from 'node:path';
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { AUTH_API } from '@moryflow/api';
import { createApiTransport, ServerApiError } from '@moryflow/api/client';
import { getProviderById, toApiModelId } from '@moryflow/model-bank/registry';
import type {
  AppCloseBehavior,
  AppRuntimeErrorCode,
  AppRuntimeResult,
  AppUpdateSettings,
  AppUpdateState,
  UpdateChannel,
  LaunchAtLoginState,
  MembershipAccessSessionPayload,
  MembershipAuthResult,
  MembershipAuthUser,
  MembershipRefreshSessionResult,
  QuickChatWindowState,
  VaultTreeNode,
} from '../../shared/ipc.js';
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
  getLastSidebarMode,
  setLastSidebarMode,
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
import {
  getCloudSyncUsageIpc,
  listCloudVaultsIpc,
  searchCloudSyncIpc,
} from './cloud-sync-ipc-handlers.js';
import { getSkillsRegistry, SKILLS_DIR } from '../skills/index.js';
import { searchIndexService } from '../search-index/index.js';
import { telegramChannelService } from '../channels/telegram/index.js';
import { parseSkipVersionPayload } from './update-payload-validation.js';
import { createOAuthLoopbackManager } from '../auth-oauth-loopback-manager.js';
import { MEMBERSHIP_API_URL } from '../membership-api-url.js';

type RegisterIpcHandlersOptions = {
  vaultWatcherController: VaultWatcherController;
  quickChat: {
    toggle: () => Promise<void>;
    open: () => Promise<void>;
    close: () => Promise<void>;
    getState: () => Promise<QuickChatWindowState>;
    setSessionId: (sessionId: string | null) => Promise<void>;
  };
  appRuntime: {
    getCloseBehavior: () => AppCloseBehavior;
    setCloseBehavior: (behavior: AppCloseBehavior) => AppCloseBehavior;
    getLaunchAtLogin: () => LaunchAtLoginState;
    setLaunchAtLogin: (enabled: boolean) => LaunchAtLoginState;
  };
  updates: {
    getState: () => AppUpdateState;
    getSettings: () => AppUpdateSettings;
    setChannel: (channel: UpdateChannel) => AppUpdateSettings;
    setAutoCheck: (enabled: boolean) => AppUpdateSettings;
    setAutoDownload: (enabled: boolean) => AppUpdateSettings;
    checkForUpdates: (options?: { interactive?: boolean }) => Promise<AppUpdateState>;
    downloadUpdate: () => Promise<AppUpdateState>;
    restartToInstall: () => void;
    skipVersion: (version?: string | null) => AppUpdateSettings;
    subscribe: (
      listener: (state: AppUpdateState, settings: AppUpdateSettings) => void
    ) => () => void;
  };
};

const externalLinkPolicy = createExternalLinkPolicy({
  allowLocalhostHttp: true,
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
const toAppRuntimeErrorResult = <T>(error: unknown): AppRuntimeResult<T> => {
  const codeValue =
    typeof error === 'object' && error && 'code' in error ? (error as { code?: unknown }).code : '';
  const code: AppRuntimeErrorCode =
    codeValue === 'UNSUPPORTED_PLATFORM' || codeValue === 'SYSTEM_API_ERROR'
      ? codeValue
      : 'SYSTEM_API_ERROR';
  const message =
    error instanceof Error && error.message.trim().length > 0
      ? error.message
      : 'App runtime operation failed.';
  return {
    ok: false,
    error: {
      code,
      message,
    },
  };
};

const okResult = <T>(data: T): AppRuntimeResult<T> => ({
  ok: true,
  data,
});

const MEMBERSHIP_REFRESH_TIMEOUT_MS = 10_000;
const membershipAuthTransport = createApiTransport({
  baseUrl: MEMBERSHIP_API_URL,
  timeoutMs: MEMBERSHIP_REFRESH_TIMEOUT_MS,
});

type MembershipTokenPayload = MembershipAccessSessionPayload & {
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user?: MembershipAuthUser;
};

const isMembershipTokenPayload = (payload: unknown): payload is MembershipTokenPayload => {
  if (!payload || typeof payload !== 'object') {
    return false;
  }
  const data = payload as Record<string, unknown>;
  return (
    typeof data.accessToken === 'string' &&
    typeof data.accessTokenExpiresAt === 'string' &&
    typeof data.refreshToken === 'string' &&
    typeof data.refreshTokenExpiresAt === 'string'
  );
};

const sanitizeMembershipUser = (user: unknown): MembershipAuthUser | undefined => {
  if (!user || typeof user !== 'object') {
    return undefined;
  }
  const data = user as Record<string, unknown>;
  if (typeof data.id !== 'string' || typeof data.email !== 'string') {
    return undefined;
  }
  return {
    id: data.id,
    email: data.email,
    name: typeof data.name === 'string' ? data.name : undefined,
  };
};

const toAccessSessionPayload = (
  payload: MembershipTokenPayload
): MembershipAccessSessionPayload => ({
  accessToken: payload.accessToken,
  accessTokenExpiresAt: payload.accessTokenExpiresAt,
});

const clearMembershipSession = async (): Promise<void> => {
  await clearAccessToken();
  await clearRefreshToken();
};

const persistMembershipSession = async (payload: MembershipTokenPayload): Promise<void> => {
  await setAccessToken(payload.accessToken);
  await setAccessTokenExpiresAt(payload.accessTokenExpiresAt);
  await setRefreshToken(payload.refreshToken);
};

const parseMembershipAuthError = (
  error: unknown,
  fallback: string
): { code: string; message: string } => {
  if (error instanceof ServerApiError) {
    return {
      code: error.code || 'UNKNOWN',
      message: error.message || fallback,
    };
  }

  return {
    code: 'NETWORK_ERROR',
    message: 'Network connection failed',
  };
};

const invalidMembershipAuthResult = (message: string): MembershipAuthResult => ({
  ok: false,
  error: {
    code: 'INVALID_REQUEST',
    message,
  },
});

const performMembershipTokenAuth = async (
  path: string,
  body: Record<string, string>,
  fallbackError: string
): Promise<MembershipAuthResult> => {
  try {
    const data = await membershipAuthTransport.request<unknown>({
      path,
      method: 'POST',
      headers: {
        'X-App-Platform': 'desktop',
      },
      body,
      timeoutMs: MEMBERSHIP_REFRESH_TIMEOUT_MS,
    });

    if (!isMembershipTokenPayload(data)) {
      await clearMembershipSession();
      return {
        ok: false,
        error: {
          code: 'INVALID_RESPONSE',
          message: 'Invalid authentication response',
        },
      };
    }

    await persistMembershipSession(data);
    return {
      ok: true,
      payload: toAccessSessionPayload(data),
      user: sanitizeMembershipUser(data.user),
    };
  } catch (error) {
    return {
      ok: false,
      error: parseMembershipAuthError(error, fallbackError),
    };
  }
};

const refreshMembershipSession = async (): Promise<MembershipRefreshSessionResult> => {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    return { ok: false, reason: 'missing_refresh_token' };
  }

  try {
    const data = await membershipAuthTransport.request<unknown>({
      path: AUTH_API.REFRESH,
      method: 'POST',
      headers: {
        'X-App-Platform': 'desktop',
      },
      body: { refreshToken },
      timeoutMs: MEMBERSHIP_REFRESH_TIMEOUT_MS,
    });
    if (!isMembershipTokenPayload(data)) {
      await clearMembershipSession();
      return { ok: false, reason: 'invalid_response' };
    }
    await persistMembershipSession(data);
    return { ok: true, payload: toAccessSessionPayload(data) };
  } catch (error) {
    if (error instanceof ServerApiError && (error.status === 401 || error.status === 403)) {
      await clearMembershipSession();
      return { ok: false, reason: 'unauthorized' };
    }
    return { ok: false, reason: 'network' };
  }
};

const logoutMembershipSession = async (): Promise<void> => {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    return;
  }

  await membershipAuthTransport
    .request<void>({
      path: AUTH_API.LOGOUT,
      method: 'POST',
      headers: {
        'X-App-Platform': 'desktop',
      },
      body: { refreshToken },
      timeoutMs: MEMBERSHIP_REFRESH_TIMEOUT_MS,
    })
    .catch(() => undefined);
};

export const registerIpcHandlers = ({
  vaultWatcherController,
  quickChat,
  appRuntime,
  updates,
}: RegisterIpcHandlersOptions) => {
  const oauthLoopbackManager = createOAuthLoopbackManager();

  telegramChannelService.subscribeStatus((status) => {
    broadcastToAllWindows('telegram:status-changed', status);
  });
  updates.subscribe((state, settings) => {
    broadcastToAllWindows('updates:state-changed', { state, settings });
  });

  ipcMain.handle('app:getVersion', () => app.getVersion());
  ipcMain.handle('quick-chat:toggle', async () => {
    await quickChat.toggle();
  });
  ipcMain.handle('quick-chat:open', async () => {
    await quickChat.open();
  });
  ipcMain.handle('quick-chat:close', async () => {
    await quickChat.close();
  });
  ipcMain.handle('quick-chat:getState', async () => {
    return quickChat.getState();
  });
  ipcMain.handle('quick-chat:setSessionId', async (_event, payload) => {
    if (!payload || typeof payload !== 'object' || !('sessionId' in payload)) {
      throw new Error('Invalid quick-chat session id payload.');
    }
    const sessionId = (payload as { sessionId?: unknown }).sessionId;
    if (sessionId !== null && typeof sessionId !== 'string') {
      throw new Error('Invalid quick-chat session id payload.');
    }
    await quickChat.setSessionId(sessionId);
  });
  ipcMain.handle('app-runtime:getCloseBehavior', () => {
    try {
      return okResult(appRuntime.getCloseBehavior());
    } catch (error) {
      return toAppRuntimeErrorResult(error);
    }
  });
  ipcMain.handle('app-runtime:setCloseBehavior', (_event, payload) => {
    const behavior = payload?.behavior;
    if (behavior !== 'hide_to_menubar' && behavior !== 'quit') {
      return {
        ok: false,
        error: {
          code: 'SYSTEM_API_ERROR',
          message: 'Invalid close behavior.',
        },
      } satisfies AppRuntimeResult<AppCloseBehavior>;
    }
    try {
      return okResult(appRuntime.setCloseBehavior(behavior));
    } catch (error) {
      return toAppRuntimeErrorResult(error);
    }
  });
  ipcMain.handle('app-runtime:getLaunchAtLogin', () => {
    try {
      return okResult(appRuntime.getLaunchAtLogin());
    } catch (error) {
      return toAppRuntimeErrorResult(error);
    }
  });
  ipcMain.handle('app-runtime:setLaunchAtLogin', (_event, payload) => {
    if (typeof payload?.enabled !== 'boolean') {
      return {
        ok: false,
        error: {
          code: 'SYSTEM_API_ERROR',
          message: 'Invalid launch-at-login payload.',
        },
      } satisfies AppRuntimeResult<LaunchAtLoginState>;
    }
    try {
      return okResult(appRuntime.setLaunchAtLogin(payload.enabled));
    } catch (error) {
      return toAppRuntimeErrorResult(error);
    }
  });
  ipcMain.handle('updates:getState', () => {
    try {
      return okResult(updates.getState());
    } catch (error) {
      return toAppRuntimeErrorResult(error);
    }
  });
  ipcMain.handle('updates:getSettings', () => {
    try {
      return okResult(updates.getSettings());
    } catch (error) {
      return toAppRuntimeErrorResult(error);
    }
  });
  ipcMain.handle('updates:setChannel', (_event, payload) => {
    const channel = payload?.channel;
    if (channel !== 'stable' && channel !== 'beta') {
      return {
        ok: false,
        error: {
          code: 'SYSTEM_API_ERROR',
          message: 'Invalid update channel.',
        },
      } satisfies AppRuntimeResult<AppUpdateSettings>;
    }
    try {
      return okResult(updates.setChannel(channel));
    } catch (error) {
      return toAppRuntimeErrorResult(error);
    }
  });
  ipcMain.handle('updates:setAutoCheck', (_event, payload) => {
    if (typeof payload?.enabled !== 'boolean') {
      return {
        ok: false,
        error: {
          code: 'SYSTEM_API_ERROR',
          message: 'Invalid auto-check payload.',
        },
      } satisfies AppRuntimeResult<AppUpdateSettings>;
    }
    try {
      return okResult(updates.setAutoCheck(payload.enabled));
    } catch (error) {
      return toAppRuntimeErrorResult(error);
    }
  });
  ipcMain.handle('updates:setAutoDownload', (_event, payload) => {
    if (typeof payload?.enabled !== 'boolean') {
      return {
        ok: false,
        error: {
          code: 'SYSTEM_API_ERROR',
          message: 'Invalid auto-download payload.',
        },
      } satisfies AppRuntimeResult<AppUpdateSettings>;
    }
    try {
      return okResult(updates.setAutoDownload(payload.enabled));
    } catch (error) {
      return toAppRuntimeErrorResult(error);
    }
  });
  ipcMain.handle('updates:checkForUpdates', async () => {
    try {
      return okResult(await updates.checkForUpdates({ interactive: true }));
    } catch (error) {
      return toAppRuntimeErrorResult(error);
    }
  });
  ipcMain.handle('updates:downloadUpdate', async () => {
    try {
      return okResult(await updates.downloadUpdate());
    } catch (error) {
      return toAppRuntimeErrorResult(error);
    }
  });
  ipcMain.handle('updates:restartToInstall', () => {
    try {
      updates.restartToInstall();
      return okResult(undefined);
    } catch (error) {
      return toAppRuntimeErrorResult(error);
    }
  });
  ipcMain.handle('updates:skipVersion', (_event, payload) => {
    const { isValid, version } = parseSkipVersionPayload(payload);
    if (!isValid) {
      return {
        ok: false,
        error: {
          code: 'SYSTEM_API_ERROR',
          message: 'Invalid skipped version payload.',
        },
      } satisfies AppRuntimeResult<AppUpdateSettings>;
    }
    try {
      return okResult(updates.skipVersion(version));
    } catch (error) {
      return toAppRuntimeErrorResult(error);
    }
  });
  ipcMain.handle('updates:openReleaseNotes', async () => {
    try {
      const url = updates.getState().releaseNotesUrl;
      if (!url) {
        throw new Error('Release notes URL is unavailable.');
      }
      const opened = await openExternalSafe(url, externalLinkPolicy);
      if (!opened) {
        throw new Error('Failed to open release notes URL.');
      }
      return okResult(undefined);
    } catch (error) {
      return toAppRuntimeErrorResult(error);
    }
  });
  ipcMain.handle('updates:openDownloadPage', async () => {
    try {
      const url = updates.getState().downloadUrl;
      if (!url) {
        throw new Error('Download URL is unavailable.');
      }
      const opened = await openExternalSafe(url, externalLinkPolicy);
      if (!opened) {
        throw new Error('Failed to open download URL.');
      }
      return okResult(undefined);
    } catch (error) {
      return toAppRuntimeErrorResult(error);
    }
  });
  ipcMain.handle('shell:openExternal', async (_event, payload) => {
    const url = typeof payload?.url === 'string' ? payload.url : '';
    if (!url) {
      return false;
    }
    return openExternalSafe(url, externalLinkPolicy);
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
  ipcMain.handle('workspace:getLastSidebarMode', () => getLastSidebarMode());
  ipcMain.handle('workspace:setLastSidebarMode', (_event, payload) => {
    const mode = typeof payload?.mode === 'string' ? payload.mode : '';
    if (mode !== 'chat' && mode !== 'home') {
      return;
    }
    setLastSidebarMode(mode);
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
  ipcMain.handle('search:query', (_event, payload) => {
    const query = typeof payload?.query === 'string' ? payload.query : '';
    const limitPerGroup =
      typeof payload?.limitPerGroup === 'number' ? payload.limitPerGroup : undefined;
    return searchIndexService.query({ query, limitPerGroup });
  });
  ipcMain.handle('search:rebuild', () => searchIndexService.rebuild());
  ipcMain.handle('search:getStatus', () => searchIndexService.getStatus());
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

  ipcMain.handle('membership:hasRefreshToken', async () => Boolean(await getRefreshToken()));

  ipcMain.handle('membership:signInWithEmail', async (_event, payload) => {
    const email = typeof payload?.email === 'string' ? payload.email.trim() : '';
    const password = typeof payload?.password === 'string' ? payload.password : '';
    if (!email || !password) {
      return invalidMembershipAuthResult('Email and password are required.');
    }
    return performMembershipTokenAuth(
      AUTH_API.SIGN_IN_EMAIL,
      { email, password },
      'Sign in failed'
    );
  });

  ipcMain.handle('membership:verifyEmailOTP', async (_event, payload) => {
    const email = typeof payload?.email === 'string' ? payload.email.trim() : '';
    const otp = typeof payload?.otp === 'string' ? payload.otp.trim() : '';
    if (!email || !otp) {
      return invalidMembershipAuthResult('Email and otp are required.');
    }
    return performMembershipTokenAuth(
      '/api/v1/auth/email-otp/verify-email',
      { email, otp },
      'Verification failed'
    );
  });

  ipcMain.handle('membership:completeEmailSignUp', async (_event, payload) => {
    const signupToken = typeof payload?.signupToken === 'string' ? payload.signupToken.trim() : '';
    const password = typeof payload?.password === 'string' ? payload.password : '';
    if (!signupToken || !password) {
      return invalidMembershipAuthResult('Signup token and password are required.');
    }
    return performMembershipTokenAuth(
      AUTH_API.SIGN_UP_EMAIL_COMPLETE,
      { signupToken, password },
      'Sign up failed'
    );
  });

  ipcMain.handle('membership:exchangeGoogleCode', async (_event, payload) => {
    const code = typeof payload?.code === 'string' ? payload.code.trim() : '';
    const nonce = typeof payload?.nonce === 'string' ? payload.nonce.trim() : '';
    if (!code || !nonce) {
      return invalidMembershipAuthResult('Code and nonce are required.');
    }
    return performMembershipTokenAuth(
      AUTH_API.SOCIAL_GOOGLE_EXCHANGE,
      { code, nonce },
      'Google sign in failed'
    );
  });

  ipcMain.handle('membership:refreshSession', async () => refreshMembershipSession());

  ipcMain.handle('membership:logout', async () => {
    await logoutMembershipSession();
  });

  ipcMain.handle('membership:clearSession', async () => {
    await clearMembershipSession();
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

  ipcMain.handle('membership:startOAuthCallbackLoopback', async (event) => {
    const owner = {
      id: event.sender.id,
      isDestroyed: () => event.sender.isDestroyed(),
      send: (channel: string, payload: { code: string; nonce: string }) => {
        event.sender.send(channel, payload);
      },
      onDestroyed: (listener: () => void) => {
        event.sender.once('destroyed', listener);
        return () => {
          event.sender.off('destroyed', listener);
        };
      },
    };
    return oauthLoopbackManager.start(owner);
  });

  ipcMain.handle('membership:stopOAuthCallbackLoopback', async (event) => {
    await oauthLoopbackManager.stop(event.sender.id);
  });

  // ── Telegram Channel ───────────────────────────────────────
  ipcMain.handle('telegram:isSecureStorageAvailable', () =>
    telegramChannelService.isSecretStorageAvailable()
  );

  ipcMain.handle('telegram:getSettings', () => telegramChannelService.getSettings());

  ipcMain.handle('telegram:updateSettings', (_event, payload) => {
    const account = payload?.account;
    const accountId = typeof account?.accountId === 'string' ? account.accountId : '';
    if (!accountId) {
      throw new Error('telegram accountId is required');
    }
    const defaultAccountId =
      typeof payload?.defaultAccountId === 'string' ? payload.defaultAccountId : undefined;
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
    const accountId = typeof payload?.accountId === 'string' ? payload.accountId : undefined;
    const status =
      payload?.status === 'pending' ||
      payload?.status === 'approved' ||
      payload?.status === 'denied' ||
      payload?.status === 'expired'
        ? payload.status
        : undefined;
    return telegramChannelService.listPairingRequests({ accountId, status });
  });

  ipcMain.handle('telegram:testProxyConnection', (_event, payload) => {
    const accountId = typeof payload?.accountId === 'string' ? payload.accountId : '';
    if (!accountId.trim()) {
      throw new Error('accountId is required');
    }
    const proxyEnabled =
      typeof payload?.proxyEnabled === 'boolean' ? payload.proxyEnabled : undefined;
    const proxyUrl = typeof payload?.proxyUrl === 'string' ? payload.proxyUrl : undefined;
    return telegramChannelService.testProxyConnection({
      accountId,
      proxyEnabled,
      proxyUrl,
    });
  });

  ipcMain.handle('telegram:detectProxySuggestion', (_event, payload) => {
    const accountId = typeof payload?.accountId === 'string' ? payload.accountId : '';
    if (!accountId.trim()) {
      throw new Error('accountId is required');
    }
    return telegramChannelService.detectProxySuggestion({
      accountId,
    });
  });

  ipcMain.handle('telegram:approvePairingRequest', async (_event, payload) => {
    const requestId = typeof payload?.requestId === 'string' ? payload.requestId : '';
    if (!requestId) {
      throw new Error('requestId is required');
    }
    await telegramChannelService.approvePairingRequest(requestId);
    return { ok: true };
  });

  ipcMain.handle('telegram:denyPairingRequest', async (_event, payload) => {
    const requestId = typeof payload?.requestId === 'string' ? payload.requestId : '';
    if (!requestId) {
      throw new Error('requestId is required');
    }
    await telegramChannelService.denyPairingRequest(requestId);
    return { ok: true };
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

  ipcMain.handle('cloud-sync:listCloudVaults', async () => listCloudVaultsIpc(cloudSyncApi));

  ipcMain.handle('cloud-sync:getStatus', () => cloudSyncEngine.getStatus());

  ipcMain.handle('cloud-sync:getStatusDetail', () => cloudSyncEngine.getStatusDetail());

  ipcMain.handle('cloud-sync:triggerSync', () => {
    cloudSyncEngine.triggerSync();
  });

  ipcMain.handle('cloud-sync:getUsage', async () => getCloudSyncUsageIpc(cloudSyncApi));

  ipcMain.handle('cloud-sync:search', async (_event, payload) =>
    searchCloudSyncIpc(cloudSyncApi, cloudSyncEngine, fileIndexManager, payload ?? {})
  );

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
