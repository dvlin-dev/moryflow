/**
 * [PROVIDES]: 受管 MCP npm 安装器（runtime 目录解析 + npm install latest）
 * [DEPENDS]: node:child_process/node:fs/node:path/node:os/node:module
 * [POS]: main/mcp-runtime 包安装与更新执行器
 * [UPDATE]: 2026-03-03 - npm 安装优先走内置 npm cli（process.execPath + npm/bin/npm-cli.js），避免依赖系统全局 npm
 * [UPDATE]: 2026-03-03 - 新增 runtime 目录备份/恢复工具，供 updater 在 latest 失败时回退旧版本文件
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);

const NPM_INSTALL_TIMEOUT_MS = 180_000;

const sanitizeServerId = (serverId: string): string => {
  const sanitized = serverId.trim().replace(/[^a-zA-Z0-9._-]/g, '_');
  return sanitized.length > 0 ? sanitized : 'mcp-server';
};

const isNodeErrorWithCode = (error: unknown, code: string): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const candidate = error as NodeJS.ErrnoException;
  return candidate.code === code;
};

const ensureRuntimeWorkspace = async (runtimeDir: string): Promise<void> => {
  await fs.mkdir(runtimeDir, { recursive: true });

  const packageJsonPath = path.join(runtimeDir, 'package.json');
  try {
    await fs.access(packageJsonPath);
  } catch (error) {
    if (!isNodeErrorWithCode(error, 'ENOENT')) {
      throw error;
    }
    await fs.writeFile(
      packageJsonPath,
      JSON.stringify(
        {
          name: 'moryflow-managed-mcp-runtime',
          private: true,
        },
        null,
        2
      ),
      'utf-8'
    );
  }
};

const isPathExists = async (targetPath: string): Promise<boolean> => {
  try {
    await fs.access(targetPath);
    return true;
  } catch (error) {
    if (isNodeErrorWithCode(error, 'ENOENT')) {
      return false;
    }
    throw error;
  }
};

export const resolveManagedRuntimeRootDir = (): string => {
  const overrideDir = process.env['MORYFLOW_MCP_RUNTIME_DIR'];
  if (overrideDir && overrideDir.trim().length > 0) {
    return path.resolve(overrideDir);
  }

  const e2eUserDataDir = process.env['MORYFLOW_E2E_USER_DATA'];
  if (e2eUserDataDir && e2eUserDataDir.trim().length > 0) {
    return path.join(path.resolve(e2eUserDataDir), 'mcp-runtime');
  }

  return path.join(os.homedir(), '.moryflow', 'mcp-runtime');
};

export const resolveServerRuntimeDir = (runtimeRootDir: string, serverId: string): string =>
  path.join(runtimeRootDir, sanitizeServerId(serverId));

type NpmInstallInvocation = {
  command: string;
  commandArgsPrefix: string[];
  env: NodeJS.ProcessEnv;
};

const resolveNpmInstallInvocation = (): NpmInstallInvocation => {
  try {
    const npmCliPath = require.resolve('npm/bin/npm-cli.js');
    return {
      command: process.execPath,
      commandArgsPrefix: [npmCliPath],
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
      },
    };
  } catch {
    return {
      command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
      commandArgsPrefix: [],
      env: {
        ...process.env,
      },
    };
  }
};

export const runNpmInstallLatest = async (
  serverRuntimeDir: string,
  packageName: string
): Promise<void> => {
  await ensureRuntimeWorkspace(serverRuntimeDir);

  const invocation = resolveNpmInstallInvocation();
  const env: NodeJS.ProcessEnv = {
    ...invocation.env,
    npm_config_loglevel: 'error',
  };
  delete env['NPM_CONFIG_HOME'];
  delete env['npm_config_home'];

  await execFileAsync(
    invocation.command,
    [
      ...invocation.commandArgsPrefix,
      'install',
      '--prefix',
      serverRuntimeDir,
      '--no-save',
      '--no-audit',
      '--no-fund',
      '--silent',
      `${packageName}@latest`,
    ],
    {
      env,
      timeout: NPM_INSTALL_TIMEOUT_MS,
      maxBuffer: 1024 * 1024 * 4,
    }
  );
};

export const createRuntimeBackup = async (serverRuntimeDir: string): Promise<string | null> => {
  if (!(await isPathExists(serverRuntimeDir))) {
    return null;
  }

  const backupDir = `${serverRuntimeDir}.backup-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await fs.rm(backupDir, { recursive: true, force: true });
  await fs.cp(serverRuntimeDir, backupDir, {
    recursive: true,
    force: true,
  });

  return backupDir;
};

export const restoreRuntimeFromBackup = async (
  serverRuntimeDir: string,
  backupDir: string
): Promise<void> => {
  await fs.rm(serverRuntimeDir, { recursive: true, force: true });
  await fs.cp(backupDir, serverRuntimeDir, {
    recursive: true,
    force: true,
  });
};

export const removeRuntimeBackup = async (backupDir: string): Promise<void> => {
  await fs.rm(backupDir, { recursive: true, force: true });
};
