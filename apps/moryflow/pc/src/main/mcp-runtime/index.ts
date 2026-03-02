/**
 * [PROVIDES]: 受管 MCP Runtime（stdio npm 包安装/更新 + 可执行解析）
 * [DEPENDS]: node:fs/node:path/node:os/node:child_process, electron-store
 * [POS]: PC 主进程 MCP stdio 执行入口；在启动与重载前提供统一包管理能力
 * [UPDATE]: 2026-03-02 - 新增受管安装模型：enabled MCP 启动静默更新，连接前自动解析可执行入口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import Store from 'electron-store';
import type { MCPStdioServerSetting } from '../../shared/ipc.js';

const execFileAsync = promisify(execFile);

const NPM_INSTALL_TIMEOUT_MS = 180_000;

const resolveManagedRuntimeDir = () => {
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

const MANAGED_RUNTIME_DIR = resolveManagedRuntimeDir();

type ManagedInstallPolicy = 'if-missing' | 'latest';

type InstalledPackageManifest = {
  version: string;
  packageDir: string;
  bin: string | Record<string, string>;
};

export type ManagedStdioResolvedServer = {
  id: string;
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
};

export type ManagedStdioResolutionFailure = {
  id: string;
  name: string;
  error: string;
};

export type ManagedStdioResolutionResult = {
  resolved: ManagedStdioResolvedServer[];
  failed: ManagedStdioResolutionFailure[];
};

type ManagedRuntimeServerState = {
  packageName: string;
  binName?: string;
  installedVersion?: string;
  lastUpdatedAt?: number;
  lastError?: string;
};

type ManagedRuntimeState = {
  servers: Record<string, ManagedRuntimeServerState>;
};

type ManagedMcpRuntimeStateStore = {
  read: () => ManagedRuntimeState;
  write: (next: ManagedRuntimeState) => void;
};

const defaultStateStore = (): ManagedMcpRuntimeStateStore => {
  const store = new Store<ManagedRuntimeState>({
    name: 'mcp-managed-runtime',
    defaults: {
      servers: {},
    },
  });

  return {
    read: () => {
      const current = store.store;
      if (!current || typeof current !== 'object') {
        return { servers: {} };
      }
      return {
        servers: current.servers ?? {},
      };
    },
    write: (next) => {
      store.store = next;
    },
  };
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

const resolveInstalledPackageDir = (runtimeDir: string, packageName: string): string => {
  const parts = packageName.split('/').filter((part) => part.length > 0);
  return path.join(runtimeDir, 'node_modules', ...parts);
};

const readInstalledPackageManifest = async (
  runtimeDir: string,
  packageName: string
): Promise<InstalledPackageManifest> => {
  const packageDir = resolveInstalledPackageDir(runtimeDir, packageName);
  const manifestPath = path.join(packageDir, 'package.json');
  const raw = await fs.readFile(manifestPath, 'utf-8');
  const parsed = JSON.parse(raw) as {
    version?: unknown;
    bin?: unknown;
  };

  if (typeof parsed.version !== 'string' || parsed.version.trim().length === 0) {
    throw new Error(`Invalid package manifest for ${packageName}: missing version`);
  }

  const bin = parsed.bin;
  const validObjectBin =
    typeof bin === 'object' &&
    bin !== null &&
    Object.values(bin).every((value) => typeof value === 'string');

  if (typeof bin !== 'string' && !validObjectBin) {
    throw new Error(`Package ${packageName} does not expose a valid bin entry`);
  }

  return {
    version: parsed.version,
    packageDir,
    bin: bin as string | Record<string, string>,
  };
};

const runNpmInstallLatest = async (runtimeDir: string, packageName: string): Promise<void> => {
  await ensureRuntimeWorkspace(runtimeDir);

  const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    npm_config_loglevel: 'error',
  };
  delete env['NPM_CONFIG_HOME'];
  delete env['npm_config_home'];

  await execFileAsync(
    command,
    [
      'install',
      '--prefix',
      runtimeDir,
      '--no-save',
      '--no-audit',
      '--no-fund',
      `${packageName}@latest`,
    ],
    {
      env,
      timeout: NPM_INSTALL_TIMEOUT_MS,
      maxBuffer: 1024 * 1024 * 4,
    }
  );
};

const isInsidePath = (baseDir: string, targetPath: string): boolean => {
  const relative = path.relative(baseDir, targetPath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};

const resolveBinEntry = (
  manifest: InstalledPackageManifest,
  server: Pick<MCPStdioServerSetting, 'packageName' | 'binName'>
): { scriptPath: string; resolvedBinName: string } => {
  if (typeof manifest.bin === 'string') {
    const scriptPath = path.resolve(manifest.packageDir, manifest.bin);
    if (!isInsidePath(manifest.packageDir, scriptPath)) {
      throw new Error(`Invalid bin path for package ${server.packageName}`);
    }
    const resolvedBinName =
      server.binName && server.binName.trim().length > 0 ? server.binName.trim() : 'default';
    return {
      scriptPath,
      resolvedBinName,
    };
  }

  const entries = Object.entries(manifest.bin).filter((entry): entry is [string, string] => {
    const [, value] = entry;
    return typeof value === 'string';
  });

  if (entries.length === 0) {
    throw new Error(`Package ${server.packageName} does not expose executable bins`);
  }

  const requestedBin = server.binName?.trim();
  if (requestedBin) {
    const matched = entries.find(([name]) => name === requestedBin);
    if (!matched) {
      throw new Error(
        `Bin "${requestedBin}" not found in ${server.packageName}. Available: ${entries
          .map(([name]) => name)
          .join(', ')}`
      );
    }
    const scriptPath = path.resolve(manifest.packageDir, matched[1]);
    if (!isInsidePath(manifest.packageDir, scriptPath)) {
      throw new Error(`Invalid bin path for package ${server.packageName}`);
    }
    return {
      scriptPath,
      resolvedBinName: requestedBin,
    };
  }

  if (entries.length > 1) {
    throw new Error(
      `Package ${server.packageName} exposes multiple bins. Please specify bin name.`
    );
  }

  const [resolvedBinName, relativeScriptPath] = entries[0];
  const scriptPath = path.resolve(manifest.packageDir, relativeScriptPath);
  if (!isInsidePath(manifest.packageDir, scriptPath)) {
    throw new Error(`Invalid bin path for package ${server.packageName}`);
  }

  return {
    scriptPath,
    resolvedBinName,
  };
};

type ManagedMcpRuntimeDeps = {
  runtimeDir?: string;
  now?: () => number;
  stateStore?: ManagedMcpRuntimeStateStore;
  installLatest?: (runtimeDir: string, packageName: string) => Promise<void>;
  readManifest?: (runtimeDir: string, packageName: string) => Promise<InstalledPackageManifest>;
  verifyScriptPath?: (scriptPath: string) => Promise<void>;
};

type ResolveSingleServerResult = {
  launch: ManagedStdioResolvedServer;
  state: ManagedRuntimeServerState;
};

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const resolveServerRuntimeState = async (
  server: MCPStdioServerSetting,
  policy: ManagedInstallPolicy,
  runtimeDir: string,
  installLatest: (runtimeDir: string, packageName: string) => Promise<void>,
  readManifest: (runtimeDir: string, packageName: string) => Promise<InstalledPackageManifest>,
  verifyScriptPath: (scriptPath: string) => Promise<void>,
  now: () => number,
  currentState: ManagedRuntimeServerState | undefined
): Promise<ResolveSingleServerResult> => {
  let manifest: InstalledPackageManifest | null = null;

  try {
    manifest = await readManifest(runtimeDir, server.packageName);
  } catch (error) {
    if (!isNodeErrorWithCode(error, 'ENOENT')) {
      throw error;
    }
  }

  const needInstall = policy === 'latest' || manifest === null;
  if (needInstall) {
    await installLatest(runtimeDir, server.packageName);
    manifest = await readManifest(runtimeDir, server.packageName);
  }

  if (!manifest) {
    throw new Error(`Failed to resolve package ${server.packageName}`);
  }

  const binEntry = resolveBinEntry(manifest, server);
  await verifyScriptPath(binEntry.scriptPath);

  return {
    launch: {
      id: server.id,
      name: server.name,
      command: process.execPath,
      args: [binEntry.scriptPath, ...server.args],
      env: server.env,
    },
    state: {
      packageName: server.packageName,
      binName: binEntry.resolvedBinName,
      installedVersion: manifest.version,
      lastUpdatedAt: needInstall ? now() : currentState?.lastUpdatedAt,
      lastError: undefined,
    },
  };
};

export type ManagedMcpRuntime = {
  resolveEnabledServers: (
    servers: MCPStdioServerSetting[],
    policy?: ManagedInstallPolicy
  ) => Promise<ManagedStdioResolutionResult>;
  refreshEnabledServers: (servers: MCPStdioServerSetting[]) => Promise<{
    updatedServerIds: string[];
    failed: ManagedStdioResolutionFailure[];
  }>;
};

export const createManagedMcpRuntime = (deps: ManagedMcpRuntimeDeps = {}): ManagedMcpRuntime => {
  const runtimeDir = deps.runtimeDir ? path.resolve(deps.runtimeDir) : MANAGED_RUNTIME_DIR;
  const now = deps.now ?? (() => Date.now());
  const stateStore = deps.stateStore ?? defaultStateStore();
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

  const resolveEnabledServers = async (
    servers: MCPStdioServerSetting[],
    policy: ManagedInstallPolicy = 'if-missing'
  ): Promise<ManagedStdioResolutionResult> => {
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
      const refreshedPackages = new Set<string>();

      for (const server of enabledServers) {
        try {
          const effectivePolicy: ManagedInstallPolicy =
            policy === 'latest' && !refreshedPackages.has(server.packageName)
              ? 'latest'
              : 'if-missing';
          if (effectivePolicy === 'latest') {
            refreshedPackages.add(server.packageName);
          }

          const next = await resolveServerRuntimeState(
            server,
            effectivePolicy,
            runtimeDir,
            installLatest,
            readManifest,
            verifyScriptPath,
            now,
            nextServersState[server.id]
          );

          resolved.push(next.launch);
          nextServersState[server.id] = next.state;
        } catch (error) {
          const message = toErrorMessage(error);
          failed.push({
            id: server.id,
            name: server.name,
            error: message,
          });
          nextServersState[server.id] = {
            packageName: server.packageName,
            binName: server.binName,
            installedVersion: nextServersState[server.id]?.installedVersion,
            lastUpdatedAt: nextServersState[server.id]?.lastUpdatedAt,
            lastError: message,
          };
        }
      }

      stateStore.write({
        servers: nextServersState,
      });

      return {
        resolved,
        failed,
      };
    });
  };

  const refreshEnabledServers: ManagedMcpRuntime['refreshEnabledServers'] = async (servers) => {
    const result = await resolveEnabledServers(servers, 'latest');
    return {
      updatedServerIds: result.resolved.map((server) => server.id),
      failed: result.failed,
    };
  };

  return {
    resolveEnabledServers,
    refreshEnabledServers,
  };
};

export const mcpRuntime = createManagedMcpRuntime();
