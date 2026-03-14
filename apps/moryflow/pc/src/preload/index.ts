/**
 * [PROVIDES]: Renderer IPC bridge (desktopAPI + membership auth storage + 会话/工具输出能力)
 * [DEPENDS]: electron ipcRenderer, shared IPC types
 * [POS]: Preload bridge (secure channel surface)
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { UIMessageChunk } from 'ai';

import type {
  AgentSettings,
  AppRuntimeErrorPayload,
  AppRuntimeResult,
  AppUpdateStateChangeEvent,
  ChatMessageEvent,
  ChatSessionEvent,
  CloudSyncStatusEvent,
  DesktopApi,
  McpStatusEvent,
  OllamaPullProgressEvent,
  TelegramRuntimeStatusSnapshot,
  VaultFsEvent,
  VaultItem,
  BuildProgressEvent,
  SandboxAuthRequest,
} from '../shared/ipc.js';
import { createSkipVersionPayload } from './update-payloads';

const openExternalOrThrow = async (url: string): Promise<void> => {
  const opened = await ipcRenderer.invoke('shell:openExternal', { url });
  if (!opened) {
    throw new Error('Failed to open external URL');
  }
};

const toAppRuntimeError = (payload: AppRuntimeErrorPayload): Error & { code: string } => {
  const error = new Error(payload.message) as Error & { code: string };
  error.code = payload.code;
  return error;
};

const invokeStructuredResult = async <T>(channel: string, payload?: unknown): Promise<T> => {
  const result = (await ipcRenderer.invoke(channel, payload)) as AppRuntimeResult<T>;
  if (result?.ok) {
    return result.data;
  }
  if (result && typeof result === 'object' && !result.ok) {
    throw toAppRuntimeError(result.error);
  }
  throw new Error('Invalid app runtime response');
};

const api: DesktopApi = {
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  membership: {
    syncToken: (token) => ipcRenderer.invoke('membership:syncToken', token),
    syncEnabled: (enabled) => ipcRenderer.invoke('membership:syncEnabled', enabled),
    isSecureStorageAvailable: () => ipcRenderer.invoke('membership:isSecureStorageAvailable'),
    getAccessToken: () => ipcRenderer.invoke('membership:getAccessToken'),
    setAccessToken: (token) => ipcRenderer.invoke('membership:setAccessToken', token),
    clearAccessToken: () => ipcRenderer.invoke('membership:clearAccessToken'),
    getAccessTokenExpiresAt: () => ipcRenderer.invoke('membership:getAccessTokenExpiresAt'),
    setAccessTokenExpiresAt: (expiresAt) =>
      ipcRenderer.invoke('membership:setAccessTokenExpiresAt', expiresAt),
    clearAccessTokenExpiresAt: () => ipcRenderer.invoke('membership:clearAccessTokenExpiresAt'),
    hasRefreshToken: () => ipcRenderer.invoke('membership:hasRefreshToken'),
    signInWithEmail: (email, password) =>
      ipcRenderer.invoke('membership:signInWithEmail', { email, password }),
    verifyEmailOTP: (email, otp) => ipcRenderer.invoke('membership:verifyEmailOTP', { email, otp }),
    completeEmailSignUp: (signupToken, password) =>
      ipcRenderer.invoke('membership:completeEmailSignUp', { signupToken, password }),
    exchangeGoogleCode: (code, nonce) =>
      ipcRenderer.invoke('membership:exchangeGoogleCode', { code, nonce }),
    refreshSession: () => ipcRenderer.invoke('membership:refreshSession'),
    logout: () => ipcRenderer.invoke('membership:logout'),
    clearSession: () => ipcRenderer.invoke('membership:clearSession'),
    openExternal: (url) => openExternalOrThrow(url),
    startOAuthCallbackLoopback: () => ipcRenderer.invoke('membership:startOAuthCallbackLoopback'),
    stopOAuthCallbackLoopback: () => ipcRenderer.invoke('membership:stopOAuthCallbackLoopback'),
    onOAuthCallback: (handler) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        payload: { code: string; nonce: string }
      ) => handler(payload);
      ipcRenderer.on('membership:oauth-callback', listener);
      return () => ipcRenderer.removeListener('membership:oauth-callback', listener);
    },
  },
  payment: {
    openCheckout: (url) => openExternalOrThrow(url),
    onSuccess: (handler) => {
      const listener = () => handler();
      ipcRenderer.on('payment:success', listener);
      return () => ipcRenderer.removeListener('payment:success', listener);
    },
  },
  vault: {
    open: (options) => ipcRenderer.invoke('vault:open', options ?? {}),
    create: (options) => ipcRenderer.invoke('vault:create', options ?? {}),
    ensureDefaultWorkspace: () => ipcRenderer.invoke('vault:ensureDefaultWorkspace'),
    selectDirectory: () => ipcRenderer.invoke('vault:selectDirectory'),
    readTree: (path) => ipcRenderer.invoke('vault:readTree', { path }),
    readTreeRoot: (path) => ipcRenderer.invoke('vault:readTreeRoot', { path }),
    readTreeChildren: (path) => ipcRenderer.invoke('vault:readTreeChildren', { path }),
    updateWatchPaths: (paths) => ipcRenderer.invoke('vault:updateWatchPaths', { paths }),
    getTreeCache: (vaultPath) => ipcRenderer.invoke('vault:getTreeCache', { vaultPath }),
    setTreeCache: (params) =>
      ipcRenderer.invoke('vault:setTreeCache', {
        vaultPath: params?.vaultPath,
        nodes: params?.nodes,
      }),
    // ── 多 Vault 支持 ──────────────────────────────────────────
    getVaults: () => ipcRenderer.invoke('vault:getVaults'),
    getActiveVault: () => ipcRenderer.invoke('vault:getActiveVault'),
    setActiveVault: (vaultId) => ipcRenderer.invoke('vault:setActiveVault', { vaultId }),
    removeVault: (vaultId) => ipcRenderer.invoke('vault:removeVault', { vaultId }),
    renameVault: (vaultId, name) => ipcRenderer.invoke('vault:renameVault', { vaultId, name }),
    validateVaults: () => ipcRenderer.invoke('vault:validateVaults'),
    onVaultsChange: (handler) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: VaultItem[]) =>
        handler(payload);
      ipcRenderer.on('vault:vaultsChanged', listener);
      return () => ipcRenderer.removeListener('vault:vaultsChanged', listener);
    },
    onActiveVaultChange: (handler) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: VaultItem | null) =>
        handler(payload);
      ipcRenderer.on('vault:activeVaultChanged', listener);
      return () => ipcRenderer.removeListener('vault:activeVaultChanged', listener);
    },
  },
  workspace: {
    getExpandedPaths: (vaultPath) =>
      ipcRenderer.invoke('workspace:getExpandedPaths', { vaultPath }),
    setExpandedPaths: (vaultPath, paths) =>
      ipcRenderer.invoke('workspace:setExpandedPaths', { vaultPath, paths }),
    getLastSidebarMode: () => ipcRenderer.invoke('workspace:getLastSidebarMode'),
    setLastSidebarMode: (mode) => ipcRenderer.invoke('workspace:setLastSidebarMode', { mode }),
    getDocumentSession: (vaultPath) =>
      ipcRenderer.invoke('workspace:getDocumentSession', { vaultPath }),
    setDocumentSession: (vaultPath, session) =>
      ipcRenderer.invoke('workspace:setDocumentSession', { vaultPath, session }),
    getRecentFiles: (vaultPath) => ipcRenderer.invoke('workspace:getRecentFiles', { vaultPath }),
    recordRecentFile: (vaultPath, filePath) =>
      ipcRenderer.invoke('workspace:recordRecentFile', { vaultPath, filePath }),
    removeRecentFile: (vaultPath, filePath) =>
      ipcRenderer.invoke('workspace:removeRecentFile', { vaultPath, filePath }),
  },
  files: {
    read: (path) => ipcRenderer.invoke('files:read', { path }),
    write: (input) => ipcRenderer.invoke('files:write', input),
    createFile: (input) => ipcRenderer.invoke('files:createFile', input),
    createFolder: (input) => ipcRenderer.invoke('files:createFolder', input),
    rename: (input) => ipcRenderer.invoke('files:rename', input),
    move: (input) => ipcRenderer.invoke('files:move', input),
    delete: (input) => ipcRenderer.invoke('files:delete', input),
    showInFinder: (input) => ipcRenderer.invoke('files:showInFinder', input),
    openPath: (input) => ipcRenderer.invoke('files:openPath', input),
  },
  events: {
    onVaultFsEvent: (handler) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: unknown) => {
        if (!payload || typeof payload !== 'object') {
          return;
        }
        handler(payload as VaultFsEvent);
      };
      ipcRenderer.on('vault:fs-event', listener);
      return () => ipcRenderer.removeListener('vault:fs-event', listener);
    },
  },
  chat: {
    send: (payload) => ipcRenderer.invoke('chat:agent-request', payload ?? {}),
    stop: (payload) => ipcRenderer.invoke('chat:agent-stop', payload ?? {}),
    approveTool: (payload) => ipcRenderer.invoke('chat:approve-tool', payload ?? {}),
    getApprovalContext: (payload) =>
      ipcRenderer.invoke('chat:approvals:get-context', payload ?? {}),
    consumeFullAccessUpgradePrompt: () =>
      ipcRenderer.invoke('chat:approvals:consume-upgrade-prompt'),
    onChunk: (channel, handler) => {
      const listener = (_event: Electron.IpcRendererEvent, chunk: UIMessageChunk | null) =>
        handler(chunk);
      ipcRenderer.on(channel, listener);
      return () => ipcRenderer.removeListener(channel, listener);
    },
    listSessions: () => ipcRenderer.invoke('chat:sessions:list'),
    createSession: () => ipcRenderer.invoke('chat:sessions:create'),
    renameSession: (input) => ipcRenderer.invoke('chat:sessions:rename', input ?? {}),
    generateSessionTitle: (input) => ipcRenderer.invoke('chat:sessions:generateTitle', input ?? {}),
    deleteSession: (input) => ipcRenderer.invoke('chat:sessions:delete', input ?? {}),
    getSessionMessages: (input) => ipcRenderer.invoke('chat:sessions:getMessages', input ?? {}),
    getGlobalMode: () => ipcRenderer.invoke('chat:permission:getGlobalMode'),
    setGlobalMode: (input) => ipcRenderer.invoke('chat:permission:setGlobalMode', input ?? {}),
    prepareCompaction: (input) =>
      ipcRenderer.invoke('chat:sessions:prepareCompaction', input ?? {}),
    truncateSession: (input) => ipcRenderer.invoke('chat:sessions:truncate', input ?? {}),
    replaceMessage: (input) => ipcRenderer.invoke('chat:sessions:replaceMessage', input ?? {}),
    forkSession: (input) => ipcRenderer.invoke('chat:sessions:fork', input ?? {}),
    onSessionEvent: (handler) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: ChatSessionEvent) =>
        handler(payload);
      ipcRenderer.on('chat:session-event', listener);
      return () => ipcRenderer.removeListener('chat:session-event', listener);
    },
    onMessageEvent: (handler) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: ChatMessageEvent) =>
        handler(payload);
      ipcRenderer.on('chat:message-event', listener);
      return () => ipcRenderer.removeListener('chat:message-event', listener);
    },
    onGlobalModeChanged: (handler) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        payload: { mode: 'ask' | 'full_access' }
      ) => handler(payload);
      ipcRenderer.on('chat:permission:global-mode-changed', listener);
      return () => ipcRenderer.removeListener('chat:permission:global-mode-changed', listener);
    },
    applyEdit: (input) => ipcRenderer.invoke('chat:apply-edit', input ?? {}),
  },
  search: {
    query: (input) => ipcRenderer.invoke('search:query', input ?? {}),
    rebuild: () => ipcRenderer.invoke('search:rebuild'),
    getStatus: () => ipcRenderer.invoke('search:getStatus'),
  },
  agent: {
    getSettings: () => ipcRenderer.invoke('agent:settings:get'),
    updateSettings: (input) => ipcRenderer.invoke('agent:settings:update', input ?? {}),
    onSettingsChange: (handler) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: AgentSettings) =>
        handler(payload);
      ipcRenderer.on('agent:settings-changed', listener);
      return () => ipcRenderer.removeListener('agent:settings-changed', listener);
    },
    listSkills: () => ipcRenderer.invoke('agent:skills:list'),
    refreshSkills: () => ipcRenderer.invoke('agent:skills:refresh'),
    getSkillDetail: (input) => ipcRenderer.invoke('agent:skills:get', input ?? {}),
    setSkillEnabled: (input) => ipcRenderer.invoke('agent:skills:setEnabled', input ?? {}),
    uninstallSkill: (input) => ipcRenderer.invoke('agent:skills:uninstall', input ?? {}),
    installSkill: (input) => ipcRenderer.invoke('agent:skills:install', input ?? {}),
    listRecommendedSkills: () => ipcRenderer.invoke('agent:skills:listRecommended'),
    openSkillDirectory: (input) => ipcRenderer.invoke('agent:skills:openDirectory', input ?? {}),
    getMcpStatus: () => ipcRenderer.invoke('agent:mcp:getStatus'),
    onMcpStatusChange: (handler) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: McpStatusEvent) =>
        handler(payload);
      ipcRenderer.on('agent:mcp-status-changed', listener);
      return () => ipcRenderer.removeListener('agent:mcp-status-changed', listener);
    },
    testMcpServer: (input) => ipcRenderer.invoke('agent:mcp:testServer', input ?? {}),
    reloadMcp: () => ipcRenderer.invoke('agent:mcp:reload'),
  },
  telegram: {
    isSecureStorageAvailable: () => ipcRenderer.invoke('telegram:isSecureStorageAvailable'),
    getSettings: () => ipcRenderer.invoke('telegram:getSettings'),
    updateSettings: (input) => ipcRenderer.invoke('telegram:updateSettings', input ?? {}),
    getStatus: () => ipcRenderer.invoke('telegram:getStatus'),
    listPairingRequests: (input) => ipcRenderer.invoke('telegram:listPairingRequests', input ?? {}),
    testProxyConnection: (input) => ipcRenderer.invoke('telegram:testProxyConnection', input ?? {}),
    detectProxySuggestion: (input) =>
      ipcRenderer.invoke('telegram:detectProxySuggestion', input ?? {}),
    approvePairingRequest: (input) =>
      ipcRenderer.invoke('telegram:approvePairingRequest', input ?? {}),
    denyPairingRequest: (input) => ipcRenderer.invoke('telegram:denyPairingRequest', input ?? {}),
    onStatusChange: (handler) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        payload: TelegramRuntimeStatusSnapshot
      ) => handler(payload);
      ipcRenderer.on('telegram:status-changed', listener);
      return () => ipcRenderer.removeListener('telegram:status-changed', listener);
    },
  },
  automations: {
    listAutomations: () => ipcRenderer.invoke('automations:list'),
    getAutomation: (input) => ipcRenderer.invoke('automations:get', input ?? {}),
    createAutomation: (input) => ipcRenderer.invoke('automations:create', input ?? {}),
    updateAutomation: (input) => ipcRenderer.invoke('automations:update', input ?? {}),
    deleteAutomation: (input) => ipcRenderer.invoke('automations:delete', input ?? {}),
    toggleAutomation: (input) => ipcRenderer.invoke('automations:toggle', input ?? {}),
    runAutomationNow: (input) => ipcRenderer.invoke('automations:runNow', input ?? {}),
    listRuns: (input) => ipcRenderer.invoke('automations:listRuns', input ?? {}),
    listEndpoints: () => ipcRenderer.invoke('automations:listEndpoints'),
    getDefaultEndpoint: () => ipcRenderer.invoke('automations:getDefaultEndpoint'),
    bindEndpoint: (input) => ipcRenderer.invoke('automations:bindEndpoint', input ?? {}),
    updateEndpoint: (input) => ipcRenderer.invoke('automations:updateEndpoint', input ?? {}),
    removeEndpoint: (input) => ipcRenderer.invoke('automations:removeEndpoint', input ?? {}),
    setDefaultEndpoint: (input) =>
      ipcRenderer.invoke('automations:setDefaultEndpoint', input ?? {}),
  },
  quickChat: {
    toggle: () => ipcRenderer.invoke('quick-chat:toggle'),
    open: () => ipcRenderer.invoke('quick-chat:open'),
    close: () => ipcRenderer.invoke('quick-chat:close'),
    getState: () => ipcRenderer.invoke('quick-chat:getState'),
    setSessionId: (input) => ipcRenderer.invoke('quick-chat:setSessionId', input),
  },
  appRuntime: {
    getCloseBehavior: () => invokeStructuredResult('app-runtime:getCloseBehavior'),
    setCloseBehavior: (behavior) =>
      invokeStructuredResult('app-runtime:setCloseBehavior', { behavior }),
    getLaunchAtLogin: () => invokeStructuredResult('app-runtime:getLaunchAtLogin'),
    setLaunchAtLogin: (enabled) =>
      invokeStructuredResult('app-runtime:setLaunchAtLogin', { enabled }),
  },
  updates: {
    getState: () => invokeStructuredResult('updates:getState'),
    getSettings: () => invokeStructuredResult('updates:getSettings'),
    setChannel: (channel) => invokeStructuredResult('updates:setChannel', { channel }),
    setAutoCheck: (enabled) => invokeStructuredResult('updates:setAutoCheck', { enabled }),
    setAutoDownload: (enabled) => invokeStructuredResult('updates:setAutoDownload', { enabled }),
    checkForUpdates: () => invokeStructuredResult('updates:checkForUpdates'),
    downloadUpdate: () => invokeStructuredResult('updates:downloadUpdate'),
    restartToInstall: () => invokeStructuredResult('updates:restartToInstall'),
    skipVersion: (version) =>
      invokeStructuredResult('updates:skipVersion', createSkipVersionPayload(version)),
    openReleaseNotes: () => invokeStructuredResult('updates:openReleaseNotes'),
    openDownloadPage: () => invokeStructuredResult('updates:openDownloadPage'),
    onStateChange: (handler) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: AppUpdateStateChangeEvent) =>
        handler(payload);
      ipcRenderer.on('updates:state-changed', listener);
      return () => ipcRenderer.removeListener('updates:state-changed', listener);
    },
  },
  testAgentProvider: (input) => ipcRenderer.invoke('agent:test-provider', input ?? {}),
  maintenance: {
    resetApp: () => ipcRenderer.invoke('app:resetApp'),
  },
  ollama: {
    checkConnection: (baseUrl) => ipcRenderer.invoke('ollama:checkConnection', { baseUrl }),
    getLocalModels: (baseUrl) => ipcRenderer.invoke('ollama:getLocalModels', { baseUrl }),
    getLibraryModels: (params) => ipcRenderer.invoke('ollama:getLibraryModels', params ?? {}),
    pullModel: (name, baseUrl) => ipcRenderer.invoke('ollama:pullModel', { name, baseUrl }),
    deleteModel: (name, baseUrl) => ipcRenderer.invoke('ollama:deleteModel', { name, baseUrl }),
    onPullProgress: (handler) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: OllamaPullProgressEvent) =>
        handler(payload);
      ipcRenderer.on('ollama:pullProgress', listener);
      return () => ipcRenderer.removeListener('ollama:pullProgress', listener);
    },
  },
  cloudSync: {
    getSettings: () => ipcRenderer.invoke('cloud-sync:getSettings'),
    updateSettings: (patch) => ipcRenderer.invoke('cloud-sync:updateSettings', patch ?? {}),

    getBinding: (localPath) => ipcRenderer.invoke('cloud-sync:getBinding', { localPath }),
    bindVault: (input) => ipcRenderer.invoke('cloud-sync:bindVault', input ?? {}),
    unbindVault: (localPath) => ipcRenderer.invoke('cloud-sync:unbindVault', { localPath }),
    listCloudVaults: () => ipcRenderer.invoke('cloud-sync:listCloudVaults'),

    getStatus: () => ipcRenderer.invoke('cloud-sync:getStatus'),
    getStatusDetail: () => ipcRenderer.invoke('cloud-sync:getStatusDetail'),
    triggerSync: () => ipcRenderer.invoke('cloud-sync:triggerSync'),
    onStatusChange: (handler) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: CloudSyncStatusEvent) =>
        handler(payload);
      ipcRenderer.on('cloud-sync:status-changed', listener);
      return () => ipcRenderer.removeListener('cloud-sync:status-changed', listener);
    },

    getUsage: () => ipcRenderer.invoke('cloud-sync:getUsage'),
  },
  memory: {
    getOverview: () => ipcRenderer.invoke('memory:getOverview'),
    search: (input) => ipcRenderer.invoke('memory:search', input ?? {}),
    listFacts: (input) => ipcRenderer.invoke('memory:listFacts', input ?? {}),
    getFactDetail: (factId) => ipcRenderer.invoke('memory:getFactDetail', { factId }),
    createFact: (input) => ipcRenderer.invoke('memory:createFact', input ?? {}),
    updateFact: (input) => ipcRenderer.invoke('memory:updateFact', input ?? {}),
    deleteFact: (factId) => ipcRenderer.invoke('memory:deleteFact', { factId }),
    batchUpdateFacts: (input) => ipcRenderer.invoke('memory:batchUpdateFacts', input ?? {}),
    batchDeleteFacts: (input) => ipcRenderer.invoke('memory:batchDeleteFacts', input ?? {}),
    getFactHistory: (factId) => ipcRenderer.invoke('memory:getFactHistory', { factId }),
    feedbackFact: (input) => ipcRenderer.invoke('memory:feedbackFact', input ?? {}),
    queryGraph: (input) => ipcRenderer.invoke('memory:queryGraph', input ?? {}),
    getEntityDetail: (input) => ipcRenderer.invoke('memory:getEntityDetail', input ?? {}),
    createExport: () => ipcRenderer.invoke('memory:createExport'),
    getExport: (exportId) => ipcRenderer.invoke('memory:getExport', { exportId }),
  },
  sitePublish: {
    list: () => ipcRenderer.invoke('site-publish:list'),
    create: (input) => ipcRenderer.invoke('site-publish:create', input),
    get: (siteId) => ipcRenderer.invoke('site-publish:get', { siteId }),
    update: (input) => ipcRenderer.invoke('site-publish:update', input),
    delete: (siteId) => ipcRenderer.invoke('site-publish:delete', { siteId }),
    offline: (siteId) => ipcRenderer.invoke('site-publish:offline', { siteId }),
    online: (siteId) => ipcRenderer.invoke('site-publish:online', { siteId }),
    getPages: (siteId) => ipcRenderer.invoke('site-publish:getPages', { siteId }),
    checkSubdomain: (subdomain) => ipcRenderer.invoke('site-publish:checkSubdomain', { subdomain }),
    suggestSubdomain: (base) => ipcRenderer.invoke('site-publish:suggestSubdomain', { base }),
    buildAndPublish: (input) => ipcRenderer.invoke('site-publish:buildAndPublish', input),
    onProgress: (handler) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: BuildProgressEvent) =>
        handler(payload);
      ipcRenderer.on('site-publish:progress', listener);
      return () => ipcRenderer.removeListener('site-publish:progress', listener);
    },
    detectChanges: (sourcePaths, lastHashes) =>
      ipcRenderer.invoke('site-publish:detectChanges', { sourcePaths, lastHashes }),
    updateContent: (siteId) => ipcRenderer.invoke('site-publish:updateContent', { siteId }),
  },
  sandbox: {
    getSettings: () => ipcRenderer.invoke('sandbox:get-settings'),
    addAuthorizedPath: (path: string) => ipcRenderer.invoke('sandbox:add-authorized-path', path),
    removeAuthorizedPath: (path: string) =>
      ipcRenderer.invoke('sandbox:remove-authorized-path', path),
    clearAuthorizedPaths: () => ipcRenderer.invoke('sandbox:clear-authorized-paths'),
    respondAuth: (response) => ipcRenderer.invoke('sandbox:auth-response', response),
    onAuthRequest: (handler) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: SandboxAuthRequest) =>
        handler(payload);
      ipcRenderer.on('sandbox:auth-request', listener);
      return () => ipcRenderer.removeListener('sandbox:auth-request', listener);
    },
  },
};

contextBridge.exposeInMainWorld('desktopAPI', api);
