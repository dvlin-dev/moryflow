/**
 * [PROVIDES]: 外部路径授权服务 + bash 沙盒管理
 * [DEPENDS]: /agents-sandbox
 * [POS]: Main 进程核心模块，提供外部路径授权与安全执行能力
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import path from 'node:path';
import { ipcMain, BrowserWindow } from 'electron';
import Store from 'electron-store';
import { SandboxManager, type SandboxConfig, type AuthChoice } from '@moryflow/agents-sandbox';

const AUTHORIZED_PATHS_KEY = 'authorizedPaths';

const settingsStore = new Store<{
  authorizedPaths: string[];
}>({
  name: 'sandbox-settings',
  defaults: {
    authorizedPaths: [],
  },
});

const normalizePath = (value: string): string => {
  const resolved = path.resolve(value.trim());
  const normalized = path.normalize(resolved);
  const trimmed =
    normalized.length > 1 && normalized.endsWith(path.sep) ? normalized.slice(0, -1) : normalized;
  return process.platform === 'win32' ? trimmed.toLowerCase() : trimmed;
};

const readAuthorizedPaths = (): string[] => {
  const raw = settingsStore.get(AUTHORIZED_PATHS_KEY) ?? [];
  return raw.map(normalizePath);
};

const writeAuthorizedPaths = (paths: string[]): void => {
  const deduped = Array.from(new Set(paths.map(normalizePath)));
  settingsStore.set(AUTHORIZED_PATHS_KEY, deduped);
};

const storageAdapter = {
  get<T>(key: string): T | undefined {
    if (key !== 'sandbox:authorizedPaths') {
      return undefined;
    }
    return readAuthorizedPaths() as T;
  },
  set<T>(key: string, value: T): void {
    if (key !== 'sandbox:authorizedPaths') {
      return;
    }
    const paths = Array.isArray(value) ? (value as string[]) : [];
    writeAuthorizedPaths(paths);
  },
};

let sandboxManager: SandboxManager | null = null;
let currentVaultRoot: string | null = null;
const pendingAuthResolvers = new Map<string, (choice: AuthChoice) => void>();

const getAuthorizedPathSnapshot = (): string[] => {
  if (sandboxManager) {
    return sandboxManager.getAuthorizedPaths();
  }
  return readAuthorizedPaths();
};

export const getAuthorizedExternalPaths = (): string[] => getAuthorizedPathSnapshot();

export const authorizeExternalPath = (rawPath: string): string => {
  if (typeof rawPath !== 'string' || rawPath.trim().length === 0) {
    throw new Error('Invalid path');
  }
  const trimmed = rawPath.trim();
  if (!path.isAbsolute(trimmed)) {
    throw new Error('Path must be absolute');
  }
  const normalized = normalizePath(trimmed);
  if (sandboxManager) {
    sandboxManager.addAuthorizedPath(normalized);
  } else {
    writeAuthorizedPaths([...readAuthorizedPaths(), normalized]);
  }
  return normalized;
};

export function initSandboxService(): void {
  ipcMain.handle('sandbox:auth-response', (_event, { requestId, choice }) => {
    const resolver = pendingAuthResolvers.get(requestId);
    if (!resolver) return;
    resolver(choice as AuthChoice);
    pendingAuthResolvers.delete(requestId);
  });

  ipcMain.handle('sandbox:get-settings', () => ({
    authorizedPaths: getAuthorizedPathSnapshot(),
  }));

  ipcMain.handle('sandbox:add-authorized-path', (_event, rawPath: string) => {
    authorizeExternalPath(rawPath);
  });

  ipcMain.handle('sandbox:remove-authorized-path', (_event, rawPath: string) => {
    if (typeof rawPath !== 'string' || rawPath.trim().length === 0) {
      throw new Error('Invalid path');
    }
    const normalized = normalizePath(rawPath);
    if (sandboxManager) {
      sandboxManager.removeAuthorizedPath(normalized);
      return;
    }
    writeAuthorizedPaths(readAuthorizedPaths().filter((item) => item !== normalized));
  });

  ipcMain.handle('sandbox:clear-authorized-paths', () => {
    if (sandboxManager) {
      sandboxManager.clearAllAuthorizedPaths();
      return;
    }
    writeAuthorizedPaths([]);
  });
}

function createSandboxManager(vaultRoot: string): SandboxManager {
  const config: SandboxConfig = {
    vaultRoot,
    storage: storageAdapter,
  };
  return new SandboxManager(config);
}

export function getSandboxManager(vaultRoot: string): SandboxManager {
  if (!sandboxManager || currentVaultRoot !== vaultRoot) {
    sandboxManager = createSandboxManager(vaultRoot);
    currentVaultRoot = vaultRoot;
  }
  return sandboxManager;
}

export async function requestPathAuthorization(path: string): Promise<AuthChoice> {
  const window = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
  if (!window) {
    console.warn('[sandbox] No window available for auth request, denying access');
    return 'deny';
  }

  const requestId = `auth-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return new Promise<AuthChoice>((resolve) => {
    const timeout = setTimeout(() => {
      pendingAuthResolvers.delete(requestId);
      resolve('deny');
    }, 30000);

    pendingAuthResolvers.set(requestId, (choice) => {
      clearTimeout(timeout);
      resolve(choice);
    });

    window.webContents.send('sandbox:auth-request', {
      requestId,
      path,
    });
  });
}
