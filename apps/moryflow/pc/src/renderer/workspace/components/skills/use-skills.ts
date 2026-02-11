/**
 * [PROVIDES]: useSkillsPageState - Skills 页面状态（搜索/详情/数据操作）
 * [DEPENDS]: useAgentSkills
 * [POS]: Skills 页面容器逻辑
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useCallback, useMemo, useState } from 'react';
import type { RecommendedSkill, SkillSummary } from '@shared/ipc';
import { toast } from 'sonner';
import { useAgentSkills } from '@/hooks/use-agent-skills';
import type { SkillsViewState } from './const';

export const useSkillsPageState = () => {
  const skillsApi = useAgentSkills();
  const [search, setSearch] = useState('');
  const [view, setView] = useState<SkillsViewState>({
    selected: null,
    detailOpen: false,
  });

  const openDetail = useCallback((skill: SkillSummary) => {
    setView({ selected: skill, detailOpen: true });
  }, []);

  const closeDetail = useCallback(() => {
    setView((prev) => ({ ...prev, detailOpen: false }));
  }, []);

  const handleInstallRecommended = useCallback(
    async (skill: RecommendedSkill) => {
      try {
        await skillsApi.createSkill({
          name: skill.name,
          title: skill.title,
          description: skill.description,
        });
        toast.success('Skill installed');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to install skill');
      }
    },
    [skillsApi]
  );

  const selectedSkill = useMemo(
    () =>
      view.selected
        ? (skillsApi.skills.find((item) => item.name === view.selected?.name) ?? null)
        : null,
    [skillsApi.skills, view.selected]
  );

  return {
    ...skillsApi,
    search,
    setSearch,
    selectedSkill,
    detailOpen: view.detailOpen,
    openDetail,
    closeDetail,
    handleInstallRecommended,
  };
};
