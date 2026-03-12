/**
 * [DEFINES]: Skills 模块共享类型（catalog/source/state/parsed）
 * [USED_BY]: skills catalog/remote/installer/registry
 * [POS]: Moryflow PC Skills 类型单一事实源
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
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
  revision: string | null;
  checkedAt: number;
  updatedAt: number;
  lastSyncStatus?: 'success' | 'failed';
  lastErrorStatus?: number | null;
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
