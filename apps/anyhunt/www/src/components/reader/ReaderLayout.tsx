/**
 * [PROPS]: children (slot for content)
 * [POS]: Three-column reader layout (sidebar | article list | article detail)
 * [UPDATE]: 2026-01-28 移动端布局改由 ReaderShell 统一接管
 */

import { type ReactNode } from 'react';
import { cn } from '@anyhunt/ui';

interface ReaderLayoutProps {
  /** Left sidebar content */
  sidebar: ReactNode;
  /** Middle column content (article list) */
  list: ReactNode;
  /** Right column content (article detail) */
  detail: ReactNode;
  /** Additional className */
  className?: string;
}

/**
 * Three-column reader layout
 *
 * Desktop: sidebar (200px) | list (320px) | detail (flex)
 * Mobile: Handled by ReaderShell mobile scaffold
 */
export function ReaderLayout({ sidebar, list, detail, className }: ReaderLayoutProps) {
  return (
    <div className={cn('flex h-screen w-full overflow-hidden bg-background', className)}>
      {/* Left sidebar - 200px fixed */}
      <aside className="hidden w-[200px] shrink-0 border-r border-border md:flex md:flex-col">
        {sidebar}
      </aside>

      {/* Middle column - article list - 320px fixed */}
      <div className="hidden w-[320px] shrink-0 border-r border-border md:flex md:flex-col">
        {list}
      </div>

      {/* Right column - article detail - flex grow */}
      <main className="flex flex-1 flex-col overflow-hidden">{detail}</main>
    </div>
  );
}
