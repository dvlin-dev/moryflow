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
import type {
  AppCloseBehavior,
  AppRuntimeErrorCode,
  AppRuntimeResult,
  AppUpdateSettings,
  AppUpdateState,
  LaunchAtLoginState,
  MembershipAccessSessionPayload,
  MembershipAuthResult,
  MembershipAuthUser,
  MembershipRefreshSessionResult,
  QuickChatWindowState,
} from '../../../shared/ipc.js';
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
} from '../../vault/index.js';
import { getAgentSettings, updateAgentSettings } from '../../agent-settings/index.js';
import { resetApp } from '../../maintenance/reset-app.js';
import { isToolOutputPathAllowed } from '../../agent-runtime/tooling/tool-output-storage.js';
import {
  getExpandedPaths,
  setExpandedPaths,
  getDocumentSession,
  setDocumentSession,
  getLastSidebarMode,
  setLastSidebarMode,
  getRecentFiles,
  recordRecentFile,
  removeRecentFile,
} from '../../workspace/settings/index.js';
import { getTreeCache, setTreeCache } from '../../vault/tree-cache.js';
import type { VaultWatcherController } from '../../vault-watcher/index.js';
import { getRuntime } from '../../chat/services/runtime.js';
import * as ollamaService from '../../ollama-service/index.js';
import { membershipBridge } from '../../membership/bridge.js';
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
} from '../../membership/token-store.js';
import { cloudSyncEngine, cloudSyncApi } from '../../cloud-sync/index.js';
import { fetchCurrentUserId } from '../../cloud-sync/user-info.js';
import { ensureWorkspaceIdentity } from '../../workspace-meta/identity.js';
import { workspaceDocRegistry } from '../../workspace-doc-registry/index.js';
import { readDeviceConfig, writeDeviceConfig } from '../../device-config/store.js';
import { workspaceProfileService } from '../../workspace-profile/service.js';
import { workspaceProfileApi } from '../../workspace-profile/api/client.js';
import {
  resolveActiveWorkspaceProfileContext,
  resolveWorkspaceProfileContextForWorkspace,
} from '../../workspace-profile/context.js';
import { createExternalLinkPolicy, openExternalSafe } from '../external-links.js';
import { registerAutomationsIpcHandlers } from './automations-handlers.js';
import { getCloudSyncUsageIpc, listCloudVaultsIpc } from './cloud-sync-handlers.js';
import { registerMembershipIpcHandlers } from './membership-handlers.js';
import { getSkillsRegistry, SKILLS_DIR } from '../../skills/index.js';
import { memoryIndexingEngine } from '../../memory-indexing/engine.js';
import { searchIndexService } from '../../search-index/index.js';
import { telegramChannelService } from '../../channels/telegram/index.js';
import { automationService } from '../../automations/service.js';
import { createOAuthLoopbackManager } from '../../membership/oauth/loopback-manager.js';
import { MEMBERSHIP_API_URL } from '../../membership/api-url.js';
import { memoryApi } from '../../memory/index.js';
import { createMembershipDeviceAuthHeaders } from '../../membership/auth-headers.js';
import { ensureActiveVaultReady as ensureActiveVaultRuntimeReady } from '../active-vault-runtime.js';
import { reconcileMemoryIndexingVault } from '../../memory-indexing/reconcile.js';
import { registerAppShellIpcHandlers } from './app-shell-handlers.js';
import { registerVaultWorkspaceIpcHandlers } from './vault-workspace-handlers.js';
import { registerSearchIpcHandlers } from './search-handlers.js';
import { registerMemoryIpcHandlers } from './memory-registration.js';
import { registerAgentIpcHandlers } from './agent-handlers.js';
import { registerOllamaIpcHandlers } from './ollama-handlers.js';
import { registerTelegramIpcHandlers } from './telegram-handlers.js';
import { registerCloudSyncIpcHandlers } from './cloud-sync-registration.js';
import { registerIpcComposition } from './composition.js';

const parseSkipVersionPayload = (
  payload: unknown
): { isValid: boolean; version: string | null | undefined } => {
  if (typeof payload === 'undefined') return { isValid: true, version: undefined };
  if (!payload || typeof payload !== 'object') return { isValid: false, version: undefined };
  if (!('version' in payload)) return { isValid: true, version: undefined };
  const candidate = (payload as { version?: unknown }).version;
  if (candidate === null) return { isValid: true, version: null };
  if (typeof candidate === 'string') return { isValid: true, version: candidate };
  return { isValid: false, version: undefined };
};

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

