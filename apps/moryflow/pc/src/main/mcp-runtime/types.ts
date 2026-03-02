/**
 * [DEFINES]: 受管 MCP Runtime 类型定义（状态、安装、解析、更新契约）
 * [USED_BY]: main/mcp-runtime/*
 * [POS]: 运行时模块类型单一事实源
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { MCPStdioServerSetting } from '../../shared/ipc.js';

export type ManagedInstallPolicy = 'if-missing' | 'latest';

export type InstalledPackageManifest = {
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

export type ManagedRuntimeServerState = {
  packageName: string;
  binName?: string;
  runtimeDir: string;
  installedVersion?: string;
  lastUpdatedAt?: number;
  lastError?: string;
};

export type ManagedRuntimeState = {
  servers: Record<string, ManagedRuntimeServerState>;
};

export type ManagedMcpRuntimeStateStore = {
  read: () => ManagedRuntimeState;
  write: (next: ManagedRuntimeState) => void;
};

export type ManagedResolveServerResult = {
  launch: ManagedStdioResolvedServer;
  state: ManagedRuntimeServerState;
  versionChanged: boolean;
};

export type ManagedMcpRuntimeDeps = {
  runtimeRootDir?: string;
  now?: () => number;
  stateStore?: ManagedMcpRuntimeStateStore;
  resolveServerRuntimeDir?: (runtimeRootDir: string, serverId: string) => string;
  installLatest?: (serverRuntimeDir: string, packageName: string) => Promise<void>;
  readManifest?: (
    serverRuntimeDir: string,
    packageName: string
  ) => Promise<InstalledPackageManifest>;
  verifyScriptPath?: (scriptPath: string) => Promise<void>;
};

export type ManagedMcpRuntime = {
  resolveEnabledServers: (
    servers: MCPStdioServerSetting[],
    policy?: ManagedInstallPolicy
  ) => Promise<ManagedStdioResolutionResult>;
  refreshEnabledServers: (servers: MCPStdioServerSetting[]) => Promise<{
    changedServerIds: string[];
    failed: ManagedStdioResolutionFailure[];
  }>;
};
