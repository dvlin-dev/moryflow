/**
 * [PROPS]: list, detail, activePane
 * [EMITS]: none
 * [POS]: Mobile reader pane switcher (list/detail)
 */

import { type ReactNode } from 'react';
import type { MobilePane } from '@/features/reader-shell/mobile-reader-state';

interface MobileReaderPaneProps {
  list?: ReactNode;
  detail: ReactNode;
  activePane: MobilePane;
}

export function MobileReaderPane({ list, detail, activePane }: MobileReaderPaneProps) {
  const content = activePane === 'list' ? (list ?? detail) : detail;

  return <div className="flex h-full flex-col overflow-hidden">{content}</div>;
}
