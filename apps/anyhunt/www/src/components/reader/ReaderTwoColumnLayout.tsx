/**
 * [PROPS]: sidebar, main
 * [POS]: Two-column reader layout (sidebar | main)
 */

import { type ReactNode } from 'react';
import { cn } from '@moryflow/ui';

interface ReaderTwoColumnLayoutProps {
  sidebar: ReactNode;
  main: ReactNode;
  className?: string;
}

export function ReaderTwoColumnLayout({ sidebar, main, className }: ReaderTwoColumnLayoutProps) {
  return (
    <div className={cn('flex h-screen w-full overflow-hidden bg-background', className)}>
      <aside className="hidden w-[200px] shrink-0 border-r border-border md:flex md:flex-col">
        {sidebar}
      </aside>

      <main className="flex flex-1 flex-col overflow-hidden">{main}</main>
    </div>
  );
}
