/**
 * [PROVIDES]: PreThreadExplorePanel — 展开/收起状态编排 + Skills 数据 + 自身布局
 * [DEPENDS]: useAgentSkills, useTranslation
 * [POS]: PreThreadView 的探索面板入口（mode/panel variant 均适用）
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
  /** 'mode' = 全屏 entry canvas，'panel' = 右侧三栏面板 */
  variant: 'mode' | 'panel';
  onFillInput: (text: string) => void;
};

export const PreThreadExplorePanel = ({ variant, onFillInput }: PreThreadExplorePanelProps) => {
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

  // panel variant：只显示 3 张卡片（无 Explore more），居中对齐
  if (variant === 'panel') {
    return (
      <div className="mx-auto w-full max-w-[34rem] px-6 pb-3">
        <ExploreBar
          items={GET_STARTED_ITEMS}
          exploreMoreLabel={t('preThreadExploreMore')}
          showExploreMore={false}
          onFillInput={onFillInput}
          onExpand={() => undefined}
          onDismiss={() => undefined}
        />
      </div>
    );
  }

  // mode variant — 展开态：ExplorePanel 填满全高（无外层 max-w 约束）
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

  // mode variant — 收起态：bar 居中对齐，由父层的 justify-end 将其推到底部
  if (dismissed) return null;

  return (
    <div className="mx-auto w-full max-w-[46rem] px-8 pb-3">
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
