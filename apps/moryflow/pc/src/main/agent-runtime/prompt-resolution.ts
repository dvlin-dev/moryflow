/**
 * [PROVIDES]: resolveSystemPrompt/resolveModelSettings - Agent 运行时提示词与模型参数解析
 * [DEPENDS]: @moryflow/agents-runtime prompt/hook 能力 + AgentSettings
 * [POS]: Agent Runtime prompt 注入边界（便于独立测试）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import type { ModelSettings } from '@openai/agents-core';
import {
  applyChatParamsHook,
  buildSystemPrompt,
  PC_BASH_FIRST_PROFILE,
  type AgentMarkdownDefinition,
  type ChatParamsHook,
  type ChatSystemHook,
} from '@moryflow/agents-runtime';
import type { AgentSettings } from '../../shared/ipc.js';

export const resolveSystemPrompt = (input: {
  settings: AgentSettings;
  basePrompt?: string;
  hook?: ChatSystemHook;
  availableSkillsBlock?: string;
}): string =>
  buildSystemPrompt({
    platformProfile: PC_BASH_FIRST_PROFILE,
    basePrompt: input.basePrompt,
    customInstructions: input.settings.personalization.customInstructions,
    availableSkillsBlock: input.availableSkillsBlock,
    systemHook: input.hook,
  });

export const resolveModelSettings = (
  agentDefinition?: AgentMarkdownDefinition | null,
  hook?: ChatParamsHook
): ModelSettings | undefined => {
  const fromAgent = agentDefinition?.modelSettings;
  if (fromAgent) {
    return applyChatParamsHook(fromAgent as ModelSettings, hook);
  }
  return applyChatParamsHook(undefined, hook);
};
