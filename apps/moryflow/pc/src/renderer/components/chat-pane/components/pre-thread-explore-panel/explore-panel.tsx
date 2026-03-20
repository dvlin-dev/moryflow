/**
 * [PROPS]: skills, onFillInput, onCollapse, labels
 * [POS]: PreThreadView 展开态 — 固定顶栏 + 可滚动 Get Started / Skills 区块
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';
import type { SkillSummary } from '@shared/ipc';
import { useTranslation } from '@/lib/i18n';
import { GET_STARTED_ITEMS } from './const';
import { GetStartedSection } from './get-started-section';
import { SkillsSection } from './skills-section';

type ExplorePanelLabels = {
  startWithTask: string;
  getStarted: string;
  skills: string;
};

type ExplorePanelProps = {
  skills: SkillSummary[];
  onFillInput: (text: string) => void;
  onCollapse: () => void;
  labels: ExplorePanelLabels;
};

export const ExplorePanel = ({ skills, onFillInput, onCollapse, labels }: ExplorePanelProps) => {
  const { t } = useTranslation('chat');
  const innerClass = 'px-3';

  return (
    <motion.div
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Fixed header — padding mirrors input box */}
      <div className="shrink-0 py-3.5">
        <div className={innerClass}>
          <button
            type="button"
            onClick={onCollapse}
            aria-label={t('collapse')}
            className="group flex items-center gap-1.5"
          >
            <span className="text-xl font-semibold text-foreground">{labels.startWithTask}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
          </button>
        </div>
      </div>

      {/* Scrollable content — @container enables responsive columns in children */}
      <div className="flex-1 overflow-y-auto">
        <div className={`@container space-y-7 py-5 ${innerClass}`}>
          <GetStartedSection
            title={labels.getStarted}
            items={GET_STARTED_ITEMS}
            onSelect={onFillInput}
          />
          <SkillsSection title={labels.skills} skills={skills} onSelect={onFillInput} />
        </div>
      </div>
    </motion.div>
  );
};
