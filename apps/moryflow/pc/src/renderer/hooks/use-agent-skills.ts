/**
 * [PROVIDES]: useAgentSkills - Skills 列表与操作（刷新/启停/卸载/安装）
 * [DEPENDS]: desktopAPI.agent.skills IPC
 * [POS]: Renderer 侧 Skills 数据访问入口
 * [UPDATE]: 2026-02-11 - 操作接口补齐 desktopAPI 可用性边界，缺失时抛出明确错误而非空引用崩溃
 * [UPDATE]: 2026-02-11 - createSkill 删除，推荐安装统一收敛为 installSkill（预设目录复制）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { RecommendedSkill, SkillDetail, SkillSummary } from '@shared/ipc';

export type UseAgentSkillsResult = {
  skills: SkillSummary[];
  enabledSkills: SkillSummary[];
  recommendedSkills: RecommendedSkill[];
  loading: boolean;
  refresh: () => Promise<void>;
  getDetail: (name: string) => Promise<SkillDetail>;
  setEnabled: (name: string, enabled: boolean) => Promise<void>;
  uninstall: (name: string) => Promise<void>;
  installSkill: (name: string) => Promise<SkillSummary>;
  openDirectory: (name: string) => Promise<void>;
};

export const useAgentSkills = (): UseAgentSkillsResult => {
  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [recommendedSkills, setRecommendedSkills] = useState<RecommendedSkill[]>([]);
  const [loading, setLoading] = useState(true);

  const requireAgentApi = useCallback(() => {
    const api = window.desktopAPI?.agent;
    if (!api) {
      throw new Error('Desktop API is unavailable.');
    }
    return api;
  }, []);

  const load = useCallback(async (mode: 'list' | 'refresh' = 'list') => {
    const api = window.desktopAPI?.agent;
    if (!api) {
      setSkills([]);
      setRecommendedSkills([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [skillList, recommended] = await Promise.all([
        mode === 'refresh' ? api.refreshSkills() : api.listSkills(),
        api.listRecommendedSkills(),
      ]);
      setSkills(skillList);
      setRecommendedSkills(recommended);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load('list');
  }, [load]);

  const refresh = useCallback(async () => {
    await load('refresh');
  }, [load]);

  const setEnabled = useCallback(
    async (name: string, enabled: boolean) => {
      const api = requireAgentApi();
      await api.setSkillEnabled({ name, enabled });
      await load('list');
    },
    [load, requireAgentApi]
  );

  const uninstall = useCallback(
    async (name: string) => {
      const api = requireAgentApi();
      await api.uninstallSkill({ name });
      await load('list');
    },
    [load, requireAgentApi]
  );

  const installSkill = useCallback(
    async (name: string) => {
      const api = requireAgentApi();
      const skill = await api.installSkill({ name });
      await load('list');
      return skill;
    },
    [load, requireAgentApi]
  );

  const getDetail = useCallback(
    async (name: string) => {
      const api = requireAgentApi();
      return api.getSkillDetail({ name });
    },
    [requireAgentApi]
  );

  const openDirectory = useCallback(
    async (name: string) => {
      const api = requireAgentApi();
      await api.openSkillDirectory({ name });
    },
    [requireAgentApi]
  );

  const enabledSkills = useMemo(() => skills.filter((item) => item.enabled), [skills]);

  return {
    skills,
    enabledSkills,
    recommendedSkills,
    loading,
    refresh,
    getDetail,
    setEnabled,
    uninstall,
    installSkill,
    openDirectory,
  };
};
