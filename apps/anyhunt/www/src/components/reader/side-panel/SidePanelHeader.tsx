/**
 * [PROPS]: pathname, search
 * [POS]: SidePanel 顶部 Header（Logo / Explore / User）
 */

import { Link } from '@tanstack/react-router';
import { Button, Icon } from '@anyhunt/ui';
import { Add01Icon, UserCircleIcon } from '@hugeicons/core-free-icons';
import { useAuth } from '@/lib/auth-context';
import { SidePanelUserMenu } from './SidePanelUserMenu';

interface SidePanelHeaderProps {
  pathname: string;
  search: string;
}

export function SidePanelHeader({ pathname, search }: SidePanelHeaderProps) {
  const { user, isAuthenticated } = useAuth();

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
            <Icon icon={Add01Icon} className="size-4" />
            <span className="sr-only">Explore topics</span>
          </Link>
        </Button>

        {isAuthenticated && user ? (
          <SidePanelUserMenu user={user} />
        ) : (
          <Button asChild variant="ghost" size="icon" className="size-8">
            <Link to="/login" search={{ redirect: pathname + search }}>
              <Icon icon={UserCircleIcon} className="size-4" />
              <span className="sr-only">Sign in</span>
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
