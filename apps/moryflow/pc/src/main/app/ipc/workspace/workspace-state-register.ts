import {
  getDocumentSession,
  getExpandedPaths,
  getLastSidebarMode,
  getRecentFiles,
  recordRecentFile,
  removeRecentFile,
  setDocumentSession,
  setExpandedPaths,
  setLastSidebarMode,
} from '../../../workspace/settings/index.js';
import { getTreeCache, setTreeCache } from '../../../vault/tree-cache.js';
import type { IpcMainLike } from '../shared.js';
import { asObjectRecord } from '../shared.js';
import type { TreeCacheNodes } from './contracts.js';

export const registerWorkspaceStateIpcHandlers = (ipcMain: IpcMainLike): void => {
  ipcMain.handle('workspace:getExpandedPaths', (_event, payload) => {
    const input = asObjectRecord(payload);
    const vaultPath = typeof input.vaultPath === 'string' ? input.vaultPath : '';
    if (!vaultPath) return [];
    return getExpandedPaths(vaultPath);
  });
  ipcMain.handle('workspace:setExpandedPaths', (_event, payload) => {
    const input = asObjectRecord(payload);
    const vaultPath = typeof input.vaultPath === 'string' ? input.vaultPath : '';
    const paths = Array.isArray(input.paths) ? input.paths : [];
    if (!vaultPath) return;
    setExpandedPaths(vaultPath, paths);
  });
  ipcMain.handle('workspace:getDocumentSession', (_event, payload) => {
    const input = asObjectRecord(payload);
    const vaultPath = typeof input.vaultPath === 'string' ? input.vaultPath : '';
    if (!vaultPath) {
      return { tabs: [], activePath: null };
    }
    return getDocumentSession(vaultPath);
  });
  ipcMain.handle('workspace:getLastSidebarMode', () => getLastSidebarMode());
  ipcMain.handle('workspace:setLastSidebarMode', (_event, payload) => {
    const input = asObjectRecord(payload);
    const mode = typeof input.mode === 'string' ? input.mode : '';
    if (mode !== 'chat' && mode !== 'home') {
      return;
    }
    setLastSidebarMode(mode);
  });
  ipcMain.handle('workspace:setDocumentSession', (_event, payload) => {
    const input = asObjectRecord(payload);
    const vaultPath = typeof input.vaultPath === 'string' ? input.vaultPath : '';
    if (!vaultPath) return;
    const session =
      input.session && typeof input.session === 'object'
        ? (input.session as Record<string, unknown>)
        : {};
    const tabs = Array.isArray(session.tabs) ? session.tabs : [];
    const activePath =
      session.activePath === null
        ? null
        : typeof session.activePath === 'string'
          ? session.activePath
          : null;
    setDocumentSession(vaultPath, { tabs, activePath });
  });
  ipcMain.handle('workspace:getRecentFiles', (_event, payload) => {
    const input = asObjectRecord(payload);
    const vaultPath = typeof input.vaultPath === 'string' ? input.vaultPath : '';
    if (!vaultPath) return [];
    return getRecentFiles(vaultPath);
  });
  ipcMain.handle('workspace:recordRecentFile', (_event, payload) => {
    const input = asObjectRecord(payload);
    const vaultPath = typeof input.vaultPath === 'string' ? input.vaultPath : '';
    const filePath = typeof input.filePath === 'string' ? input.filePath : null;
    if (!vaultPath) return;
    recordRecentFile(vaultPath, filePath);
  });
  ipcMain.handle('workspace:removeRecentFile', (_event, payload) => {
    const input = asObjectRecord(payload);
    const vaultPath = typeof input.vaultPath === 'string' ? input.vaultPath : '';
    const filePath = typeof input.filePath === 'string' ? input.filePath : null;
    if (!vaultPath) return;
    removeRecentFile(vaultPath, filePath);
  });
  ipcMain.handle('vault:getTreeCache', (_event, payload) => {
    const input = asObjectRecord(payload);
    const vaultPath = typeof input.vaultPath === 'string' ? input.vaultPath : '';
    if (!vaultPath) return null;
    return getTreeCache(vaultPath);
  });
  ipcMain.handle('vault:setTreeCache', (_event, payload) => {
    const input = asObjectRecord(payload);
    const vaultPath = typeof input.vaultPath === 'string' ? input.vaultPath : '';
    const nodes = Array.isArray(input.nodes) ? (input.nodes as TreeCacheNodes) : [];
    if (!vaultPath || nodes.length === 0) return;
    setTreeCache(vaultPath, nodes);
  });
};
