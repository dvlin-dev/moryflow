/**
 * [PROPS]: user, isAuthenticated, stats, onSignIn
 * [POS]: SidePanel 顶部用户区（UserMenu / Sign in 按钮）
 *
 * [PROTOCOL]: 本文件变更时，请同步更新 `apps/aiget/www/CLAUDE.md`
 */

import type { User } from '@/lib/auth-client';
import type { InboxStats } from '@/features/digest/types';
import { Icon } from '@aiget/ui';
import { Notification01Icon } from '@hugeicons/core-free-icons';
import { UserMenu } from '../UserMenu';

interface SidePanelUserAreaProps {
  user: User | null;
  isAuthenticated: boolean;
  stats: InboxStats | null;
  onSignIn: () => void;
}

export function SidePanelUserArea({
  user,
  isAuthenticated,
  stats,
  onSignIn,
}: SidePanelUserAreaProps) {
  if (isAuthenticated && user) {
    return <UserMenu user={user} stats={stats} />;
  }

  return (
    <button
      type="button"
      onClick={onSignIn}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
    >
      <Icon icon={Notification01Icon} className="size-4" />
      <span>Sign in / Register</span>
    </button>
  );
}
