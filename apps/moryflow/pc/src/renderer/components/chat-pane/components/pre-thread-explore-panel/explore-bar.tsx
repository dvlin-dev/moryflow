/**
 * [PROPS]: items, showExploreMore, onFillInput, onExpand, onDismiss
 * [POS]: PreThreadView 收起态 — 3 张 suggestion 卡片 + Explore more 按钮
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { X } from 'lucide-react';
import type { ExploreItem } from './const';
import { EXPLORE_ITEM_ICONS } from './const';

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
  <div className="@container space-y-2">
    {/* Explore more + × — 始终右对齐置于卡片上方，两栏/三栏保持同一套样式 */}
    {showExploreMore && (
      <div className="flex items-center justify-end gap-1">
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
          className="rounded p-0.5 text-muted-foreground/50 transition-colors hover:text-muted-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )}

    {/* 卡片网格：容器 ≥380px 时 3 列，否则 2 列（第 3 张卡片随列数自动隐藏） */}
    <div className="grid grid-cols-2 gap-2 @[380px]:grid-cols-3">
      {items.map((item, i) => {
        const Icon = EXPLORE_ITEM_ICONS[item.id];
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onFillInput(item.prompt)}
            className={`group flex flex-col gap-2 rounded-xl border border-border/50 bg-card/50 px-4 py-3.5 text-left transition-all duration-150 hover:border-border/80 hover:bg-card hover:shadow-sm${i >= 2 ? ' hidden @[380px]:flex' : ''}`}
          >
            {Icon && (
              <Icon className="h-4 w-4 text-muted-foreground/70 group-hover:text-foreground/70" />
            )}
            <span className="line-clamp-2 text-[13px] font-medium leading-snug text-foreground/80 group-hover:text-foreground">
              {item.title}
            </span>
          </button>
        );
      })}
    </div>
  </div>
);
