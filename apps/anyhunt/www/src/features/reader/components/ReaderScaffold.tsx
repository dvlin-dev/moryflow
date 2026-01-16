/**
 * [PROPS]: isMobile, sidebar, list, detail, hasSelectedItem, onBack
 * [POS]: Reader 布局壳层切换（桌面三栏 / 移动端）
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/anyhunt/www/CLAUDE.md`
 */

import type { ReactNode } from 'react';
import { MobileReaderLayout } from '@/components/reader/MobileReaderLayout';
import { ReaderLayout } from '@/components/reader/ReaderLayout';

interface ReaderScaffoldProps {
  isMobile: boolean;
  sidebar: ReactNode;
  list: ReactNode;
  detail: ReactNode;
  hasSelectedItem: boolean;
  onBack: () => void;
}

export function ReaderScaffold({
  isMobile,
  sidebar,
  list,
  detail,
  hasSelectedItem,
  onBack,
}: ReaderScaffoldProps) {
  if (isMobile) {
    return (
      <MobileReaderLayout
        sidebar={sidebar}
        list={list}
        detail={detail}
        hasSelectedArticle={hasSelectedItem}
        onBack={onBack}
      />
    );
  }

  return <ReaderLayout sidebar={sidebar} list={list} detail={detail} />;
}
