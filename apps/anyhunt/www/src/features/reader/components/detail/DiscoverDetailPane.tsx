/**
 * [PROPS]: Discover detail model
 * [POS]: Reader 右栏 - Discover 详情（纯渲染）
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/anyhunt/www/CLAUDE.md`
 */

import type { DiscoverFeedItem } from '@/features/discover/types';
import { DiscoverDetail } from '@/components/reader/DiscoverDetail';

interface DiscoverDetailPaneProps {
  item: DiscoverFeedItem | null;
  onPreviewTopic: (slug: string) => void;
  onPreviewTopicHover?: (slug: string) => void;
}

export function DiscoverDetailPane({
  item,
  onPreviewTopic,
  onPreviewTopicHover,
}: DiscoverDetailPaneProps) {
  return (
    <DiscoverDetail
      item={item}
      onPreviewTopic={onPreviewTopic}
      onPreviewTopicHover={onPreviewTopicHover}
    />
  );
}
