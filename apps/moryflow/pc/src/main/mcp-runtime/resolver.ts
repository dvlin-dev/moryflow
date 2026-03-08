/**
 * [PROVIDES]: 受管 MCP 包解析器（manifest/bin 解析 + 启动命令生成）
 * [DEPENDS]: node:fs/node:path, ./types, ./package-name
 * [POS]: main/mcp-runtime 可执行入口解析事实源
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { MCPStdioServerSetting } from '../../shared/ipc.js';
import { resolveManagedPackageNameParts } from './package-name.js';
import type { InstalledPackageManifest, ManagedStdioResolvedServer } from './types.js';

const isInsidePath = (baseDir: string, targetPath: string): boolean => {
  const relative = path.relative(baseDir, targetPath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};

const resolveInstalledPackageDir = (serverRuntimeDir: string, packageName: string): string => {
  const parts = resolveManagedPackageNameParts(packageName);
  const nodeModulesRoot = path.join(serverRuntimeDir, 'node_modules');
  const packageDir = path.join(nodeModulesRoot, ...parts);
  if (!isInsidePath(nodeModulesRoot, packageDir)) {
    throw new Error(`Invalid package path for ${packageName}`);
  }
  return packageDir;
};

export const readInstalledPackageManifest = async (
  serverRuntimeDir: string,
  packageName: string
): Promise<InstalledPackageManifest> => {
  const packageDir = resolveInstalledPackageDir(serverRuntimeDir, packageName);
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

export const resolveBinEntry = (
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

export const resolveServerLaunchFromManifest = async (input: {
  server: MCPStdioServerSetting;
  manifest: InstalledPackageManifest;
  verifyScriptPath: (scriptPath: string) => Promise<void>;
}): Promise<{ launch: ManagedStdioResolvedServer; resolvedBinName: string }> => {
  const { server, manifest, verifyScriptPath } = input;
  const binEntry = resolveBinEntry(manifest, server);
  await verifyScriptPath(binEntry.scriptPath);

  return {
    launch: {
      id: server.id,
      name: server.name,
      command: process.execPath,
      args: [binEntry.scriptPath, ...server.args],
      env: {
        ...server.env,
        ELECTRON_RUN_AS_NODE: '1',
      },
    },
    resolvedBinName: binEntry.resolvedBinName,
  };
};
