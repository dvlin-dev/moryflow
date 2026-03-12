import type { Tool } from '@openai/agents-core';
import type { AgentContext } from '@moryflow/agents-runtime';
import { createDeleteTool } from '../file/delete-tool';
import { createEditTool } from '../file/edit-tool';
import { createLsTool } from '../file/ls-tool';
import { createMoveTool } from '../file/move-tool';
import { createReadTool } from '../file/read-tool';
import { createWriteTool } from '../file/write-tool';
import { initMobileGlob, isGlobImplInitialized } from '../glob/glob-mobile';
import { createGenerateImageTool } from '../image/generate-image-tool';
import { createGlobTool } from '../search/glob-tool';
import { createGrepTool } from '../search/grep-tool';
import { createSearchInFileTool } from '../search/search-in-file-tool';
import { createTaskTool } from '../task/task-tool';
import { createWebFetchTool } from '../web/web-fetch-tool';
import { createWebSearchTool } from '../web/web-search-tool';
import type { ToolsetContext } from './shared';

const ensureMobileGlobInitialized = (ctx: ToolsetContext): void => {
  if (!isGlobImplInitialized()) {
    initMobileGlob(ctx.capabilities);
  }
};

/** 创建 Mobile 文件工具工具集 */
export const createMobileFileToolsToolset = (ctx: ToolsetContext): Tool<AgentContext>[] => {
  const { capabilities, crypto, vaultUtils, taskStateService, webSearchApiKey } = ctx;

  ensureMobileGlobInitialized(ctx);

  return [
    createReadTool(capabilities, vaultUtils),
    createWriteTool(capabilities, crypto, vaultUtils),
    createEditTool(capabilities, crypto, vaultUtils),
    createDeleteTool(capabilities, vaultUtils),
    createMoveTool(capabilities, vaultUtils),
    createLsTool(capabilities, vaultUtils),
    createGlobTool(capabilities, vaultUtils),
    createGrepTool(capabilities, vaultUtils),
    createSearchInFileTool(capabilities, vaultUtils),
    createWebFetchTool(capabilities),
    createWebSearchTool(capabilities, webSearchApiKey),
    createGenerateImageTool(capabilities),
    createTaskTool(taskStateService),
  ];
};

export type { ToolsetContext } from './shared';
