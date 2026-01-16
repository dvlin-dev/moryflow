/**
 * [PROPS]: Article detail model
 * [POS]: Reader 右栏 - Article 详情（纯渲染）
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/anyhunt/www/CLAUDE.md`
 */

import type { InboxItem } from '@/features/digest/types';
import { ArticleDetail } from '@/components/reader/ArticleDetail';

interface ArticleDetailPaneProps {
  item: InboxItem | null;
  fullContent: string | null;
  isLoadingContent: boolean;
  isSaving: boolean;
  onSave: (item: InboxItem) => void;
  onNotInterested: (item: InboxItem) => void;
}

export function ArticleDetailPane({
  item,
  onSave,
  onNotInterested,
  fullContent,
  isLoadingContent,
  isSaving,
}: ArticleDetailPaneProps) {
  return (
    <ArticleDetail
      item={item}
      onSave={onSave}
      onNotInterested={onNotInterested}
      fullContent={fullContent}
      isLoadingContent={isLoadingContent}
      isSaving={isSaving}
    />
  );
}
