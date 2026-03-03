import type { Tool } from '@openai/agents-core';
import type { PlatformCapabilities, CryptoUtils } from '@moryflow/agents-adapter';
import type { AgentContext, VaultUtils } from '@moryflow/agents-runtime';

import { createReadTool } from './file/read-tool';
import { createWriteTool } from './file/write-tool';
import { createEditTool } from './file/edit-tool';
import { createDeleteTool } from './file/delete-tool';
import { createMoveTool } from './file/move-tool';
import { createLsTool } from './file/ls-tool';
import { createGlobTool } from './search/glob-tool';
import { createGrepTool } from './search/grep-tool';
import { createSearchInFileTool } from './search/search-in-file-tool';
import { createWebFetchTool } from './web/web-fetch-tool';
import { createWebSearchTool } from './web/web-search-tool';
import type { TasksStore } from './task/tasks-store';
import { createTasksTools } from './task/tasks-tools';
import { createSubagentTool, type SubAgentToolsConfig } from './task/subagent-tool';
import { createBashTool } from './platform/bash-tool';
import { createGenerateImageTool } from './image/generate-image-tool';
import { isGlobImplInitialized, initNodeGlob } from './glob';

/**
 * 确保 glob 实现已初始化
 * 在 Node.js 环境中自动初始化为 fast-glob 实现
 * 在 React Native 环境中需要手动调用 initMobileGlob()
 */
function ensureGlobInitialized(): void {
  if (!isGlobImplInitialized()) {
    // Node.js 环境自动初始化
    initNodeGlob();
  }
}

/**
 * 工具上下文
 */
export interface ToolsContext {
  capabilities: PlatformCapabilities;
  crypto: CryptoUtils;
  vaultUtils: VaultUtils;
  tasksStore: TasksStore;
  /** 是否启用 bash 工具（仅桌面端） */
  enableBash?: boolean;
  /** Web 搜索 API Key（可选） */
  webSearchApiKey?: string;
}

/**
 * PC 精简工具上下文
 * 仅保留与 bash 非重叠的高价值工具（subagent 除外）。
 */
export interface PcLeanToolsContext extends ToolsContext {
  /**
   * 可选：覆盖 subagent 子代理工具集。
   * 若不传则使用默认“同端全能力”子代理配置。
   */
  subagentTools?: SubAgentToolsConfig;
}

/**
 * 创建基础工具集（不含 subagent 子代理）
 */
export const createBaseToolsWithoutSubagent = (ctx: ToolsContext): Tool<AgentContext>[] => {
  // 确保 glob 实现已初始化
  ensureGlobInitialized();

  const { capabilities, crypto, vaultUtils, tasksStore, enableBash = false, webSearchApiKey } = ctx;

  const tools: Tool<AgentContext>[] = [
    // 文件操作工具
    createReadTool(capabilities, vaultUtils),
    createWriteTool(capabilities, crypto, vaultUtils),
    createEditTool(capabilities, crypto, vaultUtils),
    createDeleteTool(capabilities, vaultUtils),
    createMoveTool(capabilities, vaultUtils),
    createLsTool(capabilities, vaultUtils),

    // 搜索工具
    createGlobTool(capabilities, vaultUtils),
    createGrepTool(capabilities, vaultUtils),
    createSearchInFileTool(capabilities, vaultUtils),

    // 网络工具
    createWebFetchTool(capabilities),
    createWebSearchTool(capabilities, webSearchApiKey),

    // 图片生成工具
    createGenerateImageTool(capabilities),

    // Tasks 工具
    ...createTasksTools(tasksStore),
  ];

  // 仅桌面端启用 bash 工具
  if (enableBash && capabilities.optional?.executeShell) {
    tools.push(createBashTool(capabilities, vaultUtils));
  }

  return tools;
};

/**
 * 创建基础工具集（含 subagent 子代理）
 */
export const createBaseTools = (ctx: ToolsContext): Tool<AgentContext>[] => {
  // 确保 glob 实现已初始化
  ensureGlobInitialized();

  const { capabilities, crypto, vaultUtils, tasksStore, enableBash = false, webSearchApiKey } = ctx;

  // 先创建所有工具实例，避免重复创建
  const readTool = createReadTool(capabilities, vaultUtils);
  const writeTool = createWriteTool(capabilities, crypto, vaultUtils);
  const editTool = createEditTool(capabilities, crypto, vaultUtils);
  const deleteTool = createDeleteTool(capabilities, vaultUtils);
  const moveTool = createMoveTool(capabilities, vaultUtils);
  const lsTool = createLsTool(capabilities, vaultUtils);
  const globTool = createGlobTool(capabilities, vaultUtils);
  const grepTool = createGrepTool(capabilities, vaultUtils);
  const searchInFileTool = createSearchInFileTool(capabilities, vaultUtils);
  const webFetchTool = createWebFetchTool(capabilities);
  const webSearchTool = createWebSearchTool(capabilities, webSearchApiKey);
  const generateImageTool = createGenerateImageTool(capabilities);
  const tasksTools = createTasksTools(tasksStore);

  // 组装基础工具集
  const tools: Tool<AgentContext>[] = [
    readTool,
    writeTool,
    editTool,
    deleteTool,
    moveTool,
    lsTool,
    globTool,
    grepTool,
    searchInFileTool,
    webFetchTool,
    webSearchTool,
    generateImageTool,
    ...tasksTools,
  ];

  // 仅桌面端启用 bash 工具
  if (enableBash && capabilities.optional?.executeShell) {
    tools.push(createBashTool(capabilities, vaultUtils));
  }

  // 子代理工具集（默认继承同端可用完整能力，不含 subagent 本身）
  const subAgentTools: SubAgentToolsConfig = [...tools];

  // 添加 subagent 工具
  tools.push(createSubagentTool(subAgentTools));

  return tools;
};

/**
 * 创建 PC 精简工具集（不含 subagent 子代理）
 * 用于 Bash-First runtime：文件/搜索由 bash 承担，此处仅保留非重叠工具。
 */
export const createPcLeanToolsWithoutSubagent = (ctx: ToolsContext): Tool<AgentContext>[] => {
  const { capabilities, tasksStore, webSearchApiKey } = ctx;

  const webFetchTool = createWebFetchTool(capabilities);
  const webSearchTool = createWebSearchTool(capabilities, webSearchApiKey);
  const generateImageTool = createGenerateImageTool(capabilities);
  const tasksTools = createTasksTools(tasksStore);

  return [webFetchTool, webSearchTool, generateImageTool, ...tasksTools];
};

/**
 * 创建 PC 精简工具集（含 subagent 子代理）
 * 默认子代理继承当前端可用完整能力，可由调用方覆盖。
 */
export const createPcLeanTools = (ctx: PcLeanToolsContext): Tool<AgentContext>[] => {
  const { capabilities, tasksStore, webSearchApiKey, subagentTools } = ctx;

  const webFetchTool = createWebFetchTool(capabilities);
  const webSearchTool = createWebSearchTool(capabilities, webSearchApiKey);
  const generateImageTool = createGenerateImageTool(capabilities);
  const tasksTools = createTasksTools(tasksStore);
  const toolsWithoutSubagent: Tool<AgentContext>[] = [
    webFetchTool,
    webSearchTool,
    generateImageTool,
    ...tasksTools,
  ];

  const resolvedSubagentTools: SubAgentToolsConfig = subagentTools ?? [...toolsWithoutSubagent];

  return [...toolsWithoutSubagent, createSubagentTool(resolvedSubagentTools)];
};
