/**
 * [PROVIDES]: 沙盒服务 - 管理命令执行的沙盒环境
 * [DEPENDS]: /agents-sandbox
 * [POS]: Main 进程核心模块，提供安全的命令执行能力
 */

import { ipcMain, BrowserWindow } from 'electron';
import Store from 'electron-store';
import {
  SandboxManager,
  type SandboxConfig,
  type SandboxMode,
  type AuthChoice,
} from '@moryflow/agents-sandbox';

/** 沙盒设置存储 */
const settingsStore = new Store<{
  sandboxMode: SandboxMode;
  authorizedPaths: string[];
}>({
  name: 'sandbox-settings',
  defaults: {
    sandboxMode: 'normal',
    authorizedPaths: [],
  },
});

/** 同步存储适配器 */
const storageAdapter = {
  get<T>(key: string): T | undefined {
    return settingsStore.get(key as 'sandboxMode' | 'authorizedPaths') as T | undefined;
  },
  set<T>(key: string, value: T): void {
    settingsStore.set(key as 'sandboxMode' | 'authorizedPaths', value as SandboxMode | string[]);
  },
};

let sandboxManager: SandboxManager | null = null;
let currentVaultRoot: string | null = null;
const pendingAuthResolvers = new Map<string, (choice: AuthChoice) => void>();

/**
 * 初始化沙盒服务
 */
export function initSandboxService(): void {
  // 监听授权响应
  ipcMain.handle('sandbox:auth-response', (_event, { requestId, choice }) => {
    const resolver = pendingAuthResolvers.get(requestId);
    if (resolver) {
      resolver(choice as AuthChoice);
      pendingAuthResolvers.delete(requestId);
    }
  });

  // 获取沙盒设置
  ipcMain.handle('sandbox:get-settings', () => {
    return {
      mode: settingsStore.get('sandboxMode'),
      authorizedPaths: sandboxManager?.getAuthorizedPaths() ?? [],
    };
  });

  // 设置沙盒模式
  ipcMain.handle('sandbox:set-mode', (_event, mode: SandboxMode) => {
    settingsStore.set('sandboxMode', mode);
    // 重新创建 SandboxManager
    if (currentVaultRoot) {
      sandboxManager = createSandboxManager(currentVaultRoot);
    }
  });

  // 移除授权路径
  ipcMain.handle('sandbox:remove-authorized-path', (_event, path: string) => {
    sandboxManager?.removeAuthorizedPath(path);
  });

  // 清除所有授权路径
  ipcMain.handle('sandbox:clear-authorized-paths', () => {
    sandboxManager?.clearAllAuthorizedPaths();
  });
}

/**
 * 创建 SandboxManager 实例
 */
function createSandboxManager(vaultRoot: string): SandboxManager {
  const config: SandboxConfig = {
    mode: settingsStore.get('sandboxMode'),
    vaultRoot,
    storage: storageAdapter,
  };
  return new SandboxManager(config);
}

/**
 * 获取或创建 SandboxManager
 */
export function getSandboxManager(vaultRoot: string): SandboxManager {
  if (!sandboxManager || currentVaultRoot !== vaultRoot) {
    sandboxManager = createSandboxManager(vaultRoot);
    currentVaultRoot = vaultRoot;
  }
  return sandboxManager;
}

/**
 * 请求用户授权访问外部路径
 */
export async function requestPathAuthorization(path: string): Promise<AuthChoice> {
  const window = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
  if (!window) {
    console.warn('[sandbox] No window available for auth request, denying access');
    return 'deny';
  }

  const requestId = `auth-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return new Promise<AuthChoice>((resolve) => {
    // 设置超时（30 秒）
    const timeout = setTimeout(() => {
      pendingAuthResolvers.delete(requestId);
      resolve('deny');
    }, 30000);

    pendingAuthResolvers.set(requestId, (choice) => {
      clearTimeout(timeout);
      resolve(choice);
    });

    // 发送授权请求到 renderer
    window.webContents.send('sandbox:auth-request', {
      requestId,
      path,
    });
  });
}

/** 默认命令确认回调：自动允许非白名单命令（危险命令仍会被拦截） */
const defaultCommandConfirm = async () => true;

/**
 * 创建沙盒化的 shell 执行函数
 */
export function createSandboxedExecuteShell(vaultRoot: string) {
  const manager = getSandboxManager(vaultRoot);

  return async (
    command: string,
    cwd: string,
    timeout: number = 120000
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> => {
    const result = await manager.execute(
      command,
      { cwd, timeout },
      requestPathAuthorization,
      defaultCommandConfirm
    );

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
    };
  };
}
