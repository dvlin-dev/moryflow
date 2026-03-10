/**
 * [PROPS]: items, showExploreMore, onFillInput, onExpand, onDismiss
 * [POS]: PreThreadView 收起态 — 3 张 suggestion 卡片 + Explore more 按钮
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { X } from 'lucide-react';
import type { ExploreItem } from './const';

type ExploreBarProps = {
  items: ExploreItem[];
  exploreMoreLabel: string;
  showExploreMore: boolean;
  onFillInput: (text: string) => void;
  onExpand: () => void;
  onDismiss: () => void;
};

export const ExploreBar = ({
  items,
  exploreMoreLabel,
  showExploreMore,
  onFillInput,
  onExpand,
  onDismiss,
}: ExploreBarProps) => (
  <div className="space-y-2">
    <div className="flex items-start gap-2">
      <div className="grid flex-1 grid-cols-3 gap-2">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onFillInput(item.prompt)}
            className="group rounded-xl border border-border/60 bg-card/60 px-3.5 py-3 text-left transition-all duration-150 hover:border-border hover:bg-card hover:shadow-sm"
          >
            <span className="line-clamp-2 text-[13px] font-medium leading-snug text-foreground/80 group-hover:text-foreground">
              {item.title}
            </span>
          </button>
        ))}
      </div>

      {showExploreMore && (
        <div className="flex shrink-0 items-center gap-1 pt-0.5">
          <button
            type="button"
            onClick={onExpand}
            className="text-[12px] text-muted-foreground transition-colors hover:text-foreground"
          >
            {exploreMoreLabel}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="rounded p-0.5 text-muted-foreground/60 transition-colors hover:text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  </div>
);
