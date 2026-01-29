/**
 * [PROPS]: children, showBottomNav, activeTabId, header
 * [EMITS]: none
 * [POS]: Mobile reader scaffold with bottom navigation spacing
 */

import { type ReactNode } from 'react';
import { cn } from '@anyhunt/ui';
import { MobileBottomNav } from './MobileBottomNav';
import type { MobileTabId } from '@/features/reader-shell/mobile-reader-state';

interface MobileReaderScaffoldProps {
  children: ReactNode;
  showBottomNav: boolean;
  activeTabId: MobileTabId | null;
  header?: ReactNode;
}

export function MobileReaderScaffold({
  children,
  showBottomNav,
  activeTabId,
  header,
}: MobileReaderScaffoldProps) {
  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background">
      {header ? <div className="shrink-0">{header}</div> : null}
      <main
        className={cn(
          'flex-1 overflow-hidden',
          showBottomNav && 'pb-[calc(56px+env(safe-area-inset-bottom))]'
        )}
      >
        {children}
      </main>
      {showBottomNav ? <MobileBottomNav activeTabId={activeTabId} /> : null}
    </div>
  );
}
