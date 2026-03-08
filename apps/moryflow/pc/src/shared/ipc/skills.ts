/**
 * [DEFINES]: Skills IPC 类型（安装状态/详情/推荐）
 * [USED_BY]: main skills registry, app ipc-handlers, renderer skills UI/chat input
 * [POS]: PC IPC skills 类型入口
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
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
