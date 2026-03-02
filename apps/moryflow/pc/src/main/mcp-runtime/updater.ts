/**
 * [PROVIDES]: Managed MCP runtime updater（启动静默更新 + stdio 解析 + 失败降级）
 * [DEPENDS]: ./types, ./store, ./npm-installer, ./resolver
 * [POS]: PC 主进程 MCP 包管理事实源
 * [UPDATE]: 2026-03-03 - 新增 per-server runtime 目录、版本变化检测与失败回退旧版本
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { promises as fs } from 'node:fs';
import type { MCPStdioServerSetting } from '../../shared/ipc.js';
import {
  resolveManagedRuntimeRootDir,
  resolveServerRuntimeDir,
  runNpmInstallLatest,
} from './npm-installer.js';
import { resolveServerLaunchFromManifest, readInstalledPackageManifest } from './resolver.js';
import { createDefaultManagedRuntimeStateStore } from './store.js';
import type {
  InstalledPackageManifest,
  ManagedInstallPolicy,
  ManagedMcpRuntime,
  ManagedMcpRuntimeDeps,
  ManagedResolveServerResult,
  ManagedRuntimeServerState,
  ManagedStdioResolutionFailure,
  ManagedStdioResolvedServer,
} from './types.js';

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const isNodeErrorWithCode = (error: unknown, code: string): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const candidate = error as NodeJS.ErrnoException;
  return candidate.code === code;
};

const readManifestIfExists = async (
  readManifest: (
    serverRuntimeDir: string,
    packageName: string
  ) => Promise<InstalledPackageManifest>,
  serverRuntimeDir: string,
  packageName: string
): Promise<InstalledPackageManifest | null> => {
  try {
    return await readManifest(serverRuntimeDir, packageName);
  } catch (error) {
    if (isNodeErrorWithCode(error, 'ENOENT')) {
      return null;
    }
    throw error;
  }
};

const joinErrors = (prev: string | undefined, next: string): string => {
  if (!prev || prev.trim().length === 0) {
    return next;
  }
  return `${prev}; ${next}`;
};

const resolveServerRuntimeState = async (input: {
  server: MCPStdioServerSetting;
  policy: ManagedInstallPolicy;
  runtimeRootDir: string;
  now: () => number;
  currentState?: ManagedRuntimeServerState;
  resolveRuntimeDir: (runtimeRootDir: string, serverId: string) => string;
  installLatest: (serverRuntimeDir: string, packageName: string) => Promise<void>;
  readManifest: (
    serverRuntimeDir: string,
    packageName: string
  ) => Promise<InstalledPackageManifest>;
  verifyScriptPath: (scriptPath: string) => Promise<void>;
}): Promise<ManagedResolveServerResult> => {
  const {
    server,
    policy,
    runtimeRootDir,
    now,
    currentState,
    resolveRuntimeDir,
    installLatest,
    readManifest,
    verifyScriptPath,
  } = input;

  const serverRuntimeDir = resolveRuntimeDir(runtimeRootDir, server.id);
  const previousManifest = await readManifestIfExists(
    readManifest,
    serverRuntimeDir,
    server.packageName
  );

  const shouldInstall = policy === 'latest' || previousManifest === null;
  let chosenManifest: InstalledPackageManifest | null = previousManifest;
  let warning: string | undefined;

  if (shouldInstall) {
    try {
      await installLatest(serverRuntimeDir, server.packageName);
      chosenManifest = await readManifest(serverRuntimeDir, server.packageName);
    } catch (error) {
      const message = toErrorMessage(error);
      if (!previousManifest) {
        throw error;
      }
      warning = joinErrors(warning, `update failed, fallback to previous version: ${message}`);
      chosenManifest = previousManifest;
    }
  }

  if (!chosenManifest) {
    throw new Error(`Failed to resolve package ${server.packageName}`);
  }

  let launch: ManagedStdioResolvedServer | null = null;
  let resolvedBinName: string | undefined;

  try {
    const resolved = await resolveServerLaunchFromManifest({
      server,
      manifest: chosenManifest,
      verifyScriptPath,
    });
    launch = resolved.launch;
    resolvedBinName = resolved.resolvedBinName;
  } catch (error) {
    if (previousManifest && chosenManifest !== previousManifest) {
      const message = toErrorMessage(error);
      warning = joinErrors(
        warning,
        `new version bin resolve failed, fallback to previous version: ${message}`
      );
      const fallback = await resolveServerLaunchFromManifest({
        server,
        manifest: previousManifest,
        verifyScriptPath,
      });
      launch = fallback.launch;
      resolvedBinName = fallback.resolvedBinName;
      chosenManifest = previousManifest;
    } else {
      throw error;
    }
  }

  if (!launch || !resolvedBinName) {
    throw new Error(`Failed to resolve launch command for ${server.packageName}`);
  }

  const versionChanged = chosenManifest.version !== currentState?.installedVersion;

  return {
    launch,
    state: {
      packageName: server.packageName,
      binName: resolvedBinName,
      runtimeDir: serverRuntimeDir,
      installedVersion: chosenManifest.version,
      lastUpdatedAt: shouldInstall ? now() : currentState?.lastUpdatedAt,
      lastError: warning,
    },
    versionChanged,
  };
};

export const createManagedMcpRuntime = (deps: ManagedMcpRuntimeDeps = {}): ManagedMcpRuntime => {
  const runtimeRootDir = deps.runtimeRootDir ?? resolveManagedRuntimeRootDir();
  const now = deps.now ?? (() => Date.now());
  const stateStore = deps.stateStore ?? createDefaultManagedRuntimeStateStore();
  const resolveRuntimeDir = deps.resolveServerRuntimeDir ?? resolveServerRuntimeDir;
  const installLatest = deps.installLatest ?? runNpmInstallLatest;
  const readManifest = deps.readManifest ?? readInstalledPackageManifest;
  const verifyScriptPath =
    deps.verifyScriptPath ??
    (async (scriptPath: string) => {
      await fs.access(scriptPath);
    });

  let queue: Promise<void> = Promise.resolve();

  const enqueue = async <T>(task: () => Promise<T>): Promise<T> => {
    const run = queue.then(task, task);
    queue = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  };

  const resolveServersWithPolicy = async (
    servers: MCPStdioServerSetting[],
    policy: ManagedInstallPolicy
  ): Promise<{
    resolved: ManagedStdioResolvedServer[];
    failed: ManagedStdioResolutionFailure[];
    changedServerIds: string[];
  }> => {
    return enqueue(async () => {
      const enabledServers = servers.filter(
        (server) =>
          server.enabled &&
          typeof server.packageName === 'string' &&
          server.packageName.trim().length > 0
      );

      const state = stateStore.read();
      const nextServersState = { ...state.servers };
      const resolved: ManagedStdioResolvedServer[] = [];
      const failed: ManagedStdioResolutionFailure[] = [];
      const changedServerIds: string[] = [];

      for (const server of enabledServers) {
        try {
          const next = await resolveServerRuntimeState({
            server,
            policy,
            runtimeRootDir,
            now,
            currentState: nextServersState[server.id],
            resolveRuntimeDir,
            installLatest,
            readManifest,
            verifyScriptPath,
          });

          resolved.push(next.launch);
          nextServersState[server.id] = next.state;
          if (next.versionChanged) {
            changedServerIds.push(server.id);
          }
        } catch (error) {
          const message = toErrorMessage(error);
          failed.push({
            id: server.id,
            name: server.name,
            error: message,
          });

          const previousState = nextServersState[server.id];
          nextServersState[server.id] = {
            packageName: server.packageName,
            binName: server.binName,
            runtimeDir: previousState?.runtimeDir ?? resolveRuntimeDir(runtimeRootDir, server.id),
            installedVersion: previousState?.installedVersion,
            lastUpdatedAt: previousState?.lastUpdatedAt,
            lastError: message,
          };
        }
      }

      stateStore.write({ servers: nextServersState });

      return {
        resolved,
        failed,
        changedServerIds,
      };
    });
  };

  return {
    resolveEnabledServers: async (servers, policy = 'if-missing') => {
      const result = await resolveServersWithPolicy(servers, policy);
      return {
        resolved: result.resolved,
        failed: result.failed,
      };
    },
    refreshEnabledServers: async (servers) => {
      const result = await resolveServersWithPolicy(servers, 'latest');
      return {
        changedServerIds: result.changedServerIds,
        failed: result.failed,
      };
    },
  };
};

export const mcpRuntime = createManagedMcpRuntime();
