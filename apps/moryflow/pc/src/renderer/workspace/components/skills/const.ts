/**
 * [DEFINES]: Skills 页面类型（列表/详情/操作）
 * [USED_BY]: SkillsPage, skills-list, skill-detail-modal
 * [POS]: Skills 组件目录类型中心
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import type { RecommendedSkill, SkillSummary } from '@shared/ipc';

export type SkillsViewState = {
  selected: SkillSummary | null;
  detailOpen: boolean;
};

export type SkillListProps = {
  loading: boolean;
  skills: SkillSummary[];
  recommendedSkills: RecommendedSkill[];
  search: string;
  onOpenDetail: (skill: SkillSummary) => void;
  onInstallRecommended: (skill: RecommendedSkill) => void;
};
