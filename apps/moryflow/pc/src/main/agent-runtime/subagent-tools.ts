/**
 * [PROVIDES]: 子代理委托工具集合构建（防止 subagent 自递归）
 * [DEPENDS]: @openai/agents-core, agents-runtime
 * [POS]: PC Agent Runtime 子代理工具编排辅助
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import type { Tool } from '@openai/agents-core';
import type { AgentContext } from '@moryflow/agents-runtime';

const SUBAGENT_TOOL_NAME = 'subagent';

export const buildDelegatedSubagentTools = (
  runtimeTools: Tool<AgentContext>[],
  mcpTools: Tool<AgentContext>[]
): Tool<AgentContext>[] => [
  ...runtimeTools.filter((tool) => tool.name !== SUBAGENT_TOOL_NAME),
  ...mcpTools,
];
