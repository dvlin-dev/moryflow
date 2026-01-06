/**
 * [PROVIDES]: agents 框架顶层统一导出，包含 core + openai + realtime
 * [DEPENDS]: agents-core, agents-openai, agents-realtime
 * [POS]: 应用层直接依赖的入口包，自动配置 OpenAI Provider
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */
import { setDefaultModelProvider } from '@moryflow/agents-core';
import { OpenAIProvider } from '@moryflow/agents-openai';

setDefaultModelProvider(new OpenAIProvider());
// 不再自动注册 OpenAI Tracing Exporter，由使用方按需配置
// PC 端使用 ServerTracingProcessor 上报到后端

export * from '@moryflow/agents-core';
export * from '@moryflow/agents-openai';
export { applyPatchTool, shellTool } from '@moryflow/agents-core';
export type {
  Shell,
  ShellAction,
  ShellResult,
  ShellOutputResult,
  ApplyPatchOperation,
  ApplyPatchResult,
  Editor,
  ShellTool,
  ApplyPatchTool,
} from '@moryflow/agents-core';
export * as realtime from '@moryflow/agents-realtime';
