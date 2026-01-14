/**
 * [PROPS]: user, stats
 * [POS]: User avatar and dropdown menu
 */

import { Link } from '@tanstack/react-router';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  Icon,
} from '@aiget/ui';
import {
  Settings01Icon,
  PaintBrushIcon,
  CodeIcon,
  Logout01Icon,
  ArrowDown01Icon,
  Sun01Icon,
  Moon01Icon,
  ComputerIcon,
} from '@hugeicons/core-free-icons';
import { useAuth } from '@/lib/auth-context';
import { useTheme, type Theme } from '@/hooks/useTheme';
import type { User } from '@/lib/auth-client';
import type { InboxStats } from '@/features/digest/types';

interface UserMenuProps {
  user: User;
  stats: InboxStats | null;
}

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun01Icon }[] = [
  { value: 'light', label: 'Light', icon: Sun01Icon },
  { value: 'dark', label: 'Dark', icon: Moon01Icon },
  { value: 'system', label: 'System', icon: ComputerIcon },
];

export function UserMenu({ user, stats }: UserMenuProps) {
  const { signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user.email?.slice(0, 2).toUpperCase() || 'U';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent focus:outline-none">
        <Avatar className="size-7">
          <AvatarImage src={user.image || undefined} alt={user.name || 'User'} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex flex-1 flex-col overflow-hidden">
          <span className="truncate text-sm font-medium">{user.name || 'User'}</span>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {stats && (
              <>
                <span>{stats.unreadCount} unread</span>
                <span>·</span>
                <span>{stats.totalCount} total</span>
              </>
            )}
          </div>
        </div>
        <Icon icon={ArrowDown01Icon} className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{user.name || 'User'}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link to="/settings" className="flex items-center gap-2">
            <Icon icon={Settings01Icon} className="size-4" />
            <span>Account Settings</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="flex items-center gap-2">
            <Icon icon={PaintBrushIcon} className="size-4" />
            <span>Appearance</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as Theme)}>
              {THEME_OPTIONS.map((option) => (
                <DropdownMenuRadioItem
                  key={option.value}
                  value={option.value}
                  className="flex items-center gap-2"
                >
                  <Icon icon={option.icon} className="size-4" />
                  <span>{option.label}</span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link to="/developer" className="flex items-center gap-2">
            <Icon icon={CodeIcon} className="size-4" />
            <span>Developer</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="flex items-center gap-2 text-destructive focus:text-destructive"
          onClick={() => signOut()}
        >
          <Icon icon={Logout01Icon} className="size-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
