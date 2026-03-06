/**
 * [PROVIDES]: normalizeAgentOptions - IPC 入参归一化（selectedSkill + context）
 * [DEPENDS]: shared/ipc
 * [POS]: chat-request 参数边界层（仅做结构清洗，不承载业务）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { AgentChatRequestOptions } from '../../shared/ipc.js';
import { buildThinkingProfileFromRaw } from '@moryflow/model-bank';
import { parseProviderModelRef } from '@moryflow/model-bank/registry';

const toTrimmedString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

const normalizeThinkingProfile = (
  value: unknown,
  preferredModelId?: string
): AgentChatRequestOptions['thinkingProfile'] | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  const rawLevels = Array.isArray(candidate.levels) ? candidate.levels : [];
  if (rawLevels.length === 0) {
    return undefined;
  }
  const parsedModelRef = parseProviderModelRef(preferredModelId);
  const parsedLevels = rawLevels
    .map((rawLevel) => {
      if (!rawLevel || typeof rawLevel !== 'object') {
        return null;
      }
      const levelRecord = rawLevel as Record<string, unknown>;
      const id = toTrimmedString(levelRecord.id);
      if (!id) {
        return null;
      }
      const visibleParamsRaw = Array.isArray(levelRecord.visibleParams)
        ? levelRecord.visibleParams
        : [];
      const visibleParams = visibleParamsRaw
        .map((rawParam) => {
          if (!rawParam || typeof rawParam !== 'object') {
            return null;
          }
          const paramRecord = rawParam as Record<string, unknown>;
          const key = toTrimmedString(paramRecord.key);
          const value = toTrimmedString(paramRecord.value);
          if (!key || !value) {
            return null;
          }
          return { key, value };
        })
        .filter((item): item is { key: string; value: string } => Boolean(item));

      return {
        id,
        ...(toTrimmedString(levelRecord.label)
          ? { label: toTrimmedString(levelRecord.label) }
          : {}),
        ...(toTrimmedString(levelRecord.description)
          ? { description: toTrimmedString(levelRecord.description) }
          : {}),
        ...(visibleParams.length > 0 ? { visibleParams } : {}),
      };
    })
    .filter((level): level is NonNullable<typeof level> => Boolean(level));

  if (parsedLevels.length === 0) {
    return undefined;
  }

  const profile = buildThinkingProfileFromRaw({
    supportsThinking: candidate.supportsThinking !== false,
    providerId: parsedModelRef?.providerId,
    modelId: parsedModelRef?.modelId,
    sdkType: parsedModelRef?.providerId,
    rawProfile: {
      defaultLevel: toTrimmedString(candidate.defaultLevel),
      levels: parsedLevels,
      supportsThinking: candidate.supportsThinking === false ? false : undefined,
    },
  });
  return {
    supportsThinking: profile.supportsThinking,
    defaultLevel: profile.defaultLevel,
    levels: profile.levels.map((level) => ({
      id: level.id,
      label: level.label,
      ...(level.description ? { description: level.description } : {}),
      ...(level.visibleParams && level.visibleParams.length > 0
        ? { visibleParams: level.visibleParams }
        : {}),
    })),
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

  const thinkingProfile = normalizeThinkingProfile(candidate.thinkingProfile, preferredModelId);
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

  const contextCandidate = candidate.context;
  if (contextCandidate && typeof contextCandidate === 'object') {
    const contextRecord = contextCandidate as Record<string, unknown>;
    const filePath = toTrimmedString(contextRecord.filePath);
    const summary = toTrimmedString(contextRecord.summary);
    if (filePath || summary) {
      normalized.context = {};
      if (filePath) {
        normalized.context.filePath = filePath;
      }
      if (summary) {
        normalized.context.summary = summary;
      }
    }
  }
  return Object.keys(normalized).length > 0 ? normalized : undefined;
};
