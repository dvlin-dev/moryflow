import type { Tool } from '@openai/agents-core';
import type { PlatformCapabilities, CryptoUtils } from '@moryflow/agents-adapter';
import type { AgentContext, VaultUtils } from '@moryflow/agents-runtime';

import { createWebFetchTool } from './web/web-fetch-tool';
import { createWebSearchTool } from './web/web-search-tool';
import type { TaskStateService } from './task/task-state';
import { createTaskTool } from './task/task-tool';
import { createSubagentTool, type SubAgentToolsConfig } from './task/subagent-tool';
import { createGenerateImageTool } from './image/generate-image-tool';

/**
 * 工具上下文
 */
export interface ToolsContext {
  capabilities: PlatformCapabilities;
  crypto: CryptoUtils;
  vaultUtils: VaultUtils;
  taskStateService: TaskStateService;
  /** Web 搜索 API Key（可选） */
  webSearchApiKey?: string;
}

/**
 * PC 工具上下文
 * 仅保留与 bash 非重叠的高价值工具（subagent 除外）。
 */
export interface PcToolsContext extends ToolsContext {
  /**
   * 可选：覆盖 subagent 子代理工具集。
   * 若不传则使用默认“同端全能力”子代理配置。
   */
  subagentTools?: SubAgentToolsConfig;
}

/**
 * 创建 PC 工具集（不含 subagent 子代理）
 * 用于 Bash-First runtime：文件/搜索由 bash 承担，此处仅保留非重叠工具。
 */
export const createPcToolsWithoutSubagent = (ctx: ToolsContext): Tool<AgentContext>[] => {
  const { capabilities, taskStateService, webSearchApiKey } = ctx;

  const webFetchTool = createWebFetchTool(capabilities);
  const webSearchTool = createWebSearchTool(capabilities, webSearchApiKey);
  const generateImageTool = createGenerateImageTool(capabilities);
  const taskTool = createTaskTool(taskStateService);

  return [webFetchTool, webSearchTool, generateImageTool, taskTool];
};

/**
 * 创建 PC 工具集（含 subagent 子代理）
 * 默认子代理继承当前端可用完整能力，可由调用方覆盖。
 */
export const createPcTools = (ctx: PcToolsContext): Tool<AgentContext>[] => {
  const { capabilities, taskStateService, webSearchApiKey, subagentTools } = ctx;

  const webFetchTool = createWebFetchTool(capabilities);
  const webSearchTool = createWebSearchTool(capabilities, webSearchApiKey);
  const generateImageTool = createGenerateImageTool(capabilities);
  const taskTool = createTaskTool(taskStateService);
  const toolsWithoutSubagent: Tool<AgentContext>[] = [
    webFetchTool,
    webSearchTool,
    generateImageTool,
    taskTool,
  ];

  const resolvedSubagentTools: SubAgentToolsConfig = subagentTools ?? [...toolsWithoutSubagent];

  return [...toolsWithoutSubagent, createSubagentTool(resolvedSubagentTools)];
};
