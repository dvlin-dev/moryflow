/**
 * Mobile 工具集创建器
 *
 * 用于 React Native 环境的工具集创建函数。
 * 需要先调用 initMobileGlob() 初始化 glob 实现。
 */

import type { Tool } from '@openai/agents-core';
import type { PlatformCapabilities, CryptoUtils } from '@anyhunt/agents-adapter';
import type { AgentContext, VaultUtils } from '@anyhunt/agents-runtime';

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
import { createGenerateImageTool } from './image/generate-image-tool';
import { createManagePlanTool } from './task/manage-plan';
import { isGlobImplInitialized, initMobileGlob } from './glob/glob-mobile';

/**
 * 工具上下文
 */
export interface ToolsContext {
  capabilities: PlatformCapabilities;
  crypto: CryptoUtils;
  vaultUtils: VaultUtils;
  /** Web 搜索 API Key（可选） */
  webSearchApiKey?: string;
}

/**
 * 确保 Mobile glob 实现已初始化
 */
function ensureMobileGlobInitialized(capabilities: PlatformCapabilities): void {
  if (!isGlobImplInitialized()) {
    initMobileGlob(capabilities);
  }
}

/**
 * 创建 Mobile 工具集（不含 task 子代理）
 *
 * 适用于 React Native 环境，不包含：
 * - bash 工具（移动端无 shell）
 * - task 工具（移动端暂不支持子代理）
 */
export const createMobileToolsWithoutTask = (ctx: ToolsContext): Tool<AgentContext>[] => {
  const { capabilities, crypto, vaultUtils, webSearchApiKey } = ctx;

  // 确保 glob 实现已初始化
  ensureMobileGlobInitialized(capabilities);

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

    // 任务管理工具
    createManagePlanTool(),
  ];

  return tools;
};

/**
 * createMobileTools 的别名
 * 与 createMobileToolsWithoutTask 相同（移动端暂不支持 task 子代理）
 */
export const createMobileTools = createMobileToolsWithoutTask;
