/**
 * [PROPS]: items, showExploreMore, onFillInput, onExpand, onDismiss
 * [POS]: PreThreadView 收起态 — 3 张 suggestion 卡片 + Explore more 按钮
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { X, ChevronRight, PenLine, ListChecks, Globe } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ExploreItem } from './const';

/** Get Started 各场景对应图标（按 id 映射，纯表现层） */
const ITEM_ICONS: Record<string, LucideIcon> = {
  'write-publish': PenLine,
  'build-plan': ListChecks,
  'create-site-page': Globe,
};

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
    {/*
      宽模式（≥380px）：Explore more + × 在卡片上方右对齐
      窄模式（<380px）：隐藏此行，改为卡片下方的全宽按钮
    */}
    {showExploreMore && (
      <div className="hidden items-center justify-end gap-1 @[380px]:flex">
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

    {/* 卡片网格：宽模式 3 列，窄模式 2 列（第 3 张卡片隐藏） */}
    <div className="grid grid-cols-2 gap-2 @[380px]:grid-cols-3">
      {items.map((item, i) => {
        const Icon = ITEM_ICONS[item.id];
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

      {/* 窄模式专用：Explore more 占满 2 列，作为显眼入口 */}
      {showExploreMore && (
        <button
          type="button"
          onClick={onExpand}
          className="col-span-2 flex items-center justify-between rounded-xl border border-border/50 bg-card/50 px-4 py-3 transition-all duration-150 hover:border-border/80 hover:bg-card hover:shadow-sm @[380px]:hidden"
        >
          <span className="text-[13px] font-medium text-foreground/80">{exploreMoreLabel}</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground/70" />
        </button>
      )}
    </div>
  </div>
);
