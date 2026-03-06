/**
 * [DEFINES]: Skills 页面类型（列表/详情/操作）
 * [USED_BY]: SkillsPage, skills-list, skill-detail-modal
 * [POS]: Skills 组件目录类型中心
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
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
