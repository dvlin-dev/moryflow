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

  const isPanel = variant === 'panel';

  /*
   * 包装层 padding 必须与同变体的输入框对齐：
   * - panel: 输入框用 px-6，所以这里也用 px-6（无 max-w）
   * - mode:  输入框用 mx-auto max-w-[46rem] px-8，这里保持一致
   */
  const barWrapperClass = isPanel ? 'px-6 pb-3' : 'mx-auto w-full max-w-[46rem] px-8 pb-3';

  // 展开态：ExplorePanel 填满全高（两种 variant 均支持）
  if (expanded) {
    return (
      <AnimatePresence mode="wait">
        <ExplorePanel
          key="explore-panel"
          compact={isPanel}
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
    <div className={barWrapperClass}>
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
