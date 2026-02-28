/**
 * [PROVIDES]: useSkillsPageState - Skills 页面状态（搜索/详情/数据操作）
 * [DEPENDS]: useAgentSkills, useChatSessions, useWorkspaceNav, useSelectedSkillStore
 * [POS]: Skills 页面容器逻辑
 * [UPDATE]: 2026-02-11 - Try/New skill 统一走“新建线程 + 选中 skill + 切回 Chat”链路；推荐安装改为 installSkill
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useCallback, useMemo, useState } from 'react';
import type { RecommendedSkill, SkillSummary } from '@shared/ipc';
import { toast } from 'sonner';
import { useAgentSkills } from '@/hooks/use-agent-skills';
import { useChatSessions, useSelectedSkillStore } from '@/components/chat-pane/hooks';
import { useWorkspaceNav } from '../../context';
import type { SkillsViewState } from './const';

const normalizeSkillName = (name: string) => name.trim().toLowerCase();

export const useSkillsPageState = () => {
  const skillsApi = useAgentSkills();
  const { createSession } = useChatSessions();
  const { setSidebarMode } = useWorkspaceNav();
  const setSelectedSkillName = useSelectedSkillStore((state) => state.setSelectedSkillName);
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

  const resolveInstalledSkill = useCallback(
    (skillName: string) => {
      const normalized = normalizeSkillName(skillName);
      return skillsApi.skills.find((item) => item.name === normalized) ?? null;
    },
    [skillsApi.skills]
  );

  const startSkillThread = useCallback(
    async (skillName: string, options?: { autoInstall?: boolean; autoEnable?: boolean }) => {
      const normalized = normalizeSkillName(skillName);
      let skill = resolveInstalledSkill(normalized);

      if (!skill && options?.autoInstall) {
        skill = await skillsApi.installSkill(normalized);
      }

      if (!skill) {
        throw new Error('Skill is not installed.');
      }
      if (!skill.enabled && options?.autoEnable) {
        await skillsApi.setEnabled(skill.name, true);
        skill = { ...skill, enabled: true };
      }
      if (!skill.enabled) {
        throw new Error('Skill is disabled. Enable it before trying.');
      }

      const session = await createSession();
      if (!session) {
        throw new Error('Failed to create thread.');
      }

      setSelectedSkillName(skill.name);
      setSidebarMode('chat');
      return skill;
    },
    [createSession, resolveInstalledSkill, setSelectedSkillName, setSidebarMode, skillsApi]
  );

  const handleInstallRecommended = useCallback(
    async (skill: RecommendedSkill) => {
      try {
        await skillsApi.installSkill(skill.name);
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
    startSkillThread,
  };
};
