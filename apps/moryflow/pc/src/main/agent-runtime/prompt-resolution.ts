/**
 * [PROVIDES]: resolveSystemPrompt/resolveModelSettings - Agent 运行时提示词与模型参数解析
 * [DEPENDS]: @moryflow/agents-runtime prompt/hook 能力 + AgentSettings
 * [POS]: Agent Runtime prompt 注入边界（便于独立测试）
 * [UPDATE]: 2026-03-03 - Skills 调用策略改为“意图匹配优先”，明确与任务规模无关
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { ModelSettings } from '@openai/agents-core';
import {
  applyChatParamsHook,
  applyChatSystemHook,
  type AgentMarkdownDefinition,
  type ChatParamsHook,
  type ChatSystemHook,
} from '@moryflow/agents-runtime';
import { getMorySystemPrompt } from '@moryflow/agents-runtime/prompt';
import type { AgentSettings } from '../../shared/ipc.js';

export const resolveSystemPrompt = (
  settings: AgentSettings,
  hook?: ChatSystemHook,
  availableSkillsBlock?: string
): string => {
  const base = getMorySystemPrompt();
  const customInstructions = settings.personalization.customInstructions.trim();
  const withCustomInstructions =
    customInstructions.length > 0
      ? [base, '', '<custom_instructions>', customInstructions, '</custom_instructions>'].join('\n')
      : base;
  const withSkills = availableSkillsBlock
    ? [
        withCustomInstructions,
        '',
        'Decide whether to invoke a skill by intent-to-skill matching, not by task size or complexity.',
        'When user intent matches an available skill, prefer calling the `skill` tool proactively.',
        'Only skip skill invocation when there is no meaningful match or a clear conflict.',
        availableSkillsBlock,
      ].join('\n')
    : withCustomInstructions;
  return applyChatSystemHook(withSkills, hook);
};

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
