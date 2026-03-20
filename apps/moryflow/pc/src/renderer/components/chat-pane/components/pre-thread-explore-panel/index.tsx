/**
 * [PROVIDES]: PreThreadExplorePanel — 展开/收起状态编排 + Skills 数据 + 自身布局
 * [DEPENDS]: useAgentSkills, useTranslation
 * [POS]: PreThreadView 的探索面板入口
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { useMemo, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { useTranslation } from '@/lib/i18n';
import { useAgentSkills } from '@/hooks/use-agent-skills';
import { GET_STARTED_ITEMS, PREINSTALLED_SKILL_NAMES } from './const';
import { ExploreBar } from './explore-bar';
import { ExplorePanel } from './explore-panel';

type PreThreadExplorePanelProps = {
  onFillInput: (text: string) => void;
};

export const PreThreadExplorePanel = ({ onFillInput }: PreThreadExplorePanelProps) => {
  const { t } = useTranslation('chat');
  const { skills } = useAgentSkills();
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const preinstalledSkills = useMemo(
    () => skills.filter((s) => PREINSTALLED_SKILL_NAMES.includes(s.name)),
    [skills]
  );

  const labels = {
    startWithTask: t('preThreadStartWithTask'),
    getStarted: t('preThreadGetStarted'),
    skills: t('preThreadSkills'),
  };

  if (expanded) {
    return (
      <AnimatePresence mode="wait">
        <ExplorePanel
          key="explore-panel"
          skills={preinstalledSkills}
          onFillInput={(text) => {
            onFillInput(text);
            setExpanded(false);
          }}
          onCollapse={() => setExpanded(false)}
          labels={labels}
        />
      </AnimatePresence>
    );
  }

  if (dismissed) return null;

  return (
    <div className="px-3 pb-3">
      <ExploreBar
        items={GET_STARTED_ITEMS}
        exploreMoreLabel={t('preThreadExploreMore')}
        showExploreMore
        onFillInput={onFillInput}
        onExpand={() => setExpanded(true)}
        onDismiss={() => setDismissed(true)}
      />
    </div>
  );
};
