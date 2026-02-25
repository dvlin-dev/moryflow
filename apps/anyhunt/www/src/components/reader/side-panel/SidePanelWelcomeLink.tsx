/**
 * [PROPS]: pathname
 * [POS]: SidePanel - Welcome primary entry
 */

import { Link } from '@tanstack/react-router';
import { cn } from '@moryflow/ui';

interface SidePanelWelcomeLinkProps {
  pathname: string;
}

export function SidePanelWelcomeLink({ pathname }: SidePanelWelcomeLinkProps) {
  const isActive = pathname === '/welcome' || pathname === '/welcome/' || pathname === '/';

  return (
    <Link
      to="/welcome"
      className={cn(
        'flex w-full items-center rounded-md px-2 py-1.5 text-sm font-medium transition-colors',
        isActive ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/60'
      )}
    >
      Welcome to Anyhunt
    </Link>
  );
}