const isSameResolvedPath = (left: string, right: string): boolean =>
  path.resolve(left) === path.resolve(right);

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
      headers: createMembershipDeviceAuthHeaders(),
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
      headers: createMembershipDeviceAuthHeaders(),
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
      headers: createMembershipDeviceAuthHeaders(),
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
  const ensureActiveVaultReady = async (vaultPath: string): Promise<void> =>
    ensureActiveVaultRuntimeReady(
      {
        vaultWatcherController,
        cloudSyncEngine,
        reconcileMemoryIndexing: (readyVaultPath) =>
          reconcileMemoryIndexingVault({
            vaultPath: readyVaultPath,
            documentRegistry: workspaceDocRegistry,
            memoryIndexingEngine,
          }),
      },
      vaultPath
    );

  const memoryIpcDeps = {
    profiles: {
      resolveActiveProfile: () =>
        resolveActiveWorkspaceProfileContext(
          {},
          {
            membership: membershipBridge,
            vault: {
              getActiveVaultInfo,
            },
            user: {
              fetchCurrentUserId,
            },
            workspaceMeta: {
              ensureWorkspaceIdentity,
            },
            profileService: workspaceProfileService,
            api: workspaceProfileApi,
          }
        ),
    },
    engine: cloudSyncEngine,
    usage: cloudSyncApi,
    documentRegistry: workspaceDocRegistry,
    api: memoryApi,
  };
  // Note: memory:readWorkspaceFile is NOT registered as IPC handler.
  // The agent runtime calls readWorkspaceFileIpc directly (not through IPC channel),
  // so no preload/desktop-api sync is needed.
  registerIpcComposition({
    ipcMain,
    subscribeTelegramStatus: (listener) => {
      telegramChannelService.subscribeStatus(listener);
    },
    subscribeUpdates: (listener) => {
      updates.subscribe(listener);
    },
    subscribeAutomationStatus: (listener) => {
      automationService.subscribeStatusChange(listener);
    },
    broadcastToAllWindows,
    registerAutomationsIpcHandlers,
    automationService,
    registerAppShellIpcHandlers,
    appShellDeps: {
      app,
      quickChat,
      appRuntime,
      updates,
      externalLinkPolicy,
      openExternalSafe,
      parseSkipVersionPayload,
      okResult,
      toAppRuntimeErrorResult,
      resetApp,
    },
    registerVaultWorkspaceIpcHandlers,
    vaultWorkspaceDeps: {
      createVault,
      ensureDefaultWorkspace,
      openVault,
      selectDirectory,
      getVaults,
      getActiveVaultInfo,
      switchVault,
      removeVault,
      updateVaultName,
      readVaultTreeRoot,
      readVaultTreeChildren,
      readVaultTree,
      readVaultFile,
      writeVaultFile,
      createVaultFile,
      createVaultFolder,
      renameVaultEntry,
      moveVaultEntry,
      deleteVaultEntry,
      showItemInFinder,
      getStoredVault,
      getExpandedPaths,
      setExpandedPaths,
      getDocumentSession,
      setDocumentSession,
      getLastSidebarMode,
      setLastSidebarMode,
      getRecentFiles,
      recordRecentFile,
      removeRecentFile,
      getTreeCache,
      setTreeCache,
      vaultWatcherController,
      cloudSyncEngine,
      memoryIndexingEngine,
      searchIndexService,
      existsSync,
      shell,
      pathUtils: path,
      isToolOutputPathAllowed,
      ensureActiveVaultReady,
      broadcastToAllWindows,
    },
    registerSearchIpcHandlers,
    searchDeps: {
      searchIndexService,
    },
    registerMemoryIpcHandlers,
    memoryIpcDeps,
    registerAgentIpcHandlers,
    agentDeps: {
      getAgentSettings,
      updateAgentSettings,
      getSkillsRegistry,
      skillsDir: SKILLS_DIR,
      shell,
      getRuntime,
      broadcastToAllWindows,
    },
    registerOllamaIpcHandlers,
    ollamaDeps: {
      ollamaService,
      broadcastToAllWindows,
    },
    registerMembershipIpcHandlers,
    membershipDeps: {
      membershipBridge,
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
      refreshMembershipSession,
      logoutMembershipSession,
      clearMembershipSession,
      invalidMembershipAuthResult,
      performMembershipTokenAuth,
      oauthLoopbackManager,
    },
    registerTelegramIpcHandlers,
    telegramDeps: {
      telegramChannelService,
    },
    registerCloudSyncIpcHandlers,
    cloudSyncDeps: {
      membershipBridge,
      getActiveVaultInfo,
      fetchCurrentUserId,
      ensureWorkspaceIdentity,
      workspaceProfileService,
      workspaceProfileApi,
      readDeviceConfig,
      writeDeviceConfig,
      resolveActiveWorkspaceProfileContext,
      resolveWorkspaceProfileContextForWorkspace,
      cloudSyncEngine,
      cloudSyncApi,
      ensureActiveVaultReady,
      isSameResolvedPath,
      listCloudVaultsIpc,
      getCloudSyncUsageIpc,
    },
  });
};
