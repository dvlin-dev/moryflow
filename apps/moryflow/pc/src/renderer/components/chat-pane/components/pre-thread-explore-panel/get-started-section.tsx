/**
 * [PROPS]: items, onSelect
 * [POS]: Explore 面板 Get Started 卡片区块
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { PenLine, ListChecks, Globe } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ExploreItem } from './const';

const ITEM_ICONS: Record<string, LucideIcon> = {
  'write-publish': PenLine,
  'build-plan': ListChecks,
  'create-site-page': Globe,
};

type GetStartedSectionProps = {
  title: string;
  items: ExploreItem[];
  onSelect: (prompt: string) => void;
};

export const GetStartedSection = ({ title, items, onSelect }: GetStartedSectionProps) => (
  <section>
    <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
      {title}
    </h3>
    <div className="grid grid-cols-3 gap-2">
      {items.map((item) => {
        const Icon = ITEM_ICONS[item.id];
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.prompt)}
            className="group flex flex-col gap-2 rounded-xl border border-border/60 bg-card/60 px-4 py-3.5 text-left transition-all duration-150 hover:border-border hover:bg-card hover:shadow-sm"
          >
            {Icon && (
              <Icon className="h-4 w-4 text-muted-foreground/70 group-hover:text-foreground/70" />
            )}
            <span className="text-[13px] font-medium leading-snug text-foreground group-hover:text-foreground/90">
              {item.title}
            </span>
          </button>
        );
      })}
    </div>
  </section>
);
