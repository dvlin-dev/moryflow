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

const normalizeThinkingProfile = (
  value: unknown,
): AgentChatRequestOptions['thinkingProfile'] | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  const rawLevels = Array.isArray(candidate.levels) ? candidate.levels : [];
  const dedupedLevels: Array<{ id: string; label: string; description?: string }> = [];
  const seen = new Set<string>();

  for (const rawLevel of rawLevels) {
    if (!rawLevel || typeof rawLevel !== 'object') {
      continue;
    }
    const levelRecord = rawLevel as Record<string, unknown>;
    const id = toTrimmedString(levelRecord.id);
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    dedupedLevels.push({
      id,
      label: toTrimmedString(levelRecord.label) ?? id,
      ...(toTrimmedString(levelRecord.description)
        ? { description: toTrimmedString(levelRecord.description) }
        : {}),
    });
  }

  if (!seen.has('off')) {
    dedupedLevels.unshift({ id: 'off', label: 'Off' });
  } else {
    const offIndex = dedupedLevels.findIndex((level) => level.id === 'off');
    if (offIndex > 0) {
      const [off] = dedupedLevels.splice(offIndex, 1);
      dedupedLevels.unshift(off);
    }
  }

  if (dedupedLevels.length === 0) {
    return undefined;
  }

  const supportsThinking =
    candidate.supportsThinking !== false &&
    dedupedLevels.some((level) => level.id !== 'off');
  const effectiveLevels = supportsThinking
    ? dedupedLevels
    : [dedupedLevels.find((level) => level.id === 'off') ?? { id: 'off', label: 'Off' }];
  const defaultLevelCandidate = toTrimmedString(candidate.defaultLevel);
  const defaultLevel = effectiveLevels.some(
    (level) => level.id === defaultLevelCandidate,
  )
    ? (defaultLevelCandidate as string)
    : 'off';

  return {
    supportsThinking: effectiveLevels.some((level) => level.id !== 'off'),
    defaultLevel,
    levels: effectiveLevels,
  };
};

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

  const thinkingCandidate = candidate.thinking;
  if (thinkingCandidate && typeof thinkingCandidate === 'object') {
    const thinkingRecord = thinkingCandidate as Record<string, unknown>;
    const mode = thinkingRecord.mode;
    if (mode === 'off') {
      normalized.thinking = { mode: 'off' };
    } else if (mode === 'level') {
      const level = toTrimmedString(thinkingRecord.level);
      if (level) {
        normalized.thinking = { mode: 'level', level };
      }
    }
  }

  const thinkingProfile = normalizeThinkingProfile(candidate.thinkingProfile);
  if (thinkingProfile) {
    normalized.thinkingProfile = thinkingProfile;
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
