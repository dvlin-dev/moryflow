/**
 * [PROPS]: label, to, params
 * [EMITS]: none
 * [POS]: Mobile detail top bar with back navigation
 */

import { Link } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@moryflow/ui';

interface MobileDetailHeaderProps {
  label: string;
  to: string;
  params?: Record<string, string>;
}

export function MobileDetailHeader({ label, to, params }: MobileDetailHeaderProps) {
  return (
    <div className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur">
      <Link
        to={to}
        params={params}
        className={cn(
          'inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium',
          'text-muted-foreground hover:text-foreground'
        )}
      >
        <ChevronLeft className="size-4" />
        <span>{label}</span>
      </Link>
      <div className="flex-1" />
    </div>
  );
}
