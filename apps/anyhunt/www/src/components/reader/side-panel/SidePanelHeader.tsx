/**
 * [PROPS]: pathname, search
 * [POS]: SidePanel 顶部 Header（Logo / Explore / User, Lucide icons direct render）
 */

import { Link } from '@tanstack/react-router';
import { Button } from '@anyhunt/ui';
import { Plus, CircleUser } from 'lucide-react';
import { SidePanelUserMenu } from './SidePanelUserMenu';
import { useAuthStore } from '@/stores/auth-store';

interface SidePanelHeaderProps {
  pathname: string;
  search: string;
}

export function SidePanelHeader({ pathname, search }: SidePanelHeaderProps) {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <div className="flex items-center justify-between">
      <Link
        to="/welcome"
        className="rounded-md px-1.5 py-1 text-sm font-semibold text-foreground hover:bg-accent"
      >
        Anyhunt
      </Link>

      <div className="flex items-center gap-1">
        <Button asChild variant="ghost" size="icon" className="size-8">
          <Link to="/explore">
            <Plus className="size-4" />
            <span className="sr-only">Explore topics</span>
          </Link>
        </Button>

        {isAuthenticated && user ? (
          <SidePanelUserMenu user={user} />
        ) : (
          <Button asChild variant="ghost" size="icon" className="size-8">
            <Link to="/login" search={{ redirect: pathname + search }}>
              <CircleUser className="size-4" />
              <span className="sr-only">Sign in</span>
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
