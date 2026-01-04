/**
 * [PROVIDES]: agents 框架顶层统一导出，包含 core + openai + realtime
 * [DEPENDS]: agents-core, agents-openai, agents-realtime
 * [POS]: 应用层直接依赖的入口包，自动配置 OpenAI Provider
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */
import { setDefaultModelProvider } from '@aiget/agents-core';
import { OpenAIProvider } from '@aiget/agents-openai';

setDefaultModelProvider(new OpenAIProvider());
// 不再自动注册 OpenAI Tracing Exporter，由使用方按需配置
// PC 端使用 ServerTracingProcessor 上报到后端

export * from '@aiget/agents-core';
export * from '@aiget/agents-openai';
export { applyPatchTool, shellTool } from '@aiget/agents-core';
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
} from '@aiget/agents-core';
export * as realtime from '@aiget/agents-realtime';
