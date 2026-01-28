/**
 * [PROPS]: user, stats
 * [POS]: User avatar and dropdown menu (Lucide icons direct render)
 */

import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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
} from '@anyhunt/ui';
import { Settings, Paintbrush, Code, LogOut, ChevronDown, Sun, Moon, Computer } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useTheme, type Theme } from '@/hooks/useTheme';
import type { User } from '@/lib/auth-client';
import type { InboxStats } from '@/features/digest/types';
import { AccountSettingsDialog } from './AccountSettingsDialog';

interface UserMenuProps {
  user: User;
  stats: InboxStats | null;
}

const THEME_OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Computer },
];

export function UserMenu({ user, stats }: UserMenuProps) {
  const { signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);

  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user.email?.slice(0, 2).toUpperCase() || 'U';

  return (
    <>
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
          <ChevronDown className="size-4 text-muted-foreground" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-56">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">{user.name || 'User'}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="flex items-center gap-2"
            onSelect={() => setSettingsOpen(true)}
          >
            <Settings className="size-4" />
            <span>Account Settings</span>
          </DropdownMenuItem>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="flex items-center gap-2">
              <Paintbrush className="size-4" />
              <span>Appearance</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as Theme)}>
                {THEME_OPTIONS.map((option) => {
                  const IconComponent = option.icon;
                  return (
                    <DropdownMenuRadioItem
                      key={option.value}
                      value={option.value}
                      className="flex items-center gap-2"
                    >
                      <IconComponent className="size-4" />
                      <span>{option.label}</span>
                    </DropdownMenuRadioItem>
                  );
                })}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          <DropdownMenuItem asChild>
            <Link to="/developer" className="flex items-center gap-2">
              <Code className="size-4" />
              <span>Developer</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="flex items-center gap-2 text-destructive focus:text-destructive"
            onSelect={(e) => {
              e.preventDefault();
              setSignOutConfirmOpen(true);
            }}
          >
            <LogOut className="size-4" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AccountSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

      <AlertDialog open={signOutConfirmOpen} onOpenChange={setSignOutConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>You can sign back in anytime.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setSignOutConfirmOpen(false);
                void signOut();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sign out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
