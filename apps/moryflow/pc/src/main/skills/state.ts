/**
 * [PROVIDES]: Skills 状态文件读写（disabled/skippedPreinstall/managedSkills）
 * [DEPENDS]: node:fs, skills/file-utils, skills/types
 * [POS]: Skills 状态持久化边界
 * [UPDATE]: 2026-03-03 - 兼容旧版 curatedPreinstalled 到 skippedPreinstall 的读取迁移
 *
 * [PROTOCOL]: 本文件变更时，必须同步更新 Header 与 `src/main/CLAUDE.md`
 */

import { promises as fs } from 'node:fs';
import { readIfExists, toKebabCase } from './file-utils.js';
import type { ManagedSkillState, SkillStateFile } from './types.js';

const LEGACY_PREINSTALL_SKILLS = ['find-skills', 'skill-creator'] as const;

const normalizeSkillNameList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .map((item) => toKebabCase(item))
        .filter((item) => item.length > 0)
    : [];

const sanitizeManagedSkillState = (value: unknown): ManagedSkillState | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const state = value as Partial<ManagedSkillState>;
  if (typeof state.sourceUrl !== 'string' || state.sourceUrl.trim().length === 0) {
    return null;
  }
  if (typeof state.revision !== 'string' || state.revision.trim().length === 0) {
    return null;
  }

  return {
    sourceUrl: state.sourceUrl,
    revision: state.revision,
    checkedAt: typeof state.checkedAt === 'number' ? state.checkedAt : 0,
    updatedAt: typeof state.updatedAt === 'number' ? state.updatedAt : 0,
  };
};

export const defaultSkillState = (): SkillStateFile => ({
  disabled: [],
  skippedPreinstall: [],
  managedSkills: {},
});

export const readSkillState = async (stateFile: string): Promise<SkillStateFile> => {
  const raw = await readIfExists(stateFile);
  if (!raw) {
    return defaultSkillState();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SkillStateFile> & {
      curatedPreinstalled?: unknown;
      skippedPreinstall?: unknown;
    };
    const disabled = normalizeSkillNameList(parsed.disabled);

    const skippedPreinstall = Array.isArray(parsed.skippedPreinstall)
      ? normalizeSkillNameList(parsed.skippedPreinstall)
      : parsed.curatedPreinstalled === true
        ? [...LEGACY_PREINSTALL_SKILLS]
        : [];

    const managedSkills: Record<string, ManagedSkillState> = {};
    if (parsed.managedSkills && typeof parsed.managedSkills === 'object') {
      for (const [name, value] of Object.entries(parsed.managedSkills)) {
        const normalizedName = toKebabCase(name);
        if (!normalizedName) {
          continue;
        }
        const sanitized = sanitizeManagedSkillState(value);
        if (!sanitized) {
          continue;
        }
        managedSkills[normalizedName] = sanitized;
      }
    }

    return {
      disabled: Array.from(new Set(disabled)).sort(),
      skippedPreinstall: Array.from(new Set(skippedPreinstall)).sort(),
      managedSkills,
    };
  } catch {
    return defaultSkillState();
  }
};

export const writeSkillState = async (stateFile: string, state: SkillStateFile): Promise<void> => {
  const normalized: SkillStateFile = {
    disabled: Array.from(
      new Set(state.disabled.map((item) => toKebabCase(item)).filter(Boolean))
    ).sort(),
    skippedPreinstall: Array.from(
      new Set(state.skippedPreinstall.map((item) => toKebabCase(item)).filter(Boolean))
    ).sort(),
    managedSkills: state.managedSkills,
  };

  await fs.writeFile(stateFile, `${JSON.stringify(normalized, null, 2)}\n`, 'utf-8');
};
