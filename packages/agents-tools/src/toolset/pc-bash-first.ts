import type { Tool } from '@openai/agents-core';
import type { AgentContext } from '@moryflow/agents-runtime';
import { createGenerateImageTool } from '../image/generate-image-tool';
import { createTaskTool } from '../task/task-tool';
import { createWebFetchTool } from '../web/web-fetch-tool';
import { createWebSearchTool } from '../web/web-search-tool';
import type { ToolsetContext } from './shared';

/** 创建 PC Bash-First 工具集（仅 agents-tools 负责的非重叠工具） */
export const createPcBashFirstToolset = (ctx: ToolsetContext): Tool<AgentContext>[] => {
  const { capabilities, taskStateService, webSearchApiKey } = ctx;

  return [
    createWebFetchTool(capabilities),
    createWebSearchTool(capabilities, webSearchApiKey),
    createGenerateImageTool(capabilities),
    createTaskTool(taskStateService),
  ];
};

export type { ToolsetContext } from './shared';
