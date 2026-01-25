/**
 * [PROVIDES]: Renderer IPC bridge (desktopAPI + 工具输出文件打开)
 * [DEPENDS]: electron ipcRenderer, shared IPC types
 * [POS]: Preload bridge (secure channel surface)
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { UIMessageChunk } from 'ai';

import type {
  AgentSettings,
  ChatSessionEvent,
  CloudSyncStatusEvent,
  DesktopApi,
  McpStatusEvent,
  OllamaPullProgressEvent,
  VaultFsEvent,
  VaultItem,
  BuildProgressEvent,
  SandboxAuthRequest,
  BindingConflictRequest,
} from '../shared/ipc.js';
import type { SandboxMode } from '@anyhunt/agents-sandbox';

const api: DesktopApi = {
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  membership: {
    syncToken: (token) => ipcRenderer.invoke('membership:syncToken', token),
    syncEnabled: (enabled) => ipcRenderer.invoke('membership:syncEnabled', enabled),
    getRefreshToken: () => ipcRenderer.invoke('membership:getRefreshToken'),
    setRefreshToken: (token) => ipcRenderer.invoke('membership:setRefreshToken', token),
    clearRefreshToken: () => ipcRenderer.invoke('membership:clearRefreshToken'),
  },
  payment: {
    openCheckout: (url) => ipcRenderer.invoke('shell:openExternal', { url }).then(() => undefined),
    onSuccess: (handler) => {
      const listener = () => handler();
      ipcRenderer.on('payment:success', listener);
      return () => ipcRenderer.removeListener('payment:success', listener);
    },
  },
  vault: {
    open: (options) => ipcRenderer.invoke('vault:open', options ?? {}),
    create: (options) => ipcRenderer.invoke('vault:create', options ?? {}),
    selectDirectory: () => ipcRenderer.invoke('vault:selectDirectory'),
    getRecent: () => ipcRenderer.invoke('vault:getRecent'),
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
    getLastOpenedFile: (vaultPath) =>
      ipcRenderer.invoke('workspace:getLastOpenedFile', { vaultPath }),
    setLastOpenedFile: (vaultPath, filePath) =>
      ipcRenderer.invoke('workspace:setLastOpenedFile', { vaultPath, filePath }),
    getOpenTabs: (vaultPath) => ipcRenderer.invoke('workspace:getOpenTabs', { vaultPath }),
    setOpenTabs: (vaultPath, tabs) =>
      ipcRenderer.invoke('workspace:setOpenTabs', { vaultPath, tabs }),
  },
  preload: {
    getCache: () => ipcRenderer.invoke('preload:getCache'),
    setCache: (input) => ipcRenderer.invoke('preload:setCache', input ?? {}),
    getConfig: () => ipcRenderer.invoke('preload:getConfig'),
    setConfig: (input) => ipcRenderer.invoke('preload:setConfig', input ?? {}),
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
    truncateSession: (input) => ipcRenderer.invoke('chat:sessions:truncate', input ?? {}),
    replaceMessage: (input) => ipcRenderer.invoke('chat:sessions:replaceMessage', input ?? {}),
    forkSession: (input) => ipcRenderer.invoke('chat:sessions:fork', input ?? {}),
    onSessionEvent: (handler) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: ChatSessionEvent) =>
        handler(payload);
      ipcRenderer.on('chat:session-event', listener);
      return () => ipcRenderer.removeListener('chat:session-event', listener);
    },
    applyEdit: (input) => ipcRenderer.invoke('chat:apply-edit', input ?? {}),
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

    search: (input) => ipcRenderer.invoke('cloud-sync:search', input ?? {}),

    // 绑定冲突处理
    respondBindingConflict: (response) =>
      ipcRenderer.invoke('cloud-sync:binding-conflict-response', response),
    onBindingConflictRequest: (handler) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: BindingConflictRequest) =>
        handler(payload);
      ipcRenderer.on('cloud-sync:binding-conflict-request', listener);
      return () => ipcRenderer.removeListener('cloud-sync:binding-conflict-request', listener);
    },
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
    setMode: (mode: SandboxMode) => ipcRenderer.invoke('sandbox:set-mode', mode),
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
