/**
 * [PROPS]: onPreviewTopic, onBrowseTopics
 * [POS]: SidePanel Featured Topics 区（含 Browse topics / Browse all）
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/aiget/www/CLAUDE.md`
 */

import { Link } from '@tanstack/react-router';
import { Icon } from '@aiget/ui';
import { Search01Icon } from '@hugeicons/core-free-icons';
import { useFeaturedTopics } from '@/features/discover';

interface SidePanelFeaturedTopicsProps {
  onBrowseTopics: () => void;
  onBrowseTopicsHover?: () => void;
  onPreviewTopic?: (slug: string) => void;
  onPreviewTopicHover?: (slug: string) => void;
}

export function SidePanelFeaturedTopics({
  onBrowseTopics,
  onBrowseTopicsHover,
  onPreviewTopic,
  onPreviewTopicHover,
}: SidePanelFeaturedTopicsProps) {
  const { data: featuredTopicsData } = useFeaturedTopics(5);
  const items = featuredTopicsData?.items ?? [];

  if (items.length === 0) return null;

  return (
    <div className="space-y-0.5 p-2">
      <div className="px-2 py-1">
        <span className="text-xs font-medium uppercase text-muted-foreground">Featured Topics</span>
      </div>
      {items.map((topic) => (
        <div key={topic.id}>
          {onPreviewTopic ? (
            <button
              type="button"
              onClick={() => onPreviewTopic(topic.slug)}
              onMouseEnter={() => onPreviewTopicHover?.(topic.slug)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <span className="truncate">{topic.title}</span>
            </button>
          ) : (
            <Link
              to="/topics/$slug"
              params={{ slug: topic.slug }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <span className="truncate">{topic.title}</span>
            </Link>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={onBrowseTopics}
        onMouseEnter={onBrowseTopicsHover}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <Icon icon={Search01Icon} className="size-4" />
        <span>Browse all</span>
      </button>
    </div>
  );
}
