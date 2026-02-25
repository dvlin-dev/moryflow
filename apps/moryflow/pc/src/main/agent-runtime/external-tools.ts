/**
 * [PROVIDES]: Desktop 外部工具加载（~/.moryflow/tools/*.ts）
 * [DEPENDS]: node:fs, node:path, agents-runtime
 * [POS]: PC Tool 外部化入口（仅桌面端启用）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import type { Tool } from '@openai/agents-core';
import { tsImport } from 'tsx/esm/api';
import type { CryptoUtils, PlatformCapabilities } from '@moryflow/agents-adapter';
import type { AgentContext, VaultUtils } from '@moryflow/agents-runtime';

const TOOLS_DIR = path.join(os.homedir(), '.moryflow', 'tools');

export type ExternalToolContext = {
  capabilities: PlatformCapabilities;
  crypto: CryptoUtils;
  vaultUtils: VaultUtils;
};

type ExternalToolFactory = (
  context: ExternalToolContext
) => Tool<AgentContext> | Tool<AgentContext>[] | Promise<Tool<AgentContext> | Tool<AgentContext>[]>;

type ExternalToolModule = {
  default?: Tool<AgentContext> | Tool<AgentContext>[] | ExternalToolFactory;
  createTools?: ExternalToolFactory;
  tools?: Tool<AgentContext>[] | Tool<AgentContext>;
};

const isTool = (value: unknown): value is Tool<AgentContext> => {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.name === 'string' &&
    typeof record.type === 'string' &&
    typeof record.invoke === 'function'
  );
};

const normalizeTools = (value: unknown): Tool<AgentContext>[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter(isTool);
  }
  return isTool(value) ? [value] : [];
};

const resolveToolsFromModule = async (
  module: ExternalToolModule,
  context: ExternalToolContext
): Promise<Tool<AgentContext>[]> => {
  const tools: Tool<AgentContext>[] = [];
  if (typeof module.createTools === 'function') {
    tools.push(...normalizeTools(await module.createTools(context)));
  }
  if (module.default) {
    const resolved =
      typeof module.default === 'function'
        ? await (module.default as ExternalToolFactory)(context)
        : module.default;
    tools.push(...normalizeTools(resolved));
  }
  if (module.tools) {
    tools.push(...normalizeTools(module.tools));
  }
  return tools;
};

const loadModule = async (fullPath: string): Promise<ExternalToolModule | null> => {
  const ext = path.extname(fullPath).toLowerCase();
  const fileUrl = pathToFileURL(fullPath).href;
  try {
    if (ext === '.ts' || ext === '.mts') {
      return (await tsImport(fileUrl, { parentURL: import.meta.url })) as ExternalToolModule;
    }
    return (await import(fileUrl)) as ExternalToolModule;
  } catch (error) {
    console.warn('[external-tools] failed to load module', fullPath, error);
    return null;
  }
};

const isToolFile = (name: string): boolean => {
  const ext = path.extname(name).toLowerCase();
  return ['.ts', '.mts', '.js', '.mjs', '.cjs'].includes(ext);
};

export const loadExternalTools = async (
  context: ExternalToolContext
): Promise<Tool<AgentContext>[]> => {
  try {
    const entries = await fs.readdir(TOOLS_DIR, { withFileTypes: true });
    const files = entries.filter((entry) => entry.isFile() && isToolFile(entry.name));
    if (files.length === 0) return [];

    const allTools: Tool<AgentContext>[] = [];
    const seen = new Set<string>();

    for (const file of files) {
      const fullPath = path.join(TOOLS_DIR, file.name);
      const module = await loadModule(fullPath);
      if (!module) continue;
      const tools = await resolveToolsFromModule(module, context);
      for (const tool of tools) {
        if (seen.has(tool.name)) {
          console.warn('[external-tools] duplicate tool name, skipped:', tool.name);
          continue;
        }
        seen.add(tool.name);
        allTools.push(tool);
      }
    }

    return allTools;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      return [];
    }
    console.warn('[external-tools] failed to read tools directory', error);
    return [];
  }
};

export const getExternalToolsDir = (): string => TOOLS_DIR;
