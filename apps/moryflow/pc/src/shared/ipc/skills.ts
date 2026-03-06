/**
 * [DEFINES]: Skills IPC 类型（安装状态/详情/推荐）
 * [USED_BY]: main skills registry, app ipc-handlers, renderer skills UI/chat input
 * [POS]: PC IPC skills 类型入口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

export type SkillSummary = {
  name: string;
  title: string;
  description: string;
  enabled: boolean;
  location: string;
  updatedAt: number;
};

export type SkillDetail = SkillSummary & {
  content: string;
  files: string[];
};

export type RecommendedSkill = {
  name: string;
  title: string;
  description: string;
};
