/**
 * [PROVIDES]: computeAgentOptions - ChatPane Agent 请求参数派生
 * [DEPENDS]: @shared/ipc
 * [POS]: Chat Pane 业务辅助逻辑（聚焦单一职责：只做 options 派生）
 * [UPDATE]: 2026-02-08 - 移除未使用的消息 parts 工具函数；消息 parts 解析统一由 `@moryflow/ui/ai/message` 提供
 * [UPDATE]: 2026-02-11 - 支持 selectedSkillName 结构化参数，替代纯文本技能注入
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { AgentChatContext, AgentChatRequestOptions } from '@shared/ipc';

export const computeAgentOptions = ({
  activeFilePath,
  contextSummary,
  preferredModelId,
  selectedSkillName,
}: {
  activeFilePath?: string | null;
  contextSummary?: string | null;
  preferredModelId?: string | null;
  selectedSkillName?: string | null;
}): AgentChatRequestOptions | undefined => {
  const context: AgentChatContext = {};

  if (activeFilePath) {
    context.filePath = activeFilePath;
  }

  if (contextSummary && contextSummary.trim().length > 0) {
    context.summary = contextSummary.trim();
  }

  const options: AgentChatRequestOptions = {};

  if (context.filePath || context.summary) {
    options.context = context;
  }

  if (preferredModelId && preferredModelId.trim().length > 0) {
    options.preferredModelId = preferredModelId.trim();
  }

  if (selectedSkillName && selectedSkillName.trim().length > 0) {
    options.selectedSkill = { name: selectedSkillName.trim() };
  }

  return Object.keys(options).length > 0 ? options : undefined;
};
