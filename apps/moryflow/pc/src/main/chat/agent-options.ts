/**
 * [PROVIDES]: normalizeAgentOptions - IPC 入参归一化（兼容旧字段 + selectedSkill）
 * [DEPENDS]: shared/ipc
 * [POS]: chat-request 参数边界层（仅做结构清洗，不承载业务）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { AgentChatRequestOptions } from '../../shared/ipc.js';

const toTrimmedString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

export const normalizeAgentOptions = (raw: unknown): AgentChatRequestOptions | undefined => {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }
  const candidate = raw as Record<string, unknown>;
  const normalized: AgentChatRequestOptions = {};
  const preferredModelId = toTrimmedString(candidate.preferredModelId);
  if (preferredModelId) {
    normalized.preferredModelId = preferredModelId;
  }

  const selectedSkillCandidate = candidate.selectedSkill;
  if (selectedSkillCandidate && typeof selectedSkillCandidate === 'object') {
    const skillRecord = selectedSkillCandidate as Record<string, unknown>;
    const skillName = toTrimmedString(skillRecord.name);
    if (skillName) {
      normalized.selectedSkill = { name: skillName };
    }
  }

  const legacyFilePath = toTrimmedString(candidate.activeFilePath);
  const legacySummary = toTrimmedString(candidate.contextSummary);
  const contextCandidate = candidate.context;
  if (contextCandidate && typeof contextCandidate === 'object') {
    const contextRecord = contextCandidate as Record<string, unknown>;
    const filePath = toTrimmedString(contextRecord.filePath) ?? legacyFilePath;
    const summary = toTrimmedString(contextRecord.summary) ?? legacySummary;
    if (filePath || summary) {
      normalized.context = {};
      if (filePath) {
        normalized.context.filePath = filePath;
      }
      if (summary) {
        normalized.context.summary = summary;
      }
    }
  } else if (legacyFilePath || legacySummary) {
    normalized.context = {};
    if (legacyFilePath) {
      normalized.context.filePath = legacyFilePath;
    }
    if (legacySummary) {
      normalized.context.summary = legacySummary;
    }
  }
  return Object.keys(normalized).length > 0 ? normalized : undefined;
};
