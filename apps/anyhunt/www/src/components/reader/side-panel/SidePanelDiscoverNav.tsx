/**
 * [PROPS]: currentView, onViewChange, onBrowseTopics
 * [POS]: SidePanel Discover 导航（Featured/Trending/Browse topics）
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/anyhunt/www/CLAUDE.md`
 */

import { Icon } from '@anyhunt/ui';
import { Fire02Icon, Search01Icon, SparklesIcon } from '@hugeicons/core-free-icons';
import type { SidePanelView } from './side-panel.types';

interface SidePanelDiscoverNavProps {
  currentView: SidePanelView;
  onViewChange: (view: SidePanelView) => void;
  onBrowseTopics: () => void;
  onBrowseTopicsHover?: () => void;
}

function isDiscoverSelected(currentView: SidePanelView, view: SidePanelView): boolean {
  if (currentView.type !== view.type) return false;
  if (view.type === 'discover' && currentView.type === 'discover') {
    return currentView.feed === view.feed;
  }
  if (view.type === 'topics' && currentView.type === 'topics') return true;
  return false;
}

export function SidePanelDiscoverNav({
  currentView,
  onViewChange,
  onBrowseTopics,
  onBrowseTopicsHover,
}: SidePanelDiscoverNavProps) {
  return (
    <div className="space-y-0.5 p-2">
      <div className="px-2 py-1">
        <span className="text-xs font-medium uppercase text-muted-foreground">Discover</span>
      </div>
      <button
        type="button"
        onClick={() => onViewChange({ type: 'discover', feed: 'featured' })}
        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
          isDiscoverSelected(currentView, { type: 'discover', feed: 'featured' })
            ? 'bg-accent text-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        }`}
      >
        <Icon icon={SparklesIcon} className="size-4" />
        <span>Featured</span>
      </button>
      <button
        type="button"
        onClick={() => onViewChange({ type: 'discover', feed: 'trending' })}
        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
          isDiscoverSelected(currentView, { type: 'discover', feed: 'trending' })
            ? 'bg-accent text-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        }`}
      >
        <Icon icon={Fire02Icon} className="size-4" />
        <span>Trending</span>
      </button>
      <button
        type="button"
        onClick={onBrowseTopics}
        onMouseEnter={onBrowseTopicsHover}
        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
          isDiscoverSelected(currentView, { type: 'topics' })
            ? 'bg-accent text-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        }`}
      >
        <Icon icon={Search01Icon} className="size-4" />
        <span>Browse topics</span>
      </button>
    </div>
  );
}
