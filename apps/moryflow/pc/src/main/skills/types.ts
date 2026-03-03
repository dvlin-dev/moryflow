/**
 * [DEFINES]: Skills 模块共享类型（catalog/source/state/parsed）
 * [USED_BY]: skills catalog/remote/installer/registry
 * [POS]: Moryflow PC Skills 类型单一事实源
 *
 * [PROTOCOL]: 本文件变更时，必须同步更新 Header 与 `src/main/CLAUDE.md`
 */

export type GitHubSkillSource = {
  owner: string;
  repo: string;
  ref: string;
  path: string;
  sourceUrl: string;
};

export type CuratedSkill = {
  name: string;
  fallbackTitle: string;
  fallbackDescription: string;
  preinstall: boolean;
  recommended: boolean;
  source: GitHubSkillSource;
};

export type ManagedSkillState = {
  sourceUrl: string;
  revision: string;
  checkedAt: number;
  updatedAt: number;
};

export type SkillStateFile = {
  disabled: string[];
  skippedPreinstall: string[];
  managedSkills: Record<string, ManagedSkillState>;
};

export type ParsedSkill = {
  name: string;
  title: string;
  description: string;
  content: string;
  location: string;
  updatedAt: number;
  files: string[];
};
